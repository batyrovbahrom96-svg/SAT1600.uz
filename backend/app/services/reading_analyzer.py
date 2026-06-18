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
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}

SYSTEM_PROMPT = """
You are an expert SAT Reading tutor with SAT score 1540. You have 10 years of teaching experience.

Your job is to:
1. Analyze the passage deeply
2. SOLVE any questions found
3. Give REAL approach hints
4. Translate everything precisely
5. Teach the student HOW to think

Return ONLY valid JSON:
{
  "passage_type": "Literature/Science/History/Social Science",
  "difficulty": "Easy/Medium/Hard",
  "reading_time": "X minutes",
  "word_count": 150,
  "full_translation": {
    "uzbek": "PRECISE word-for-word translation of the ENTIRE passage to Uzbek. Natural flowing Uzbek language. Every sentence translated accurately.",
    "russian": "ТОЧНЫЙ дословный перевод ВСЕГО отрывка на русский язык. Естественный русский язык. Каждое предложение переведено точно."
  },
  "main_idea": {
    "one_sentence_en": "summary",
    "one_sentence_ru": "краткое содержание",
    "one_sentence_uz": "qisqacha mazmun",
    "detailed_en": "detailed explanation",
    "detailed_ru": "подробное объяснение",
    "detailed_uz": "batafsil tushuntirish"
  },
  "vocabulary": [
    {
      "word": "word from passage",
      "definition_en": "definition",
      "definition_ru": "определение",
      "definition_uz": "ta'rif",
      "in_context_en": "meaning here",
      "in_context_ru": "значение здесь",
      "in_context_uz": "bu yerdagi ma'nosi",
      "memory_trick_en": "trick",
      "memory_trick_ru": "способ запомнить",
      "memory_trick_uz": "eslab qolish usuli",
      "sat_frequency": "High/Medium/Low"
    }
  ],
  "tone": {
    "primary_en": "Formal",
    "primary_ru": "Официальный",
    "primary_uz": "Rasmiy",
    "percentage": 75,
    "explanation_en": "why this tone",
    "explanation_ru": "почему этот тон",
    "explanation_uz": "nega bu ton"
  },
  "purpose": {
    "primary_en": "To inform",
    "primary_ru": "Информировать",
    "primary_uz": "Ma'lumot berish",
    "percentage": 65,
    "explanation_en": "explanation",
    "explanation_ru": "объяснение",
    "explanation_uz": "tushuntirish"
  },
  "how_to_approach": {
    "steps_en": [
      "STEP 1: Read the title/author note first — this gives context",
      "STEP 2: Read first and last paragraph — understand structure",
      "STEP 3: Look for transition words — they signal key ideas",
      "STEP 4: Circle opinion words — shows author's stance",
      "STEP 5: For each question — find evidence in text first"
    ],
    "steps_ru": [
      "ШАГ 1: Сначала прочитайте название — это даёт контекст",
      "ШАГ 2: Прочитайте первый и последний абзац",
      "ШАГ 3: Ищите слова-переходы — они указывают на ключевые идеи",
      "ШАГ 4: Отмечайте слова-мнения — показывает позицию автора",
      "ШАГ 5: Для каждого вопроса — сначала найдите доказательство"
    ],
    "steps_uz": [
      "QADAM 1: Avval sarlavha/muallif izohini o'qing",
      "QADAM 2: Birinchi va oxirgi paragrafni o'qing",
      "QADAM 3: O'tish so'zlarini toping — ular asosiy g'oyani ko'rsatadi",
      "QADAM 4: Fikr so'zlarini belgilang — muallif pozitsiyasini ko'rsatadi",
      "QADAM 5: Har bir savol uchun — avval matnda dalil toping"
    ],
    "time_management_en": "Spend 4-5 minutes reading, 1 minute per question",
    "time_management_ru": "4-5 минут на чтение, 1 минута на вопрос",
    "time_management_uz": "O'qishga 4-5 daqiqa, har savolga 1 daqiqa",
    "common_traps_en": ["Too extreme answers (always/never)", "Out of scope — not mentioned in passage", "Opposite meaning trap", "Partially correct answers"],
    "common_traps_ru": ["Слишком категоричные ответы (всегда/никогда)", "Вне контекста — не упомянуто в тексте", "Ловушка противоположного значения", "Частично правильные ответы"],
    "common_traps_uz": ["Juda keskin javoblar (doim/hech qachon)", "Mavzudan tashqari — matnda aytilmagan", "Teskari ma'no tuzoq", "Qisman to'g'ri javoblar"]
  },
  "questions_solved": [
    {
      "question_number": 1,
      "question_text": "exact question",
      "question_text_ru": "точный вопрос",
      "question_text_uz": "aniq savol",
      "options": {"A": "option text", "B": "option text", "C": "option text", "D": "option text"},
      "options_ru": {"A": "вариант на русском", "B": "вариант на русском", "C": "вариант на русском", "D": "вариант на русском"},
      "options_uz": {"A": "o'zbek tilida variant", "B": "o'zbek tilida variant", "C": "o'zbek tilida variant", "D": "o'zbek tilida variant"},
      "correct_answer": "B",
      "thinking_process_en": "Here is HOW to think through this: First, the question asks about... Look at line X where the author says... This tells us... Therefore B is correct because...",
      "thinking_process_ru": "Вот КАК думать: Вопрос спрашивает... Посмотрите на строку X... Это говорит нам... Поэтому B правильно потому что...",
      "thinking_process_uz": "QANDAY o'ylash kerak: Savol so'rayapti... X qatorga qarang... Bu bizga aytadi... Shuning uchun B to'g'ri chunki...",
      "why_correct_en": "B is correct because [specific evidence from text]",
      "why_correct_ru": "B правильно потому что [конкретное доказательство]",
      "why_correct_uz": "B to'g'ri chunki [matndan aniq dalil]",
      "why_wrong_en": {"A": "A is wrong because...", "C": "C is wrong because...", "D": "D is wrong because..."},
      "why_wrong_ru": {"A": "A неверно потому что...", "C": "C неверно потому что...", "D": "D неверно потому что..."},
      "why_wrong_uz": {"A": "A noto'g'ri chunki...", "C": "C noto'g'ri chunki...", "D": "D noto'g'ri chunki..."},
      "evidence_line": "Quote from passage that proves answer",
      "question_type": "Main Idea/Detail/Inference/Vocabulary/Tone/Purpose/Evidence",
      "difficulty": "Easy/Medium/Hard",
      "tip_en": "For this question TYPE always...",
      "tip_ru": "Для этого ТИПА вопроса всегда...",
      "tip_uz": "Bu TUR savol uchun doim..."
    }
  ],
  "sat_strategy": {
    "do_en": ["tip1", "tip2"],
    "do_ru": ["совет1", "совет2"],
    "do_uz": ["maslahat1", "maslahat2"],
    "avoid_en": ["mistake1", "mistake2"],
    "avoid_ru": ["ошибка1", "ошибка2"],
    "avoid_uz": ["xato1", "xato2"],
    "score_impact": "+30-50 points"
  },
  "improvement_plan": {
    "week1_en": "Week 1 task",
    "week1_ru": "Задание неделя 1",
    "week1_uz": "1-hafta vazifasi",
    "week2_en": "Week 2 task",
    "week2_ru": "Задание неделя 2",
    "week2_uz": "2-hafta vazifasi",
    "week3_en": "Week 3 task",
    "week3_ru": "Задание неделя 3",
    "week3_uz": "3-hafta vazifasi",
    "predicted_improvement": "+X points"
  },
  "extracted_text": "Full text extracted from image if image input"
}

IMPORTANT RULES:
1. If passage has questions, solve ALL of them.
2. Translation must be PRECISE and natural.
3. Thinking process must be a REAL explanation.
4. Evidence must be QUOTED from passage.
5. Wrong answers must explain WHY wrong.
6. All three languages must be present for every explanation field.
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
    if len(image_data) > MAX_IMAGE_BYTES:
        raise ValueError("image_too_large")
    normalized_type = _detect_image_type(image_data, image_type)
    if normalized_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("invalid_file_type")

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
    extracted_text = str((analysis or {}).get("extracted_text") or "").strip()
    if not analysis or not analysis.get("main_idea"):
        extracted_text = extracted_text or (extract_text_from_reading_image(image_data, normalized_type) or "").strip()
        if len(extracted_text) < 20:
            raise ValueError("image_error")
        analysis = _call_claude_text(extracted_text, normalized_language) or _fallback_analysis(extracted_text)
        analysis["extracted_text"] = extracted_text
    extracted_text = str(analysis.get("extracted_text") or "").strip()
    source_text = extracted_text or "Image passage"
    return _finish_analysis(db, user, source_text, normalized_language, is_pro, analysis, "image")


def extract_text_from_reading_image(image_data: bytes, image_type: str) -> str | None:
    if len(image_data) > MAX_IMAGE_BYTES:
        raise ValueError("image_too_large")
    normalized_type = _detect_image_type(image_data, image_type)
    if normalized_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("invalid_file_type")

    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    image_base64 = base64.standard_b64encode(image_data).decode("utf-8")
    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 2000,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": normalized_type, "data": image_base64},
                    },
                    {
                        "type": "text",
                        "text": "Please read and return ALL text visible in this image. Return just the text, nothing else.",
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
        with request.urlopen(api_request, timeout=35) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except (OSError, error.HTTPError, json.JSONDecodeError):
        return None
    text = ""
    for block in raw.get("content") or []:
        if isinstance(block, dict) and block.get("type") == "text":
            text += str(block.get("text") or "")
    return text.strip() or None


def _finish_analysis(db: Session, user: User, source_text: str, language: str, is_pro: bool, analysis: dict, input_type: str) -> dict:
    analysis = _normalize_analysis(analysis)
    if not is_pro:
        original_question_count = len(analysis.get("questions_solved") or [])
        analysis["vocabulary"] = analysis["vocabulary"][:3]
        analysis["difficult_words"] = analysis["vocabulary"]
        analysis["vocabulary_locked"] = True
        analysis["translation_locked"] = True
        analysis["questions_solved_locked"] = max(0, original_question_count - 1)
        analysis["questions_solved"] = (analysis.get("questions_solved") or [])[:1]
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
        public_analysis["translation_locked"] = True
        public_analysis["questions_solved"] = (public_analysis.get("questions_solved") or [])[:1]
        public_analysis["questions_solved_locked"] = max(1, int(public_analysis.get("questions_solved_locked") or 1))
    return {
        "share_id": row.share_id,
        "language": row.language,
        "analysis": public_analysis,
        "source_text": row.source_text,
        "created_at": row.created_at.isoformat(),
        "is_pro": row.is_pro_snapshot,
        "input_type": row.input_type,
    }


def _detect_image_type(image_data: bytes, image_type: str | None) -> str:
    content_type = (image_type or "").split(";")[0].strip().lower()
    if content_type == "image/jpg":
        content_type = "image/jpeg"
    if content_type in ALLOWED_IMAGE_TYPES:
        return content_type
    if image_data.startswith(b"\xff\xd8"):
        return "image/jpeg"
    if image_data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_data.startswith(b"RIFF") and image_data[8:12] == b"WEBP":
        return "image/webp"
    if image_data.startswith(b"GIF87a") or image_data.startswith(b"GIF89a"):
        return "image/gif"
    return content_type or "image/jpeg"


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
        "max_tokens": 4000,
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
                        "text": _image_analysis_prompt(language),
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


def _image_analysis_prompt(language: str) -> str:
    return f"""
