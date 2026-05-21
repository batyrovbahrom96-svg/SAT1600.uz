from collections import Counter
from dataclasses import dataclass, replace
from pathlib import Path
import random
import re

import matplotlib.pyplot as plt
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_session_local
from app.models import ChoiceTrapRole, Question, QuestionChoice, QuestionFormat, QuestionSource, SATSection, Test

TEST_TITLE = "SAT1600 Diagnostic Mock 1"
RW_DISTRACTOR_TAXONOMY = {"semantic_twin", "scope_error", "logic_flip"}
RW_HIGH_PLAUSIBILITY_TAXONOMY = {"semantic_twin", "scope_error"}
RW_GENERATION_PATTERNS = {
    "Vocabulary in Context": {"literal_vs_abstract", "functional_precision", "tone_alignment"},
    "Main Idea": {"example_vs_general", "study_vs_conclusion"},
    "Function": {"setup_refutation", "local_explanation", "evidence_support"},
    "Data Analysis": {"ranking_flip_threshold", "data_mapping_table"},
    "Command of Evidence": {"causal_chain_support", "weaken_origin_claim", "textual_claim_strength", "quantitative_trend_value"},
    "TEXT_STRUCTURE_FUNCTION": {"belief_vs_evidence", "claim_vs_refutation", "setup_vs_result"},
    "CROSS_TEXT_CONNECTION": {"claim_vs_empirical_evidence", "model_vs_data", "hypothesis_vs_revision"},
    "Inference": {"contradiction_inference", "expectation_violation", "causal_gap"},
    "Transitions": {"reinforcement", "clarification", "concession", "conclusion"},
    "Rhetorical Synthesis": {"compare", "contrast", "present_conclusion"},
    "Standard English Conventions": {
        "grammar_subject_verb",
        "grammar_clause_boundary",
        "grammar_modifier",
        "grammar_pronoun_reference",
        "referent_precision",
        "sentence_boundary_resolution",
        "appositive_structure",
        "modifier_attachment",
        "clause_integration",
        "punctuation_flow",
        "subject_reference_alignment",
    },
}
TRANSITION_TYPES = {
    "addition": ("moreover", "furthermore"),
    "contrast": ("however", "by contrast"),
    "cause_effect": ("therefore", "as a result", "hence"),
    "reinforcement": ("indeed", "in fact"),
    "clarification": ("specifically", "namely"),
    "example": ("for example", "for instance"),
    "concession": ("admittedly", "granted"),
    "sequence": ("then", "subsequently"),
    "conclusion": ("ultimately", "in conclusion"),
}
RHETORICAL_TASK_TYPES = {
    "compare",
    "contrast",
    "similarity",
    "summarize",
    "support_claim",
    "present_conclusion",
    "emphasize_difference",
    "emphasize_similarity",
}
TABLE_REASONING_PATTERNS = {
    "conditional_comparison",
    "claim_validation",
    "trend_exception",
    "multi_row_inference",
}
TABLE_CONSTRAINT_TYPES = {
    "subset_filtering",
    "comparison_across_rows_columns",
    "relationship_to_claim",
    "exception_detection",
}
TABLE_REQUIRED_SKILLS = {"scan_multiple_rows", "apply_condition"}
RW_PATTERN_REGISTRY = {
    "literal_vs_abstract": {
        "passage_template": "context redirects a word from literal sense to abstract sense",
        "logic_rule": "use the later constraint to choose the contextual meaning",
        "correct_answer_rule": "must fit the abstract role created by the context",
        "distractor_generators": ("literal_meaning", "near_synonym_wrong_context", "wrong_tone"),
    },
    "functional_precision": {
        "passage_template": "context narrows a word toward functional precision",
        "logic_rule": "choose the meaning that describes what the thing does",
        "correct_answer_rule": "must match the function specified by the later sentence",
        "distractor_generators": ("intensity_trap", "visual_trap", "wrong_register"),
    },
    "tone_alignment": {
        "passage_template": "context uses tone to disambiguate a word",
        "logic_rule": "align the meaning with the author's attitude",
        "correct_answer_rule": "must preserve the passage's evaluative tone",
        "distractor_generators": ("negative_tone_trap", "literal_trap", "scope_error"),
    },
    "example_vs_general": {
        "passage_template": "specific example supports a broader central claim",
        "logic_rule": "choose the general claim rather than the example alone",
        "correct_answer_rule": "must include the broader conclusion supported by the example",
        "distractor_generators": ("example_only", "overgeneralized_rule", "irrelevant_detail"),
    },
    "study_vs_conclusion": {
        "passage_template": "study details lead to a broader central conclusion",
        "logic_rule": "distinguish measured details from the conclusion they support",
        "correct_answer_rule": "must state the study's supported conclusion",
        "distractor_generators": ("study_detail_only", "wrong_variable", "unsupported_importance"),
    },
    "setup_refutation": {
        "passage_template": "opening expectation is later refuted",
        "logic_rule": "identify setup rather than final conclusion",
        "correct_answer_rule": "must describe the setup function precisely",
        "distractor_generators": ("mislabel_conclusion", "unrelated_detail", "too_general"),
    },
    "local_explanation": {
        "passage_template": "local mechanism explains a later claim",
        "logic_rule": "identify explanation function without broadening it",
        "correct_answer_rule": "must connect the detail to the later claim",
        "distractor_generators": ("broad_claim", "wrong_mechanism", "unrelated_background"),
    },
    "evidence_support": {
        "passage_template": "specific evidence supports a later claim",
        "logic_rule": "identify evidence by its role in supporting the claim",
        "correct_answer_rule": "must name the support relationship",
        "distractor_generators": ("mislabel_reaction", "wrong_focus", "too_general"),
    },
    "ranking_flip_threshold": {
        "passage_template": "ranked evidence with a threshold that flips the apparent winner",
        "logic_rule": "choose the claim that accounts for the threshold, not the surface ranking",
        "correct_answer_rule": "must mention the post-threshold reversal",
        "distractor_generators": ("surface_rank", "pre_threshold_scope", "logic_flip"),
    },
    "causal_chain_support": {
        "passage_template": "cause chain with one delayed support link",
        "logic_rule": "identify the link that supports the final causal claim",
        "correct_answer_rule": "must preserve the full cause-to-effect sequence",
        "distractor_generators": ("missing_link", "reverse_cause", "overbroad_cause"),
    },
    "contradiction_inference": {
        "passage_template": "expectation followed by contrasting result",
        "logic_rule": "infer the limited conclusion created by the contradiction",
        "correct_answer_rule": "must explain the contradiction without overgeneralizing",
        "distractor_generators": ("denies_result", "restates_expectation", "extreme_inference"),
    },
    "expectation_violation": {
        "passage_template": "expected pattern is violated by a qualifying condition",
        "logic_rule": "infer the condition that limits the expectation",
        "correct_answer_rule": "must preserve the qualified violation",
        "distractor_generators": ("denies_expectation", "overgeneralizes_result", "wrong_condition"),
    },
    "causal_gap": {
        "passage_template": "apparent cause is complicated by an alternative explanation",
        "logic_rule": "avoid treating timing as proof of cause",
        "correct_answer_rule": "must identify the causal uncertainty",
        "distractor_generators": ("false_cause", "denies_effect", "extreme_causal_claim"),
    },
    "data_mapping_table": {
        "passage_template": "compact data table described in prose with irrelevant detail",
        "logic_rule": "map the correct row and column before drawing a claim",
        "correct_answer_rule": "must use the matching data point and qualifier",
        "distractor_generators": ("wrong_row", "wrong_column", "unqualified_data_claim"),
    },
    "weaken_origin_claim": {
        "passage_template": "origin claim weakened by earlier or alternative evidence",
        "logic_rule": "select the evidence that weakens an origin explanation",
        "correct_answer_rule": "must introduce earlier or competing origin evidence",
        "distractor_generators": ("supports_origin", "irrelevant_detail", "too_broad_history"),
    },
    "textual_claim_strength": {
        "passage_template": "compressed scholarly claim with related but nondecisive evidence",
        "logic_rule": "match evidence to the precise strength of the claim",
        "correct_answer_rule": "must support the qualified claim without overextending it",
        "distractor_generators": ("merely_related", "overstrong_claim", "wrong_relevance"),
    },
    "quantitative_trend_value": {
        "passage_template": "small table with trend and value both available",
        "logic_rule": "distinguish trend direction from individual values",
        "correct_answer_rule": "must use exact data relationship and variable direction",
        "distractor_generators": ("wrong_variable", "trend_value_confusion", "inverted_direction"),
    },
    "belief_vs_evidence": {
        "passage_template": "target sentence states a belief later tested against evidence",
        "logic_rule": "identify the target as a belief or claim that later evidence qualifies",
        "correct_answer_rule": "must name the target sentence's precise function as a belief being evaluated",
        "distractor_generators": ("mislabel_as_evidence", "too_general_context", "wrong_focus"),
    },
    "claim_vs_refutation": {
        "passage_template": "target sentence introduces a claim that later information refutes",
        "logic_rule": "separate the claim setup from the refuting result",
        "correct_answer_rule": "must identify the target as a claim set up for later challenge",
        "distractor_generators": ("mislabel_as_conclusion", "too_general_context", "wrong_focus"),
    },
    "setup_vs_result": {
        "passage_template": "target sentence prepares a contrast before the result resolves it",
        "logic_rule": "identify the target as contrast setup rather than outcome",
        "correct_answer_rule": "must identify the target as setup for the later result",
        "distractor_generators": ("mislabel_as_result", "too_general_context", "wrong_focus"),
    },
    "claim_vs_empirical_evidence": {
        "passage_template": "Text 1 presents a claim and Text 2 responds with empirical evidence",
        "logic_rule": "compare Text 2's evidence-based stance with Text 1's claim",
        "correct_answer_rule": "must state whether Text 2 supports, contradicts, or modifies Text 1",
        "distractor_generators": ("irrelevant_detail", "partial_agreement", "wrong_direction"),
    },
    "model_vs_data": {
        "passage_template": "Text 1 proposes a model and Text 2 weighs it against data",
        "logic_rule": "recognize that Text 2 reframes the model using measured evidence",
        "correct_answer_rule": "must identify Text 2's qualified response to the model",
        "distractor_generators": ("irrelevant_detail", "partial_agreement", "wrong_direction"),
    },
    "hypothesis_vs_revision": {
        "passage_template": "Text 1 offers a hypothesis and Text 2 revises its scope",
        "logic_rule": "compare the original hypothesis with the revised limitation",
        "correct_answer_rule": "must identify Text 2's modification of Text 1's claim",
        "distractor_generators": ("irrelevant_detail", "partial_agreement", "wrong_direction"),
    },
    "reinforcement": {
        "passage_template": "second sentence strengthens an already stated claim",
        "logic_rule": "choose a transition that reinforces rather than merely adds or concludes",
        "correct_answer_rule": "must preserve discourse reinforcement",
        "distractor_generators": ("addition_valid_syntax", "cause_effect_valid_syntax", "concession_valid_syntax"),
    },
    "clarification": {
        "passage_template": "second sentence narrows a broad claim with a specific restatement",
        "logic_rule": "choose a transition that clarifies, not contrasts or exemplifies loosely",
        "correct_answer_rule": "must signal clarification",
        "distractor_generators": ("example_valid_syntax", "reinforcement_valid_syntax", "sequence_valid_syntax"),
    },
    "concession": {
        "passage_template": "first clause admits a limitation before preserving the claim",
        "logic_rule": "choose a concession marker that fits the limited admission",
        "correct_answer_rule": "must mark concession without reversing the argument",
        "distractor_generators": ("contrast_valid_syntax", "cause_effect_valid_syntax", "conclusion_valid_syntax"),
    },
    "conclusion": {
        "passage_template": "final sentence compresses prior evidence into a cautious conclusion",
        "logic_rule": "choose a conclusion marker, not cause or clarification",
        "correct_answer_rule": "must signal summary conclusion",
        "distractor_generators": ("clarification_valid_syntax", "reinforcement_valid_syntax", "sequence_valid_syntax"),
    },
    "compare": {
        "passage_template": "notes about two subjects with overlap and difference",
        "logic_rule": "select and compress relationship-relevant notes",
        "correct_answer_rule": "must compare both subjects on the stated dimension",
        "distractor_generators": ("single_subject_true_note", "wrong_relationship", "irrelevant_true_detail"),
    },
    "contrast": {
        "passage_template": "notes about two subjects where the goal is to emphasize difference",
        "logic_rule": "filter notes to foreground contrast",
        "correct_answer_rule": "must emphasize a relevant difference without losing shared context",
        "distractor_generators": ("similarity_instead", "single_subject_true_note", "irrelevant_true_detail"),
    },
    "present_conclusion": {
        "passage_template": "notes requiring filtering before a conclusion",
        "logic_rule": "combine only notes that support the intended conclusion",
        "correct_answer_rule": "must state a concise conclusion from relevant notes",
        "distractor_generators": ("true_but_background", "unsupported_generalization", "wrong_note_combination"),
    },
    "grammar_subject_verb": {
        "passage_template": "one sentence with intervening phrase between subject and verb",
        "logic_rule": "match the verb to the grammatical subject only",
        "correct_answer_rule": "must use correct subject-verb agreement",
        "distractor_generators": ("attraction_error", "tense_drift", "number_flip"),
    },
    "grammar_clause_boundary": {
        "passage_template": "one boundary between two clauses",
        "logic_rule": "choose punctuation that joins or separates clauses correctly",
        "correct_answer_rule": "must fix only the clause boundary",
        "distractor_generators": ("comma_splice", "fragment", "run_on"),
    },
    "grammar_modifier": {
        "passage_template": "one opening modifier with one intended noun",
        "logic_rule": "place the modified noun immediately after the modifier",
        "correct_answer_rule": "must avoid a dangling or misplaced modifier",
        "distractor_generators": ("dangling_modifier", "misplaced_modifier", "illogical_subject"),
    },
    "grammar_pronoun_reference": {
        "passage_template": "one pronoun with two possible antecedents",
        "logic_rule": "choose the pronoun/reference that removes ambiguity",
        "correct_answer_rule": "must identify the intended antecedent clearly",
        "distractor_generators": ("ambiguous_pronoun", "wrong_antecedent", "number_mismatch"),
    },
    "referent_precision": {
        "passage_template": "two plausible referents with one intended entity",
        "logic_rule": "choose wording that preserves the intended referent",
        "correct_answer_rule": "must resolve reference without changing meaning",
        "distractor_generators": ("ambiguous_referent", "wrong_referent", "overexplicit_shift"),
    },
    "sentence_boundary_resolution": {
        "passage_template": "adjacent clauses with a hidden boundary relationship",
        "logic_rule": "choose punctuation that resolves clause structure only",
        "correct_answer_rule": "must preserve both clauses without splice or fragment",
        "distractor_generators": ("comma_splice_natural", "fragment_natural", "overjoined_clause"),
    },
    "appositive_structure": {
        "passage_template": "nonessential identifying phrase embedded in a sentence",
        "logic_rule": "choose punctuation that marks an appositive and preserves flow",
        "correct_answer_rule": "must set off nonessential appositive only",
        "distractor_generators": ("missing_comma", "restrictive_shift", "flow_break"),
    },
    "modifier_attachment": {
        "passage_template": "opening modifier with two plausible nouns",
        "logic_rule": "attach modifier to the intended noun without changing tense or meaning",
        "correct_answer_rule": "must place intended noun next to modifier",
        "distractor_generators": ("nearby_wrong_noun", "dangling_but_smooth", "meaning_preserving_misattach"),
    },
    "clause_integration": {
        "passage_template": "one dependent idea must be integrated into an independent clause",
        "logic_rule": "choose structure that integrates the clause without creating a fragment",
        "correct_answer_rule": "must subordinate or coordinate exactly one relationship",
        "distractor_generators": ("fragment_smooth", "run_on_smooth", "relationship_shift"),
    },
    "punctuation_flow": {
        "passage_template": "sentence with one punctuation choice affecting reading flow",
        "logic_rule": "choose punctuation that preserves intended emphasis and grammar",
        "correct_answer_rule": "must maintain flow without over-separating",
        "distractor_generators": ("overpause", "underpause", "meaning_shift"),
    },
    "subject_reference_alignment": {
        "passage_template": "subject reference delayed by an interrupting phrase",
        "logic_rule": "align the subject reference with the intended actor",
        "correct_answer_rule": "must preserve actor-action alignment",
        "distractor_generators": ("actor_swap", "passive_ambiguity", "reference_drift"),
    },
}


