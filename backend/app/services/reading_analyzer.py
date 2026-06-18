from __future__ import annotations

import base64
from datetime import datetime, timezone
import json
import re
import secrets
from urllib import error, request

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ReadingAnalysis, Subscription, User

FREE_DAILY_ANALYSES = 3
MAX_INPUT_CHARS = 9000
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}

SYSTEM_PROMPT = """
You are an expert SAT Reading tutor with SAT score 1540.

Analyze the given SAT reading passage deeply and thoroughly.

Return ONLY valid JSON with this EXACT structure:
{
  "passage_type": "Literature/Science/History/Social Science",
  "difficulty": "Easy/Medium/Hard",
  "reading_time": "X minutes",
  "word_count": 150,
  "main_idea": {
    "one_sentence": "One clear sentence summary",
    "one_sentence_en": "One clear sentence summary in English",
    "one_sentence_ru": "One clear sentence summary in Russian",
    "one_sentence_uz": "One clear sentence summary in Uzbek",
    "detailed_uz": "Detailed in Uzbek",
    "detailed_ru": "Detailed in Russian",
    "detailed_en": "Detailed in English",
    "sat_connection": "How many times this appears on SAT",
    "sat_connection_en": "SAT relevance in English",
    "sat_connection_ru": "SAT relevance in Russian",
    "sat_connection_uz": "SAT relevance in Uzbek"
  },
  "vocabulary": [
    {
      "word": "word",
      "definition_uz": "definition",
      "definition_ru": "definition",
      "definition_en": "definition",
      "in_context": "how used here",
      "in_context_en": "how used in passage",
      "in_context_ru": "how used in Russian",
      "in_context_uz": "how used in Uzbek",
      "memory_trick": "remember trick",
      "memory_trick_en": "trick to remember",
      "memory_trick_ru": "trick in Russian",
      "memory_trick_uz": "trick in Uzbek",
      "sat_frequency": "High/Medium/Low"
    }
  ],
  "tone": {
    "primary": "Formal/Informal/Persuasive/Informative",
    "primary_en": "Formal",
    "primary_ru": "Formal in Russian",
    "primary_uz": "Formal in Uzbek",
    "percentage": 75,
    "explanation_uz": "...",
    "explanation_ru": "...",
    "explanation_en": "..."
  },
  "purpose": {
    "primary": "To inform/persuade/entertain/describe",
    "primary_en": "To inform",
    "primary_ru": "To inform in Russian",
    "primary_uz": "To inform in Uzbek",
    "percentage": 65,
    "explanation_uz": "...",
    "explanation_ru": "...",
    "explanation_en": "..."
  },
  "author_perspective": {
    "uz": "Author viewpoint in Uzbek",
    "ru": "Author viewpoint in Russian",
    "en": "Author viewpoint in English"
  },
  "sat_strategy": {
    "do_uz": ["tip1", "tip2"],
    "do_ru": ["tip1", "tip2"],
    "do_en": ["tip1", "tip2"],
    "avoid_uz": ["mistake1", "mistake2"],
    "avoid_ru": ["mistake1", "mistake2"],
    "avoid_en": ["mistake1", "mistake2"],
    "time_tip_uz": "time advice",
    "time_tip_ru": "time advice",
    "time_tip_en": "time advice",
    "score_impact": "+X points"
  },
  "practice_questions": [
    {
      "question": "SAT-style question",
      "options": {"A": "option", "B": "option", "C": "option", "D": "option"},
      "correct": "B",
      "explanation_uz": "Why B in Uzbek",
      "explanation_ru": "Why B in Russian",
      "explanation_en": "Why B in English",
      "question_type": "Main Idea/Detail/Inference/Vocabulary"
    }
  ],
  "improvement_plan": {
    "week1_uz": "Week 1 task in Uzbek",
    "week1_ru": "Week 1 task in Russian",
    "week1_en": "Week 1 task in English",
    "week2_uz": "Week 2 task in Uzbek",
    "week2_ru": "Week 2 task in Russian",
    "week2_en": "Week 2 task in English",
    "week3_uz": "Week 3 task in Uzbek",
    "week3_ru": "Week 3 task in Russian",
    "week3_en": "Week 3 task in English",
    "predicted_improvement": "+X points"
  },
  "extracted_text": "Full text extracted from image if image input"
}

Be thorough, specific, and helpful for SAT preparation. All explanations must be genuinely useful.
"""


