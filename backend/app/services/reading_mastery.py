from __future__ import annotations

import json
import random
from typing import Any

from app.core.config import get_settings
from app.services.reading_analyzer import _model_candidates, _parse_message_json, _send_anthropic_payload

PASS_MISTAKE_LIMIT = 2
CONTENT_SCHEMA_VERSION = "rw_mastery_multilingual_v3"


TYPE_SPECS: dict[str, dict[str, Any]] = {
    "Central Ideas & Details": {
        "uz": "Asosiy g'oyalar va tafsilotlar",
        "skill": "butun matnning bosh fikrini va uni qo'llab-quvvatlovchi tafsilotlarni ajratish",
        "frequency": "har testda bir necha marta",
        "trap": "bitta detalni butun matnning asosiy g'oyasi deb tanlash",
        "strategies": [
            "Avval birinchi va oxirgi gapni tekshiring: SAT ko'pincha asosiy fikrni shu joylarda beradi.",
            "Javob butun matnni qamrashi kerak; faqat bitta misol yoki detal bo'lsa, ehtimol xato.",
            "Juda keng javoblardan qoching: matnda aytilmagan katta xulosani tanlamang.",
            "To'g'ri javob matndagi kamida ikki joy bilan mos kelishi kerak.",
            "⚠️ Tuzoqlar: chiroyli eshitiladigan, lekin matnning faqat yarmini qamraydigan javoblar."
        ],
    },
    "Inferences": {
        "uz": "Xulosa chiqarish",
        "skill": "matnda bevosita aytilmagan, lekin dalil bilan isbotlanadigan xulosani topish",
        "frequency": "deyarli har testda",
        "trap": "matndan tashqariga chiqib, shaxsiy taxmin qilish",
        "strategies": [
            "Xulosa har doim matnga suyanadi; 'menimcha' degan fikr SATda ishlamaydi.",
            "Savoldagi odam, narsa yoki g'oyani matndan topib, atrofidagi gaplarni o'qing.",
            "Javob matndagi dalildan bir qadam narida bo'lishi mumkin, lekin ikki-uch qadam emas.",
            "Juda keskin so'zlar: always, never, only kabi variantlarga ehtiyot bo'ling.",
            "⚠️ Tuzoqlar: mantiqan mumkin, lekin matn bilan isbotlanmagan javoblar."
        ],
    },
    "Command of Evidence (Textual)": {
        "uz": "Matndan dalil topish",
        "skill": "berilgan da'voni eng aniq isbotlaydigan jumla yoki detalni tanlash",
        "frequency": "har testda uchraydi",
        "trap": "mavzuga aloqador, lekin da'voni bevosita isbotlamaydigan dalilni tanlash",
        "strategies": [
            "Avval da'vo nimani isbotlashini aniq ayting.",
            "Keyin har bir variantni savol bilan solishtiring: u dalilmi yoki shunchaki aloqadormi?",
            "Eng yaxshi dalil to'g'ridan-to'g'ri isbotlaydi, aylanib o'tmaydi.",
            "Juda umumiy yoki juda tor quote ko'pincha xato bo'ladi.",
            "⚠️ Tuzoqlar: matndan olingani uchun avtomatik to'g'ri deb o'ylash."
        ],
    },
    "Command of Evidence (Quantitative)": {
        "uz": "Jadval va grafikdan dalil topish",
        "skill": "jadval, grafik yoki raqamli ma'lumotdan aniq dalil chiqarish",
        "frequency": "ko'pincha ma'lumotli matnlarda",
        "trap": "o'q va birliklarni e'tiborsiz qoldirish",
        "strategies": [
            "Avval grafik nomi, o'qlar va birliklarni o'qing.",
            "Savol aniq qaysi data point haqida so'rayotganini belgilang.",
            "Taxmin qilmang: eng yaqin son emas, savolga mos aniq dalil kerak.",
            "Matndagi claim va grafikdagi raqam bir-biriga mos kelishini tekshiring.",
            "⚠️ Tuzoqlar: foiz, son va trendni aralashtirib yuborish."
        ],
    },
    "Words in Context": {
        "uz": "Kontekstdagi so'zlar",
        "skill": "so'zning lug'atdagi birinchi ma'nosini emas, matndagi aniq vazifasini topish",
        "frequency": "har testda 4-5 marta",
        "trap": "eng tanish ma'noni tanlash",
        "strategies": [
            "So'zning ODDIY ma'nosini emas, MATNDAGI ma'nosini qidiring.",
            "Bo'sh joydan oldin va keyingi 2-3 gapni diqqat bilan o'qing.",
            "Har bir variantni gapga qo'yib ko'ring: qaysi biri ma'noni saqlaydi?",
            "Subyekt nima qildi va obyekt bilan qanday munosabatda ekanini toping.",
            "⚠️ Eng katta tuzoq: lug'atdagi birinchi ma'noni tanlash."
        ],
    },
    "Text Structure & Purpose": {
        "uz": "Matn tuzilishi va maqsadi",
        "skill": "muallif matnni qanday tashkil qilganini va nima uchun yozganini tushunish",
        "frequency": "har testda uchraydi",
        "trap": "matn nimani aytayotganini uning vazifasi bilan adashtirish",
        "strategies": [
            "Har gapning vazifasini belgilang: claim, example, contrast, explanation yoki conclusion.",
            "Savol 'what' emas, ko'pincha 'why' haqida bo'ladi.",
            "Matn patternini toping: problem-solution, claim-evidence, compare-contrast.",
            "Javob butun struktura bilan mos bo'lishi kerak.",
            "⚠️ Tuzoqlar: faqat bitta gap vazifasini butun matn vazifasi deb olish."
        ],
    },
    "Cross-Text Connections": {
        "uz": "Ikki matn orasidagi bog'lanish",
        "skill": "ikki qisqa matnning kelishadigan yoki farq qiladigan joyini topish",
        "frequency": "ko'pincha paired text savollarida",
        "trap": "faqat birinchi matnga qarab javob berish",
        "strategies": [
            "Text 1 fikrini bir jumlada yozing, keyin Text 2 fikrini yozing.",
            "Ular rozi, qarshi yoki biri ikkinchisini kengaytiradimi?",
            "Variant har ikkala matnni ham hisobga olishi kerak.",
            "Faqat bitta matnga mos javoblar odatda xato.",
            "⚠️ Tuzoqlar: Text 2 ni shunchaki takror deb o'ylash."
        ],
    },
    "Rhetorical Synthesis": {
        "uz": "Ritorik sintez",
        "skill": "berilgan eslatmalardan maqsadga mos bitta aniq jumla tuzish",
        "frequency": "Writing qismida muntazam",
        "trap": "maqsadni unutib, keraksiz ma'lumot qo'shish",
        "strategies": [
            "Avval student goal ni o'qing: javob aynan shu maqsadga xizmat qilishi kerak.",
            "Eslatmalardan faqat kerakli ma'lumotni oling.",
            "Variant tashqi fakt qo'shsa, uni chiqarib tashlang.",
            "Eng yaxshi javob ixcham va vazifaga mos bo'ladi.",
            "⚠️ Tuzoqlar: barcha eslatmalarni tiqishtirishga urinish."
        ],
    },
    "Transitions": {
        "uz": "O'tish so'zlari",
        "skill": "ikki g'oya orasidagi mantiqiy munosabatga mos transition tanlash",
        "frequency": "har testda ko'p uchraydi",
        "trap": "silliq eshitilgani uchun noto'g'ri yo'nalishdagi so'zni tanlash",
        "strategies": [
            "Blankdan oldingi va keyingi gap munosabatini aniqlang: davommi, qarama-qarshilikmi, sababmi?",
            "Same direction: furthermore, additionally kabi so'zlar.",
            "Contrast: however, nevertheless, despite kabi so'zlar.",
            "Cause/effect: therefore, consequently kabi so'zlar.",
            "⚠️ Tuzoqlar: chiroyli eshitiladi, lekin mantiqiy yo'nalish noto'g'ri."
        ],
    },
    "Boundaries (Punctuation)": {
        "uz": "Tinish belgilari chegaralari",
        "skill": "mustaqil va bog'liq gaplarni to'g'ri tinish belgisi bilan ajratish",
        "frequency": "Standard English qismida muntazam",
        "trap": "ikki mustaqil gap orasiga yolg'iz vergul qo'yish",
        "strategies": [
            "Har ikki tomonda mustaqil gap bormi? Avval shuni tekshiring.",
            "Independent + independent: nuqta, nuqtali vergul yoki comma + FANBOYS kerak.",
            "Yolg'iz comma ikki mustaqil gapni bog'lay olmaydi.",
            "Dependent gap oldin kelsa, ko'pincha comma kerak; keyin kelsa, ko'pincha kerak emas.",
            "⚠️ Eng katta tuzoq: comma splice."
        ],
    },
    "Form, Structure, and Sense": {
        "uz": "Forma, tuzilish va ma'no",
        "skill": "grammatik forma, subject-verb agreement, pronoun va parallel structure ni tekshirish",
        "frequency": "har testda uchraydi",
        "trap": "fe'lni eng yaqin otga moslashtirish",
        "strategies": [
            "Fe'lni eng yaqin so'zga emas, haqiqiy subject ga moslang.",
            "Pronoun qaysi antecedent ga qaytayotganini tekshiring.",
            "Parallel structure bo'lsa, grammatik shakllar bir xil bo'lishi kerak.",
            "Modifier nimani tasvirlayotgan bo'lsa, unga yaqin turishi kerak.",
            "⚠️ Tuzoqlar: uzun modifier subject ni yashirib qo'yadi."
        ],
    },
    "Reserved/Combined Review Unit": {
        "uz": "Umumiy takrorlash bo'limi",
        "skill": "barcha Reading & Writing savol turlarini aralashtirib, haqiqiy test ritmida ishlash",
        "frequency": "yakuniy mustahkamlash uchun",
        "trap": "savol turini aniqlamasdan javob tanlash",
        "strategies": [
            "Har savolda avval savol turini nomlang.",
            "Keyin shu turga mos strategiyani qo'llang.",
            "Dalilsiz javob tanlamang.",
            "Xato variantlarni type-specific sabab bilan chiqaring.",
            "⚠️ Tuzoqlar: barcha savolga bitta usul bilan yondashish."
        ],
    },
}


