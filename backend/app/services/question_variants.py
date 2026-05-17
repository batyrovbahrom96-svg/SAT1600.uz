from copy import copy

from app.models import Question, QuestionChoice, QuestionFormat, QuestionSource, SATSection


def build_generated_variants(base_questions: list[Question], target_count: int) -> list[Question]:
    variants: list[Question] = []
    candidates = [question for question in base_questions if question.discrimination_score >= 0.35]
    for index, base in enumerate(candidates):
        if len(variants) >= target_count:
            break
        variant = copy(base)
        variant.id = base.id
        variant.source = QuestionSource.generated_variant
        variant.parent_question_id = base.id
        variant.prompt = _variant_prompt(base, index)
        variant.explanation = f"Generated variant of the same tested skill. {base.explanation}"
        variant.choices = _variant_choices(base)
        variants.append(variant)
    return variants


def _variant_prompt(base: Question, index: int) -> str:
    if base.section == SATSection.math:
        return f"{base.prompt} Use a changed value set for variant {index + 1}, then apply the same relationship."
    return f"{base.prompt} In this variant, focus on the author's exact claim before choosing."


def _variant_choices(base: Question) -> list[QuestionChoice]:
    if base.format == QuestionFormat.grid_in:
        return []
    return [copy(choice) for choice in base.choices]