@dataclass(frozen=True)
class ChoiceSpec:
    label: str
    text: str
    role: ChoiceTrapRole
    basis: str


@dataclass(frozen=True)
class QuestionSpec:
    section: SATSection
    module: int
    order_index: int
    difficulty: int
    adaptive_level: str
    source: QuestionSource
    topic: str
    subtopic: str
    structure_key: str
    passage: str | None
    prompt: str
    correct_answer: str
    explanation: str
    trap_type: str
    question_type: str
    format: QuestionFormat
    estimated_time: int
    discrimination_score: float
    choices: tuple[ChoiceSpec, ...] = ()
    graph_path: str | None = None
    graph_reasoning_type: str | None = None
    graph_required: bool = False
    data_type: str = "none"
    data_payload: dict | None = None


@dataclass(frozen=True)
class AmbiguityFirstItem:
    generation_pattern: str
    ambiguous_passage: str
    constraint_sentence: str
    prompt: str
    answer_options: tuple[str, str, str, str]
    correct_index: int
    topic: str
    subtopic: str
    question_type: str
    trap_type: str
    explanation: str
    constraints_required: int = 1
    data_type: str = "text_data"
    data_payload: dict | None = None


@dataclass(frozen=True)
class RWModuleSlot:
    slot_key: str
    question_type: str
    pattern: str
    difficulty: int


RW_FIXED_MODULE1_SLOT_KEYS = [
    "vocab_easy",
    "vocab_context",
    "central_detail",
    "inference_easy",
    "text_structure_basic",
    "evidence_support",
    "cross_text_basic",
    "cross_text_response",
    "central_competing",
    "inference_combined",
    "quant_table_support",
    "evidence_weaken",
    "evidence_support_harder",
    "quant_table_mapping",
    "inference_hypothesis",
    "grammar_sva",
    "grammar_modifier",
    "grammar_boundary",
    "grammar_ambiguous_boundary",
    "grammar_pronoun",
    "transition_logic",
    "transition_subtle",
    "transition_precision",
    "transition_hard",
    "rhetorical_contrast",
    "rhetorical_conclusion",
    "rhetorical_comparison",
]


RW_MODULE_BLUEPRINT: tuple[RWModuleSlot, ...] = (
    RWModuleSlot("vocab_easy", "Vocabulary in Context", "literal_vs_abstract", 3),
    RWModuleSlot("vocab_context", "Vocabulary in Context", "functional_precision", 3),
    RWModuleSlot("central_detail", "Main Idea", "study_vs_conclusion", 4),
    RWModuleSlot("inference_easy", "Inference", "expectation_violation", 4),
    RWModuleSlot("text_structure_basic", "TEXT_STRUCTURE_FUNCTION", "setup_vs_result", 4),
    RWModuleSlot("evidence_support", "Function", "evidence_support", 5),
    RWModuleSlot("cross_text_basic", "CROSS_TEXT_CONNECTION", "claim_vs_empirical_evidence", 5),
    RWModuleSlot("cross_text_response", "CROSS_TEXT_CONNECTION", "model_vs_data", 5),
    RWModuleSlot("central_competing", "Main Idea", "example_vs_general", 6),
    RWModuleSlot("inference_combined", "Inference", "causal_gap", 6),
    RWModuleSlot("quant_table_support", "Command of Evidence", "quantitative_trend_value", 6),
    RWModuleSlot("evidence_weaken", "Command of Evidence", "weaken_origin_claim", 6),
    RWModuleSlot("evidence_support_harder", "Command of Evidence", "textual_claim_strength", 7),
    RWModuleSlot("quant_table_mapping", "Data Analysis", "data_mapping_table", 7),
    RWModuleSlot("inference_hypothesis", "CROSS_TEXT_CONNECTION", "hypothesis_vs_revision", 7),
    RWModuleSlot("grammar_sva", "Standard English Conventions", "grammar_subject_verb", 7),
    RWModuleSlot("grammar_modifier", "Standard English Conventions", "grammar_modifier", 7),
    RWModuleSlot("grammar_boundary", "Standard English Conventions", "grammar_clause_boundary", 7),
    RWModuleSlot("grammar_ambiguous_boundary", "Standard English Conventions", "sentence_boundary_resolution", 8),
    RWModuleSlot("grammar_pronoun", "Standard English Conventions", "grammar_pronoun_reference", 8),
    RWModuleSlot("transition_logic", "Transitions", "reinforcement", 8),
    RWModuleSlot("transition_subtle", "Transitions", "clarification", 9),
    RWModuleSlot("transition_precision", "Transitions", "concession", 9),
    RWModuleSlot("transition_hard", "Transitions", "conclusion", 9),
    RWModuleSlot("rhetorical_contrast", "Rhetorical Synthesis", "contrast", 10),
    RWModuleSlot("rhetorical_conclusion", "Rhetorical Synthesis", "present_conclusion", 10),
    RWModuleSlot("rhetorical_comparison", "Rhetorical Synthesis", "compare", 10),
)


def seed() -> None:
    db = get_session_local()()
    try:
        create_sample_graph()
        test = db.execute(select(Test).where(Test.title == TEST_TITLE)).scalar_one_or_none()
        if not test:
            test = Test(title=TEST_TITLE, description="Database-driven adaptive Digital SAT diagnostic.", is_active=True)
            db.add(test)
            db.flush()
        else:
            test.description = "Database-driven adaptive Digital SAT diagnostic."
            test.is_active = True

        specs = build_question_bank()
        existing_questions = (
            db.execute(
                select(Question)
                .where(Question.test_id == test.id)
                .options(selectinload(Question.choices))
            )
            .scalars()
            .unique()
            .all()
        )
        by_slot = {(question.section, question.module, question.order_index): question for question in existing_questions}
        wanted_slots = {(spec.section, spec.module, spec.order_index) for spec in specs}
        for question in existing_questions:
            if (question.section, question.module, question.order_index) not in wanted_slots:
                question.is_active = False
                question.validation_status = "disabled"
                question.validation_notes = "Disabled by seed refresh because it is outside the current SAT module blueprint."
        for spec in specs:
            question = by_slot.get((spec.section, spec.module, spec.order_index))
            if not question:
                question = Question(test_id=test.id, section=spec.section, module=spec.module, order_index=spec.order_index)
                db.add(question)
            apply_question_spec(question, spec)
            db.flush()
            sync_choices(db, question, spec.choices)

        db.commit()
        print(f"Seeded or refreshed {len(specs)} SAT questions for {TEST_TITLE}.")
    finally:
        db.close()


def apply_question_spec(question: Question, spec: QuestionSpec) -> None:
    question.difficulty = spec.difficulty
    question.adaptive_level = spec.adaptive_level
    question.source = spec.source
    question.topic = spec.topic
    question.subtopic = spec.subtopic
    question.structure_key = spec.structure_key
    question.graph_path = spec.graph_path
    question.graph_reasoning_type = spec.graph_reasoning_type
    question.graph_required = spec.graph_required
    question.data_type = spec.data_type
    question.data_payload = spec.data_payload or {}
    question.passage = spec.passage
    question.prompt = spec.prompt
    question.correct_answer = spec.correct_answer
    question.explanation = spec.explanation
    question.trap_type = spec.trap_type
    question.question_type = spec.question_type
    question.format = spec.format
    question.estimated_time = spec.estimated_time
    question.discrimination_score = spec.discrimination_score
    question.is_active = True
    if question.validation_status in {None, "disabled"}:
        question.validation_status = "needs_review"


def sync_choices(db, question: Question, specs: tuple[ChoiceSpec, ...]) -> None:
    existing = {choice.label: choice for choice in question.choices}
    wanted = {choice.label for choice in specs}
    for choice in list(question.choices):
        if choice.label not in wanted:
            db.delete(choice)
    for spec in specs:
        choice = existing.get(spec.label)
        if not choice:
            choice = QuestionChoice(question_id=question.id, label=spec.label)
            db.add(choice)
        choice.text = spec.text
        choice.trap_role = spec.role
        choice.error_basis = spec.basis


def build_question_bank() -> list[QuestionSpec]:
    validate_rw_pattern_registry()
    validate_rw_module_blueprint()
    questions: list[QuestionSpec] = []
    for module in (1, 2):
        module_questions: list[QuestionSpec] = []
        for index in range(27):
            module_questions.append(reading_writing_question(module, index))
        module_questions = apply_answer_distribution(module_questions, seed=f"rw-module-{module}")
        validate_answer_distribution(module_questions)
        for question in module_questions:
            validate_reading_writing_spec(question)
            validate_choice_label_order(question)
            validate_question_data_contract(question)
            questions.append(question)
    for module in (1, 2):
        module_questions = []
        for index in range(22):
            module_questions.append(math_question(module, index))
        module_questions = apply_answer_distribution(module_questions, seed=f"math-module-{module}")
        validate_answer_distribution(module_questions)
        for question in module_questions:
            validate_choice_label_order(question)
            validate_question_data_contract(question)
            questions.append(question)
    return questions


def apply_answer_distribution(module_questions: list[QuestionSpec], *, seed: str) -> list[QuestionSpec]:
    multiple_choice_questions = [
        question
        for question in module_questions
        if question.format == QuestionFormat.multiple_choice and len(question.choices) == 4
    ]
    if not multiple_choice_questions:
        return module_questions

    rng = random.Random(f"{TEST_TITLE}:{seed}")
    answer_cycle = ["A", "B", "C", "D"]
    start_index = rng.randrange(len(answer_cycle))
    target_labels = [answer_cycle[(start_index + index) % len(answer_cycle)] for index in range(len(multiple_choice_questions))]
    target_labels = randomize_hard_zone_targets(multiple_choice_questions, target_labels, rng)

    target_by_order = {
        question.order_index: target_label
        for question, target_label in zip(multiple_choice_questions, target_labels, strict=True)
    }
    redistributed: list[QuestionSpec] = []
    for question in module_questions:
        target_label = target_by_order.get(question.order_index)
        if target_label is None:
            redistributed.append(question)
            continue
        redistributed.append(assign_correct_answer_label(question, target_label, rng))
    return redistributed


def randomize_hard_zone_targets(questions: list[QuestionSpec], target_labels: list[str], rng: random.Random) -> list[str]:
    hard_positions = [
        index
        for index, question in enumerate(questions)
        if question.section == SATSection.reading_writing and question.order_index >= 18
    ]
    if len(hard_positions) < 2:
        return target_labels

    original = list(target_labels)
    hard_labels = [target_labels[index] for index in hard_positions]
    for _ in range(80):
        shuffled = list(hard_labels)
        rng.shuffle(shuffled)
        candidate = list(original)
        for position, label in zip(hard_positions, shuffled, strict=True):
            candidate[position] = label
        if not has_three_consecutive(candidate):
            return candidate
    return original