def generate_mastery_content(type_name: str, attempt: int = 1) -> dict:
    settings = get_settings()
    if settings.anthropic_api_key:
        generated = _generate_with_claude(type_name, attempt)
        if generated:
            return generated
    return _fallback_content(type_name, attempt)


def content_has_multilingual_fields(content: dict | None) -> bool:
    if not isinstance(content, dict):
        return False
    if content.get("schema_version") != CONTENT_SCHEMA_VERSION:
        return False
    questions = content.get("questions")
    if not isinstance(questions, list) or not questions:
        return False
    required_top_level = ("explanation_en", "explanation_ru", "explanation_uz", "strategy_en", "strategy_ru", "strategy_uz")
    if any(not content.get(key) for key in required_top_level):
        return False
    sample = questions[0]
    if not isinstance(sample, dict):
        return False
    required_question = (
        "passage_or_sentence_en",
        "passage_or_sentence_ru",
        "passage_or_sentence_uz",
        "question_text_en",
        "question_text_ru",
        "question_text_uz",
        "options_en",
        "options_ru",
        "options_uz",
        "explanation_en",
        "explanation_ru",
        "explanation_uz",
        "why_wrong_en",
        "why_wrong_ru",
        "why_wrong_uz",
    )
    return all(sample.get(key) for key in required_question)


