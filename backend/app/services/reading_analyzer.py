from __future__ import annotations

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

SYSTEM_PROMPT = """
You are an expert SAT Reading tutor with score 1540.

Analyze the given SAT reading passage or sentence.

Return ONLY valid JSON:
{
  "main_idea": {
    "uzbek": "Simple explanation in Uzbek",
    "russian": "Simple explanation in Russian",
    "english": "Simple explanation in English"
  },
  "difficult_words": [
    {
      "word": "word here",
      "definition_uz": "...",
      "definition_ru": "...",
      "definition_en": "...",
      "example": "..."
    }
  ],
  "tone": {
    "type": "Formal/Informal/Persuasive/Informative",
    "explanation_uz": "...",
    "explanation_ru": "...",
    "explanation_en": "..."
  },
  "purpose": {
    "type": "To inform/persuade/entertain/describe",
    "explanation_uz": "...",
    "explanation_ru": "...",
    "explanation_en": "..."
  },
  "sat_tip": {
    "uzbek": "Specific SAT strategy tip",
    "russian": "Specific SAT strategy tip",
    "english": "Specific SAT strategy tip"
  },
  "practice_questions": [
    {
      "question": "SAT style question",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correct": "B",
      "explanation": "Why B is correct"
    }
  ],
  "difficulty": "Easy/Medium/Hard",
  "passage_type": "Literature/Science/History/Social Science"
}
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
    if len(clean_text) < 20:
        raise ValueError("Passage is too short. Paste at least one full SAT sentence.")
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

    analysis = _call_claude(clean_text, normalized_language) or _fallback_analysis(clean_text)
    analysis = _normalize_analysis(analysis)
    if not is_pro:
        analysis["difficult_words"] = analysis["difficult_words"][:3]
        analysis["practice_questions"] = "LOCKED"

    user.daily_analyses = (user.daily_analyses or 0) + (0 if is_pro else 1)
    user.last_analysis_date = datetime.utcnow()
    user.total_analyses = (user.total_analyses or 0) + 1

    share_id = _new_share_id(db)
    row = ReadingAnalysis(
        user_id=user.id,
        share_id=share_id,
        language=normalized_language,
        source_text=clean_text,
        analysis=analysis,
        is_pro_snapshot=is_pro,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "id": str(row.id),
        "share_id": row.share_id,
        "share_url": f"https://www.sattest.uz/shared/{row.share_id}",
        "is_pro": is_pro,
        "remaining_free": None if is_pro else max(0, FREE_DAILY_ANALYSES - (user.daily_analyses or 0)),
        "analysis": analysis,
        "source_text": clean_text,
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
    }


def _call_claude(text: str, language: str) -> dict | None:
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None

    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 2200,
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
    analysis["main_idea"].setdefault("uzbek", "Passage asosiy fikrni tushuntiradi va muallifning markaziy da'vosini ko'rsatadi.")
    analysis["main_idea"].setdefault("russian", "Отрывок объясняет главную мысль и центральную позицию автора.")
    analysis["main_idea"].setdefault("english", "The passage explains the central idea and the author's main point.")
    analysis.setdefault("difficult_words", [])
    analysis.setdefault("tone", {})
    analysis["tone"].setdefault("type", "Informative")
    analysis["tone"].setdefault("explanation_uz", "Matn rasmiy va tushuntiruvchi ohangda yozilgan.")
    analysis["tone"].setdefault("explanation_ru", "Текст написан в формальном и объяснительном тоне.")
    analysis["tone"].setdefault("explanation_en", "The text uses a formal, explanatory tone.")
    analysis.setdefault("purpose", {})
    analysis["purpose"].setdefault("type", "To inform")
    analysis["purpose"].setdefault("explanation_uz", "Maqsad o'quvchiga g'oya yoki dalilni tushuntirish.")
    analysis["purpose"].setdefault("explanation_ru", "Цель — объяснить читателю идею или аргумент.")
    analysis["purpose"].setdefault("explanation_en", "The purpose is to explain an idea or argument to the reader.")
    analysis.setdefault("sat_tip", {})
    analysis["sat_tip"].setdefault("uzbek", "SAT Readingda avval asosiy da'voni toping, keyin har bir detal shu da'voga qanday xizmat qilishini tekshiring.")
    analysis["sat_tip"].setdefault("russian", "В SAT Reading сначала найдите главную мысль, затем проверьте, как детали поддерживают её.")
    analysis["sat_tip"].setdefault("english", "On SAT Reading, find the main claim first, then check how each detail supports it.")
    analysis.setdefault("practice_questions", [])
    analysis.setdefault("difficulty", "Medium")
    analysis.setdefault("passage_type", "Social Science")
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
        }
        for word in unique_words
    ]
    preview = text[:220] + ("..." if len(text) > 220 else "")
    return {
        "main_idea": {
            "uzbek": f"Bu passage asosiy fikrni dalillar orqali tushuntiradi: {preview}",
            "russian": f"Этот отрывок объясняет главную мысль через детали: {preview}",
            "english": f"This passage develops a central idea through supporting details: {preview}",
        },
        "difficult_words": difficult_words,
        "tone": {
            "type": "Informative",
            "explanation_uz": "Ohang tushuntiruvchi va akademik.",
            "explanation_ru": "Тон объяснительный и академический.",
            "explanation_en": "The tone is explanatory and academic.",
        },
        "purpose": {
            "type": "To inform",
            "explanation_uz": "Muallif mavzuni tushuntirish va asosiy fikrni yetkazishni maqsad qiladi.",
            "explanation_ru": "Автор стремится объяснить тему и передать главную мысль.",
            "explanation_en": "The author aims to explain the topic and communicate a main idea.",
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
            }
        ],
        "difficulty": "Medium",
        "passage_type": "Social Science",
    }


def _new_share_id(db: Session) -> str:
    for _ in range(20):
        share_id = secrets.token_urlsafe(9).replace("-", "").replace("_", "")[:12]
        exists = db.execute(select(ReadingAnalysis.id).where(ReadingAnalysis.share_id == share_id)).first()
        if not exists:
            return share_id
    return secrets.token_hex(8)