def assign_correct_answer_label(question: QuestionSpec, target_label: str, rng: random.Random) -> QuestionSpec:
    correct_choices = [choice_spec for choice_spec in question.choices if choice_spec.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        raise ValueError(f"Cannot distribute answers without exactly one correct choice: {question.question_type}.")

    correct_choice = correct_choices[0]
    distractors = [choice_spec for choice_spec in question.choices if choice_spec.role != ChoiceTrapRole.correct]
    rng.shuffle(distractors)
    remaining_labels = [label for label in ("A", "B", "C", "D") if label != target_label]
    relabeled_choices = [replace(correct_choice, label=target_label)]
    relabeled_choices.extend(
        replace(choice_spec, label=label)
        for label, choice_spec in zip(remaining_labels, distractors, strict=True)
    )
    relabeled_choices.sort(key=lambda choice_spec: choice_spec.label)
    return replace(question, correct_answer=target_label, choices=tuple(relabeled_choices))


def validate_answer_distribution(module_questions: list[QuestionSpec]) -> None:
    labels = [
        question.correct_answer
        for question in module_questions
        if question.format == QuestionFormat.multiple_choice and len(question.choices) == 4
    ]
    if not labels:
        return
    if has_three_consecutive(labels):
        raise ValueError(f"Answer distribution has three identical answers in a row: {labels}.")

    counts = Counter(labels)
    if set(counts) - {"A", "B", "C", "D"}:
        raise ValueError(f"Answer distribution contains invalid labels: {counts}.")
    if max(counts.values()) - min(counts.get(label, 0) for label in ("A", "B", "C", "D")) > 1:
        raise ValueError(f"Answer distribution is too skewed in module: {counts}.")


def validate_choice_label_order(question: QuestionSpec) -> None:
    if question.format != QuestionFormat.multiple_choice:
        return
    rendered_labels = [choice_spec.label for choice_spec in question.choices]
    if rendered_labels != ["A", "B", "C", "D"]:
        raise ValueError(f"Rendered answer labels must be A/B/C/D for {question.question_type}: {rendered_labels}.")
    correct_choices = [choice_spec for choice_spec in question.choices if choice_spec.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1 or correct_choices[0].label != question.correct_answer:
        raise ValueError(f"Correct answer integrity failed after label remapping for {question.question_type}.")


def has_three_consecutive(labels: list[str]) -> bool:
    return any(labels[index] == labels[index + 1] == labels[index + 2] for index in range(len(labels) - 2))


def adaptive_level(module: int, index: int) -> str:
    if module == 1:
        return "standard"
    return ("hard", "medium", "easy")[index % 3]


def difficulty_for(module: int, index: int) -> int:
    if module == 1:
        return 3 + (index % 5)
    return {"easy": 3, "medium": 6, "hard": 8}[adaptive_level(module, index)] + (index % 2)


def rw_difficulty_for(index: int) -> int:
    return RW_MODULE_BLUEPRINT[index].difficulty


def source_for(index: int) -> QuestionSource:
    return QuestionSource.generated_variant if index % 10 in (7, 8, 9) else QuestionSource.database


def reading_writing_question(module: int, index: int) -> QuestionSpec:
    slot = RW_MODULE_BLUEPRINT[index]
    spec = generate(slot.question_type, slot.pattern, module=module, index=index)
    validate_reading_writing_spec(spec)
    validate_reading_writing_slot(spec, slot, index)
    return spec


def generate(question_type: str, pattern: str, *, module: int, index: int) -> QuestionSpec:
    return rw_ambiguity_first_base(module, index, rw_pattern_item(question_type, pattern))


def rw_pattern_item(question_type: str, pattern: str) -> AmbiguityFirstItem:
    items: dict[tuple[str, str], AmbiguityFirstItem] = {
        ("Vocabulary in Context", "literal_vs_abstract"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, the curator described the restored mural as bright, a word that could refer to color or to the idea behind the design. "
                "The pigments often remained muted after cleaning."
            ),
            constraint_sentence="However, the arrangement made the once-confusing political symbols easier for visitors to interpret.",
            prompt="As used in the text, what does \"bright\" most nearly mean?",
            answer_options=("visually intense", "not dull in color", "cheerful in tone", "intellectually clear"),
            correct_index=3,
            topic="Vocabulary in Context",
            subtopic="Pattern: literal_vs_abstract",
            question_type="Vocabulary in Context",
            trap_type="literal meaning trap",
            explanation="The opening makes a literal color sense tempting, but the correction sentence shifts bright toward abstract clarity.",
        ),
        ("Vocabulary in Context", "functional_precision"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Early field notes called the sensor's reading sharp, and several interpretations of the word seemed possible. "
                "The device often detected tiny changes, though the display itself was plain."
            ),
            constraint_sentence="However, the researchers valued the reading because it distinguished neighboring temperature changes that older tools merged.",
            prompt="As used in the text, what does \"sharp\" most nearly mean?",
            answer_options=("severe", "finely precise", "sudden", "visually crisp"),
            correct_index=3,
            topic="Vocabulary in Context",
            subtopic="Pattern: functional_precision",
            question_type="Vocabulary in Context",
            trap_type="precision versus intensity trap",
            explanation="The passage delays clarity until the function of distinguishing close values makes precision the controlling sense.",
        ),
        ("Vocabulary in Context", "tone_alignment"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, the review called the memoir restrained, which may sound like criticism. "
                "The reviewer often praised the writer's refusal to dramatize painful scenes."
            ),
            constraint_sentence="However, the quiet tone made the final chapter feel more trustworthy rather than less emotional.",
            prompt="As used in the text, what does \"restrained\" most nearly mean?",
            answer_options=("prevented from acting", "emotionally limited", "lacking detail", "controlled in expression"),
            correct_index=3,
            topic="Vocabulary in Context",
            subtopic="Pattern: tone_alignment",
            question_type="Vocabulary in Context",
            trap_type="tone misread trap",
            explanation="The positive tone of the review makes controlled expression a better fit than a negative sense of limitation.",
        ),
        ("Function", "setup_refutation"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Several archaeologists expected the broken pottery to be ordinary kitchen waste. "
                "The passage initially describes that expectation in some detail, although it may seem like background."
            ),
            constraint_sentence="However, the next sentence notes traces of rare pigment on the pieces, challenging the kitchen-waste explanation.",
            prompt="What is the main function of the expectation described in the first sentence?",
            answer_options=("It summarizes the author's final claim.", "It identifies a view the later evidence complicates.", "It gives an example unrelated to the evidence.", "It provides a setup that the later evidence partly refutes."),
            correct_index=3,
            topic="Function",
            subtopic="Pattern: setup_refutation",
            question_type="Function",
            trap_type="setup-refutation trap",
            explanation="The expectation is not the conclusion; it is a setup that later evidence pushes against.",
        ),
        ("Function", "local_explanation"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The author pauses to describe how moss absorbs water through leaflike structures rather than roots. "
                "At first, this detail may seem like a digression, and the paragraph often moves slowly here."
            ),
            constraint_sentence="However, the following sentence uses the detail to explain why moss responded quickly after the dry spell ended.",
            prompt="What is the main function of the detail about moss structure?",
            answer_options=("It introduces a competing species.", "It explains a mechanism needed for the later claim.", "It proves that roots are unimportant in all plants.", "It supplies a local explanation for the moss's quick response."),
            correct_index=3,
            topic="Function",
            subtopic="Pattern: local_explanation",
            question_type="Function",
            trap_type="local explanation trap",
            explanation="The detail locally explains the response rather than making a broad botanical claim.",
        ),
        ("Function", "evidence_support"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The passage mentions that recordings from three neighborhoods showed the same late-night noise pattern. "
                "Several details could seem merely descriptive, and the author often avoids stating the conclusion immediately."
            ),
            constraint_sentence="However, the repeated pattern supports the claim that the sound came from a scheduled rail-cleaning machine.",
            prompt="What is the main function of the neighborhood recordings?",
            answer_options=("They create a contrast with rail schedules.", "They provide evidence for the source of the sound.", "They describe residents' reactions to noise.", "They support the claim by showing the pattern was repeated."),
            correct_index=3,
            topic="Function",
            subtopic="Pattern: evidence_support",
            question_type="Function",
            trap_type="evidence role trap",
            explanation="The recordings are evidence; the subtlety is that their repetition, not their location alone, supports the claim.",
        ),
        ("Main Idea", "example_vs_general"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The text begins with a study of one library that added evening hours and saw more student visits. "
                "At first, the example may seem to be the whole point."
            ),
            constraint_sentence="However, the author uses it to argue that public services often work best when schedules reflect users' actual routines.",
            prompt="Which choice best states the main idea of the text?",
            answer_options=("One library increased student visits by adding evening hours.", "Libraries should always stay open at night.", "Student routines are difficult for libraries to measure.", "A specific library example supports a broader claim about adapting services to users' routines."),
            correct_index=3,
            topic="Main Idea",
            subtopic="Pattern: example_vs_general",
            question_type="Main Idea",
            trap_type="example versus general claim trap",
            explanation="The example is tempting, but the final sentence shifts from one library to a general service-design claim.",
        ),
        ("Main Idea", "study_vs_conclusion"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A study tracked urban bees that visited balcony gardens, park flowers, and roadside plants. "
                "Several measurements may seem important on their own."
            ),
            constraint_sentence="However, the researchers concluded that small scattered habitats can often function together as a connected food network.",
            prompt="Which choice best states the main idea of the text?",
            answer_options=("Urban bees visit balcony gardens, parks, and roadside plants.", "The study measured more than one type of urban habitat.", "Roadside plants are the most important food source for bees.", "A study of bee visits suggests scattered city habitats may operate as a connected network."),
            correct_index=3,
            topic="Main Idea",
            subtopic="Pattern: study_vs_conclusion",
            question_type="Main Idea",
            trap_type="study detail versus conclusion trap",
            explanation="The measurements matter because they support the broader conclusion about connected habitats.",
        ),
        ("Cross-Text Connections", "claim_vs_evidence"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Text 1 claims that a poet's short lines mainly create speed. Text 2 notes that the same short lines often force readers to pause over isolated images. "
                "At first, the texts may seem to discuss the same feature in agreement."
            ),
            constraint_sentence="However, Text 2 uses evidence about reader pauses to complicate Text 1's claim about speed.",
            prompt="How would the author of Text 2 most likely respond to Text 1?",
            answer_options=("By accepting Text 1's claim without qualification", "By adding evidence that narrows Text 1's interpretation", "By rejecting the importance of line length entirely", "By arguing that Text 1 overlooks evidence that short lines can slow readers down"),
            correct_index=3,
            topic="Cross-Text Connections",
            subtopic="Pattern: claim_vs_evidence",
            question_type="Cross-Text Connections",
            trap_type="claim versus evidence trap",
            explanation="Text 2 does not simply disagree; it uses evidence to challenge the completeness of Text 1's claim.",
        ),
        ("Cross-Text Connections", "agreement_shift"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Text 1 argues that community gardens may strengthen neighborhood ties. Text 2 agrees that such gardens often create meeting places. "
                "At first, the two authors appear fully aligned."
            ),
            constraint_sentence="However, Text 2 adds that the effect tends to fade when residents do not share responsibility for maintenance.",
            prompt="Which choice best describes the relationship between the two texts?",
            answer_options=("Text 2 completely rejects Text 1's claim.", "Text 2 agrees with Text 1 but adds a condition.", "Text 2 discusses a different topic from Text 1.", "Text 2 qualifies Text 1's claim by identifying a condition for the effect."),
            correct_index=3,
            topic="Cross-Text Connections",
            subtopic="Pattern: agreement_shift",
            question_type="Cross-Text Connections",
            trap_type="agreement shift trap",
            explanation="The second text begins in agreement but shifts by adding a maintenance condition.",
        ),
        ("TEXT_STRUCTURE_FUNCTION", "belief_vs_evidence"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Several marine historians initially believed that coastal bells were used mainly to warn ships away from shallow reefs. "
                "That belief seemed reasonable because early harbor maps often marked bells near dangerous channels."
            ),
            constraint_sentence="However, maintenance logs show that some bells were moved inland during fog season, where they helped workers coordinate unloading rather than guide ships. Together, the records and logs make the original explanation less complete.",
            prompt="Which choice best describes the function of the underlined sentence in the text as a whole?",
            answer_options=("It presents evidence proving that bells were used only for navigation.", "It gives general background about harbor maps without connecting to the argument.", "It shifts the focus from ships to dockworkers.", "It states a belief that the later evidence complicates."),
            correct_index=3,
            topic="TEXT_STRUCTURE_FUNCTION",
            subtopic="Pattern: belief_vs_evidence",
            question_type="TEXT_STRUCTURE_FUNCTION",
            trap_type="belief versus evidence trap",
            explanation="The target is a belief/claim, not evidence; the logs later qualify it.",
            constraints_required=2,
            data_payload={
                "target_sentence": "That belief seemed reasonable because early harbor maps often marked bells near dangerous channels.",
                "target_role": "belief / claim",
            },
        ),
        ("TEXT_STRUCTURE_FUNCTION", "claim_vs_refutation"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A botanist argued that the pale leaves on several alpine plants were simply signs of poor nutrition. "
                "The claim initially fit observations from lower elevations, where nutrient-poor soil often produces similar coloring."
            ),
            constraint_sentence="However, later tests showed that the alpine leaves reflected a waxy coating that reduced water loss, not a nutritional problem. The newer evidence made the original explanation seem too narrow.",
            prompt="Which choice best describes the function of the underlined sentence in the text as a whole?",
            answer_options=("It reports the later test result that resolves the passage.", "It offers a broad description of alpine plants without advancing the argument.", "It introduces evidence that confirms the botanist's claim.", "It presents a claim whose apparent support is later overturned."),
            correct_index=3,
            topic="TEXT_STRUCTURE_FUNCTION",
            subtopic="Pattern: claim_vs_refutation",
            question_type="TEXT_STRUCTURE_FUNCTION",
            trap_type="claim versus refutation trap",
            explanation="The target functions as claim setup; the later tests refute its explanation.",
            constraints_required=2,
            data_payload={
                "target_sentence": "The claim initially fit observations from lower elevations, where nutrient-poor soil often produces similar coloring.",
                "target_role": "contrast setup",
            },
        ),
        ("TEXT_STRUCTURE_FUNCTION", "setup_vs_result"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Engineers expected a lightweight bridge panel could vibrate more than the older steel panel. "
                "At first, the expectation seemed likely because the new material was thinner and less dense."
            ),
            constraint_sentence="However, embedded ribs distributed force across the panel, and measurements showed less vibration than in the older design. The measurements therefore reversed what the initial expectation made likely.",
            prompt="Which choice best describes the function of the underlined sentence in the text as a whole?",
            answer_options=("It states the final result of the engineering test.", "It provides unrelated information about material cost.", "It offers evidence that the older panel was badly designed.", "It sets up an expectation that the later measurements challenge."),
            correct_index=3,
            topic="TEXT_STRUCTURE_FUNCTION",
            subtopic="Pattern: setup_vs_result",
            question_type="TEXT_STRUCTURE_FUNCTION",
            trap_type="setup versus result trap",
            explanation="The target is not the result; it sets up an expectation that later evidence reverses.",
            constraints_required=2,
            data_payload={
                "target_sentence": "At first, the expectation seemed likely because the new material was thinner and less dense.",
                "target_role": "hypothesis",
            },
        ),
        ("CROSS_TEXT_CONNECTION", "claim_vs_empirical_evidence"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Text 1: Some art historians claim that patrons chose miniature portraits mainly because they were inexpensive substitutes for larger paintings. "
                "Text 2: However, purchase records show that several miniatures cost nearly as much as full-size portraits, and buyers often described them as private keepsakes."
            ),
            constraint_sentence="Although both texts discuss why patrons chose miniatures, Text 2 uses evidence to revise Text 1's economic explanation.",
            prompt="Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
            answer_options=("By noting that the records include prices for full-size portraits.", "By partly agreeing that cost mattered in every case.", "By arguing that miniatures were never purchased by wealthy patrons.", "By saying the claim is incomplete because evidence points to personal use as well as price."),
            correct_index=3,
            topic="CROSS_TEXT_CONNECTION",
            subtopic="Pattern: claim_vs_empirical_evidence",
            question_type="CROSS_TEXT_CONNECTION",
            trap_type="claim versus empirical evidence trap",
            explanation="Text 2 responds with empirical evidence that modifies, rather than simply repeats, Text 1's claim.",
            constraints_required=2,
        ),
        ("CROSS_TEXT_CONNECTION", "model_vs_data"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Text 1: A climate model proposes that urban trees cool nearby streets mostly by casting shade during midday. "
                "Text 2: However, sensor data from several blocks show that streets with sparse shade but high leaf moisture often stayed cooler into the evening."
            ),
            constraint_sentence="Although Text 2 does not reject the model entirely, it reframes the cooling effect as depending partly on moisture and time of day.",
            prompt="Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
            answer_options=("By focusing only on how many blocks were measured.", "By agreeing that shade explains all cooling in the data.", "By denying that trees can cool streets at midday.", "By arguing that the model captures only part of the cooling pattern."),
            correct_index=3,
            topic="CROSS_TEXT_CONNECTION",
            subtopic="Pattern: model_vs_data",
            question_type="CROSS_TEXT_CONNECTION",
            trap_type="model versus data trap",
            explanation="Text 2 uses data to qualify the model without fully rejecting it.",
            constraints_required=2,
        ),
        ("CROSS_TEXT_CONNECTION", "hypothesis_vs_revision"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Text 1: A linguist hypothesizes that borrowed words could spread rapidly when speakers need names for new technologies. "
                "Text 2: However, a study of radio terminology found that some borrowed terms spread slowly when local words already had social prestige."
            ),
            constraint_sentence="Although Text 2 accepts that need can matter, it revises the hypothesis by adding a social condition.",
            prompt="Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
            answer_options=("By discussing radio terminology as an unrelated historical detail.", "By agreeing that new technology always causes rapid borrowing.", "By claiming that borrowed words never spread for practical reasons.", "By suggesting that the hypothesis works only when local alternatives lack strong social value."),
            correct_index=3,
            topic="CROSS_TEXT_CONNECTION",
            subtopic="Pattern: hypothesis_vs_revision",
            question_type="CROSS_TEXT_CONNECTION",
            trap_type="hypothesis revision trap",
            explanation="Text 2 modifies the hypothesis by adding a condition about existing local terms.",
            constraints_required=2,
        ),
        ("Inference", "expectation_violation"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Researchers expected older seeds to germinate more slowly than newer seeds. "
                "At first, that expectation seemed reasonable because older seeds often lose moisture."
            ),
            constraint_sentence="However, seeds stored in cooler rooms sprouted nearly as quickly as new seeds from warmer rooms.",
            prompt="Which inference is best supported by the text?",
            answer_options=("Seed age is never related to germination speed.", "Storage conditions may affect germination speed.", "Older seeds always sprout faster in cool rooms.", "Cool storage may reduce the expected disadvantage of seed age."),
            correct_index=3,
            topic="Inference",
            subtopic="Pattern: expectation_violation",
            question_type="Inference",
            trap_type="expectation violation trap",
            explanation="The result violates the age expectation and supports a qualified inference about cool storage.",
        ),
        ("Inference", "causal_gap"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A theater introduced lower ticket prices, and attendance rose the next month. "
                "Several observers initially treated the timing as proof of cause."
            ),
            constraint_sentence="However, a popular actor joined the production during the same period, so the price change may not fully explain the increase.",
            prompt="Which inference is best supported by the text?",
            answer_options=("Lower prices had no effect on attendance.", "The actor's arrival is a possible alternative explanation.", "Attendance rises whenever a popular actor joins a show.", "The attendance increase cannot be attributed confidently to lower prices alone."),
            correct_index=3,
            topic="Inference",
            subtopic="Pattern: causal_gap",
            question_type="Inference",
            trap_type="causal gap trap",
            explanation="The timing invites a price-cause answer, but the actor creates a causal gap requiring caution.",
        ),
        ("Data Analysis", "ranking_flip_threshold"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A student compared three plant-growth trials. At first, Trial A seemed strongest because it had the highest average height, while Trial B often stayed close behind and Trial C had more uneven results."
            ),
            constraint_sentence="However, after applying the lab's reliability threshold of at least 90% survival, only Trial B kept enough plants alive to support a recommendation.",
            prompt="Which claim is best supported by the data described in the text?",
            answer_options=("Trial A should be recommended because it had the highest average height.", "Trial B was close to Trial A in height and met the survival threshold.", "Trial C is best because uneven results can indicate rapid growth.", "The reliability threshold changes the ranking, making Trial B the supported recommendation."),
            correct_index=3,
            topic="Data Analysis",
            subtopic="Pattern: ranking_flip_threshold",
            question_type="Data Analysis",
            trap_type="surface ranking trap",
            explanation="The surface ranking points to Trial A, but the threshold flips the supported choice to Trial B.",
        ),
        ("Command of Evidence", "causal_chain_support"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Several researchers thought the stream's clearer water came directly from lower rainfall. At first, that explanation seemed plausible because dry months often leave less runoff."
            ),
            constraint_sentence="However, the report shows that lower rainfall reduced runoff, reduced runoff carried less soil into the stream, and the reduced soil load made the water clearer.",
            prompt="Which choice best supports the report's causal claim?",
            answer_options=("Rainfall was lower during several months of the study.", "Runoff may affect how much soil enters a stream.", "Clearer water can occur in streams for many different reasons.", "Lower rainfall reduced runoff, which reduced soil entering the stream and made the water clearer."),
            correct_index=3,
            topic="Command of Evidence",
            subtopic="Pattern: causal_chain_support",
            question_type="Command of Evidence",
            trap_type="missing causal link trap",
            explanation="The correct answer preserves the complete rainfall-to-runoff-to-soil-to-clarity chain.",
        ),
        ("Inference", "contradiction_inference"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Researchers expected a quieter classroom to improve recall on every task. At first, that prediction seemed reasonable because students often report fewer distractions in quiet rooms."
            ),
            constraint_sentence="However, students in moderately noisy rooms remembered spoken examples nearly as well as students in quiet rooms, though they did worse on silent reading tasks.",
            prompt="Which inference is best supported by the text?",
            answer_options=("Quiet rooms are never useful for recall tasks.", "Moderate noise may not affect all kinds of recall in the same way.", "Students prefer noisy rooms for spoken examples.", "The results contradict the prediction only for spoken examples, not for every task."),
            correct_index=3,
            topic="Inference",
            subtopic="Pattern: contradiction_inference",
            question_type="Inference",
            trap_type="contradiction scope trap",
            explanation="The result contradicts the broad prediction only in a limited part of the task set.",
        ),
        ("Data Analysis", "data_mapping_table"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The table lists survey results for three museums. Several unrelated details about exhibit size may seem relevant at first."
            ),
            constraint_sentence="However, when only weekend responses are considered, West had the highest satisfaction rating, while East led only in total repeat visitors.",
            prompt="Which statement correctly maps the data in the table?",
            answer_options=("East had the highest weekend satisfaction rating.", "West and East had the same total repeat visitors.", "North led both repeat visitors and weekend satisfaction.", "West led weekend satisfaction, while East led total repeat visitors."),
            correct_index=3,
            topic="Data Analysis",
            subtopic="Pattern: data_mapping_table",
            question_type="Data Analysis",
            trap_type="wrong row or column trap",
            explanation="The answer must use the weekend satisfaction column and the total repeat visitor column separately.",
            constraints_required=2,
            data_type="table",
            data_payload={
                "title": "Museum Survey Results",
                "reasoning_pattern": "multi_row_inference",
                "required_constraints": 2,
                "constraint_types": ["comparison_across_rows_columns", "exception_detection"],
                "required_skills": ["scan_multiple_rows", "apply_condition"],
                "reject_shortcuts": ["max_min_lookup", "single_value_reading", "direct_row_match"],
                "columns": ["Museum", "Total repeat visitors", "Weekend satisfaction rating"],
                "rows": [
                    {"Museum": "East", "Total repeat visitors": 42, "Weekend satisfaction rating": "82%"},
                    {"Museum": "North", "Total repeat visitors": 38, "Weekend satisfaction rating": "79%"},
                    {"Museum": "West", "Total repeat visitors": 35, "Weekend satisfaction rating": "91%"},
                ],
            },
        ),
        ("Command of Evidence", "weaken_origin_claim"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A historian proposed that a weaving style originated in Harbor City. At first, the claim seemed likely because Harbor City records often mention that style in trade inventories."
            ),
            constraint_sentence="However, a dated village fragment using the same pattern was found from fifty years before the earliest Harbor City inventory.",
            prompt="Which choice would most weaken the historian's origin claim?",
            answer_options=("Harbor City traded woven goods with several villages.", "Inventories often preserve commercial names rather than makers' names.", "Some Harbor City records mention expensive dyes.", "A village fragment with the same pattern predates the earliest Harbor City record by fifty years."),
            correct_index=3,
            topic="Command of Evidence",
            subtopic="Pattern: weaken_origin_claim",
            question_type="Command of Evidence",
            trap_type="origin evidence trap",
            explanation="Earlier matching evidence from elsewhere weakens the proposed origin more directly than trade details do.",
        ),
        ("Standard English Conventions", "grammar_subject_verb"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The collection of field notes, along with several sketches from the trip, ___ often stored in the archive's climate-controlled room. The extra phrase may distract readers at first."
            ),
            constraint_sentence="However, the grammatical subject is collection, not sketches.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=("are", "were", "have been", "is"),
            correct_index=3,
            topic="Standard English Conventions",
            subtopic="Pattern: grammar_subject_verb",
            question_type="Standard English Conventions",
            trap_type="subject-verb agreement trap",
            explanation="This pattern tests only subject-verb agreement; the singular subject collection requires is.",
        ),
        ("Standard English Conventions", "grammar_clause_boundary"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The prototype seemed simple at first ___ however, its internal sensors often required careful calibration. Only the boundary between the two clauses is being tested."
            ),
            constraint_sentence="However, both sides of the boundary are independent clauses.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=(",", "and", "which", ";"),
            correct_index=3,
            topic="Standard English Conventions",
            subtopic="Pattern: grammar_clause_boundary",
            question_type="Standard English Conventions",
            trap_type="clause boundary trap",
            explanation="This pattern tests only clause boundaries; a semicolon correctly separates two independent clauses before however.",
        ),
        ("Standard English Conventions", "sentence_boundary_resolution"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The mural's surface looked uniform at first ___ later imaging often revealed two separate paint layers. The relationship between the clauses may seem subtle because both describe observations of the same object."
            ),
            constraint_sentence="However, both clauses can stand independently, and the second complicates the first observation.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=(",", "which", "and later", ";"),
            correct_index=3,
            topic="Standard English Conventions",
            subtopic="Pattern: sentence_boundary_resolution",
            question_type="Standard English Conventions",
            trap_type="ambiguous boundary trap",
            explanation="This pattern tests only sentence_boundary_resolution; the subtle issue is resolving two independent clauses without a comma splice or fragment.",
            constraints_required=2,
        ),
        ("Standard English Conventions", "grammar_modifier"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "After often comparing the fossil under angled light, ___ noticed a faint ridge along its edge. At first, several nouns could seem available after the modifier."
            ),
            constraint_sentence="However, the opening modifier must describe the person doing the comparing.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=("a faint ridge was noticed by the researcher", "the fossil's edge became visible", "the ridge along the fossil appeared", "the researcher noticed a faint ridge"),
            correct_index=3,
            topic="Standard English Conventions",
            subtopic="Pattern: grammar_modifier",
            question_type="Standard English Conventions",
            trap_type="modifier placement trap",
            explanation="This pattern tests only modifier placement; the noun after the modifier must be the researcher.",
        ),
        ("Standard English Conventions", "grammar_pronoun_reference"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Maya told Lina that the archive's map was missing a label, and ___ often made the catalog confusing. At first, either person might seem connected to the problem."
            ),
            constraint_sentence="However, the intended antecedent is the missing label, not either researcher.",
            prompt="Which choice completes the text so that it conforms to Standard English and makes the reference clear?",
            answer_options=("she", "they", "this", "the missing label"),
            correct_index=3,
            topic="Standard English Conventions",
            subtopic="Pattern: grammar_pronoun_reference",
            question_type="Standard English Conventions",
            trap_type="pronoun reference trap",
            explanation="This pattern tests only pronoun reference; repeating the noun removes the ambiguous pronoun.",
            constraints_required=2,
        ),
        ("Transitions", "reinforcement"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A survey of migratory birds found that several species often paused near small urban wetlands, although the sites were omitted from regional conservation maps. The researchers also recorded repeated overnight stays at those same wetlands."
            ),
            constraint_sentence="___, the team found that the birds returned to the sites even when larger marshes nearby were available.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Moreover,", "Therefore,", "Admittedly,", "Indeed,"),
            correct_index=3,
            topic="Transitions",
            subtopic="Pattern: reinforcement",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=reinforcement; the second finding strengthens the first rather than merely adding, conceding, or concluding from it.",
            constraints_required=2,
        ),
        ("Transitions", "clarification"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The historian argues that the archive's silence is not proof that the craft disappeared, although early readers may assume that missing records mean missing activity. Later tax lists often mention the same tools under a broader household category."
            ),
            constraint_sentence="___, the records do not name the craft directly but preserve indirect evidence that it continued.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Nevertheless,", "Similarly,", "Therefore,", "Specifically,"),
            correct_index=3,
            topic="Transitions",
            subtopic="Pattern: clarification",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=clarification; the final sentence restates the archival point more precisely rather than contrasting, concluding, or comparing.",
            constraints_required=2,
        ),
        ("Transitions", "concession"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The ceramic coating was costly to apply and, at first, several engineers questioned whether the added step would be practical. The coating often reduced heat loss, however, even on older equipment with uneven surfaces."
            ),
            constraint_sentence="___, the team recommended testing the coating in a small set of factories before rejecting it.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Therefore,", "Specifically,", "In fact,", "Admittedly,"),
            correct_index=3,
            topic="Transitions",
            subtopic="Pattern: concession",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=concession; the sentence admits a limitation before preserving the recommendation.",
            constraints_required=2,
        ),
        ("Transitions", "conclusion"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The excavation team found imported beads, local pottery, and repair marks on several tools, although no single object proved how the settlement was used. Taken together, the finds often point to both trade and everyday residence."
            ),
            constraint_sentence="___, the site was likely not just a trading stop but a place where people lived for extended periods.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Specifically,", "Meanwhile,", "Admittedly,", "Ultimately,"),
            correct_index=3,
            topic="Transitions",
            subtopic="Pattern: conclusion",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=conclusion; the final sentence draws a cautious summary from several pieces of evidence.",
            constraints_required=2,
        ),
        ("Standard English Conventions", "referent_precision"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "When Dr. Mensah gave Rivera the revised catalog entry, ___ often still contained an unclear date range. At first, either the person or the entry could seem to be the focus."
            ),
            constraint_sentence="However, the sentence must refer precisely to the catalog entry, not to either researcher.",
            prompt="Which choice completes the text so that it conforms to Standard English and resolves the reference?",
            answer_options=("she", "they", "that", "the entry"),
            correct_index=3,
            topic="Standard English Conventions",
            subtopic="Pattern: referent_precision",
            question_type="Standard English Conventions",
            trap_type="referent precision trap",
            explanation="This pattern tests only referent_precision; the answer must preserve the intended referent while avoiding an ambiguous pronoun.",
            constraints_required=2,
        ),
        ("Standard English Conventions", "clause_integration"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The satellite detected a faint heat signal over the ridge ___ the research team often treated the result cautiously because cloud cover can distort readings. At first, the relationship between the clauses may seem merely sequential."
            ),
            constraint_sentence="However, the second clause explains why the team qualified the first observation.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=(", the research team", "; although the research team", "which the research team", ", but the research team"),
            correct_index=3,
            topic="Standard English Conventions",
            subtopic="Pattern: clause_integration",
            question_type="Standard English Conventions",
            trap_type="clause integration trap",
            explanation="This pattern tests only clause_integration; the correct structure integrates two independent clauses while preserving the contrast in caution.",
            constraints_required=2,
        ),
        ("Standard English Conventions", "modifier_attachment"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "After often comparing the restored panels with older photographs, ___ noticed that the border had been repainted in a slightly different blue. At first, both the panels and the conservator seem nearby enough to attract the modifier."
            ),
            constraint_sentence="However, only the conservator can logically perform the comparison.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=("the restored panels revealed that the conservator", "the older photographs led the conservator to notice", "a different blue was noticed by the conservator, who", "the conservator"),
            correct_index=3,
            topic="Standard English Conventions",
            subtopic="Pattern: modifier_attachment",
            question_type="Standard English Conventions",
            trap_type="modifier attachment trap",
            explanation="This pattern tests only modifier_attachment; the intended noun must immediately follow the opening modifier.",
            constraints_required=2,
        ),
        ("Rhetorical Synthesis", "compare"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A student is comparing two restoration projects. Notes: Project A often reused original stone but required longer closures; Project B used newer stone and reopened sooner; both projects preserved the buildings' original outlines; several notes about budgets are available but not relevant."
            ),
            constraint_sentence="However, the student's goal is to compare the projects' preservation approaches while acknowledging one shared outcome.",
            prompt="Which choice best uses relevant information from the notes to accomplish the student's goal?",
            answer_options=("Project A took longer than Project B, and both had budget records.", "Project B reopened sooner because it used newer stone.", "Both projects involved historic buildings, although Project A took longer.", "Project A reused original stone, Project B used newer stone, and both preserved the buildings' outlines."),
            correct_index=3,
            topic="Rhetorical Synthesis",
            subtopic="Pattern: compare",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical task filtering trap",
            explanation="Hard synthesis task=compare; the answer filters irrelevant budget detail, recognizes the difference in approach, and compresses the shared outcome.",
            constraints_required=3,
        ),
        ("Rhetorical Synthesis", "contrast"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A student is contrasting two community archives. Notes: Archive A often invites residents to annotate photographs online; Archive B relies on staff-written labels and in-person exhibits; both preserve neighborhood images; several funding details may seem relevant at first."
            ),
            constraint_sentence="However, the student's goal is to emphasize the difference in how each archive involves the public.",
            prompt="Which choice best uses the notes to emphasize the contrast between the two archives?",
            answer_options=("Both archives preserve historical photographs for community members.", "Archive A and Archive B received grants in different years.", "Archive B has in-person exhibits, so it is more historically accurate than Archive A.", "Archive A lets residents add online annotations, whereas Archive B presents staff-written labels in exhibits."),
            correct_index=3,
            topic="Rhetorical Synthesis",
            subtopic="Pattern: contrast",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical contrast trap",
            explanation="Hard synthesis task=contrast; the subtle distinction is filtering true but irrelevant funding details and emphasizing the public-involvement difference.",
            constraints_required=3,
        ),
        ("Rhetorical Synthesis", "present_conclusion"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A student is reviewing notes about a school garden. Notes: pollinator counts often rose near native flowers; vegetable yields changed little; maintenance took fewer hours after paths were redesigned; a local newspaper praised the garden's appearance."
            ),
            constraint_sentence="However, the student's goal is to present a conclusion about ecological impact, not appearance or labor.",
            prompt="Which choice best uses relevant information from the notes to accomplish the student's goal?",
            answer_options=("The garden became easier to maintain after its paths were redesigned.", "A local newspaper praised the garden's appearance.", "Vegetable yields changed little after the redesign.", "The increase in pollinator counts near native flowers suggests that the garden improved habitat conditions."),
            correct_index=3,
            topic="Rhetorical Synthesis",
            subtopic="Pattern: present_conclusion",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical task filtering trap",
            explanation="Hard synthesis task=present_conclusion; the answer filters true but irrelevant notes and compresses the ecological evidence into a conclusion.",
            constraints_required=3,
        ),
        ("Command of Evidence", "quantitative_trend_value"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The table compares two bus routes. Several scheduling notes may appear relevant beside the table, although they are not needed."
            ),
            constraint_sentence="However, the claim being evaluated is that Route M showed the larger percentage increase, not the larger final ridership value.",
            prompt="Which choice best evaluates the claim using the data?",
            answer_options=("Route L supports the claim because 1,260 riders in May is more than Route M's 1,050.", "Route M cannot support the claim because it began with 900 riders, fewer than Route L's 1,200.", "Route L and Route M both gained riders, so the percentage comparison is the same for the two routes.", "Route M supports the claim because its increase from 900 to 1,050 is a larger percentage change than Route L's increase from 1,200 to 1,260."),
            correct_index=3,
            topic="Command of Evidence",
            subtopic="Pattern: quantitative_trend_value",
            question_type="Command of Evidence",
            trap_type="trend versus value trap",
            explanation="Hard evidence type=quantitative; the answer separates final value from percentage trend and uses the exact data direction.",
            constraints_required=2,
            data_type="table",
            data_payload={
                "title": "Bus Route Ridership",
                "reasoning_pattern": "claim_validation",
                "required_constraints": 2,
                "constraint_types": ["comparison_across_rows_columns", "relationship_to_claim"],
                "required_skills": ["scan_multiple_rows", "apply_condition"],
                "reject_shortcuts": ["max_min_lookup", "single_value_reading", "direct_row_match"],
                "columns": ["Route", "April riders", "May riders"],
                "rows": [
                    {"Route": "L", "April riders": 1200, "May riders": 1260},
                    {"Route": "M", "April riders": 900, "May riders": 1050},
                ],
            },
        ),
        ("Command of Evidence", "textual_claim_strength"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A critic claims that a novelist's brief scenic descriptions often slow the plot only slightly while sharpening the reader's sense of place. Several reviews mention scenery, although not all address pacing."
            ),
            constraint_sentence="However, the strongest evidence must address both the limited effect on pace and the clearer sense of setting.",
            prompt="Which finding would best support the critic's claim?",
            answer_options=("Some readers remembered the novel's city streets but disliked its ending.", "A review praised the descriptions as beautiful without discussing plot movement.", "Several readers said the plot felt slow whenever descriptions appeared.", "Readers reported that the descriptions briefly paused the action but made the locations easier to imagine."),
            correct_index=3,
            topic="Command of Evidence",
            subtopic="Pattern: textual_claim_strength",
            question_type="Command of Evidence",
            trap_type="claim strength trap",
            explanation="Hard evidence type=textual; the answer must match both parts of the qualified claim rather than merely mentioning related information.",
            constraints_required=2,
        ),
    }
    try:
        return items[(question_type, pattern)]
    except KeyError as exc:
        raise ValueError(f"No Reading & Writing generator for {question_type}/{pattern}") from exc