def grade_mastery_answers(questions: list[dict], answers: dict[str, str]) -> dict:
    correct = 0
    graded = []
    for index, question in enumerate(questions):
        selected = (answers.get(str(index)) or answers.get(str(index + 1)) or "").strip().upper()
        correct_answer = str(question.get("correct_answer") or "").strip().upper()
        is_correct = selected == correct_answer
        correct += 1 if is_correct else 0
        graded.append({"index": index, "selected": selected, "correct": correct_answer, "is_correct": is_correct})
    mistakes = max(0, len(questions) - correct)
    return {"correct": correct, "mistakes": mistakes, "passed": mistakes <= PASS_MISTAKE_LIMIT, "graded": graded}


def _generate_with_claude(type_name: str, attempt: int) -> dict | None:
    prompt = _generation_prompt(type_name, attempt)
    payload_base = {
        "max_tokens": 6000,
        "system": "You are an expert SAT Reading & Writing tutor. Return only valid JSON.",
        "messages": [{"role": "user", "content": prompt}],
    }
    settings = get_settings()
    for model in _model_candidates(settings.anthropic_model):
        raw = _send_anthropic_payload({"model": model, **payload_base}, timeout=45)
        if not raw:
            continue
        parsed = _parse_message_json(raw)
        normalized = _normalize_content(type_name, parsed)
        if normalized:
            return normalized
    return None


def _generation_prompt(type_name: str, attempt: int) -> str:
    return f"""
You are an expert SAT Reading & Writing tutor with a perfect 1600 score.
Generate original content for the question type: {type_name}.

This is attempt #{attempt}; make this question set fresh and different from prior attempts.

Return JSON with:
1. explanation_en, explanation_ru, explanation_uz: 2-3 sentences explaining what this question type tests, written in a direct expert-tutor voice.
2. strategy_en, strategy_ru, strategy_uz: 4-5 specific, actionable strategy bullet points, including at least one common-trap warning.
3. questions: array of exactly 10 ORIGINAL SAT-style practice questions for this type, matching real SAT difficulty and format, each with:
   - passage_or_sentence_en, passage_or_sentence_ru, passage_or_sentence_uz
   - question_text_en, question_text_ru, question_text_uz
   - options_en, options_ru, options_uz objects with A, B, C, D
   - correct_answer
   - explanation_en, explanation_ru, explanation_uz explaining why correct and citing evidence from the passage
   - why_wrong_en, why_wrong_ru, why_wrong_uz objects with brief reason for each incorrect option

CRITICAL:
- Never reproduce or closely paraphrase any existing published SAT preparation material, textbook, or test-prep website content.
- All passages, questions, and examples must be entirely original creations.
- Questions must specifically test {type_name}, not a random SAT skill.
- Every visible field must be fully localized. Do not mix Uzbek into Russian or English fields. Do not leave English in Uzbek/Russian fields unless it is an official SAT term.
- Return only valid JSON.
"""


def _normalize_content(type_name: str, parsed: dict | None) -> dict | None:
    if not isinstance(parsed, dict):
        return None
    questions = parsed.get("questions")
    if not isinstance(questions, list) or len(questions) < 10:
        return None
    normalized_questions = []
    for index, question in enumerate(questions[:10]):
        if not isinstance(question, dict):
            return None
        options = question.get("options") if isinstance(question.get("options"), dict) else {}
        if not all(key in options for key in ("A", "B", "C", "D")):
            return None
        correct = str(question.get("correct_answer") or "").strip().upper()
        if correct not in {"A", "B", "C", "D"}:
            return None
        options_en = _options_for_language(question, "en", options)
        options_ru = _options_for_language(question, "ru", options_en)
        options_uz = _options_for_language(question, "uz", options_en)
        wrong_en = _wrong_for_language(question, "en")
        wrong_ru = _wrong_for_language(question, "ru")
        wrong_uz = _wrong_for_language(question, "uz")
        passage_en = str(question.get("passage_or_sentence_en") or question.get("passage_or_sentence") or "")
        question_en = str(question.get("question_text_en") or question.get("question_text") or f"{type_name} question #{index + 1}")
        normalized_questions.append(
            {
                "passage_or_sentence": passage_en,
                "passage_or_sentence_en": passage_en,
                "passage_or_sentence_ru": str(question.get("passage_or_sentence_ru") or passage_en),
                "passage_or_sentence_uz": str(question.get("passage_or_sentence_uz") or passage_en),
                "question_text": question_en,
                "question_text_en": question_en,
                "question_text_ru": str(question.get("question_text_ru") or question_en),
                "question_text_uz": str(question.get("question_text_uz") or question.get("question_text") or f"{type_name} savoli #{index + 1}"),
                "options": options_en,
                "options_en": options_en,
                "options_ru": options_ru,
                "options_uz": options_uz,
                "correct_answer": correct,
                "explanation_en": str(question.get("explanation_en") or question.get("explanation_uz") or ""),
                "explanation_ru": str(question.get("explanation_ru") or question.get("explanation_uz") or ""),
                "explanation_uz": str(question.get("explanation_uz") or ""),
                "why_wrong_en": {key: str(wrong_en.get(key) or "This option is not directly supported by the passage evidence.") for key in ("A", "B", "C", "D") if key != correct},
                "why_wrong_ru": {key: str(wrong_ru.get(key) or "Этот вариант не подтверждается доказательством из текста.") for key in ("A", "B", "C", "D") if key != correct},
                "why_wrong_uz": {key: str(wrong_uz.get(key) or "Bu variant matndagi dalilga mos kelmaydi.") for key in ("A", "B", "C", "D") if key != correct},
            }
        )
    spec = TYPE_SPECS.get(type_name, TYPE_SPECS["Central Ideas & Details"])
    explanation_uz = str(parsed.get("explanation_uz") or _explanation(type_name, spec))
    return {
        "schema_version": CONTENT_SCHEMA_VERSION,
        "explanation_en": str(parsed.get("explanation_en") or _explanation_en(type_name, spec)),
        "explanation_ru": str(parsed.get("explanation_ru") or _explanation_ru(type_name, spec)),
        "explanation_uz": explanation_uz,
        "strategy_en": _strategy_list(parsed.get("strategy_en"), spec, "en"),
        "strategy_ru": _strategy_list(parsed.get("strategy_ru"), spec, "ru"),
        "strategy_uz": _strategy_list(parsed.get("strategy_uz"), spec),
        "questions": normalized_questions,
    }