def normalize_language(language: str | None) -> str:
    lowered = (language or "uz").lower()
    if lowered.startswith("ru"):
        return "ru"
    if lowered.startswith("en"):
        return "en"
    return "uz"


def user_has_active_pro(db: Session, user: User) -> bool:
    now = datetime.utcnow()
    return bool(
        db.execute(
            select(Subscription.id).where(
                Subscription.user_id == user.id,
                Subscription.status == "active",
                or_(Subscription.current_period_end.is_(None), Subscription.current_period_end > now),
            )
        ).first()
    )


def reset_user_daily_counter_if_needed(user: User) -> None:
    today = datetime.now(timezone.utc).date()
    last_date = user.last_analysis_date.date() if user.last_analysis_date else None
    if last_date != today:
        user.daily_analyses = 0
        user.last_analysis_date = datetime.utcnow()


def reset_all_daily_analysis_limits(db: Session) -> int:
    result = db.execute(update(User).values(daily_analyses=0, last_analysis_date=datetime.utcnow()))
    db.commit()
    return int(result.rowcount or 0)


def analyze_reading_passage(db: Session, user: User, text: str, language: str) -> dict:
    clean_text = " ".join(text.strip().split())
    if len(clean_text) < 50:
        raise ValueError("text_too_short")
    if len(clean_text) > MAX_INPUT_CHARS:
        raise ValueError("Passage is too long. Please paste a shorter passage.")

    normalized_language = normalize_language(language)
    is_pro = user_has_active_pro(db, user)
    reset_user_daily_counter_if_needed(user)
    if not is_pro and (user.daily_analyses or 0) >= FREE_DAILY_ANALYSES:
        return {
            "limit_reached": True,
            "message": "Free limit reached. Upgrade to Pro!",
            "remaining_free": 0,
            "is_pro": False,
        }

    analysis = _call_claude_text(clean_text, normalized_language) or _fallback_analysis(clean_text)
    return _finish_analysis(db, user, clean_text, normalized_language, is_pro, analysis, "text")


def analyze_reading_image(db: Session, user: User, image_data: bytes, image_type: str, language: str) -> dict:
    normalized_type = (image_type or "").lower()
    if normalized_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("invalid_file_type")
    if len(image_data) > MAX_IMAGE_BYTES:
        raise ValueError("image_too_large")

    normalized_language = normalize_language(language)
    is_pro = user_has_active_pro(db, user)
    reset_user_daily_counter_if_needed(user)
    if not is_pro and (user.daily_analyses or 0) >= FREE_DAILY_ANALYSES:
        return {
            "limit_reached": True,
            "message": "limit_reached",
            "remaining_free": 0,
            "is_pro": False,
        }

    analysis = _call_claude_image(image_data, normalized_type, normalized_language)
    if not analysis or analysis.get("error") == "no_text_found":
        raise ValueError("no_text_found")
    extracted_text = str(analysis.get("extracted_text") or "").strip()
    source_text = extracted_text or "Image passage"
    return _finish_analysis(db, user, source_text, normalized_language, is_pro, analysis, "image")


def _finish_analysis(db: Session, user: User, source_text: str, language: str, is_pro: bool, analysis: dict, input_type: str) -> dict:
    analysis = _normalize_analysis(analysis)
    if not is_pro:
        analysis["vocabulary"] = analysis["vocabulary"][:3]
        analysis["difficult_words"] = analysis["vocabulary"]
        analysis["vocabulary_locked"] = True
        analysis["practice_questions"] = "LOCKED"
        analysis["improvement_plan_locked"] = True

    user.daily_analyses = (user.daily_analyses or 0) + (0 if is_pro else 1)
    user.last_analysis_date = datetime.utcnow()
    user.total_analyses = (user.total_analyses or 0) + 1

    share_id = _new_share_id(db)
    row = ReadingAnalysis(
        user_id=user.id,
        share_id=share_id,
        language=language,
        source_text=source_text,
        input_type=input_type,
        analysis=analysis,
        is_pro_snapshot=is_pro,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "id": str(row.id),
        "share_id": row.share_id,
        "share_url": f"https://www.sattest.uz/reading-analyzer/shared/{row.share_id}",
        "is_pro": is_pro,
        "remaining_free": None if is_pro else max(0, FREE_DAILY_ANALYSES - (user.daily_analyses or 0)),
        "analysis": analysis,
        "source_text": source_text,
        "input_type": input_type,
        "created_at": row.created_at.isoformat(),
    }