def rw_base(
    module: int,
    index: int,
    *,
    topic: str,
    subtopic: str,
    question_type: str,
    passage: str,
    prompt: str,
    correct: str,
    choices: tuple[ChoiceSpec, ...],
    explanation: str,
    trap_type: str,
    data_type: str = "none",
    data_payload: dict | None = None,
) -> QuestionSpec:
    difficulty = rw_difficulty_for(index)
    return QuestionSpec(
        section=SATSection.reading_writing,
        module=module,
        order_index=index,
        difficulty=difficulty,
        adaptive_level=adaptive_level(module, index),
        source=source_for(index),
        topic=topic,
        subtopic=subtopic,
        structure_key=f"rw-{question_type.lower().replace(' ', '-')}-{difficulty_band(difficulty)}-{index % 6}",
        passage=passage,
        prompt=prompt,
        correct_answer=correct,
        explanation=explanation,
        trap_type=trap_type,
        question_type=question_type,
        format=QuestionFormat.multiple_choice,
        estimated_time=65 + (index % 4) * 10,
        discrimination_score=round(0.42 + (index % 6) * 0.07, 2),
        choices=choices,
        data_type=data_type,
        data_payload=data_payload or {},
    )


def rw_ambiguity_first_base(module: int, index: int, item: AmbiguityFirstItem) -> QuestionSpec:
    validate_ambiguity_first_item(item)
    difficulty = rw_difficulty_for(index)
    labels = ("A", "B", "C", "D")
    correct_label = labels[item.correct_index]
    wrong_patterns = iter(("TOO BROAD", "TOO NARROW", "CONTEXT MISMATCH"))
    roles = {
        "CORRECT": ChoiceTrapRole.correct,
        "TOO BROAD": ChoiceTrapRole.common_mistake,
        "TOO NARROW": ChoiceTrapRole.conceptual_misunderstanding,
        "CONTEXT MISMATCH": ChoiceTrapRole.extreme_wrong_logic,
    }
    choices: list[ChoiceSpec] = []
    for option_index, answer_text in enumerate(item.answer_options):
        pattern = "CORRECT" if option_index == item.correct_index else next(wrong_patterns)
        choices.append(rw_choice(labels[option_index], answer_text, pattern, roles[pattern]))
    return rw_base(
        module,
        index,
        topic=item.topic,
        subtopic=item.subtopic,
        question_type=item.question_type,
        passage=f"{item.ambiguous_passage} {item.constraint_sentence}",
        prompt=item.prompt,
        correct=correct_label,
        explanation=(
            f"pattern={item.generation_pattern}; constraints_required={item.constraints_required}; "
            f"logic_pattern={RW_PATTERN_REGISTRY[item.generation_pattern]['logic_rule']}; "
            f"distractor_taxonomy={','.join(RW_PATTERN_REGISTRY[item.generation_pattern]['distractor_generators'])}; "
            f"Ambiguity-first validation: {item.explanation}"
            f"{' Hard calibration: the correct answer turns on a subtle distinction among multiple plausible options.' if difficulty >= 8 else ''}"
        ),
        trap_type=item.trap_type,
        choices=tuple(choices),
        data_type=item.data_type,
        data_payload=item.data_payload,
    )