def _options_for_language(question: dict, lang: str, fallback: dict) -> dict:
    value = question.get(f"options_{lang}")
    if not isinstance(value, dict):
        value = fallback
    return {key: str(value.get(key) or fallback.get(key) or "") for key in ("A", "B", "C", "D")}


def _wrong_for_language(question: dict, lang: str) -> dict:
    value = question.get(f"why_wrong_{lang}")
    if isinstance(value, dict):
        return value
    legacy = question.get("why_wrong_uz")
    return legacy if isinstance(legacy, dict) else {}


def _strategy_list(value: Any, spec: dict, lang: str = "uz") -> list[str]:
    if isinstance(value, list) and len(value) >= 3:
        return [str(item) for item in value[:5]]
    if lang == "en":
        trap = _localized_trap(spec, "en")
        return [
            "Identify exactly what the question type is asking before reading the choices.",
            "Find the sentence, detail, or structure that proves the answer.",
            "Eliminate choices that are too broad, too narrow, unsupported, or opposite.",
            "Choose the most precise answer, not the one that only sounds familiar.",
            f"⚠️ Common trap: {trap}."
        ]
    if lang == "ru":
        trap = _localized_trap(spec, "ru")
        return [
            "Сначала определите, что именно проверяет этот тип вопроса.",
            "Найдите предложение, деталь или структуру, которые доказывают ответ.",
            "Исключите варианты: слишком широкие, слишком узкие, без доказательства или противоположные.",
            "Выберите самый точный ответ, а не тот, который просто звучит знакомо.",
            f"⚠️ Главная ловушка: {trap}."
        ]
    return list(spec["strategies"])


def _fallback_content(type_name: str, attempt: int) -> dict:
    spec = TYPE_SPECS.get(type_name, TYPE_SPECS["Central Ideas & Details"])
    rng = random.Random(f"{type_name}-{attempt}-{random.randint(1, 1_000_000)}")
    contexts = list(_fallback_contexts())
    rng.shuffle(contexts)
    return {
        "schema_version": CONTENT_SCHEMA_VERSION,
        "explanation_en": _explanation_en(type_name, spec),
        "explanation_ru": _explanation_ru(type_name, spec),
        "explanation_uz": _explanation(type_name, spec),
        "strategy_en": _strategy_list(None, spec, "en"),
        "strategy_ru": _strategy_list(None, spec, "ru"),
        "strategy_uz": list(spec["strategies"]),
        "questions": [_fallback_question(type_name, contexts[index], index, rng) for index in range(10)],
    }


def _explanation(type_name: str, spec: dict) -> str:
    return (
        f"{type_name} savollari sizdan {spec['skill']} talab qiladi. "
        f"Bu SAT'da {spec['frequency']} uchraydi. "
        f"Ko'pchilik bu turda {spec['trap']} xatosini qiladi."
    )


def _explanation_en(type_name: str, spec: dict) -> str:
    skill = _localized_skill(spec, "en")
    frequency = _localized_frequency(spec, "en")
    trap = _localized_trap(spec, "en")
    return (
        f"{type_name} questions ask you to use a specific SAT skill: {skill}. "
        f"This appears {frequency} on the SAT. "
        f"The common mistake is {trap} instead of choosing from evidence."
    )


def _explanation_ru(type_name: str, spec: dict) -> str:
    skill = _localized_skill(spec, "ru")
    frequency = _localized_frequency(spec, "ru")
    trap = _localized_trap(spec, "ru")
    return (
        f"Вопросы {type_name} проверяют конкретный навык SAT: {skill}. "
        f"На SAT это встречается {frequency}. "
        f"Типичная ошибка — {trap}, вместо выбора по доказательству."
    )


def _localized_skill(spec: dict, lang: str) -> str:
    uz = str(spec.get("skill") or "")
    skills = {
        "butun matnning bosh fikrini va uni qo'llab-quvvatlovchi tafsilotlarni ajratish": {
            "en": "identifying the central idea of the whole text and the details that support it",
            "ru": "определять главную мысль всего текста и детали, которые её поддерживают",
        },
        "matnda bevosita aytilmagan, lekin dalil bilan isbotlanadigan xulosani topish": {
            "en": "drawing a conclusion that is supported by evidence even when it is not stated directly",
            "ru": "делать вывод, который подтверждается текстом, даже если он не сказан напрямую",
        },
        "berilgan da'voni eng aniq isbotlaydigan jumla yoki detalni tanlash": {
            "en": "choosing the sentence or detail that most directly proves a claim",
            "ru": "выбирать предложение или деталь, которые прямо доказывают утверждение",
        },
        "jadval, grafik yoki raqamli ma'lumotdan aniq dalil chiqarish": {
            "en": "using tables, graphs, or numerical data as precise evidence",
            "ru": "использовать таблицы, графики или числовые данные как точное доказательство",
        },
        "so'zning lug'atdagi birinchi ma'nosini emas, matndagi aniq vazifasini topish": {
            "en": "finding the word's exact meaning in context, not just its first dictionary meaning",
            "ru": "находить точное значение слова в контексте, а не первое словарное значение",
        },
        "muallif matnni qanday tashkil qilganini va nima uchun yozganini tushunish": {
            "en": "understanding how the author organizes the text and why it is written that way",
            "ru": "понимать, как автор организует текст и зачем он так построен",
        },
        "ikki qisqa matnning kelishadigan yoki farq qiladigan joyini topish": {
            "en": "finding where two short texts agree, disagree, or build on each other",
            "ru": "находить, где два коротких текста совпадают, расходятся или дополняют друг друга",
        },
        "berilgan eslatmalardan maqsadga mos bitta aniq jumla tuzish": {
            "en": "using given notes to create one clear sentence that matches the stated goal",
            "ru": "использовать заметки, чтобы составить одно точное предложение под заданную цель",
        },
        "ikki g'oya orasidagi mantiqiy munosabatga mos transition tanlash": {
            "en": "choosing the transition that matches the logical relationship between two ideas",
            "ru": "выбирать переходное слово, которое соответствует логической связи между идеями",
        },
        "mustaqil va bog'liq gaplarni to'g'ri tinish belgisi bilan ajratish": {
            "en": "separating independent and dependent clauses with correct punctuation",
            "ru": "разделять независимые и зависимые части предложения правильной пунктуацией",
        },
        "grammatik forma, subject-verb agreement, pronoun va parallel structure ni tekshirish": {
            "en": "checking grammar form, subject-verb agreement, pronouns, and parallel structure",
            "ru": "проверять грамматическую форму, согласование, местоимения и параллельную структуру",
        },
        "barcha Reading & Writing savol turlarini aralashtirib, haqiqiy test ritmida ishlash": {
            "en": "working through a mixed set of Reading & Writing question types like a real test",
            "ru": "решать смешанный набор вопросов Reading & Writing в ритме реального теста",
        },
    }
    return skills.get(uz, {}).get(lang) or ("using the target SAT skill precisely" if lang == "en" else "точно применять нужный навык SAT")