def public_shared_analysis(db: Session, share_id: str) -> dict | None:
    row = db.execute(select(ReadingAnalysis).where(ReadingAnalysis.share_id == share_id)).scalar_one_or_none()
    if not row:
        return None
    public_analysis = dict(row.analysis or {})
    if not row.is_pro_snapshot:
        public_analysis["practice_questions"] = "LOCKED"
    return {
        "share_id": row.share_id,
        "language": row.language,
        "analysis": public_analysis,
        "source_text": row.source_text,
        "created_at": row.created_at.isoformat(),
        "is_pro": row.is_pro_snapshot,
        "input_type": row.input_type,
    }


def _call_claude_text(text: str, language: str) -> dict | None:
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None

    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 3000,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Analyze this SAT reading passage:\n\n"
                    f"{text}\n\n"
                    f"Language preference: {language}\n\n"
                    "Return JSON analysis."
                ),
            }
        ],
    }
    api_request = request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "User-Agent": "SATTEST.UZ-ReadingAnalyzer/1.0",
        },
        method="POST",
    )
    try:
        with request.urlopen(api_request, timeout=35) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except (OSError, error.HTTPError, json.JSONDecodeError):
        return None

    content = raw.get("content") or []
    text_block = ""
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            text_block += str(block.get("text") or "")
    return _parse_json_text(text_block)


def _call_claude_image(image_data: bytes, image_type: str, language: str) -> dict | None:
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None

    image_base64 = base64.standard_b64encode(image_data).decode("utf-8")
    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 3000,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": image_type,
                            "data": image_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "This image contains a SAT reading passage or text. "
                            "Extract and read all visible text carefully, analyze it as SAT Reading, "
                            f"use language preference {language}, and return complete JSON. "
                            "If the image does not contain readable text, return {\"error\":\"no_text_found\"}."
                        ),
                    },
                ],
            }
        ],
    }
    api_request = request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "User-Agent": "SATTEST.UZ-ReadingAnalyzer/1.0",
        },
        method="POST",
    )
    try:
        with request.urlopen(api_request, timeout=45) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except (OSError, error.HTTPError, json.JSONDecodeError):
        return None

    content = raw.get("content") or []
    text_block = ""
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            text_block += str(block.get("text") or "")
    return _parse_json_text(text_block)