Please look at this image carefully.

This image contains a SAT Reading passage and/or questions.

YOUR TASK:
1. Read ALL text visible in the image.
2. Extract EVERY word accurately.
3. Analyze it as SAT content.
4. Solve every visible question.
5. If a vocabulary question asks about "trace", remember that in the phrase "no trace of their passing to be left", the best meaning is evidence.

IMPORTANT:
- Read the text even if it is small.
- Include the passage text in extracted_text.
- Include any questions shown.
- Include any answer choices shown.
- If the image is difficult, extract the readable parts and continue with the analysis.

Language preference: {language}

Return ONLY valid JSON matching the system prompt schema. Include:
- extracted_text
- full_translation in Uzbek and Russian
- main_idea in English, Russian, Uzbek
- vocabulary
- tone and purpose
- how_to_approach
- questions_solved with correct_answer, thinking_process, why_correct, why_wrong, evidence_line, and tips
- sat_strategy
- improvement_plan
"""


def _parse_json_text(value: str) -> dict | None:
    original = value.strip()
    for candidate in _json_candidates(original):
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    repaired = _repair_json_with_claude(original)
    if repaired:
        return repaired
    return None


def _json_candidates(value: str) -> list[str]:
    candidates = [value]
    if "```json" in value:
        start = value.find("```json") + len("```json")
        end = value.rfind("```")
        if end > start:
            candidates.append(value[start:end].strip())
    if "```" in value:
        fenced = re.sub(r"^```(?:json)?\s*", "", value.strip())
        fenced = re.sub(r"\s*```$", "", fenced)
        candidates.append(fenced.strip())
    start = value.find("{")
    end = value.rfind("}")
    if start >= 0 and end > start:
        candidates.append(value[start : end + 1])
    return [candidate for index, candidate in enumerate(candidates) if candidate and candidate not in candidates[:index]]


def _repair_json_with_claude(value: str) -> dict | None:
    settings = get_settings()
    if not settings.anthropic_api_key or not value:
        return None
    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 4000,
        "messages": [
            {
                "role": "user",
                "content": (
                    "This JSON is malformed. Fix it and return ONLY valid JSON. "
                    "No explanation needed.\n\n"
                    f"{value[:3000]}"
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
    text_block = ""
    for block in raw.get("content") or []:
        if isinstance(block, dict) and block.get("type") == "text":
            text_block += str(block.get("text") or "")
    for candidate in _json_candidates(text_block):
        try:
            parsed = json.loads(candidate)
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            continue
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

    analysis.setdefault("full_translation", {})
    analysis["full_translation"].setdefault(
        "uzbek",
        "To'liq tarjima tayyorlanmadi. Matnni qayta tahlil qiling yoki aniqroq screenshot yuboring.",
    )
    analysis["full_translation"].setdefault(
        "russian",
        "Полный перевод не был подготовлен. Повторите анализ или загрузите более чёткий скриншот.",
    )

    analysis.setdefault("how_to_approach", {})
    approach = analysis["how_to_approach"]
    approach.setdefault(
        "steps_en",
        [
            "STEP 1: Identify what the passage is mainly doing.",
            "STEP 2: Mark transition words because they show shifts in logic.",
            "STEP 3: For every question, find text evidence before choosing.",
        ],
    )
    approach.setdefault(
        "steps_ru",
        [
            "ШАГ 1: Определите, что в основном делает текст.",
            "ШАГ 2: Отмечайте слова-переходы, потому что они показывают логику.",
            "ШАГ 3: Для каждого вопроса сначала найдите доказательство в тексте.",
        ],
    )
    approach.setdefault(
        "steps_uz",
        [
            "QADAM 1: Matn asosan nima qilayotganini aniqlang.",
            "QADAM 2: O'tish so'zlarini belgilang, ular mantiq o'zgarishini ko'rsatadi.",
            "QADAM 3: Har bir savolda avval matndan dalil toping.",
        ],
    )
    approach.setdefault("time_management_en", analysis["sat_strategy"].get("time_tip_en") or "Spend 4-5 minutes reading and about 1 minute per question.")
    approach.setdefault("time_management_ru", analysis["sat_strategy"].get("time_tip_ru") or "Тратьте 4-5 минут на чтение и около 1 минуты на вопрос.")
    approach.setdefault("time_management_uz", analysis["sat_strategy"].get("time_tip_uz") or "O'qishga 4-5 daqiqa va har savolga taxminan 1 daqiqa ajrating.")
    approach.setdefault(
        "common_traps_en",
        ["Extreme wording", "Answer not mentioned in the passage", "Opposite meaning", "Partly true but incomplete"],
    )
    approach.setdefault(
        "common_traps_ru",
        ["Слишком категоричная формулировка", "Ответ не упомянут в тексте", "Противоположный смысл", "Частично верно, но неполно"],
    )
    approach.setdefault(
        "common_traps_uz",
        ["Juda keskin so'zlar", "Matnda aytilmagan javob", "Teskari ma'no", "Qisman to'g'ri, lekin to'liq emas"],
    )

    analysis.setdefault("practice_questions", [])
    if isinstance(analysis["practice_questions"], list):
        for question in analysis["practice_questions"]:
            if isinstance(question, dict):
                legacy = question.get("explanation") or "The correct answer is supported by the passage."
                question.setdefault("explanation_uz", legacy)
                question.setdefault("explanation_ru", legacy)
                question.setdefault("explanation_en", legacy)
                question.setdefault("question_type", "Main Idea")
    analysis["questions_solved"] = _normalize_questions_solved(analysis)
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


def _normalize_questions_solved(analysis: dict) -> list[dict]:
    raw_questions = analysis.get("questions_solved")
    if not isinstance(raw_questions, list) or not raw_questions:
        raw_questions = analysis.get("practice_questions") if isinstance(analysis.get("practice_questions"), list) else []

    normalized: list[dict] = []
    for index, item in enumerate(raw_questions if isinstance(raw_questions, list) else [], start=1):
        if not isinstance(item, dict):
            continue
        options = item.get("options") if isinstance(item.get("options"), dict) else {}
        options = {letter: str(options.get(letter) or "") for letter in ("A", "B", "C", "D")}
        correct = str(item.get("correct_answer") or item.get("correct") or "B").strip().upper()[:1] or "B"
        evidence = str(item.get("evidence_line") or item.get("evidence") or "Use the sentence in the passage that directly supports the answer.")
        explanation_en = str(item.get("why_correct_en") or item.get("explanation_en") or item.get("explanation") or f"{correct} is correct because it is supported by the passage.")
        explanation_ru = str(item.get("why_correct_ru") or item.get("explanation_ru") or explanation_en)
        explanation_uz = str(item.get("why_correct_uz") or item.get("explanation_uz") or explanation_en)
        question_text = str(item.get("question_text") or item.get("question") or "Which choice is best supported by the passage?")
        question_type = str(item.get("question_type") or "Main Idea")

        normalized.append(
            {
                "question_number": int(item.get("question_number") or index),
                "question_text": question_text,
                "question_text_ru": str(item.get("question_text_ru") or question_text),
                "question_text_uz": str(item.get("question_text_uz") or question_text),
                "options": options,
                "options_ru": _normalize_option_map(item.get("options_ru"), options),
                "options_uz": _normalize_option_map(item.get("options_uz"), options),
                "correct_answer": correct,
                "thinking_process_en": str(
                    item.get("thinking_process_en")
                    or f"First identify what the question asks. Then locate the evidence in the passage. The quoted evidence points to {correct}, so that answer is the safest SAT choice."
                ),
                "thinking_process_ru": str(
                    item.get("thinking_process_ru")
                    or f"Сначала определите, что спрашивает вопрос. Затем найдите доказательство в тексте. Цитата указывает на {correct}, поэтому это самый безопасный выбор."
                ),
                "thinking_process_uz": str(
                    item.get("thinking_process_uz")
                    or f"Avval savol nimani so'rayotganini aniqlang. Keyin matndan dalil toping. Dalil {correct} javobini ko'rsatadi, shuning uchun bu eng xavfsiz SAT tanlovi."
                ),
                "why_correct_en": explanation_en,
                "why_correct_ru": explanation_ru,
                "why_correct_uz": explanation_uz,
                "why_wrong_en": _normalize_wrong_map(item.get("why_wrong_en"), correct, "This choice is not directly supported by the evidence."),
                "why_wrong_ru": _normalize_wrong_map(item.get("why_wrong_ru"), correct, "Этот вариант не подтверждается прямо текстом."),
                "why_wrong_uz": _normalize_wrong_map(item.get("why_wrong_uz"), correct, "Bu variant matndagi dalil bilan bevosita tasdiqlanmaydi."),
                "evidence_line": evidence,
                "question_type": question_type,
                "difficulty": str(item.get("difficulty") or analysis.get("difficulty") or "Medium"),
                "tip_en": str(item.get("tip_en") or f"For {question_type} questions, prove the answer with one exact phrase from the passage."),
                "tip_ru": str(item.get("tip_ru") or f"Для вопросов типа {question_type} подтверждайте ответ точной фразой из текста."),
                "tip_uz": str(item.get("tip_uz") or f"{question_type} savollarida javobni matndagi aniq ibora bilan isbotlang."),
            }
        )
    return normalized


def _normalize_option_map(value: object, fallback: dict[str, str]) -> dict[str, str]:
    source = value if isinstance(value, dict) else fallback
    return {letter: str(source.get(letter) or fallback.get(letter) or "") for letter in ("A", "B", "C", "D")}


def _normalize_wrong_map(value: object, correct: str, fallback: str) -> dict[str, str]:
    source = value if isinstance(value, dict) else {}
    return {letter: str(source.get(letter) or fallback) for letter in ("A", "B", "C", "D") if letter != correct}


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