def _localized_frequency(spec: dict, lang: str) -> str:
    uz = str(spec.get("frequency") or "")
    values = {
        "har testda bir necha marta": {"en": "several times per test", "ru": "несколько раз в каждом тесте"},
        "deyarli har testda": {"en": "on almost every test", "ru": "почти в каждом тесте"},
        "har testda uchraydi": {"en": "on every test", "ru": "в каждом тесте"},
        "ko'pincha ma'lumotli matnlarda": {"en": "often in data-based texts", "ru": "часто в текстах с данными"},
        "har testda 4-5 marta": {"en": "four to five times per test", "ru": "четыре-пять раз в каждом тесте"},
        "ko'pincha paired text savollarida": {"en": "often in paired-text questions", "ru": "часто в вопросах с двумя текстами"},
        "Writing qismida muntazam": {"en": "regularly in the Writing portion", "ru": "регулярно в части Writing"},
        "har testda ko'p uchraydi": {"en": "many times per test", "ru": "много раз в каждом тесте"},
        "Standard English qismida muntazam": {"en": "regularly in Standard English questions", "ru": "регулярно в вопросах Standard English"},
        "yakuniy mustahkamlash uchun": {"en": "as a final review skill", "ru": "как финальное закрепление"},
    }
    return values.get(uz, {}).get(lang) or ("regularly" if lang == "en" else "регулярно")


def _localized_trap(spec: dict, lang: str) -> str:
    uz = str(spec.get("trap") or "")
    traps = {
        "bitta detalni butun matnning asosiy g'oyasi deb tanlash": {
            "en": "treating one detail as the central idea of the entire text",
            "ru": "принимать одну деталь за главную мысль всего текста",
        },
        "matndan tashqariga chiqib, shaxsiy taxmin qilish": {
            "en": "making a personal guess that goes beyond the text",
            "ru": "делать личное предположение, выходящее за рамки текста",
        },
        "mavzuga aloqador, lekin da'voni bevosita isbotlamaydigan dalilni tanlash": {
            "en": "choosing evidence that is related but does not directly prove the claim",
            "ru": "выбирать связанную деталь, которая не доказывает утверждение напрямую",
        },
        "o'q va birliklarni e'tiborsiz qoldirish": {
            "en": "ignoring labels, axes, or units",
            "ru": "игнорировать подписи, оси или единицы измерения",
        },
        "eng tanish ma'noni tanlash": {
            "en": "choosing the most familiar dictionary meaning",
            "ru": "выбирать самое знакомое словарное значение",
        },
        "matn nimani aytayotganini uning vazifasi bilan adashtirish": {
            "en": "confusing what the text says with why that part is there",
            "ru": "путать содержание текста с функцией этой части",
        },
        "faqat birinchi matnga qarab javob berish": {
            "en": "answering from only the first text",
            "ru": "отвечать только по первому тексту",
        },
        "maqsadni unutib, keraksiz ma'lumot qo'shish": {
            "en": "forgetting the goal and adding unnecessary information",
            "ru": "забывать цель и добавлять лишнюю информацию",
        },
        "silliq eshitilgani uchun noto'g'ri yo'nalishdagi so'zni tanlash": {
            "en": "choosing a transition because it sounds smooth even though the logic is wrong",
            "ru": "выбирать переход, который звучит плавно, но передаёт неверную логику",
        },
        "ikki mustaqil gap orasiga yolg'iz vergul qo'yish": {
            "en": "placing a comma alone between two independent clauses",
            "ru": "ставить одну запятую между двумя независимыми предложениями",
        },
        "fe'lni eng yaqin otga moslashtirish": {
            "en": "matching the verb to the nearest noun instead of the true subject",
            "ru": "согласовывать глагол с ближайшим существительным, а не с настоящим подлежащим",
        },
        "savol turini aniqlamasdan javob tanlash": {
            "en": "choosing an answer before identifying the question type",
            "ru": "выбирать ответ до определения типа вопроса",
        },
    }
    return traps.get(uz, {}).get(lang) or ("choosing without evidence" if lang == "en" else "выбирать без доказательства")


