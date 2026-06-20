from __future__ import annotations

import json
import random
from typing import Any

from app.core.config import get_settings
from app.services.reading_analyzer import _model_candidates, _parse_message_json, _send_anthropic_payload

PASS_MISTAKE_LIMIT = 2


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
1. explanation_uz: 2-3 sentences in Uzbek explaining what this question type tests, written in a direct expert-tutor voice.
2. strategy_uz: 4-5 specific, actionable strategy bullet points in Uzbek, including at least one common-trap warning.
3. questions: array of exactly 10 ORIGINAL SAT-style practice questions for this type, matching real SAT difficulty and format, each with:
   - passage_or_sentence
   - question_text
   - options object with A, B, C, D
   - correct_answer
   - explanation_uz explaining why correct and citing evidence from the passage
   - why_wrong_uz object with brief reason for each incorrect option

CRITICAL:
- Never reproduce or closely paraphrase any existing published SAT preparation material, textbook, or test-prep website content.
- All passages, questions, and examples must be entirely original creations.
- Questions must specifically test {type_name}, not a random SAT skill.
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
        wrong = question.get("why_wrong_uz") if isinstance(question.get("why_wrong_uz"), dict) else {}
        normalized_questions.append(
            {
                "passage_or_sentence": str(question.get("passage_or_sentence") or ""),
                "question_text": str(question.get("question_text") or f"{type_name} savoli #{index + 1}"),
                "options": {key: str(options.get(key) or "") for key in ("A", "B", "C", "D")},
                "correct_answer": correct,
                "explanation_uz": str(question.get("explanation_uz") or ""),
                "why_wrong_uz": {key: str(wrong.get(key) or "Bu variant matndagi dalilga mos kelmaydi.") for key in ("A", "B", "C", "D") if key != correct},
            }
        )
    spec = TYPE_SPECS.get(type_name, TYPE_SPECS["Central Ideas & Details"])
    return {
        "explanation_uz": str(parsed.get("explanation_uz") or _explanation(type_name, spec)),
        "strategy_uz": _strategy_list(parsed.get("strategy_uz"), spec),
        "questions": normalized_questions,
    }


def _strategy_list(value: Any, spec: dict) -> list[str]:
    if isinstance(value, list) and len(value) >= 3:
        return [str(item) for item in value[:5]]
    return list(spec["strategies"])


def _fallback_content(type_name: str, attempt: int) -> dict:
    spec = TYPE_SPECS.get(type_name, TYPE_SPECS["Central Ideas & Details"])
    rng = random.Random(f"{type_name}-{attempt}-{random.randint(1, 1_000_000)}")
    return {
        "explanation_uz": _explanation(type_name, spec),
        "strategy_uz": list(spec["strategies"]),
        "questions": [_fallback_question(type_name, spec, index, rng) for index in range(10)],
    }


def _explanation(type_name: str, spec: dict) -> str:
    return (
        f"{type_name} savollari sizdan {spec['skill']} talab qiladi. "
        f"Bu SAT'da {spec['frequency']} uchraydi. "
        f"Ko'pchilik bu turda {spec['trap']} xatosini qiladi."
    )


def _fallback_question(type_name: str, spec: dict, index: int, rng: random.Random) -> dict:
    topics = [
        ("urban gardens", "shahar bog'lari", "researchers noticed that small neighborhood gardens improved community participation"),
        ("ancient inks", "qadimgi siyohlar", "chemists compared mineral traces to identify where manuscripts were produced"),
        ("bird migration", "qushlar migratsiyasi", "biologists tracked seasonal routes and found that wind patterns changed travel time"),
        ("public libraries", "kutubxonalar", "a city report showed that extended library hours increased student attendance"),
        ("marine sensors", "dengiz sensorlari", "engineers used underwater sensors to measure changes in ocean temperature"),
    ]
    topic_en, topic_uz, evidence = topics[index % len(topics)]
    correct = ["B", "D", "A", "C"][index % 4]
    options_by_correct = {
        "A": {"A": "It directly matches the evidence in the text.", "B": "It is too broad.", "C": "It adds outside information.", "D": "It reverses the relationship."},
        "B": {"A": "It focuses on a minor detail.", "B": "It best follows the evidence in context.", "C": "It is too extreme.", "D": "It is unrelated to the claim."},
        "C": {"A": "It repeats words without answering the question.", "B": "It contradicts the evidence.", "C": "It is the most precise answer.", "D": "It goes beyond the text."},
        "D": {"A": "It is only partly true.", "B": "It ignores the key evidence.", "C": "It is grammatically possible but logically wrong.", "D": "It best completes the logic."},
    }[correct]
    passage = (
        f"A recent SATTEST practice passage about {topic_en} explains that {evidence}. "
        f"The author uses this detail to show a specific relationship rather than a general opinion."
    )
    question_text = _fallback_question_text(type_name, index)
    why_wrong = {key: f"{key} xato: {value}" for key, value in options_by_correct.items() if key != correct}
    return {
        "passage_or_sentence": passage,
        "question_text": question_text,
        "options": options_by_correct,
        "correct_answer": correct,
        "explanation_uz": (
            f"{correct} to'g'ri, chunki dalil: '{evidence}'. "
            f"Bu javob {type_name} strategiyasiga mos: avval savol turini aniqlaymiz, keyin matndan aniq dalil bilan tasdiqlaymiz."
        ),
        "why_wrong_uz": why_wrong,
        "meta": {"topic_uz": topic_uz, "generated_fallback": True, "variant": rng.randint(1000, 9999)},
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