def rw_vocabulary(module: int, index: int) -> QuestionSpec:
    records = (
        AmbiguityFirstItem(
            generation_pattern="context_reversal",
            ambiguous_passage=(
                "The astronomer's first images were blurred by dust on the lens. "
                "After the instrument was cleaned, the outline of the distant moon became clear."
            ),
            constraint_sentence="The team could often map its ridges from the image, although several shadows still required cautious interpretation.",
            prompt="As used in the text, what does \"clear\" most nearly mean?",
            answer_options=("successful", "transparent like glass", "easy to see", "free from obstruction"),
            correct_index=2,
            topic="Vocabulary in Context",
            subtopic="Words in context",
            question_type="Vocabulary in Context",
            trap_type="context-controlled vocabulary meaning",
            explanation="The first sentence makes several meanings of clear plausible; the mapping detail forces the visual sense, easy to see.",
        ),
        AmbiguityFirstItem(
            generation_pattern="precision_vs_general",
            ambiguous_passage=(
                "In early trials, the new coating changed the metal's temperature only slightly. "
                "When the researchers added a thin mineral layer, however, the difference became marked."
            ),
            constraint_sentence="The change was often large enough to force them to revise their explanation of how heat moved through the sample.",
            prompt="As used in the text, what does \"marked\" most nearly mean?",
            answer_options=("important", "labeled with a symbol", "noticeable", "damaged by scratches"),
            correct_index=2,
            topic="Vocabulary in Context",
            subtopic="Words in context",
            question_type="Vocabulary in Context",
            trap_type="context-controlled vocabulary meaning",
            explanation="Marked could suggest labeling or importance, but the measured difference becoming large forces the meaning noticeable.",
        ),
        AmbiguityFirstItem(
            generation_pattern="precision_vs_general",
            ambiguous_passage=(
                "The curator first thought the woven cloth was plain because its colors had faded. "
                "Under angled light, however, fine threads of silver appeared between the darker fibers."
            ),
            constraint_sentence="Their placement tended to reveal workmanship that was delicate and precise rather than bold.",
            prompt="As used in the text, what does \"fine\" most nearly mean?",
            answer_options=("acceptable", "very thin", "delicate and precise", "requiring payment as punishment"),
            correct_index=2,
            topic="Vocabulary in Context",
            subtopic="Words in context",
            question_type="Vocabulary in Context",
            trap_type="context-controlled vocabulary meaning",
            explanation="Fine could mean thin or acceptable, but the workmanship constraint favors delicate and precise over the nearby alternatives.",
        ),
        AmbiguityFirstItem(
            generation_pattern="tone_shift",
            ambiguous_passage=(
                "At first, the critic praised the novelist's anger at injustice but noted that the final chapter tempers that anger with sympathy. "
                "The shift does not excuse the characters who made harmful choices under pressure."
            ),
            constraint_sentence="Instead, it tends to make the judgment less severe.",
            prompt="As used in the text, what does \"tempers\" most nearly mean?",
            answer_options=("changes", "heats and hardens metal", "softens or moderates", "loses emotional control"),
            correct_index=2,
            topic="Vocabulary in Context",
            subtopic="Words in context",
            question_type="Vocabulary in Context",
            trap_type="context-controlled vocabulary meaning",
            explanation="Tempers has several plausible meanings, but less severe constrains it to softens or moderates.",
        ),
        AmbiguityFirstItem(
            generation_pattern="context_reversal",
            ambiguous_passage=(
                "Sensors placed near the wetland did not register the brief afternoon shower. "
                "The rain evaporated before reaching the lower leaves."
            ),
            constraint_sentence="By contrast, the slower overnight storm often produced a signal across nearly every device.",
            prompt="As used in the text, what does \"register\" most nearly mean?",
            answer_options=("respond to", "enroll officially", "detect or record", "speak in a particular tone"),
            correct_index=2,
            topic="Vocabulary in Context",
            subtopic="Words in context",
            question_type="Vocabulary in Context",
            trap_type="context-controlled vocabulary meaning",
            explanation="Register could mean several things, but signal from sensors forces the detect-or-record meaning.",
        ),
    )
    return rw_ambiguity_first_base(module, index, records[(index // 5) % len(records)])


def rw_transition(module: int, index: int) -> QuestionSpec:
    records = (
        (
            "The first climate model predicted that the algae would often decline as the water warmed. The follow-up samples showed the opposite pattern, with the population increasing near the heated vents. ___ the team revised its account of the algae's nutrient source.",
            "therefore",
            "cause-effect after contrast",
            "false_cause",
        ),
        (
            "Although the museum expected visitors to spend less time in the smaller photography exhibit, the gallery's quiet layout tended to encourage longer conversations and repeat viewing. ___ attendance surveys showed that visitors described the exhibit as unusually absorbing.",
            "however",
            "contrast with expectation",
            "contrast_trap",
        ),
        (
            "Although the first poem presents the city as a place shaped by memory rather than by maps, the second poem also tends to treat streets as emotional landmarks. ___ both poems connect geography with personal history.",
            "similarly",
            "parallel relationship",
            "example_vs_result_confusion",
        ),
        (
            "Although the engineer knew the prototype used more expensive materials than the older model, the new design often reduced maintenance costs so sharply that the total five-year expense was lower. ___ she recommended the prototype for the transit project.",
            "nevertheless",
            "concession followed by decision",
            "contrast_trap",
        ),
    )
    passage, correct_word, relationship, generation_pattern = records[index % len(records)]
    choices = {
        "A": "However,",
        "B": "Therefore,",
        "C": "Similarly,",
        "D": "Nevertheless,",
    }
    correct_label = {"however": "A", "therefore": "B", "similarly": "C", "nevertheless": "D"}[correct_word]
    transition_traps = {
        "A": "CONTEXT MISMATCH",
        "B": "TOO BROAD",
        "C": "TOO NARROW",
        "D": "CONTEXT MISMATCH",
    }
    if correct_label == "B":
        transition_traps["D"] = "TOO BROAD"
    elif correct_label == "C":
        transition_traps["D"] = "TOO NARROW"
    transition_traps[correct_label] = "CORRECT"
    trap_roles = {
        "CORRECT": ChoiceTrapRole.correct,
        "TOO BROAD": ChoiceTrapRole.common_mistake,
        "TOO NARROW": ChoiceTrapRole.conceptual_misunderstanding,
        "CONTEXT MISMATCH": ChoiceTrapRole.extreme_wrong_logic,
    }
    return rw_base(
        module,
        index,
        topic="Transitions",
        subtopic="Logical transitions",
        question_type="Transitions",
        passage=passage,
        prompt="Which choice completes the text with the most logical transition?",
        correct=correct_label,
        explanation=f"pattern={generation_pattern}; The sentence relationship is {relationship}, so {choices[correct_label].strip(',')} best preserves the intended logic.",
        trap_type="logical transition mismatch",
        choices=(
            rw_choice("A", choices["A"], transition_traps["A"], trap_roles[transition_traps["A"]]),
            rw_choice("B", choices["B"], transition_traps["B"], trap_roles[transition_traps["B"]]),
            rw_choice("C", choices["C"], transition_traps["C"], trap_roles[transition_traps["C"]]),
            rw_choice("D", choices["D"], transition_traps["D"], trap_roles[transition_traps["D"]]),
        ),
    )


def rw_command_of_evidence(module: int, index: int) -> QuestionSpec:
    records = (
        AmbiguityFirstItem(
            generation_pattern="partial_support",
            ambiguous_passage="A botanist studying desert flowers found that one species often opened later in the day during unusually dry weeks. The timing change initially seemed beneficial, a useful-looking shift but not a simple one.",
            constraint_sentence="Although this delay reduced water loss, it also meant fewer visits from morning pollinators, so the pattern was not a simple improvement.",
            prompt="Which choice best describes the conclusion that is most strongly supported by the text?",
            answer_options=(
                "Plants in deserts always benefit when flowers open later.",
                "The species opened later during unusually dry weeks.",
                "Morning pollinators stopped visiting desert flowers because temperatures were too high.",
                "The plant conserves water in dry conditions but may receive fewer pollinator visits.",
            ),
            correct_index=3,
            topic="Command of Evidence",
            subtopic="Evidence-based conclusion",
            question_type="Command of Evidence",
            trap_type="evidence scope mismatch",
            explanation="The first two sentences allow a simple benefit reading, but the pollinator contrast favors the trade-off answer over broader claims.",
        ),
        AmbiguityFirstItem(
            generation_pattern="implicit_contradiction",
            ambiguous_passage="A literary scholar notes that the narrator's brief jokes often interrupt scenes of grief. At first, those jokes might seem to make the novel lighter, or at least less severe.",
            constraint_sentence="Instead, the interruptions make the grief feel more controlled and, therefore, more intense; the humor functions as restraint, not escape.",
            prompt="Which choice best describes the conclusion that is most strongly supported by the text?",
            answer_options=(
                "Humor in novels usually makes painful scenes easier to read.",
                "The narrator includes brief jokes during scenes of grief.",
                "The novel is mainly a comedy that avoids serious emotion.",
                "The jokes intensify grief by briefly containing it rather than replacing it.",
            ),
            correct_index=3,
            topic="Command of Evidence",
            subtopic="Evidence-based conclusion",
            question_type="Command of Evidence",
            trap_type="evidence scope mismatch",
            explanation="The draft makes lightness plausible, but the restraint-not-escape constraint makes intensification stronger than a comedy reading.",
        ),
        AmbiguityFirstItem(
            generation_pattern="partial_support",
            ambiguous_passage="An economist compared neighborhoods with identical transit access but different street designs. Several explanations for shop activity remained possible, and some may have seemed equally persuasive at first.",
            constraint_sentence="However, shops on narrower streets received more foot traffic even when rent and population density were similar.",
            prompt="Which choice best describes the conclusion that is most strongly supported by the text?",
            answer_options=(
                "Transit access is the main cause of commercial growth in every neighborhood.",
                "The comparison used neighborhoods with identical transit access.",
                "Narrow streets increase rent, which then produces more foot traffic.",
                "Street design may influence local shopping activity even when transit access is the same.",
            ),
            correct_index=3,
            topic="Command of Evidence",
            subtopic="Evidence-based conclusion",
            question_type="Command of Evidence",
            trap_type="evidence scope mismatch",
            explanation="The controlled comparison leaves several causes plausible until the however-clause isolates street design.",
        ),
    )
    return rw_ambiguity_first_base(module, index, records[index % len(records)])


def rw_inference(module: int, index: int) -> QuestionSpec:
    records = (
        AmbiguityFirstItem(
            generation_pattern="implicit_contradiction",
            ambiguous_passage="During rehearsals, the orchestra's conductor asked the percussionists to play more softly, even though reviewers had often praised their energy. The request could have reflected several concerns about the performance.",
            constraint_sentence="However, she wanted the audience to notice a quiet flute melody that returns near the end of the piece.",
            prompt="Which choice is the most reasonable inference from the text?",
            answer_options=(
                "The conductor thought every energetic performance prevents audiences from hearing melodies.",
                "The flute melody appears near the end of the piece.",
                "Reviewers caused the conductor to remove the percussion section from the performance.",
                "The conductor believed a less forceful percussion part would help listeners hear an important melody.",
            ),
            correct_index=3,
            topic="Inference",
            subtopic="Reasonable inference",
            question_type="Inference",
            trap_type="unsupported inference",
            explanation="The softer-percussion request is ambiguous until the flute-melody detail favors the balance inference.",
        ),
        AmbiguityFirstItem(
            generation_pattern="reversed_causality",
            ambiguous_passage="A marine biologist expected young fish to avoid artificial reefs because the structures lacked mature coral. Yet many young fish often gathered near some of those reefs.",
            constraint_sentence="However, they did so only when nearby grasses were dense enough to hide them from predators.",
            prompt="Which choice is the most reasonable inference from the text?",
            answer_options=(
                "Artificial reefs are always better habitats than natural coral reefs.",
                "Young fish gathered near artificial reefs with dense grasses.",
                "The fish preferred artificial reefs because mature coral is dangerous.",
                "For young fish, protection from predators may matter as much as the reef material itself.",
            ),
            correct_index=3,
            topic="Inference",
            subtopic="Reasonable inference",
            question_type="Inference",
            trap_type="unsupported inference",
            explanation="The gathering behavior is ambiguous until the predator-shelter constraint makes the broader habitat inference strongest.",
        ),
        AmbiguityFirstItem(
            generation_pattern="partial_support",
            ambiguous_passage="The novelist often describes a village festival through smells from kitchens and fragments of overheard songs rather than through a full explanation of the event. The scene feels unfinished, though not careless.",
            constraint_sentence="However, readers must assemble the festival from partial impressions, much as a visitor would.",
            prompt="Which choice is the most reasonable inference from the text?",
            answer_options=(
                "Novels should explain public events through complete historical summaries.",
                "The passage mentions smells from kitchens and fragments of songs.",
                "The narrator cannot understand the festival's meaning at all.",
                "The description is designed to make readers experience the festival indirectly and piece by piece.",
            ),
            correct_index=3,
            topic="Inference",
            subtopic="Reasonable inference",
            question_type="Inference",
            trap_type="unsupported inference",
            explanation="The unfinished quality could imply confusion, but the visitor comparison constrains it to an intentional piecing-together effect.",
        ),
    )
    return rw_ambiguity_first_base(module, index, records[index % len(records)])


def rw_rhetorical_synthesis(module: int, index: int) -> QuestionSpec:
    records = (
        AmbiguityFirstItem(
            generation_pattern="partial_support",
            ambiguous_passage="A student is writing about architect Lina Bo Bardi. Several notes could seem useful: Bo Bardi designed buildings in Brazil, often reused industrial materials, and placed theaters, walkways, and gathering areas inside a former factory.",
            constraint_sentence="However, the student's goal is to emphasize Bo Bardi's desire for public spaces to feel informal and welcoming.",
            prompt="To emphasize Bo Bardi's goal of making public spaces welcoming, which choice best uses relevant information from the notes?",
            answer_options=(
                "Lina Bo Bardi designed several buildings after moving to Brazil.",
                "Bo Bardi reused industrial materials in some projects.",
                "The cultural center included theaters, so it was more important than her other buildings.",
                "By turning a former factory into a cultural center with theaters, walkways, and gathering areas, Bo Bardi showed how reused industrial spaces could invite public use.",
            ),
            correct_index=3,
            topic="Rhetorical Synthesis",
            subtopic="Use notes to meet a goal",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical goal mismatch",
            explanation="Several notes are relevant to Bo Bardi, but the welcoming-public-space goal favors the cultural-center answer.",
        ),
        AmbiguityFirstItem(
            generation_pattern="partial_support",
            ambiguous_passage="A student is writing about a citizen-science bird survey. Several notes could seem useful: volunteers counted birds each spring, professional ornithologists often checked unusual reports, and the data helped reveal a northward shift in two species' nesting ranges.",
            constraint_sentence="However, the student's goal is to show why the survey's design made its findings credible.",
            prompt="To show why the survey's design made its findings credible, which choice best uses relevant information from the notes?",
            answer_options=(
                "The survey was about birds that nested farther north over time.",
                "Volunteers counted birds each spring for more than a decade.",
                "Citizen-science surveys prove that professional ornithologists are unnecessary.",
                "Because volunteers collected observations for twelve years and ornithologists checked unusual reports, the survey produced evidence strong enough to reveal nesting-range shifts.",
            ),
            correct_index=3,
            topic="Rhetorical Synthesis",
            subtopic="Use notes to meet a goal",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical goal mismatch",
            explanation="The survey topic and duration are plausible, but credibility requires combining duration with expert review.",
        ),
        AmbiguityFirstItem(
            generation_pattern="partial_support",
            ambiguous_passage="A student is writing about chemist Alice Ball. Several notes could seem useful: Ball developed an injectable treatment from chaulmoogra oil, earlier forms of the oil were often difficult for patients to absorb, and she died before her work received full public credit.",
            constraint_sentence="However, the student's goal is to emphasize the practical importance of Ball's method for treating Hansen's disease.",
            prompt="To emphasize the practical importance of Ball's method, which choice best uses relevant information from the notes?",
            answer_options=(
                "Alice Ball died before her work received full public credit.",
                "Chaulmoogra oil existed before Ball developed her method.",
                "Because Ball was not fully credited, her treatment could not have helped patients.",
                "Ball's injectable treatment made chaulmoogra oil easier for patients to absorb, allowing the method to be used in treating Hansen's disease.",
            ),
            correct_index=3,
            topic="Rhetorical Synthesis",
            subtopic="Use notes to meet a goal",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical goal mismatch",
            explanation="The biographical details are plausible, but the practical-importance goal requires absorption and treatment use.",
        ),
    )
    return rw_ambiguity_first_base(module, index, records[index % len(records)])


def difficulty_band(difficulty: int) -> str:
    if difficulty <= 4:
        return "easy"
    if difficulty <= 7:
        return "medium"
    return "hard"


def rw_choice(label: str, text: str, pattern: str, role: ChoiceTrapRole) -> ChoiceSpec:
    explanations = {
        "CORRECT": "CORRECT: fully answers the question using the passage's exact logic.",
        "TOO BROAD": "TOO BROAD: plausible language, but the claim goes beyond what the passage supports.",
        "TOO NARROW": "TOO NARROW: true or plausible detail, but it is too limited to answer the question.",
        "CONTEXT MISMATCH": "CONTEXT MISMATCH: plausible in isolation, but it conflicts with the passage's context, tone, or logic.",
    }
    taxonomy = {
        "CORRECT": "correct",
        "TOO BROAD": "scope_error",
        "TOO NARROW": "semantic_twin",
        "CONTEXT MISMATCH": "logic_flip",
    }[pattern]
    plausibility = {
        "CORRECT": "correct",
        "TOO BROAD": "high",
        "TOO NARROW": "high",
        "CONTEXT MISMATCH": "medium",
    }[pattern]
    competition = "top" if pattern in {"CORRECT", "TOO NARROW"} else "first_pass"
    return choice(
        label,
        text,
        role,
        (
            f"{explanations[pattern]} taxonomy={taxonomy}; plausibility={plausibility}; "
            f"competition={competition}; why_wrong={internal_distractor_explanation(pattern)}"
        ),
    )


def internal_distractor_explanation(pattern: str) -> str:
    return {
        "CORRECT": "correct",
        "TOO BROAD": "too broad",
        "TOO NARROW": "too narrow but sentence-compatible",
        "CONTEXT MISMATCH": "incorrect logical relation or wrong tone",
    }[pattern]


def validate_ambiguity_first_item(item: AmbiguityFirstItem) -> None:
    if item.correct_index not in range(4):
        raise ValueError("Ambiguity-first item must choose one correct option after all four answers are written.")
    if len(item.answer_options) != 4 or len(set(item.answer_options)) != 4:
        raise ValueError("Ambiguity-first item must provide four distinct plausible answers before correctness is assigned.")
    if not item.ambiguous_passage or not item.constraint_sentence:
        raise ValueError("Ambiguity-first item requires both an ambiguous draft passage and a later constraint sentence.")
    ambiguous_sentence_count = sum(item.ambiguous_passage.count(mark) for mark in ".!?")
    final_sentence_count = sum(f"{item.ambiguous_passage} {item.constraint_sentence}".count(mark) for mark in ".!?")
    if ambiguous_sentence_count < 1:
        raise ValueError("Ambiguity-first passage must start with at least one ambiguous sentence.")
    if final_sentence_count < 2 or final_sentence_count > 4:
        raise ValueError("Constrained final passage must be 2-4 sentences.")


def validate_rw_module_blueprint() -> None:
    if len(RW_MODULE_BLUEPRINT) != 27:
        raise ValueError("Reading & Writing module blueprint must contain exactly 27 slots.")
    slot_keys = [slot.slot_key for slot in RW_MODULE_BLUEPRINT]
    if slot_keys != RW_FIXED_MODULE1_SLOT_KEYS:
        raise ValueError(f"Module 1 RW blueprint must use the fixed slot order: {slot_keys}.")
    previous_difficulty = 0
    previous_pattern = ""
    for index, slot in enumerate(RW_MODULE_BLUEPRINT):
        if slot.pattern not in RW_GENERATION_PATTERNS.get(slot.question_type, set()):
            raise ValueError(f"RW slot {index + 1} has invalid pattern {slot.pattern} for {slot.question_type}.")
        if slot.difficulty < previous_difficulty:
            raise ValueError("Reading & Writing module difficulty must progress easy to medium to hard.")
        previous_difficulty = slot.difficulty
        if slot.pattern == previous_pattern:
            raise ValueError("Reading & Writing module blueprint cannot repeat the same pattern in adjacent slots.")
        previous_pattern = slot.pattern
        if slot.slot_key.startswith("quant_") and slot.pattern not in {"quantitative_trend_value", "data_mapping_table"}:
            raise ValueError(f"Quant slot {slot.slot_key} must use a table-backed quantitative pattern.")
        if index >= 18 and slot.difficulty < 8:
            raise ValueError("Hard-zone Reading & Writing slots cannot contain easy or medium questions.")


def validate_rw_pattern_registry() -> None:
    expected_patterns = {
        "literal_vs_abstract",
        "functional_precision",
        "tone_alignment",
        "example_vs_general",
        "study_vs_conclusion",
        "setup_refutation",
        "local_explanation",
        "evidence_support",
        "ranking_flip_threshold",
        "causal_chain_support",
        "contradiction_inference",
        "expectation_violation",
        "causal_gap",
        "data_mapping_table",
        "weaken_origin_claim",
        "grammar_subject_verb",
        "grammar_clause_boundary",
        "grammar_modifier",
        "grammar_pronoun_reference",
        "textual_claim_strength",
        "quantitative_trend_value",
        "belief_vs_evidence",
        "claim_vs_refutation",
        "setup_vs_result",
        "claim_vs_empirical_evidence",
        "model_vs_data",
        "hypothesis_vs_revision",
        "reinforcement",
        "clarification",
        "concession",
        "conclusion",
        "contrast",
        "compare",
        "present_conclusion",
        "referent_precision",
        "sentence_boundary_resolution",
        "appositive_structure",
        "modifier_attachment",
        "clause_integration",
        "punctuation_flow",
        "subject_reference_alignment",
    }
    registered_patterns = set().union(*RW_GENERATION_PATTERNS.values())
    if registered_patterns != expected_patterns:
        raise ValueError(f"RW pattern registry mismatch: {sorted(registered_patterns)}")
    for pattern in expected_patterns:
        registry_entry = RW_PATTERN_REGISTRY.get(pattern)
        if not registry_entry:
            raise ValueError(f"Missing registry entry for {pattern}.")
        for required_key in ("passage_template", "logic_rule", "correct_answer_rule", "distractor_generators"):
            if required_key not in registry_entry:
                raise ValueError(f"Pattern {pattern} missing {required_key}.")
        if len(registry_entry["distractor_generators"]) < 3:
            raise ValueError(f"Pattern {pattern} needs at least three distractor generators.")


def validate_reading_writing_slot(spec: QuestionSpec, slot: RWModuleSlot, index: int) -> None:
    if spec.question_type != slot.question_type:
        raise ValueError(f"RW slot {index + 1} expected {slot.question_type}, got {spec.question_type}.")
    if extract_metadata_value(spec.explanation, "pattern") != slot.pattern:
        raise ValueError(f"RW slot {index + 1} expected pattern {slot.pattern}.")
    if spec.difficulty != slot.difficulty:
        raise ValueError(f"RW slot {index + 1} expected difficulty {slot.difficulty}, got {spec.difficulty}.")
    if slot.slot_key.startswith("quant_") and spec.data_type != "table":
        raise ValueError(f"RW slot {index + 1} ({slot.slot_key}) must include structured table data.")
    if index >= 18 and spec.difficulty < 8:
        raise ValueError(f"RW slot {index + 1} is in the hard zone but received an easy/medium question.")
    plausible_distractors = [
        choice_spec
        for choice_spec in spec.choices
        if choice_spec.role != ChoiceTrapRole.correct and "plausibility=high" in (choice_spec.basis or "")
    ]
    if len(plausible_distractors) < 2:
        raise ValueError(f"RW slot {index + 1} must include at least two plausible distractors.")
    survivors = simulate_first_pass_elimination(spec)
    minimum_survivors = 3 if spec.difficulty >= 8 else 2
    if len(survivors) < minimum_survivors:
        raise ValueError(f"RW slot {index + 1} is too obvious; first-pass elimination left only {len(survivors)} answer(s).")
    if spec.difficulty <= 4 and slot.question_type in {"Inference", "Command of Evidence", "Rhetorical Synthesis"}:
        if "plausibility=high" not in " ".join(choice_spec.basis or "" for choice_spec in spec.choices):
            raise ValueError(f"RW slot {index + 1} easy question still needs direct but plausible answer choices.")
    if 5 <= spec.difficulty <= 7 and "Ambiguity-first validation:" not in spec.explanation and spec.question_type != "Transitions":
        raise ValueError(f"RW slot {index + 1} medium question must require inference from constrained context.")
    if spec.difficulty >= 8 and "subtle" not in spec.explanation.lower() and spec.question_type != "Transitions":
        raise ValueError(f"RW slot {index + 1} hard question must depend on a subtle distinction among plausible answers.")
    if index >= 18:
        validate_hard_zone_item(spec, slot, index)
    if spec.question_type == "Standard English Conventions":
        validate_single_grammar_rule(spec, slot.pattern)


def validate_reading_writing_spec(spec: QuestionSpec) -> None:
    allowed_types = set(RW_GENERATION_PATTERNS)
    if spec.question_type not in allowed_types:
        raise ValueError(f"Unsupported Reading & Writing question type: {spec.question_type}")
    if not spec.passage:
        raise ValueError("Reading & Writing questions require a passage.")
    sentence_count = sum(spec.passage.count(mark) for mark in ".!?")
    if sentence_count < 2 or sentence_count > 4:
        raise ValueError(f"Passage must be 2-4 sentences: {spec.passage}")
    if len(spec.choices) != 4:
        raise ValueError("Reading & Writing questions must have exactly four choices.")
    correct_choices = [item for item in spec.choices if item.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1 or correct_choices[0].label != spec.correct_answer:
        raise ValueError("Reading & Writing questions must have exactly one correct answer matching correct_answer.")
    bases = " ".join(choice_spec.basis or "" for choice_spec in spec.choices)
    for required in ("TOO BROAD", "TOO NARROW", "CONTEXT MISMATCH", "CORRECT"):
        if required not in bases:
            raise ValueError(f"Missing distractor pattern {required} for {spec.question_type}.")
    distractor_bases = [choice_spec.basis or "" for choice_spec in spec.choices if choice_spec.role != ChoiceTrapRole.correct]
    for taxonomy in RW_DISTRACTOR_TAXONOMY:
        if not any(f"taxonomy={taxonomy}" in basis for basis in distractor_bases):
            raise ValueError(f"Missing distractor taxonomy {taxonomy} for {spec.question_type}.")
    if len([basis for basis in distractor_bases if "plausibility=high" in basis]) < 2:
        raise ValueError(f"Question is too easy: fewer than two distractors are highly plausible for {spec.question_type}.")
    validate_pattern_based_generation(spec)
    validate_answer_competition(spec)
    if not any(word in spec.passage.lower() for word in ("although", "however", "yet", "by contrast", "instead", "opposite", "rather than")):
        raise ValueError(f"Passage needs contrast language to create SAT-style ambiguity: {spec.question_type}.")
    if not any(qualifier in spec.passage.lower() for qualifier in ("often", "may", "tends", "tended", "could")):
        raise ValueError(f"Passage needs a qualifier to avoid over-direct conclusions: {spec.question_type}.")
    if not any(marker in spec.passage.lower() for marker in ("at first", "first", "early", "initially", "expected", "seemed", "several", "notes", "though", "although", "not a simple")):
        raise ValueError(f"Passage needs human-like noise or delayed clarity: {spec.question_type}.")
    weak_phrases = ("the finding suggests", "the observation suggests", "the result points to", "therefore, the answer")
    if any(phrase in spec.passage.lower() for phrase in weak_phrases):
        raise ValueError(f"Passage contains a direct conclusion cue that makes the answer too obvious: {spec.question_type}.")
    if spec.question_type == "TEXT_STRUCTURE_FUNCTION":
        validate_text_structure_function(spec)
    if spec.question_type == "CROSS_TEXT_CONNECTION":
        validate_cross_text_connection(spec)
    validate_question_data_contract(spec)


def validate_text_structure_function(spec: QuestionSpec) -> None:
    target_sentence = (spec.data_payload or {}).get("target_sentence")
    target_role = (spec.data_payload or {}).get("target_role")
    if not isinstance(target_sentence, str) or target_sentence not in (spec.passage or ""):
        raise ValueError("TEXT_STRUCTURE_FUNCTION questions must include a target_sentence present in the passage.")
    if target_role not in {"belief / claim", "contrast setup", "evidence", "conclusion", "hypothesis"}:
        raise ValueError(f"Invalid target sentence role: {target_role!r}.")
    if len(target_sentence.split()) < 8:
        raise ValueError("TARGET sentence must not be trivial.")
    if "underlined sentence" not in spec.prompt.lower():
        raise ValueError("TEXT_STRUCTURE_FUNCTION prompt must ask about the underlined sentence.")
    if not re.search(r"\b(however|although|later|rather than|not)\b", spec.passage.lower()):
        raise ValueError("TEXT_STRUCTURE_FUNCTION passage must contain contrast or development.")
    plausible_distractors = [
        choice_spec
        for choice_spec in spec.choices
        if choice_spec.role != ChoiceTrapRole.correct and "plausibility=high" in (choice_spec.basis or "")
    ]
    if len(plausible_distractors) < 2:
        raise ValueError("TEXT_STRUCTURE_FUNCTION requires at least two plausible distractors.")


def validate_cross_text_connection(spec: QuestionSpec) -> None:
    passage = spec.passage or ""
    if "Text 1:" not in passage or "Text 2:" not in passage:
        raise ValueError("CROSS_TEXT_CONNECTION questions must include Text 1 and Text 2.")
    if "author of Text 2" not in spec.prompt:
        raise ValueError("CROSS_TEXT_CONNECTION prompt must ask how Text 2 would respond to Text 1.")
    if not re.search(r"\b(however|although|revises|qualifies|modifies|contradicts|supports)\b", passage.lower()):
        raise ValueError("CROSS_TEXT_CONNECTION must have a clear logical relationship.")
    text_1, text_2 = passage.split("Text 2:", 1)
    if not text_1.strip() or not text_2.strip():
        raise ValueError("CROSS_TEXT_CONNECTION must require comparison between both texts.")
    if len(set(text_1.lower().split()) & set(text_2.lower().split())) < 2:
        raise ValueError("CROSS_TEXT_CONNECTION texts must be connected by shared subject matter.")


def validate_question_data_contract(spec: QuestionSpec) -> None:
    allowed_data_types = {"none", "text_data", "table", "graph"}
    if spec.data_type not in allowed_data_types:
        raise ValueError(f"Invalid data_type {spec.data_type} for {spec.question_type}.")
    text = " ".join(part for part in (spec.passage, spec.prompt) if part).lower()
    mentions_visual = bool(re.search(r"\b(table|graph|figure|chart)\b", text))
    if spec.data_type == "text_data" and mentions_visual:
        raise ValueError(f"text_data question cannot mention table/graph/figure/chart: {spec.question_type}.")
    if spec.data_type == "table":
        payload = spec.data_payload or {}
        if not isinstance(payload.get("columns"), list) or not payload["columns"]:
            raise ValueError(f"Table question missing data_payload.columns: {spec.question_type}.")
        if not isinstance(payload.get("rows"), list) or not payload["rows"]:
            raise ValueError(f"Table question missing data_payload.rows: {spec.question_type}.")
        if not re.search(r"\b(table|data)\b", text):
            raise ValueError(f"Table question wording must reference table/data: {spec.question_type}.")
        validate_table_reasoning_contract(spec, payload, text)
    elif spec.data_type == "graph":
        if not spec.graph_path and not (spec.data_payload or {}).get("graph_path"):
            raise ValueError(f"Graph question missing graph_path/data_payload: {spec.question_type}.")
        if not re.search(r"\b(graph|figure)\b", text):
            raise ValueError(f"Graph question wording must reference graph/figure: {spec.question_type}.")
    elif mentions_visual:
        raise ValueError(f"Question mentions visual source without matching data_type/data_payload: {spec.question_type}.")


def validate_table_reasoning_contract(spec: QuestionSpec, payload: dict, text: str) -> None:
    reasoning_pattern = payload.get("reasoning_pattern")
    if reasoning_pattern not in TABLE_REASONING_PATTERNS:
        raise ValueError(f"Table question needs a valid reasoning pattern, got {reasoning_pattern!r}.")

    metadata_constraints = int(extract_metadata_value(spec.explanation, "constraints_required") or "0")
    payload_constraints = int(payload.get("required_constraints") or 0)
    if max(metadata_constraints, payload_constraints) < 2:
        raise ValueError(f"Table question must require at least two constraints: {spec.question_type}.")

    constraint_types = set(payload.get("constraint_types") or [])
    if not constraint_types & TABLE_CONSTRAINT_TYPES:
        raise ValueError(f"Table question must use subset, comparison, claim, or exception reasoning: {spec.question_type}.")

    required_skills = set(payload.get("required_skills") or [])
    if not TABLE_REQUIRED_SKILLS.issubset(required_skills):
        raise ValueError(f"Table question must require scanning multiple rows and applying a condition: {spec.question_type}.")

    rejected_shortcuts = set(payload.get("reject_shortcuts") or [])
    if not {"max_min_lookup", "single_value_reading", "direct_row_match"}.issubset(rejected_shortcuts):
        raise ValueError(f"Table question must explicitly reject direct lookup shortcuts: {spec.question_type}.")

    if re.search(r"\b(what is|what was|which row|which value)\b", text):
        raise ValueError(f"Table question is phrased like a direct lookup: {spec.question_type}.")

    table_values = extract_table_value_tokens(payload)
    wrong_choices = [choice for choice in spec.choices if choice.role != ChoiceTrapRole.correct]
    for choice in wrong_choices:
        answer_text = choice.text.lower()
        answer_compact = answer_text.replace(",", "")
        if not any(token in answer_text or token.replace(",", "") in answer_compact for token in table_values):
            raise ValueError(f"Table distractor must use real table values while applying the wrong constraint: {choice.text}")


def extract_table_value_tokens(payload: dict) -> set[str]:
    tokens: set[str] = set()
    for row in payload.get("rows") or []:
        if not isinstance(row, dict):
            continue
        for value in row.values():
            text = str(value).strip().lower()
            if text:
                if len(text) > 1:
                    tokens.add(text)
                    tokens.add(text.replace(",", ""))
        route_value = str(row.get("Route", "")).strip().lower()
        if route_value:
            tokens.add(f"route {route_value}")
    return tokens


def validate_single_grammar_rule(spec: QuestionSpec, pattern: str) -> None:
    grammar_rules = {
        "grammar_subject_verb": "subject-verb agreement",
        "grammar_clause_boundary": "clause boundaries",
        "grammar_modifier": "modifier placement",
        "grammar_pronoun_reference": "pronoun reference",
        "referent_precision": "referent_precision",
        "sentence_boundary_resolution": "sentence_boundary_resolution",
        "appositive_structure": "appositive_structure",
        "modifier_attachment": "modifier_attachment",
        "clause_integration": "clause_integration",
        "punctuation_flow": "punctuation_flow",
        "subject_reference_alignment": "subject_reference_alignment",
    }
    expected_rule = grammar_rules.get(pattern)
    if expected_rule is None:
        raise ValueError(f"Unknown grammar pattern: {pattern}.")
    if f"tests only {expected_rule}" not in spec.explanation:
        raise ValueError(f"Grammar question {pattern} must test only {expected_rule}.")
    other_rules = [rule for key, rule in grammar_rules.items() if key != pattern]
    if any(f"tests only {rule}" in spec.explanation for rule in other_rules):
        raise ValueError(f"Grammar question {pattern} mixes multiple grammar rules.")


def validate_hard_zone_item(spec: QuestionSpec, slot: RWModuleSlot, index: int) -> None:
    constraints_required = int(extract_metadata_value(spec.explanation, "constraints_required") or "0")
    if constraints_required < 2:
        raise ValueError(f"Hard-zone RW slot {index + 1} must require at least two simultaneous decisions.")
    if "logic_pattern=" not in spec.explanation or "distractor_taxonomy=" not in spec.explanation:
        raise ValueError(f"Hard-zone RW slot {index + 1} must expose logic pattern and distractor taxonomy metadata.")
    if len(simulate_first_pass_elimination(spec)) < 3:
        raise ValueError(f"Hard-zone RW slot {index + 1} must retain at least three first-pass survivors.")
    if not all(choice_spec.text and len(choice_spec.text.strip()) >= 1 for choice_spec in spec.choices):
        raise ValueError(f"Hard-zone RW slot {index + 1} has a distractor that is not valid answer text.")
    if slot.question_type == "Transitions" and slot.pattern not in TRANSITION_TYPES:
        raise ValueError(f"Transition pattern {slot.pattern} is not in the fine-grained transition taxonomy.")
    if slot.question_type == "Rhetorical Synthesis" and slot.pattern not in RHETORICAL_TASK_TYPES:
        raise ValueError(f"Rhetorical synthesis task {slot.pattern} is not in the supported task taxonomy.")
    if slot.question_type == "Standard English Conventions":
        allowed_hard_grammar = {
            "referent_precision",
            "sentence_boundary_resolution",
            "appositive_structure",
            "modifier_attachment",
            "clause_integration",
            "punctuation_flow",
            "subject_reference_alignment",
            "grammar_pronoun_reference",
        }
        if slot.pattern not in allowed_hard_grammar:
            raise ValueError(f"Hard-zone grammar pattern {slot.pattern} is not a structural ambiguity pattern.")


def validate_pattern_based_generation(spec: QuestionSpec) -> None:
    pattern = extract_metadata_value(spec.explanation, "pattern")
    allowed_patterns = RW_GENERATION_PATTERNS.get(spec.question_type)
    if allowed_patterns is None:
        allowed_patterns = set().union(*RW_GENERATION_PATTERNS.values())
    if pattern not in allowed_patterns:
        raise ValueError(f"{spec.question_type} must use a named generation pattern, got {pattern!r}.")


def validate_answer_competition(spec: QuestionSpec) -> None:
    top_competitors = [
        choice_spec
        for choice_spec in spec.choices
        if "competition=top" in (choice_spec.basis or "")
    ]
    if len(top_competitors) < 2:
        raise ValueError(f"{spec.question_type} is too obvious: fewer than two top-competing answers.")
    if not any(choice_spec.role == ChoiceTrapRole.correct for choice_spec in top_competitors):
        raise ValueError(f"{spec.question_type} top competition must include the correct answer.")
    if not any("taxonomy=semantic_twin" in (choice_spec.basis or "") for choice_spec in top_competitors if choice_spec.role != ChoiceTrapRole.correct):
        raise ValueError(f"{spec.question_type} needs a semantic-twin distractor that differs only in nuance.")
    if not all("why_wrong=" in (choice_spec.basis or "") for choice_spec in spec.choices):
        raise ValueError(f"{spec.question_type} choices must include internal answer explanations.")
    obviously_strong_markers = ("only valid", "obviously", "clearly the")
    if any(marker in spec.explanation.lower() for marker in obviously_strong_markers):
        raise ValueError(f"{spec.question_type} final filter rejected an obviously stronger correct-answer explanation.")


def extract_metadata_value(text: str, key: str) -> str | None:
    prefix = f"{key}="
    if prefix not in text:
        return None
    return text.split(prefix, 1)[1].split(";", 1)[0].strip()


def simulate_first_pass_elimination(spec: QuestionSpec) -> list[ChoiceSpec]:
    survivors: list[ChoiceSpec] = []
    for choice_spec in spec.choices:
        basis = choice_spec.basis or ""
        if choice_spec.role == ChoiceTrapRole.correct:
            survivors.append(choice_spec)
        elif "plausibility=high" in basis:
            survivors.append(choice_spec)
        elif spec.difficulty >= 8 and any(f"taxonomy={taxonomy}" in basis for taxonomy in RW_HIGH_PLAUSIBILITY_TAXONOMY):
            survivors.append(choice_spec)
    return survivors


def math_question(module: int, index: int) -> QuestionSpec:
    templates = [
        math_linear,
        math_quadratic,
        math_function,
        math_geometry,
        math_data,
        math_word_problem,
        math_graph,
    ]
    return templates[index % len(templates)](module, index)


def math_base(module: int, index: int, *, topic: str, subtopic: str, question_type: str, prompt: str, correct: str, explanation: str, trap_type: str, fmt: QuestionFormat, choices: tuple[ChoiceSpec, ...] = (), graph_path: str | None = None) -> QuestionSpec:
    return QuestionSpec(
        section=SATSection.math,
        module=module,
        order_index=index,
        difficulty=difficulty_for(module, index),
        adaptive_level=adaptive_level(module, index),
        source=source_for(index),
        topic=topic,
        subtopic=subtopic,
        structure_key=f"math-{subtopic.lower().replace(' ', '-')}-{index % 4}",
        passage=None,
        prompt=prompt,
        correct_answer=correct,
        explanation=explanation,
        trap_type=trap_type,
        question_type=question_type,
        format=fmt,
        estimated_time=75 + (index % 5) * 15,
        discrimination_score=round(0.44 + (index % 6) * 0.06, 2),
        choices=choices,
        graph_path=graph_path,
        graph_reasoning_type="slope_meaning" if graph_path else None,
        graph_required=bool(graph_path),
        data_type="graph" if graph_path else "none",
        data_payload={"graph_path": graph_path, "graph_reasoning_type": "slope_meaning"} if graph_path else {},
    )


def math_linear(module: int, index: int) -> QuestionSpec:
    a = 2 + index % 5
    b = 7 + index % 4
    x = 3
    result = a * x + b
    prompt = f"If {a}x + {b} = {result}, what is the value of x?"
    return math_base(
        module,
        index,
        topic="Algebra",
        subtopic="Linear equations",
        question_type="Linear equations",
        prompt=prompt,
        correct="C",
        explanation=f"Subtract {b} from both sides to get {a}x = {a * x}, so x = {x}.",
        trap_type="inverse operation error",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(x - 1), str(x + 1), str(x), str(result), correct="C"),
    )


def math_quadratic(module: int, index: int) -> QuestionSpec:
    root = 3 + index % 4
    prompt = f"The equation (x - {root})(x + 2) = 0 has one positive solution. What is that solution?"
    return math_base(
        module,
        index,
        topic="Advanced Math",
        subtopic="Quadratics",
        question_type="Quadratics",
        prompt=prompt,
        correct="B",
        explanation=f"By the zero product property, x - {root} = 0 gives the positive solution x = {root}.",
        trap_type="sign error",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(-2), str(root), str(-root), str(root + 2), correct="B"),
    )


def math_function(module: int, index: int) -> QuestionSpec:
    m = 2 + index % 3
    c = 5 + index % 4
    x = 4
    answer = str(m * x + c)
    return math_base(
        module,
        index,
        topic="Functions",
        subtopic="Function notation",
        question_type="Function notation",
        prompt=f"For the function f(x) = {m}x + {c}, what is f({x})?",
        correct=answer,
        explanation=f"Substitute {x} for x: f({x}) = {m}({x}) + {c} = {answer}.",
        trap_type="substitution error",
        fmt=QuestionFormat.grid_in,
    )


def math_geometry(module: int, index: int) -> QuestionSpec:
    angle = 35 + (index % 5) * 5
    answer = 180 - angle
    return math_base(
        module,
        index,
        topic="Geometry and Trigonometry",
        subtopic="Angles",
        question_type="Angles",
        prompt=f"Two angles form a straight line. One angle measures {angle} degrees. What is the measure, in degrees, of the other angle?",
        correct="D",
        explanation=f"Angles on a straight line sum to 180 degrees, so the other angle is 180 - {angle} = {answer}.",
        trap_type="angle sum confusion",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(angle), str(90 - angle), str(answer - 10), str(answer), correct="D"),
    )


def math_data(module: int, index: int) -> QuestionSpec:
    values = [6 + index % 3, 8 + index % 2, 10, 12, 14]
    mean_value = sum(values) / len(values)
    prompt = f"The data set is {', '.join(str(v) for v in values)}. What is the mean of the data set?"
    return math_base(
        module,
        index,
        topic="Data Analysis",
        subtopic="Mean and interpretation",
        question_type="Data Analysis",
        prompt=prompt,
        correct="A",
        explanation=f"The sum is {sum(values)} and there are {len(values)} values, so the mean is {mean_value:g}.",
        trap_type="mean calculation error",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(f"{mean_value:g}", f"{values[len(values)//2]}", f"{sum(values)}", f"{mean_value + 2:g}", correct="A"),
    )


def math_word_problem(module: int, index: int) -> QuestionSpec:
    rate = 4 + index % 4
    hours = 3 + index % 3
    start = 5
    answer = rate * hours + start
    return math_base(
        module,
        index,
        topic="Word Problems",
        subtopic="Rates",
        question_type="Rates",
        prompt=f"A tank contains {start} liters of water. Water is added at a constant rate of {rate} liters per hour for {hours} hours. How many liters of water are in the tank after {hours} hours?",
        correct=str(answer),
        explanation=f"Add the starting amount to the amount added: {start} + {rate}({hours}) = {answer}.",
        trap_type="rate setup error",
        fmt=QuestionFormat.grid_in,
    )


def math_graph(module: int, index: int) -> QuestionSpec:
    return math_base(
        module,
        index,
        topic="Graph Interpretation",
        subtopic="Slope and intercepts",
        question_type="Graph Interpretation",
        prompt="The graph shows a line modeling total cost y, in dollars, after x hours. Which statement best interprets the slope of the line?",
        correct="B",
        explanation="The slope represents the change in total cost for each additional hour.",
        trap_type="slope interpretation error",
        fmt=QuestionFormat.multiple_choice,
        graph_path="/static/graphs/sample-linear.png",
        choices=(
            choice("A", "The starting cost before any hours are added is 3 dollars.", ChoiceTrapRole.common_mistake, "This confuses slope with an intercept."),
            choice("B", "The total cost increases by 3 dollars for each additional hour.", ChoiceTrapRole.correct, "This correctly interprets slope as rate of change."),
            choice("C", "The total cost is always 3 dollars regardless of the number of hours.", ChoiceTrapRole.conceptual_misunderstanding, "This ignores the increasing line."),
            choice("D", "The number of hours increases by 3 for each additional dollar.", ChoiceTrapRole.extreme_wrong_logic, "This reverses the units of the rate."),
        ),
    )


def choice(label: str, text: str, role: ChoiceTrapRole, basis: str) -> ChoiceSpec:
    return ChoiceSpec(label=label, text=text, role=role, basis=basis)


def math_choices(a: str, b: str, c: str, d: str, *, correct: str) -> tuple[ChoiceSpec, ...]:
    roles = {
        "A": ChoiceTrapRole.correct if correct == "A" else ChoiceTrapRole.common_mistake,
        "B": ChoiceTrapRole.correct if correct == "B" else ChoiceTrapRole.conceptual_misunderstanding,
        "C": ChoiceTrapRole.correct if correct == "C" else ChoiceTrapRole.conceptual_misunderstanding,
        "D": ChoiceTrapRole.correct if correct == "D" else ChoiceTrapRole.extreme_wrong_logic,
    }
    return (
        choice("A", a, roles["A"], "This option reflects either the correct computation or a common arithmetic slip."),
        choice("B", b, roles["B"], "This option reflects either the correct computation or a conceptual mix-up."),
        choice("C", c, roles["C"], "This option reflects either the correct computation or a sign/substitution error."),
        choice("D", d, roles["D"], "This option reflects either the correct computation or an unsupported extreme value."),
    )


def create_sample_graph() -> None:
    output_dir = Path("static/graphs")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "sample-linear.png"
    if output_path.exists():
        return

    x_values = [0, 1, 2, 3, 4, 5]
    y_values = [2 + 3 * x for x in x_values]
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(x_values, y_values, marker="o", linewidth=2.5, color="#1d4ed8")
    ax.set_title("Total Cost by Hour")
    ax.set_xlabel("Hours")
    ax.set_ylabel("Total cost (dollars)")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


if __name__ == "__main__":
    seed()