def _fallback_contexts() -> list[dict]:
    return [
        {
            "subject": "urban trees",
            "passage": "City planners in Norchester expected newly planted street trees to lower summer temperatures immediately. Measurements taken over four years, however, showed a slower pattern: the blocks became noticeably cooler only after the tree canopies widened enough to shade pavement for most of the afternoon.",
            "central": "Street trees cooled the neighborhood only after their canopies became large enough to shade pavement.",
            "detail": "the blocks became noticeably cooler only after the tree canopies widened",
            "inference": "New trees may need several years before they produce a measurable cooling effect.",
            "purpose": "to correct an expectation by presenting longer-term measurements",
            "tone": "measured and explanatory",
            "transition_relation": "contrast",
        },
        {
            "subject": "ceramic fragments",
            "passage": "Archaeologist Mina Cho cataloged hundreds of ceramic fragments from a coastal settlement. Although the pieces looked nearly identical, chemical tests showed that some clay came from inland riverbeds, suggesting that the settlement traded with communities far beyond the shore.",
            "central": "Chemical testing of pottery revealed evidence of inland trade connections.",
            "detail": "some clay came from inland riverbeds",
            "inference": "Visual similarity alone was not enough to determine where the ceramics originated.",
            "purpose": "to show how scientific analysis changed an archaeological interpretation",
            "tone": "analytical",
            "transition_relation": "contrast",
        },
        {
            "subject": "sleep and memory",
            "passage": "In a study of vocabulary learning, students who reviewed new words before sleeping remembered more terms the next morning than students who reviewed them after waking. The researchers argued that sleep did not simply preserve memory but helped stabilize fragile new associations.",
            "central": "Reviewing vocabulary before sleep may help strengthen new memories.",
            "detail": "students who reviewed new words before sleeping remembered more terms",
            "inference": "The timing of review can affect how well new information is retained.",
            "purpose": "to explain a study result and its implication",
            "tone": "informative",
            "transition_relation": "addition",
        },
        {
            "subject": "wetland restoration",
            "passage": "When engineers reopened a blocked tidal channel, saltwater returned to the marsh within days. Native grasses did not recover as quickly, but after two growing seasons their roots had spread across areas that had previously been bare mud.",
            "central": "Restoring water flow began a gradual recovery of native marsh grasses.",
            "detail": "after two growing seasons their roots had spread",
            "inference": "Ecological recovery can continue long after the initial restoration step.",
            "purpose": "to describe stages in a restoration process",
            "tone": "patient and factual",
            "transition_relation": "time",
        },
        {
            "subject": "museum labels",
            "passage": "A museum replaced several technical labels with short narratives about how objects were used in daily life. Visitor surveys later showed that people spent more time with the same objects and remembered more details about them.",
            "central": "Narrative labels helped visitors engage more deeply with museum objects.",
            "detail": "people spent more time with the same objects and remembered more details",
            "inference": "How information is presented can influence museum visitors' attention.",
            "purpose": "to show the effect of a communication change",
            "tone": "practical",
            "transition_relation": "cause",
        },
        {
            "subject": "desert varnish",
            "passage": "Dark coatings on desert rocks form slowly as windblown dust, clay, and minerals accumulate on exposed surfaces. Because the coatings develop over long periods, researchers can use them to estimate how long a rock face has remained undisturbed.",
            "central": "Slow-forming desert rock coatings can help estimate surface age.",
            "detail": "the coatings develop over long periods",
            "inference": "A rock face with a thick coating has likely been exposed for a long time.",
            "purpose": "to explain a natural process and its research use",
            "tone": "scientific",
            "transition_relation": "cause",
        },
        {
            "subject": "community theater",
            "passage": "The director of a small community theater wanted younger residents to attend performances. Instead of changing the plays, she invited students to help design posters and lobby displays. Attendance among teenagers rose, suggesting that participation before the performance made the event feel more personally relevant.",
            "central": "Student involvement in promotion increased teenage attendance at a theater.",
            "detail": "Attendance among teenagers rose",
            "inference": "Teenagers were more likely to attend when they felt connected to the event.",
            "purpose": "to describe a strategy for increasing audience engagement",
            "tone": "constructive",
            "transition_relation": "contrast",
        },
        {
            "subject": "microplastic sampling",
            "passage": "Early ocean surveys counted microplastics only near the surface, where floating particles are easiest to collect. Later studies sampled deeper water and found substantial concentrations there as well, complicating estimates of how much plastic is actually present in the ocean.",
            "central": "Deeper sampling changed estimates of ocean microplastic distribution.",
            "detail": "Later studies sampled deeper water and found substantial concentrations there",
            "inference": "Surface-only surveys likely underestimated ocean plastic pollution.",
            "purpose": "to explain why a measurement method was incomplete",
            "tone": "cautious",
            "transition_relation": "addition",
        },
        {
            "subject": "public transit maps",
            "passage": "A transit agency redesigned its bus map so that major routes appeared thicker and transfer points were marked with bright circles. Complaints from first-time riders decreased after the new map was introduced, even though the routes themselves did not change.",
            "central": "A clearer map made the bus system easier for new riders to use.",
            "detail": "Complaints from first-time riders decreased",
            "inference": "Some rider confusion came from presentation rather than from the route system itself.",
            "purpose": "to show how design can improve navigation",
            "tone": "explanatory",
            "transition_relation": "cause",
        },
        {
            "subject": "plant roots",
            "passage": "Botanists once assumed that roots grew mainly downward in response to gravity. New imaging, however, shows that roots also respond to tiny differences in soil moisture, curving toward wetter pockets even when those pockets are not directly below the plant.",
            "central": "Roots respond to moisture patterns as well as gravity.",
            "detail": "roots also respond to tiny differences in soil moisture",
            "inference": "Root growth is more flexible than a gravity-only model suggests.",
            "purpose": "to revise an older scientific assumption",
            "tone": "corrective and scientific",
            "transition_relation": "contrast",
        },
        {
            "subject": "traditional weaving",
            "passage": "Historian Leila Ortiz studied old weaving patterns from mountain villages. She found that certain repeated shapes appeared only after new trade roads opened, indicating that local artists incorporated symbols encountered through contact with traveling merchants.",
            "central": "Trade routes influenced the designs used by local weavers.",
            "detail": "certain repeated shapes appeared only after new trade roads opened",
            "inference": "Artistic traditions can change when communities interact with outsiders.",
            "purpose": "to connect a change in art to a historical development",
            "tone": "interpretive",
            "transition_relation": "cause",
        },
        {
            "subject": "acoustic panels",
            "passage": "A school installed acoustic panels in its cafeteria to reduce noise. Teachers reported that students finished lunch more calmly, but sound measurements showed only a modest reduction in volume. The panels may have changed the quality of the noise more than its overall loudness.",
            "central": "Acoustic panels improved the cafeteria environment even though measured volume changed only slightly.",
            "detail": "students finished lunch more calmly",
            "inference": "Noise quality can affect comfort even when loudness changes little.",
            "purpose": "to distinguish measured volume from perceived sound comfort",
            "tone": "nuanced",
            "transition_relation": "contrast",
        },
    ]