def _parse_json_text(value: str) -> dict | None:
    clean = value.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?\s*", "", clean)
        clean = re.sub(r"\s*```$", "", clean)
    start = clean.find("{")
    end = clean.rfind("}")
    if start >= 0 and end > start:
        clean = clean[start : end + 1]
    try:
        parsed = json.loads(clean)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def _normalize_analysis(analysis: dict) -> dict:
    analysis.setdefault("main_idea", {})
    legacy_main = analysis["main_idea"]
    legacy_uz = legacy_main.get("uzbek") or legacy_main.get("detailed_uz")
    legacy_ru = legacy_main.get("russian") or legacy_main.get("detailed_ru")
    legacy_en = legacy_main.get("english") or legacy_main.get("detailed_en")
    legacy_main.setdefault("one_sentence", legacy_main.get("one_sentence_en") or legacy_en or legacy_uz or "The passage develops a central SAT idea.")
    legacy_main.setdefault("one_sentence_en", legacy_main.get("one_sentence") or legacy_en or "The passage develops a central SAT idea.")
    legacy_main.setdefault("one_sentence_ru", legacy_main.get("one_sentence") or legacy_ru or "Отрывок развивает главную мысль.")
    legacy_main.setdefault("one_sentence_uz", legacy_main.get("one_sentence") or legacy_uz or "Matn asosiy fikrni rivojlantiradi.")
    legacy_main.setdefault("detailed_uz", legacy_uz or "Passage asosiy fikrni tushuntiradi va muallifning markaziy da'vosini ko'rsatadi.")
    legacy_main.setdefault("detailed_ru", legacy_ru or "Отрывок объясняет главную мысль и центральную позицию автора.")
    legacy_main.setdefault("detailed_en", legacy_en or "The passage explains the central idea and the author's main point.")
    legacy_main.setdefault("sat_connection", "This passage type appears regularly on SAT Reading and Writing questions.")
    legacy_main.setdefault("sat_connection_en", legacy_main.get("sat_connection"))
    legacy_main.setdefault("sat_connection_ru", legacy_main.get("sat_connection"))
    legacy_main.setdefault("sat_connection_uz", legacy_main.get("sat_connection"))
    legacy_main["uzbek"] = legacy_main["detailed_uz"]
    legacy_main["russian"] = legacy_main["detailed_ru"]
    legacy_main["english"] = legacy_main["detailed_en"]
    vocabulary = analysis.get("vocabulary") or analysis.get("difficult_words") or []
    normalized_vocabulary = []
    for item in vocabulary if isinstance(vocabulary, list) else []:
        if not isinstance(item, dict):
            continue
        item.setdefault("in_context", item.get("in_context_en") or item.get("example") or "Use the surrounding sentence to confirm meaning.")
        item.setdefault("in_context_en", item.get("in_context") or item.get("example") or "Use the surrounding sentence to confirm meaning.")
        item.setdefault("in_context_ru", item.get("in_context") or item.get("example") or "Проверьте значение по соседним словам.")
        item.setdefault("in_context_uz", item.get("in_context") or item.get("example") or "Ma'noni atrofdagi so'zlardan tekshiring.")
        item.setdefault("memory_trick", item.get("memory_trick_en") or "Connect this word to the author's purpose.")
        item.setdefault("memory_trick_en", item.get("memory_trick"))
        item.setdefault("memory_trick_ru", item.get("memory_trick"))
        item.setdefault("memory_trick_uz", item.get("memory_trick"))
        item.setdefault("sat_frequency", "Medium")
        normalized_vocabulary.append(item)
    analysis["vocabulary"] = normalized_vocabulary
    analysis["difficult_words"] = normalized_vocabulary
    analysis.setdefault("tone", {})
    analysis["tone"].setdefault("primary", analysis["tone"].get("type") or "Informative")
    analysis["tone"].setdefault("primary_en", analysis["tone"].get("primary") or "Informative")
    analysis["tone"].setdefault("primary_ru", analysis["tone"].get("primary") or "Информативный")
    analysis["tone"].setdefault("primary_uz", analysis["tone"].get("primary") or "Ma'lumot beruvchi")
    analysis["tone"].setdefault("type", analysis["tone"].get("primary") or "Informative")
    analysis["tone"].setdefault("percentage", 75)
    analysis["tone"].setdefault("explanation_uz", "Matn rasmiy va tushuntiruvchi ohangda yozilgan.")
    analysis["tone"].setdefault("explanation_ru", "Текст написан в формальном и объяснительном тоне.")
    analysis["tone"].setdefault("explanation_en", "The text uses a formal, explanatory tone.")
    analysis.setdefault("purpose", {})
    analysis["purpose"].setdefault("primary", analysis["purpose"].get("type") or "To inform")
    analysis["purpose"].setdefault("primary_en", analysis["purpose"].get("primary") or "To inform")
    analysis["purpose"].setdefault("primary_ru", analysis["purpose"].get("primary") or "Информировать")
    analysis["purpose"].setdefault("primary_uz", analysis["purpose"].get("primary") or "Ma'lumot berish")
    analysis["purpose"].setdefault("type", analysis["purpose"].get("primary") or "To inform")
    analysis["purpose"].setdefault("percentage", 65)
    analysis["purpose"].setdefault("explanation_uz", "Maqsad o'quvchiga g'oya yoki dalilni tushuntirish.")
    analysis["purpose"].setdefault("explanation_ru", "Цель — объяснить читателю идею или аргумент.")
    analysis["purpose"].setdefault("explanation_en", "The purpose is to explain an idea or argument to the reader.")
    analysis.setdefault("author_perspective", {})
    analysis["author_perspective"].setdefault("uz", "Muallif mavzuni tushuntiruvchi va dalilga tayangan pozitsiyada beradi.")
    analysis["author_perspective"].setdefault("ru", "Автор объясняет тему с опорой на доказательства.")
    analysis["author_perspective"].setdefault("en", "The author presents the topic through evidence-based explanation.")
    analysis.setdefault("sat_strategy", {})
    analysis["sat_strategy"].setdefault("do_uz", ["Avval asosiy da'voni belgilang.", "Har bir detal da'voga qanday xizmat qilishini tekshiring."])
    analysis["sat_strategy"].setdefault("do_ru", ["Сначала найдите главную мысль.", "Проверьте, как детали поддерживают её."])
    analysis["sat_strategy"].setdefault("do_en", ["Find the main claim first.", "Check how each detail supports that claim."])
    analysis["sat_strategy"].setdefault("avoid_uz", ["Kontekstsiz javob tanlamang.", "Bitta kuchli so'zga aldanmang."])
    analysis["sat_strategy"].setdefault("avoid_ru", ["Не выбирайте ответ без контекста.", "Не ведитесь на одно сильное слово."])
    analysis["sat_strategy"].setdefault("avoid_en", ["Do not choose without context.", "Do not fall for one attractive word."])
    analysis["sat_strategy"].setdefault("time_tip_uz", "Bu turdagi matnga 1-2 daqiqa sarflang.")
    analysis["sat_strategy"].setdefault("time_tip_ru", "Тратьте 1-2 минуты на такой текст.")
    analysis["sat_strategy"].setdefault("time_tip_en", "Spend 1-2 minutes on this type.")
    analysis["sat_strategy"].setdefault("score_impact", "+20-40 points")
    analysis.setdefault("sat_tip", {})
    analysis["sat_tip"].setdefault("uzbek", analysis["sat_strategy"].get("time_tip_uz"))
    analysis["sat_tip"].setdefault("russian", analysis["sat_strategy"].get("time_tip_ru"))
    analysis["sat_tip"].setdefault("english", analysis["sat_strategy"].get("time_tip_en"))
    analysis.setdefault("practice_questions", [])
    if isinstance(analysis["practice_questions"], list):
        for question in analysis["practice_questions"]:
            if isinstance(question, dict):
                legacy = question.get("explanation") or "The correct answer is supported by the passage."
                question.setdefault("explanation_uz", legacy)
                question.setdefault("explanation_ru", legacy)
                question.setdefault("explanation_en", legacy)
                question.setdefault("question_type", "Main Idea")
    analysis.setdefault("improvement_plan", {})
    analysis["improvement_plan"].setdefault("week1_uz", "Har kuni 2 ta main idea savolini tahlil qiling.")
    analysis["improvement_plan"].setdefault("week1_ru", "Каждый день разбирайте 2 вопроса на главную мысль.")
    analysis["improvement_plan"].setdefault("week1_en", "Review 2 main idea questions daily.")
    analysis["improvement_plan"].setdefault("week2_uz", "Vocabulary-in-context savollarini mashq qiling.")
    analysis["improvement_plan"].setdefault("week2_ru", "Практикуйте vocabulary-in-context вопросы.")
    analysis["improvement_plan"].setdefault("week2_en", "Practice vocabulary-in-context questions.")
    analysis["improvement_plan"].setdefault("week3_uz", "Timed mini-testlar bilan tezlikni oshiring.")
    analysis["improvement_plan"].setdefault("week3_ru", "Увеличьте скорость через timed mini-tests.")
    analysis["improvement_plan"].setdefault("week3_en", "Improve speed with timed mini-tests.")
    analysis["improvement_plan"].setdefault("predicted_improvement", "+30 points")
    analysis["improvement_plan"].setdefault("predicted_improvement_en", analysis["improvement_plan"].get("predicted_improvement") or "+30 points")
    analysis["improvement_plan"].setdefault("predicted_improvement_ru", analysis["improvement_plan"].get("predicted_improvement") or "+30 баллов")
    analysis["improvement_plan"].setdefault("predicted_improvement_uz", analysis["improvement_plan"].get("predicted_improvement") or "+30 ball")
    analysis.setdefault("difficulty", "Medium")
    analysis.setdefault("passage_type", "Social Science")
    analysis.setdefault("reading_time", "2 minutes")
    return analysis


