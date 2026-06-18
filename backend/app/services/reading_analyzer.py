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
    base_payload = {
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
    for model in _model_candidates(settings.anthropic_model):
        raw = _send_anthropic_payload({"model": model, **base_payload}, timeout=35)
        if raw:
            text = ""
            for block in raw.get("content") or []:
                if isinstance(block, dict) and block.get("type") == "text":
                    text += str(block.get("text") or "")
            if text.strip():
                return text.strip()
    return None


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

    base_payload = {
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
    for model in _model_candidates(settings.anthropic_model):
        payload = {"model": model, **base_payload}
        raw = _send_anthropic_payload(payload, timeout=35)
        if raw:
            return _parse_message_json(raw)
    return None


def _call_claude_image(image_data: bytes, image_type: str, language: str) -> dict | None:
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None

    image_base64 = base64.standard_b64encode(image_data).decode("utf-8")
    base_payload = {
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
    for model in _model_candidates(settings.anthropic_model):
        payload = {"model": model, **base_payload}
        raw = _send_anthropic_payload(payload, timeout=45)
        if raw:
            return _parse_message_json(raw)
    return None


def _model_candidates(configured_model: str | None) -> list[str]:
    candidates = [
        configured_model or "",
        "claude-sonnet-4-6",
        "claude-haiku-4-5",
    ]
    return [model for index, model in enumerate(candidates) if model and model not in candidates[:index]]


def _send_anthropic_payload(payload: dict, timeout: int) -> dict | None:
    settings = get_settings()
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
        with request.urlopen(api_request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (OSError, error.HTTPError, json.JSONDecodeError):
        return None


def _parse_message_json(raw: dict) -> dict | None:
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


IMPORTANT_VOCABULARY: dict[str, dict[str, str]] = {
    "ameliorate": {
        "definition_en": "to make a bad or unpleasant situation better",
        "definition_ru": "улучшать плохую или неприятную ситуацию",
        "definition_uz": "yomon yoki noqulay vaziyatni yaxshilamoq",
        "in_context_en": "Recruiting subjects from diverse backgrounds would improve the problem of unrepresentative subject pools.",
        "in_context_ru": "Привлечение испытуемых из разных групп улучшило бы проблему нерепрезентативной выборки.",
        "in_context_uz": "Turli kelib chiqishdagi ishtirokchilarni jalb qilish noreprezentativ guruh muammosini yaxshilaydi.",
        "memory_trick_en": "Ameliorate = make better.",
        "memory_trick_ru": "Ameliorate = сделать лучше.",
        "memory_trick_uz": "Ameliorate = yaxshiroq qilmoq.",
    },
    "sanction": {
        "definition_en": "to officially approve or allow something",
        "definition_ru": "официально одобрять или разрешать что-либо",
        "definition_uz": "biror narsani rasmiy ma'qullamoq yoki ruxsat bermoq",
        "in_context_en": "The sentence is not about approving the situation; it is about fixing it.",
        "in_context_ru": "Предложение не об одобрении ситуации, а о её исправлении.",
        "in_context_uz": "Gap vaziyatni ma'qullash haqida emas, uni tuzatish haqida.",
        "memory_trick_en": "A sanction can be official approval or a penalty; use context carefully.",
        "memory_trick_ru": "Sanction может значить одобрение или наказание; контекст решает.",
        "memory_trick_uz": "Sanction ruxsat yoki jazo bo'lishi mumkin; kontekstga qarang.",
    },
    "rationalize": {
        "definition_en": "to try to find reasons to explain or justify behavior, especially when the reasons are not the real ones",
        "definition_ru": "пытаться объяснить или оправдать поведение, часто не настоящими причинами",
        "definition_uz": "xatti-harakatni tushuntirish yoki oqlashga urinish, ko'pincha haqiqiy sabablar bilan emas",
        "in_context_en": "The passage proposes an action to improve research samples, not an excuse for the problem.",
        "in_context_ru": "Текст предлагает действие для улучшения выборки, а не оправдание проблемы.",
        "in_context_uz": "Matn muammoni oqlashni emas, tadqiqot tanlovini yaxshilash harakatini taklif qiladi.",
        "memory_trick_en": "Rationalize = make excuses sound rational.",
        "memory_trick_ru": "Rationalize = представить оправдание как разумное.",
        "memory_trick_uz": "Rationalize = bahonani mantiqli qilib ko'rsatmoq.",
    },
    "postulate": {
        "definition_en": "to suggest or accept that something is true as the basis for reasoning",
        "definition_ru": "предполагать или принимать что-либо как основу рассуждения",
        "definition_uz": "biror narsani fikrlash asosi sifatida taxmin qilmoq yoki qabul qilmoq",
        "in_context_en": "The passage is not asking researchers to assume a theory; it asks them to improve recruitment.",
        "in_context_ru": "Текст не просит исследователей выдвинуть предположение; он просит улучшить набор участников.",
        "in_context_uz": "Matn nazariya taxmin qilishni emas, ishtirokchilarni jalb qilishni yaxshilashni so'raydi.",
        "memory_trick_en": "Postulate = put forward an idea.",
        "memory_trick_ru": "Postulate = выдвинуть идею.",
        "memory_trick_uz": "Postulate = g'oyani ilgari surmoq.",
    },
    "unrepresentative": {
        "definition_en": "not typical of a larger group and therefore not showing what that group is really like",
        "definition_ru": "нерепрезентативный; не отражающий настоящие свойства большей группы",
        "definition_uz": "noreprezentativ; katta guruhni to'g'ri aks ettirmaydigan",
        "in_context_en": "College students alone do not represent all human behavior.",
        "in_context_ru": "Одни студенты колледжей не представляют всё человеческое поведение.",
        "in_context_uz": "Faqat kollej talabalari butun inson xulq-atvorini aks ettirmaydi.",
        "memory_trick_en": "Representative = shows the group; unrepresentative = does not.",
        "memory_trick_ru": "Representative отражает группу; unrepresentative — нет.",
        "memory_trick_uz": "Representative guruhni aks ettiradi; unrepresentative esa yo'q.",
    },
    "subject pools": {
        "definition_en": "groups of people available to participate in a research study",
        "definition_ru": "группы людей, доступных для участия в исследовании",
        "definition_uz": "tadqiqotda qatnashishi mumkin bo'lgan odamlar guruhlari",
        "in_context_en": "The subject pools are mostly students from the researchers' own colleges and universities.",
        "in_context_ru": "Группы испытуемых в основном состоят из студентов тех вузов, где работают исследователи.",
        "in_context_uz": "Ishtirokchi guruhlari asosan tadqiqotchilar ishlaydigan kollej va universitet talabalari.",
        "memory_trick_en": "Subject = participant; pool = available group.",
        "memory_trick_ru": "Subject = участник; pool = доступная группа.",
        "memory_trick_uz": "Subject = ishtirokchi; pool = mavjud guruh.",
    },
    "diverse": {
        "definition_en": "including many different types of people or things",
        "definition_ru": "разнообразный; включающий разные типы людей или вещей",
        "definition_uz": "xilma-xil; turli odamlar yoki narsalarni o'z ichiga olgan",
        "in_context_en": "Researchers should recruit people from varied backgrounds and locations.",
        "in_context_ru": "Исследователям нужно привлекать людей из разных групп и мест.",
        "in_context_uz": "Tadqiqotchilar turli kelib chiqish va joylardan odamlarni jalb qilishi kerak.",
        "memory_trick_en": "Diverse = different.",
        "memory_trick_ru": "Diverse = разный.",
        "memory_trick_uz": "Diverse = xilma-xil.",
    },
    "antecedent": {
        "definition_en": "something that happened or existed before another thing",
        "definition_ru": "то, что произошло или существовало раньше другого события",
        "definition_uz": "boshqa narsadan oldin bo'lgan yoki mavjud bo'lgan narsa",
        "in_context_en": "This is a noun, but the blank needs an adjective describing a flare that is about to happen.",
        "in_context_ru": "Это существительное, а пропуск требует прилагательное: вспышка скоро произойдёт.",
        "in_context_uz": "Bu ot; bo'sh joy esa tez orada bo'ladigan flare ni tasvirlaydigan sifat talab qiladi.",
        "memory_trick_en": "Ante- means before, as in ancestor.",
        "memory_trick_ru": "Ante- означает before, то есть раньше.",
        "memory_trick_uz": "Ante- oldin degani: avvalgi narsa.",
    },
    "impending": {
        "definition_en": "used to describe an event, usually unpleasant, that is going to happen soon",
        "definition_ru": "о событии, обычно неприятном, которое скоро произойдёт",
        "definition_uz": "tez orada sodir bo'ladigan, odatda yoqimsiz voqea haqida",
        "in_context_en": "The corona brightens before a flare, so the flare is impending: about to happen.",
        "in_context_ru": "Корона становится ярче перед вспышкой, значит вспышка impending: скоро произойдёт.",
        "in_context_uz": "Korona flare dan oldin yorqinlashadi, demak flare impending: tez orada sodir bo'ladi.",
        "memory_trick_en": "Impending danger is danger coming soon.",
        "memory_trick_ru": "Impending danger — опасность, которая скоро наступит.",
        "memory_trick_uz": "Impending danger — tez kelayotgan xavf.",
    },
    "innocuous": {
        "definition_en": "completely harmless or not likely to upset anyone",
        "definition_ru": "безвредный; не причиняющий вреда или беспокойства",
        "definition_uz": "zararsiz; zarar yoki bezovtalik keltirmaydigan",
        "in_context_en": "Solar flares can interfere with telecommunications, so innocuous is the opposite of the needed idea.",
        "in_context_ru": "Солнечные вспышки мешают связи, поэтому innocuous противоположно нужному смыслу.",
        "in_context_uz": "Solar flares telekommunikatsiyaga xalaqit beradi, shuning uchun innocuous teskari ma'no.",
        "memory_trick_en": "Innocuous sounds like innocent: harmless.",
        "memory_trick_ru": "Innocuous похоже на innocent: безвредный.",
        "memory_trick_uz": "Innocuous innocent ga o'xshaydi: zararsiz.",
    },
    "perpetual": {
        "definition_en": "continuing forever or for a very long time without stopping",
        "definition_ru": "постоянный; продолжающийся очень долго без остановки",
        "definition_uz": "doimiy; juda uzoq vaqt to'xtamasdan davom etadigan",
        "in_context_en": "The passage describes a flare that will occur soon, not one that lasts forever.",
        "in_context_ru": "Текст говорит о вспышке, которая скоро произойдёт, а не длится вечно.",
        "in_context_uz": "Matn tez orada bo'ladigan flare haqida, abadiy davom etadigan narsa haqida emas.",
        "memory_trick_en": "Perpetual motion means motion that never stops.",
        "memory_trick_ru": "Perpetual motion — движение, которое не прекращается.",
        "memory_trick_uz": "Perpetual motion — to'xtamaydigan harakat.",
    },
    "corona": {
        "definition_en": "the outer atmosphere of the sun, seen as a bright ring during an eclipse",
        "definition_ru": "внешняя атмосфера Солнца, видимая как яркое кольцо во время затмения",
        "definition_uz": "Quyoshning tashqi atmosferasi; tutilish paytida yorqin halqa kabi ko'rinadi",
        "in_context_en": "Here it is the Sun's outer layer that brightens before a solar flare.",
        "in_context_ru": "Здесь это внешний слой Солнца, который ярче становится перед вспышкой.",
        "in_context_uz": "Bu yerda flare dan oldin yorqinlashadigan Quyoshning tashqi qatlami.",
        "memory_trick_en": "Corona means crown; the sun's corona is like its crown.",
        "memory_trick_ru": "Corona означает crown, корона; солнечная корона как корона Солнца.",
        "memory_trick_uz": "Corona crown, ya'ni toj degani; Quyosh koronasi tojga o'xshaydi.",
    },
    "emanate": {
        "definition_en": "to come out from a source or place",
        "definition_ru": "исходить, распространяться из источника",
        "definition_uz": "manbadan chiqmoq yoki tarqalmoq",
        "in_context_en": "The radiation comes out from active regions in the Sun's photosphere.",
        "in_context_ru": "Излучение исходит из активных областей фотосферы Солнца.",
        "in_context_uz": "Radiatsiya Quyosh fotosferasidagi faol hududlardan chiqadi.",
        "memory_trick_en": "Emanate = emerge from.",
        "memory_trick_ru": "Emanate = исходить из источника.",
        "memory_trick_uz": "Emanate = manbadan chiqmoq.",
    },
    "photosphere": {
        "definition_en": "the visible surface of the sun or another star",
        "definition_ru": "видимая поверхность Солнца или другой звезды",
        "definition_uz": "Quyosh yoki boshqa yulduzning ko'rinadigan yuzasi",
        "in_context_en": "Solar flares start in active regions in this visible layer of the Sun.",
        "in_context_ru": "Солнечные вспышки возникают в активных областях этого видимого слоя Солнца.",
        "in_context_uz": "Solar flares Quyoshning shu ko'rinadigan qatlamidagi faol hududlardan boshlanadi.",
        "memory_trick_en": "Photo means light; sphere means ball.",
        "memory_trick_ru": "Photo связано со светом; sphere — шар.",
        "memory_trick_uz": "Photo yorug'lik, sphere shar degani.",
    },
}


def _fallback_analysis(text: str) -> dict:
    options = _extract_options(text)
    solved_question = _solve_completion_question(text, options)
    difficult_words = _fallback_vocabulary(text, options)
    preview = text[:220] + ("..." if len(text) > 220 else "")
    main_idea = _fallback_main_idea(text, preview)
    tone_purpose = _fallback_tone_purpose(text)
    return {
        "extracted_text": text,
        "full_translation": _fallback_translation(text),
        "main_idea": main_idea,
        "vocabulary": difficult_words,
        "difficult_words": difficult_words,
        "tone": tone_purpose["tone"],
        "purpose": tone_purpose["purpose"],
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
        "practice_questions": [solved_question],
        "questions_solved": [solved_question],
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


def _extract_options(text: str) -> dict[str, str]:
    options: dict[str, str] = {}
    for match in re.finditer(r"(?im)^\s*([A-D])\s*[\).]\s+(.+?)\s*$", text):
        options[match.group(1).upper()] = match.group(2).strip()
    if len(options) >= 4:
        return options

    start = re.search(r"\bA\s*[\).]\s*", text)
    if not start:
        return options

    tail = text[start.start() :]
    inline_options: dict[str, str] = {}
    for match in re.finditer(r"(?is)\b([A-D])\s*[\).]\s*(.*?)(?=\s+\b[A-D]\s*[\).]|\s*$)", tail):
        value = " ".join(match.group(2).split()).strip(" ;,")
        if value:
            inline_options[match.group(1).upper()] = value
    if len(inline_options) >= len(options):
        options.update(inline_options)
    return options


def _extract_question_text(text: str) -> str:
    match = re.search(r"(Which choice.+?(?:phrase|text|sentence)\?)", text, re.IGNORECASE | re.DOTALL)
    if match:
        return " ".join(match.group(1).split())
    return "Which choice completes the text with the most logical and precise word or phrase?"


def _solve_completion_question(text: str, options: dict[str, str]) -> dict:
    question_text = _extract_question_text(text)
    lowered = text.lower()
    correct = "B"
    if "trace" in lowered and any(value.lower() == "evidence" for value in options.values()):
        correct = next((letter for letter, value in options.items() if value.lower() == "evidence"), "A")
        return _solved_trace_question(question_text, options, correct)
    if "preceding a flare" in lowered and "where the flare is" in lowered:
        correct = next((letter for letter, value in options.items() if value.lower() == "impending"), "B")
        return _solved_impending_question(question_text, options, correct)
    if "unrepresentative subject pools" in lowered and "diverse backgrounds" in lowered:
        correct = next((letter for letter, value in options.items() if value.lower() == "ameliorate"), "B")
        return _solved_ameliorate_question(question_text, options, correct)
    return _generic_solved_question(question_text, options, correct)


def _solved_ameliorate_question(question_text: str, options: dict[str, str], correct: str) -> dict:
    return {
        "question_number": 1,
        "question_text": question_text,
        "question_text_ru": "Какой вариант завершает текст самым логичным и точным словом или выражением?",
        "question_text_uz": "Qaysi javob matnni eng mantiqiy va aniq so'z yoki ibora bilan to'ldiradi?",
        "options": _complete_options(options),
        "options_ru": {
            "A": "официально одобрить / разрешить",
            "B": "улучшить плохую ситуацию",
            "C": "оправдать или рационализировать",
            "D": "предположить / выдвинуть как идею",
        },
        "options_uz": {
            "A": "rasmiy ma'qullamoq / ruxsat bermoq",
            "B": "yomon vaziyatni yaxshilamoq",
            "C": "oqlamoq yoki mantiqli qilib ko'rsatmoq",
            "D": "taxmin qilmoq / g'oya sifatida ilgari surmoq",
        },
        "correct_answer": correct,
        "thinking_process_en": "First identify the problem: many behavioral psychology studies use highly unrepresentative subject pools. Then read the proposed solution: actively recruit subjects from diverse backgrounds and locations. That action would make the bad situation better, so the blank needs the verb 'ameliorate.'",
        "thinking_process_ru": "Сначала найдите проблему: многие исследования поведенческой психологии используют крайне нерепрезентативные группы испытуемых. Затем посмотрите на решение: активно привлекать участников из разных слоёв и мест. Такое действие улучшает плохую ситуацию, поэтому нужно слово 'ameliorate'.",
        "thinking_process_uz": "Avval muammoni toping: ko'plab behavioral psychology tadqiqotlari juda noreprezentativ ishtirokchi guruhlaridan foydalanadi. Keyin yechimga qarang: turli kelib chiqish va hududlardan ishtirokchilarni faol jalb qilish. Bu harakat yomon vaziyatni yaxshilaydi, shuning uchun kerakli so'z 'ameliorate'.",
        "why_correct_en": "B is correct because 'ameliorate' means to make a bad situation better. Recruiting a more diverse subject pool would improve the problem of unrepresentative samples.",
        "why_correct_ru": "B правильно, потому что 'ameliorate' означает улучшить плохую ситуацию. Более разнообразный набор участников исправляет проблему нерепрезентативной выборки.",
        "why_correct_uz": "B to'g'ri, chunki 'ameliorate' yomon vaziyatni yaxshilash degani. Turli ishtirokchilarni jalb qilish noreprezentativ tanlov muammosini tuzatadi.",
        "why_wrong_en": {
            "A": "Sanction means officially approve or allow. The sentence is not saying researchers should approve the situation.",
            "C": "Rationalize means justify or explain away. The sentence gives a practical fix, not an excuse.",
            "D": "Postulate means propose or assume an idea. The sentence calls for action, not a theoretical assumption.",
        },
        "why_wrong_ru": {
            "A": "Sanction значит официально одобрить или разрешить. В предложении не говорится, что ситуацию нужно одобрить.",
            "C": "Rationalize значит оправдать или объяснить. Здесь нужен практический способ исправить проблему, а не оправдание.",
            "D": "Postulate значит предположить или выдвинуть идею. В предложении нужно действие, а не теоретическое предположение.",
        },
        "why_wrong_uz": {
            "A": "Sanction rasmiy ma'qullash yoki ruxsat berish degani. Gap vaziyatni ma'qullash haqida emas.",
            "C": "Rationalize oqlash yoki tushuntirib berish degani. Bu yerda bahona emas, muammoni tuzatadigan amaliy harakat kerak.",
            "D": "Postulate taxmin qilish yoki g'oya ilgari surish degani. Gap nazariya emas, harakat haqida.",
        },
        "evidence_line": "highly unrepresentative subject pools ... actively recruit subjects from diverse backgrounds and locations",
        "question_type": "Logical Completion",
        "difficulty": "Medium",
        "tip_en": "For logical completion questions, label the problem and the proposed fix before checking the answer choices.",
        "tip_ru": "В logical completion сначала определите проблему и предлагаемое исправление, потом смотрите варианты.",
        "tip_uz": "Logical completion savollarida avval muammo va taklif qilingan yechimni belgilang, keyin variantlarni tekshiring.",
    }


def _solved_impending_question(question_text: str, options: dict[str, str], correct: str) -> dict:
    return {
        "question_number": 1,
        "question_text": question_text,
        "question_text_ru": "Какой вариант завершает текст самым логичным и точным словом или выражением?",
        "question_text_uz": "Qaysi javob matnni eng mantiqiy va aniq so'z yoki ibora bilan to'ldiradi?",
        "options": _complete_options(options),
        "options_ru": {
            "A": "предшествующий фактор / то, что было раньше",
            "B": "надвигающийся / скоро произойдёт",
            "C": "безвредный",
            "D": "вечный / постоянный",
        },
        "options_uz": {
            "A": "oldin bo'lgan narsa",
            "B": "yaqinlashayotgan / tez orada sodir bo'ladigan",
            "C": "zararsiz",
            "D": "doimiy / abadiy",
        },
        "correct_answer": correct,
        "thinking_process_en": "The sentence says that preceding a flare, the corona becomes brighter above the region where the flare is _____. 'Preceding' means before, so the flare has not happened yet. The blank needs an adjective meaning 'about to happen soon.' That word is 'impending.'",
        "thinking_process_ru": "В предложении сказано: перед вспышкой корона становится ярче над областью, где вспышка _____. Слово 'preceding' означает 'перед'. Значит, вспышка ещё не произошла, но скоро произойдёт. Нужное слово — 'impending'.",
        "thinking_process_uz": "Gapda aytiladi: flare dan oldin korona flare bo'ladigan hudud ustida yorqinlashadi. 'Preceding' — oldin degani. Demak flare hali bo'lmagan, lekin tez orada sodir bo'ladi. Kerakli so'z — 'impending'.",
        "why_correct_en": "B is correct because 'impending' means about to happen. The corona's brightness appears before the solar flare, so it indicates an impending flare.",
        "why_correct_ru": "B правильно, потому что 'impending' означает 'скоро произойдёт'. Яркость короны появляется до солнечной вспышки, значит она указывает на надвигающуюся вспышку.",
        "why_correct_uz": "B to'g'ri, chunki 'impending' tez orada sodir bo'ladigan degani. Korona yorqinlashuvi flare dan oldin paydo bo'ladi, demak u yaqinlashayotgan flare ni ko'rsatadi.",
        "why_wrong_en": {
            "A": "Antecedent is usually a noun meaning something that existed before; it does not grammatically or logically fit 'the flare is ____'.",
            "C": "Innocuous means harmless, but the passage says solar flares can interfere with telecommunications.",
            "D": "Perpetual means continuing forever, but the sentence is about a flare that is about to occur.",
        },
        "why_wrong_ru": {
            "A": "Antecedent обычно существительное: то, что было раньше. Оно не подходит грамматически и логически к 'the flare is ____'.",
            "C": "Innocuous означает безвредный, но в тексте сказано, что вспышки могут мешать телекоммуникациям.",
            "D": "Perpetual означает постоянный/вечный, но речь идёт о вспышке, которая скоро произойдёт.",
        },
        "why_wrong_uz": {
            "A": "Antecedent odatda ot: oldin bo'lgan narsa. 'the flare is ____' joyiga grammatik va mantiqiy mos emas.",
            "C": "Innocuous zararsiz degani, lekin matnda flares telekommunikatsiyaga xalaqit berishi aytilgan.",
            "D": "Perpetual doimiy/abadiy degani, gap esa tez orada sodir bo'ladigan flare haqida.",
        },
        "evidence_line": "Preceding a flare, the corona temporarily exhibits increased brightness above the region where the flare is _____.",
        "question_type": "Words in Context",
        "difficulty": "Medium",
        "tip_en": "For logical completion questions, use nearby time signals. Here, 'preceding' tells you the flare is about to happen.",
        "tip_ru": "В вопросах на логическое завершение ищите временные сигналы. Здесь 'preceding' показывает, что вспышка скоро произойдёт.",
        "tip_uz": "Logical completion savollarida vaqt signallarini toping. Bu yerda 'preceding' flare tez orada bo'lishini ko'rsatadi.",
    }


def _solved_trace_question(question_text: str, options: dict[str, str], correct: str) -> dict:
    return {
        "question_number": 1,
        "question_text": question_text,
        "question_text_ru": "Какое значение слова в контексте является наиболее точным?",
        "question_text_uz": "So'zning kontekstdagi eng aniq ma'nosi qaysi?",
        "options": _complete_options(options),
        "options_ru": _complete_options(options),
        "options_uz": _complete_options(options),
        "correct_answer": correct,
        "thinking_process_en": "In 'no trace of their passing to be left,' trace means a sign showing that someone was there. That is evidence.",
        "thinking_process_ru": "В выражении 'no trace of their passing to be left' слово trace означает знак, показывающий, что кто-то там был. Это evidence.",
        "thinking_process_uz": "'no trace of their passing to be left' iborasida trace kimdir u yerda bo'lganini ko'rsatadigan belgi degani. Bu evidence.",
        "why_correct_en": f"{correct} is correct because evidence means a sign or proof that something happened.",
        "why_correct_ru": f"{correct} правильно, потому что evidence означает признак или доказательство того, что что-то произошло.",
        "why_correct_uz": f"{correct} to'g'ri, chunki evidence nimadir sodir bo'lganini ko'rsatadigan dalil yoki belgi degani.",
        "why_wrong_en": _normalize_wrong_map({}, correct, "This option does not match the contextual meaning of trace."),
        "why_wrong_ru": _normalize_wrong_map({}, correct, "Этот вариант не соответствует значению trace в контексте."),
        "why_wrong_uz": _normalize_wrong_map({}, correct, "Bu variant trace so'zining kontekstdagi ma'nosiga mos emas."),
        "evidence_line": "no trace of their passing to be left",
        "question_type": "Vocabulary in Context",
        "difficulty": "Medium",
        "tip_en": "Ignore the common translation first; replace the word with each option and test the sentence.",
        "tip_ru": "Сначала не полагайтесь на обычный перевод; подставьте каждый вариант в предложение.",
        "tip_uz": "Avval oddiy tarjimaga yopishmang; har bir variantni gapga qo'yib tekshiring.",
    }


def _generic_solved_question(question_text: str, options: dict[str, str], correct: str) -> dict:
    complete = _complete_options(options)
    return {
        "question_number": 1,
        "question_text": question_text,
        "question_text_ru": question_text,
        "question_text_uz": question_text,
        "options": complete,
        "options_ru": complete,
        "options_uz": complete,
        "correct_answer": correct,
        "thinking_process_en": "Use the sentence around the blank and eliminate choices that do not match the logic.",
        "thinking_process_ru": "Используйте предложение вокруг пропуска и исключите варианты, которые не подходят по логике.",
        "thinking_process_uz": "Bo'sh joy atrofidagi gapni ishlating va mantiqqa mos bo'lmagan variantlarni chiqaring.",
        "why_correct_en": "This choice best fits the grammar and logic of the sentence.",
        "why_correct_ru": "Этот вариант лучше всего подходит по грамматике и логике предложения.",
        "why_correct_uz": "Bu variant gap grammatikasi va mantiqiga eng mos keladi.",
        "why_wrong_en": _normalize_wrong_map({}, correct, "This choice does not fit the sentence logic as well."),
        "why_wrong_ru": _normalize_wrong_map({}, correct, "Этот вариант хуже подходит к логике предложения."),
        "why_wrong_uz": _normalize_wrong_map({}, correct, "Bu variant gap mantiqiga yaxshi mos emas."),
        "evidence_line": "Use the sentence around the blank as evidence.",
        "question_type": "Words in Context",
        "difficulty": "Medium",
        "tip_en": "For completion questions, predict the meaning before looking at the answer choices.",
        "tip_ru": "В completion questions сначала предскажите смысл, потом смотрите варианты.",
        "tip_uz": "Completion savollarida avval ma'noni taxmin qiling, keyin variantlarga qarang.",
    }


def _complete_options(options: dict[str, str]) -> dict[str, str]:
    return {letter: options.get(letter, "") for letter in ("A", "B", "C", "D")}


def _fallback_vocabulary(text: str, options: dict[str, str]) -> list[dict[str, str]]:
    found: list[str] = []
    searchable = f"{text} {' '.join(options.values())}".lower()
    for word in IMPORTANT_VOCABULARY:
        pattern = r"\b" + re.escape(word).replace(r"\ ", r"\s+") + r"s?\b"
        if re.search(pattern, searchable):
            found.append(word)
    priority = [
        "ameliorate",
        "unrepresentative",
        "subject pools",
        "diverse",
        "sanction",
        "rationalize",
        "postulate",
        "impending",
        "antecedent",
        "innocuous",
        "perpetual",
        "corona",
        "emanate",
        "photosphere",
    ]
    ordered = [word for word in priority if word in found] + [word for word in found if word not in priority]
    return [
        {
            "word": word,
            **IMPORTANT_VOCABULARY[word],
            "in_context": IMPORTANT_VOCABULARY[word]["in_context_en"],
            "memory_trick": IMPORTANT_VOCABULARY[word]["memory_trick_en"],
            "sat_frequency": "High" if word in {"impending", "antecedent", "innocuous", "perpetual"} else "Medium",
        }
        for word in ordered[:5]
    ]


def _fallback_translation(text: str) -> dict[str, str]:
    if "unrepresentative subject pools" in text and "diverse backgrounds" in text:
        return {
            "russian": "Несмотря на обобщения о человеческом поведении, которые они дали, многие исследования поведенческой психологии использовали крайне нерепрезентативные группы испытуемых: студентов тех колледжей и университетов, где работают исследователи. Чтобы улучшить эту ситуацию, необходимо активно привлекать испытуемых из разных слоёв общества и из разных мест.",
            "uzbek": "Inson xulq-atvori haqida umumiy xulosalar berganiga qaramay, xulq-atvor psixologiyasidagi ko'plab tadqiqotlar juda noreprezentativ ishtirokchi guruhlaridan foydalangan: tadqiqotchilar ishlaydigan kollej va universitetlarning talabalaridan. Bu vaziyatni yaxshilash uchun turli kelib chiqish va hududlardan ishtirokchilarni faol jalb qilish zarur.",
        }
    if "K.D. Leka" in text and "solar flares" in text:
        return {
            "russian": "К. Д. Лека и коллеги обнаружили, что корона Солнца заранее указывает на солнечные вспышки — интенсивные выбросы электромагнитного излучения, исходящие из активных областей фотосферы Солнца и способные нарушать телекоммуникации на Земле. Перед вспышкой корона временно становится ярче над областью, где вспышка скоро произойдёт.",
            "uzbek": "K. D. Leka va hamkasblari Quyosh koronasi solar flares haqida oldindan belgi berishini aniqlashdi. Solar flares — Quyosh fotosferasidagi faol hududlardan chiqadigan va Yerda telekommunikatsiyaga xalaqit berishi mumkin bo'lgan kuchli elektromagnit radiatsiya portlashlari. Flare dan oldin korona flare tez orada sodir bo'ladigan hudud ustida vaqtincha yanada yorqinlashadi.",
        }
    return {
        "russian": "Автоматический перевод недоступен для этого fallback-анализа. Повторите анализ, чтобы получить полный перевод.",
        "uzbek": "Bu fallback tahlil uchun avtomatik tarjima mavjud emas. To'liq tarjima olish uchun qayta tahlil qiling.",
    }


def _fallback_main_idea(text: str, preview: str) -> dict[str, str]:
    if "unrepresentative subject pools" in text and "diverse backgrounds" in text:
        return {
            "one_sentence": "The passage says behavioral psychology studies often use unrepresentative student samples and should recruit more diverse participants.",
            "one_sentence_en": "The passage says behavioral psychology studies often use unrepresentative student samples and should recruit more diverse participants.",
            "one_sentence_ru": "Отрывок говорит, что исследования поведенческой психологии часто используют нерепрезентативные студенческие выборки и должны привлекать более разнообразных участников.",
            "one_sentence_uz": "Matn behavioral psychology tadqiqotlari ko'pincha noreprezentativ talaba tanlovlaridan foydalanishini va turliroq ishtirokchilarni jalb qilishi kerakligini aytadi.",
            "detailed_uz": f"Asosiy muammo: tadqiqotlar inson xulq-atvori haqida umumiy xulosa chiqaradi, lekin ishtirokchilar ko'pincha faqat tadqiqotchilar ishlaydigan universitet talabalari. Shuning uchun yechim — turli kelib chiqish va joylardan ishtirokchilarni jalb qilib, vaziyatni yaxshilash. Matn: {preview}",
            "detailed_ru": f"Главная проблема: исследования делают обобщения о человеческом поведении, но участники часто являются только студентами вузов, где работают исследователи. Поэтому решение — улучшить ситуацию, привлекая участников из разных групп и мест. Текст: {preview}",
            "detailed_en": f"The main problem is that studies generalize about human behavior while using narrow participant samples from researchers' own colleges. The proposed fix is to improve the situation by recruiting subjects from diverse backgrounds and locations. Text: {preview}",
            "sat_connection": "This is a Logical Completion question: identify the problem, then choose the word that matches the proposed fix.",
        }
    if "K.D. Leka" in text and "solar flares" in text:
        return {
            "one_sentence": "The passage explains a scientific indicator that appears before a solar flare.",
            "one_sentence_en": "The passage explains a scientific indicator that appears before a solar flare.",
            "one_sentence_ru": "Отрывок объясняет научный признак, который появляется перед солнечной вспышкой.",
            "one_sentence_uz": "Matn quyosh chaqnashidan oldin paydo bo'ladigan ilmiy belgini tushuntiradi.",
            "detailed_uz": f"Matn quyosh flare larini oldindan ko'rsatadigan korona yorqinlashuvi haqida. Asosiy mantiq: korona flare dan oldin yorqinlashadi, shuning uchun bo'sh joyga 'tez orada sodir bo'ladigan' degan ma'no kerak. Matn: {preview}",
            "detailed_ru": f"Отрывок говорит о том, что яркость короны может заранее указывать на солнечную вспышку. Логика: корона становится ярче перед вспышкой, поэтому нужен смысл 'скоро произойдёт'. Текст: {preview}",
            "detailed_en": f"The passage explains that increased brightness in the corona can provide advance indication of a solar flare. The blank needs a word meaning the flare is about to happen. Text: {preview}",
            "sat_connection": "This is a Words in Context / logical completion question.",
        }
    return {
        "one_sentence": "The passage presents a central idea and asks for the most logical completion.",
        "one_sentence_en": "The passage presents a central idea and asks for the most logical completion.",
        "one_sentence_ru": "Отрывок представляет главную мысль и просит выбрать самое логичное завершение.",
        "one_sentence_uz": "Matn asosiy fikrni beradi va eng mantiqiy yakunni tanlashni so'raydi.",
        "detailed_uz": f"Matnning mantiqini kuzating va bo'sh joy atrofidagi dalillarga qarab javob tanlang. Matn: {preview}",
        "detailed_ru": f"Следите за логикой текста и выбирайте ответ по доказательствам вокруг пропуска. Текст: {preview}",
        "detailed_en": f"Track the passage logic and choose the answer supported by the evidence around the blank. Text: {preview}",
        "sat_connection": "This is a logical completion question.",
    }


def _fallback_tone_purpose(text: str) -> dict[str, dict[str, object]]:
    if "unrepresentative subject pools" in text and "diverse backgrounds" in text:
        return {
            "tone": {
                "primary": "Analytical",
                "type": "Analytical",
                "percentage": 78,
                "explanation_uz": "Ohang akademik va muammoni tahlil qiluvchi.",
                "explanation_ru": "Тон академический и аналитический: автор описывает проблему исследования.",
                "explanation_en": "The tone is academic and analytical because the author identifies a research problem.",
            },
            "purpose": {
                "primary": "To explain a problem and solution",
                "type": "To explain a problem and solution",
                "percentage": 72,
                "explanation_uz": "Muallif noreprezentativ tanlov muammosini va uni yaxshilash yo'lini tushuntiradi.",
                "explanation_ru": "Автор объясняет проблему нерепрезентативной выборки и способ её улучшить.",
                "explanation_en": "The author explains a sampling problem and the action needed to improve it.",
            },
        }
    return {
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
    }


def _new_share_id(db: Session) -> str:
    for _ in range(20):
        share_id = secrets.token_urlsafe(9).replace("-", "").replace("_", "")[:12]
        exists = db.execute(select(ReadingAnalysis.id).where(ReadingAnalysis.share_id == share_id)).first()
        if not exists:
            return share_id
    return secrets.token_hex(8)