def _fallback_question(type_name: str, context: dict, index: int, rng: random.Random) -> dict:
    if type_name == "Inferences":
        return _question_payload(
            context,
            "Which conclusion is best supported by the text?",
            {
                "A": context["inference"],
                "B": f"The study proves that {context['subject']} cannot be improved by later changes.",
                "C": f"Researchers had no useful evidence about {context['subject']}.",
                "D": f"The passage recommends replacing all older methods immediately.",
            },
            "A",
            "A to'g'ri, chunki bu xulosa matndagi aniq dalildan kelib chiqadi va matndan tashqariga chiqmaydi.",
            {"B": "Juda keskin va matnda aytilmagan.", "C": "Matnda foydali dalil bor.", "D": "Passage tavsiya emas, tushuntirish beradi."},
        )
    if type_name == "Command of Evidence (Textual)":
        return _question_payload(
            context,
            "Which quotation from the text best supports the main claim?",
            {
                "A": context["detail"],
                "B": f"{context['subject']} is mentioned in the first sentence.",
                "C": "the author uses this detail",
                "D": "a general opinion",
            },
            "A",
            f"A to'g'ri, chunki '{context['detail']}' claimni bevosita isbotlaydigan eng aniq dalil.",
            {"B": "Bu faqat mavzuni nomlaydi, claimni isbotlamaydi.", "C": "Bu dalil emas, muallifning ishlatish usulini bildiradi.", "D": "Bu juda umumiy."},
        )
    if type_name == "Command of Evidence (Quantitative)":
        numbers = [(32, 47), (18, 29), (41, 56), (24, 38)][index % 4]
        passage = f"A survey about {context['subject']} recorded positive responses from {numbers[0]}% of participants before a change and {numbers[1]}% after it. The table therefore suggests a measurable increase, not a decrease."
        return _question_payload(
            {**context, "passage": passage, "detail": f"{numbers[0]}% before and {numbers[1]}% after"},
            "Which choice best describes the data?",
            {
                "A": f"Positive responses increased from {numbers[0]}% to {numbers[1]}%.",
                "B": f"Positive responses decreased from {numbers[1]}% to {numbers[0]}%.",
                "C": "The data show no measurable difference.",
                "D": "The table compares two unrelated groups without a timeline.",
            },
            "A",
            "A to'g'ri, chunki raqamlar oldingi va keyingi holatni aniq solishtiradi.",
            {"B": "Yo'nalish teskari.", "C": "Raqamlarda farq bor.", "D": "Matnda before/after timeline berilgan."},
        )
    if type_name == "Words in Context":
        words = [
            ("marked", "noticeably changed", "decorated", "graded", "claimed"),
            ("stable", "not easily changed", "popular", "expensive", "temporary"),
            ("modest", "limited in size", "shy", "fashionable", "completely absent"),
            ("substantial", "large enough to matter", "wooden", "uncertain", "brief"),
        ]
        target, correct_text, b, c, d = words[index % len(words)]
        passage = f"The report on {context['subject']} described a {target} shift: {context['detail']}."
        return _question_payload(
            {**context, "passage": passage, "detail": context["detail"]},
            f"As used in the text, what does '{target}' most nearly mean?",
            {"A": correct_text, "B": b, "C": c, "D": d},
            "A",
            f"A to'g'ri, chunki '{target}' bu gapda '{correct_text}' ma'nosida ishlatilgan; dalil: '{context['detail']}'.",
            {"B": "Bu so'zning boshqa kontekstdagi ma'nosi.", "C": "Bu gapdagi dalilga mos emas.", "D": "Matndagi munosabatni buzadi."},
        )
    if type_name == "Text Structure & Purpose":
        return _question_payload(
            context,
            "Which choice best describes the function of the second sentence?",
            {
                "A": context["purpose"],
                "B": "to introduce an unrelated historical example",
                "C": "to reject all previous research on the topic",
                "D": "to shift from evidence to a personal story",
            },
            "A",
            "A to'g'ri, chunki ikkinchi gap birinchi fikrni aniq dalil yoki natija bilan rivojlantiradi.",
            {"B": "Misol mavzudan uzilmagan.", "C": "Matn barcha oldingi tadqiqotni rad etmaydi.", "D": "Shaxsiy hikoya yo'q."},
        )
    if type_name == "Cross-Text Connections":
        passage = f"Text 1: {context['passage']} Text 2: A second researcher agrees with the result but argues that the same pattern should be tested in other locations before broad conclusions are drawn."
        return _question_payload(
            {**context, "passage": passage},
            "How would the author of Text 2 most likely respond to Text 1?",
            {
                "A": "By accepting the finding while recommending additional testing.",
                "B": "By claiming that Text 1 has no evidence.",
                "C": "By arguing that the topic is not worth studying.",
                "D": "By saying the result applies to every possible setting.",
            },
            "A",
            "A to'g'ri, chunki Text 2 natijani inkor qilmaydi, faqat uni boshqa joylarda ham tekshirish kerakligini aytadi.",
            {"B": "Text 2 evidence yo'q demaydi.", "C": "U mavzuni rad etmaydi.", "D": "U aksincha broad conclusiondan ehtiyot bo'ladi."},
        )
    if type_name == "Rhetorical Synthesis":
        passage = f"Research notes: - {context['subject']} was studied by local researchers. - Key finding: {context['central']}. - Student goal: explain the finding clearly to a general audience."
        return _question_payload(
            {**context, "passage": passage},
            "Which choice best uses the notes to accomplish the student's goal?",
            {
                "A": f"Researchers found that {context['central'].lower()}",
                "B": f"{context['subject'].title()} is a topic that some researchers have studied in several ways.",
                "C": "The student should include every note even if the audience does not need it.",
                "D": "Local researchers worked, but the notes do not say what they found.",
            },
            "A",
            "A to'g'ri, chunki u student goalga mos: topilmani umumiy auditoriyaga aniq va ixcham tushuntiradi.",
            {"B": "Juda umumiy va key findingni bermaydi.", "C": "Bu javob emas, noto'g'ri strategiya.", "D": "Notesdagi asosiy topilmani yashiradi."},
        )
    if type_name == "Transitions":
        relation = context["transition_relation"]
        transition = {"contrast": "However,", "addition": "Additionally,", "cause": "Therefore,", "time": "Later,"}.get(relation, "Therefore,")
        distractors = {"contrast": ["Similarly,", "For example,", "Therefore,"], "addition": ["However,", "Nevertheless,", "Instead,"], "cause": ["Nevertheless,", "Meanwhile,", "Similarly,"], "time": ["In contrast,", "Consequently,", "For instance,"]}.get(relation, ["However,", "Additionally,", "For example,"])
        passage = f"{context['passage']} _____ the evidence points to a clear relationship between the change and the result."
        return _question_payload(
            {**context, "passage": passage},
            "Which choice most logically completes the text?",
            {"A": transition, "B": distractors[0], "C": distractors[1], "D": distractors[2]},
            "A",
            f"A to'g'ri, chunki gaplar orasidagi munosabat '{relation}' bo'lib, '{transition}' shu yo'nalishni beradi.",
            {"B": "Mantiqiy yo'nalish mos emas.", "C": "Bu relationshipni noto'g'ri ko'rsatadi.", "D": "Bu transition matndagi dalil bilan mos kelmaydi."},
        )
    if type_name == "Boundaries (Punctuation)":
        return _question_payload(
            context,
            "Which choice correctly completes the sentence?",
            {
                "A": f"The researchers recorded the result; the pattern remained visible in later measurements.",
                "B": f"The researchers recorded the result, the pattern remained visible in later measurements.",
                "C": f"The researchers recorded the result the pattern remained visible in later measurements.",
                "D": f"The researchers recorded the result, and because the pattern remained visible in later measurements.",
            },
            "A",
            "A to'g'ri, chunki ikki mustaqil gap semicolon bilan to'g'ri bog'langan.",
            {"B": "Comma splice: ikki mustaqil gap orasida yolg'iz vergul.", "C": "Tinish belgisi yo'q.", "D": "Ikkinchi qism dependent bo'lib qolgan."},
        )
    if type_name == "Form, Structure, and Sense":
        return _question_payload(
            context,
            "Which choice completes the sentence so that it conforms to Standard English?",
            {
                "A": "The collection of measurements was reviewed before the report was published.",
                "B": "The collection of measurements were reviewed before the report was published.",
                "C": "The collection of measurements reviewing before the report was published.",
                "D": "The collection of measurements have reviewed before the report was published.",
            },
            "A",
            "A to'g'ri, chunki subject 'collection' birlikda, shuning uchun 'was reviewed' kerak.",
            {"B": "'measurements' yaqin turibdi, lekin haqiqiy subject 'collection'.", "C": "Fe'l formasi tugallanmagan.", "D": "'have reviewed' subject bilan mos emas."},
        )
    if type_name == "Reserved/Combined Review Unit":
        mixed_types = ["Central Ideas & Details", "Inferences", "Words in Context", "Transitions", "Boundaries (Punctuation)"]
        return _fallback_question(mixed_types[index % len(mixed_types)], context, index, rng)
    return _question_payload(
        context,
        "Which choice best states the central idea of the text?",
        {
            "A": context["central"],
            "B": f"The passage lists every possible problem with {context['subject']}.",
            "C": f"The passage argues that {context['subject']} should no longer be studied.",
            "D": "The passage tells a personal story without analysis.",
        },
        "A",
        f"A to'g'ri, chunki butun matn '{context['central']}' fikrini rivojlantiradi.",
        {"B": "Bu juda keng va matnda yo'q.", "C": "Matn tadqiqotni rad etmaydi.", "D": "Matn shaxsiy hikoya emas."},
    )