def _fallback_analysis(text: str) -> dict:
    words = re.findall(r"[A-Za-z][A-Za-z'-]{5,}", text)
    unique_words = []
    for word in words:
        lowered = word.lower()
        if lowered not in {item.lower() for item in unique_words}:
            unique_words.append(word)
        if len(unique_words) >= 5:
            break
    difficult_words = [
        {
            "word": word,
            "definition_uz": "Kontekstga qarab muhim akademik so'z; gapdagi vazifasini tekshiring.",
            "definition_ru": "Важное академическое слово; проверьте его роль в контексте.",
            "definition_en": "An academic word; use context to identify its exact role.",
            "example": f"Look at how '{word}' affects the author's meaning.",
            "in_context": f"'{word}' affects the author's meaning in this passage.",
            "memory_trick": "Tie the word to the sentence's job.",
            "sat_frequency": "Medium",
        }
        for word in unique_words
    ]
    preview = text[:220] + ("..." if len(text) > 220 else "")
    return {
        "main_idea": {
            "one_sentence": "The passage develops one central idea through supporting details.",
            "detailed_uz": f"Bu passage asosiy fikrni dalillar orqali tushuntiradi: {preview}",
            "detailed_ru": f"Этот отрывок объясняет главную мысль через детали: {preview}",
            "detailed_en": f"This passage develops a central idea through supporting details: {preview}",
            "sat_connection": "This appears often in main idea, purpose, and inference questions.",
        },
        "vocabulary": difficult_words,
        "difficult_words": difficult_words,
        "tone": {
            "primary": "Informative",
            "type": "Informative",
            "percentage": 75,
            "explanation_uz": "Ohang tushuntiruvchi va akademik.",
            "explanation_ru": "Тон объяснительный и академический.",
            "explanation_en": "The tone is explanatory and academic.",
        },
        "purpose": {
            "primary": "To inform",
            "type": "To inform",
            "percentage": 65,
            "explanation_uz": "Muallif mavzuni tushuntirish va asosiy fikrni yetkazishni maqsad qiladi.",
            "explanation_ru": "Автор стремится объяснить тему и передать главную мысль.",
            "explanation_en": "The author aims to explain the topic and communicate a main idea.",
        },
        "author_perspective": {
            "uz": "Muallif mavzuga tushuntiruvchi va dalilga asoslangan pozitsiyada qaraydi.",
            "ru": "Автор рассматривает тему объяснительно и опирается на доказательства.",
            "en": "The author approaches the topic in an explanatory, evidence-based way.",
        },
        "sat_strategy": {
            "do_uz": ["Asosiy da'voni bir jumlada yozing.", "Har bir detalni shu da'vo bilan bog'lang."],
            "do_ru": ["Запишите главную мысль в одном предложении.", "Свяжите каждую деталь с этой мыслью."],
            "do_en": ["State the main claim in one sentence.", "Connect each detail back to that claim."],
            "avoid_uz": ["Juda keng javoblarni tanlamang.", "Passageda yo'q xulosani qo'shmang."],
            "avoid_ru": ["Не выбирайте слишком широкий ответ.", "Не добавляйте вывод без доказательства."],
            "avoid_en": ["Avoid answers that are too broad.", "Do not add conclusions without evidence."],
            "time_tip_uz": "Bunday matnga 1-2 daqiqa ajrating.",
            "time_tip_ru": "На такой текст выделяйте 1-2 минуты.",
            "time_tip_en": "Spend 1-2 minutes on this type.",
            "score_impact": "+20-40 points",
        },
        "sat_tip": {
            "uzbek": "Savolda detail so'ralsa, javobni faqat passage ichidagi dalil bilan tanlang.",
            "russian": "Если вопрос о детали, выбирайте ответ только по доказательству в тексте.",
            "english": "For detail questions, choose the answer supported directly by the passage.",
        },
        "practice_questions": [
            {
                "question": "Which choice best states the main purpose of the passage?",
                "options": {
                    "A": "To present a personal story without analysis",
                    "B": "To explain a central idea using supporting details",
                    "C": "To reject all opposing viewpoints",
                    "D": "To compare unrelated historical events",
                },
                "correct": "B",
                "explanation": "The passage develops one central idea with supporting details, so B is best.",
                "explanation_uz": "Passage bitta asosiy fikrni dalillar bilan rivojlantiradi, shuning uchun B eng mos.",
                "explanation_ru": "Отрывок развивает одну главную мысль через детали, поэтому B лучше всего.",
                "explanation_en": "The passage develops one central idea with supporting details, so B is best.",
                "question_type": "Main Idea",
            }
        ],
        "improvement_plan": {
            "week1_uz": "Main idea savollarini har kuni mashq qiling.",
            "week1_ru": "Каждый день тренируйте вопросы на главную мысль.",
            "week1_en": "Practice main idea questions daily.",
            "week2_uz": "Tone va purpose savollariga o'ting.",
            "week2_ru": "Перейдите к вопросам tone and purpose.",
            "week2_en": "Move to tone and purpose questions.",
            "week3_uz": "Timed mini-mock bilan natijani tekshiring.",
            "week3_ru": "Проверьте результат через timed mini-mock.",
            "week3_en": "Check progress with timed mini-mocks.",
            "predicted_improvement": "+30 points",
        },
        "difficulty": "Medium",
        "passage_type": "Social Science",
        "reading_time": "2 minutes",
    }


def _new_share_id(db: Session) -> str:
    for _ in range(20):
        share_id = secrets.token_urlsafe(9).replace("-", "").replace("_", "")[:12]
        exists = db.execute(select(ReadingAnalysis.id).where(ReadingAnalysis.share_id == share_id)).first()
        if not exists:
            return share_id
    return secrets.token_hex(8)