def _question_payload(context: dict, question_text: str, options: dict, correct: str, explanation: str, why_wrong: dict) -> dict:
    explanation_en = explanation.replace("to'g'ri, chunki", "is correct because").replace("chunki", "because")
    explanation_ru = explanation.replace("to'g'ri, chunki", "верно, потому что").replace("chunki", "потому что")
    return {
        "passage_or_sentence": context["passage"],
        "passage_or_sentence_en": context["passage"],
        "passage_or_sentence_ru": context["passage"],
        "passage_or_sentence_uz": context["passage"],
        "question_text": question_text,
        "question_text_en": question_text,
        "question_text_ru": question_text,
        "question_text_uz": question_text,
        "options": options,
        "options_en": options,
        "options_ru": options,
        "options_uz": options,
        "correct_answer": correct,
        "explanation_en": explanation_en,
        "explanation_ru": explanation_ru,
        "explanation_uz": explanation,
        "why_wrong_en": {key: str(value) for key, value in why_wrong.items()},
        "why_wrong_ru": {key: str(value) for key, value in why_wrong.items()},
        "why_wrong_uz": why_wrong,
    }


def _fallback_question_text(type_name: str, index: int) -> str:
    if type_name == "Words in Context":
        return "Which choice completes the text with the most logical and precise word?"
    if type_name == "Transitions":
        return "Which transition most logically connects the two ideas?"
    if type_name == "Boundaries (Punctuation)":
        return "Which choice correctly completes the sentence with proper punctuation?"
    if type_name == "Rhetorical Synthesis":
        return "Which choice most effectively uses the notes to accomplish the student's goal?"
    if type_name == "Inferences":
        return "Which conclusion is best supported by the text?"
    if "Evidence" in type_name:
        return "Which choice provides the strongest evidence for the claim?"
    if type_name == "Central Ideas & Details":
        return "Which choice best states the central idea of the text?"
    return f"Which choice best answers this {type_name} question?"
