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
MODULE2_MODE = "hard"
RW_DISTRACTOR_TAXONOMY = {"semantic_twin", "scope_error", "incomplete_reasoning"}
RW_HIGH_PLAUSIBILITY_TAXONOMY = {"semantic_twin", "scope_error"}
RW_GENERATION_PATTERNS = {
    "Vocabulary in Context": {"literal_vs_abstract", "functional_precision", "tone_alignment"},
    "Main Idea": {"example_vs_general", "study_vs_conclusion"},
    "Function": {"setup_refutation", "local_explanation", "evidence_support"},
    "Data Analysis": {"ranking_flip_threshold", "data_mapping_table"},
    "Command of Evidence": {"causal_chain_support", "weaken_origin_claim", "textual_claim_strength", "quantitative_trend_value"},
    "command_of_evidence_quantitative_graph": {"graph_trend_claim_shift"},
    "TEXT_STRUCTURE_FUNCTION": {"belief_vs_evidence", "claim_vs_refutation", "setup_vs_result"},
    "CROSS_TEXT_CONNECTION": {"claim_vs_empirical_evidence", "model_vs_data", "hypothesis_vs_revision"},
    "Inference": {"contradiction_inference", "expectation_violation", "causal_gap"},
    "Transitions": {"reinforcement", "clarification", "concession", "conclusion"},
    "Rhetorical Synthesis": {"notes_task_selection", "compare", "contrast", "present_conclusion"},
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
GRAPH_REASONING_PATTERNS = {"crossover_point", "threshold_shift", "divergence_convergence"}
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
        "distractor_generators": ("surface_rank", "pre_threshold_scope", "incomplete_reasoning"),
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
    "graph_trend_claim_shift": {
        "passage_template": "graph-backed study claim revised after a crossover or threshold pattern",
        "logic_rule": "use the graph's new relationship to choose the evidence for the revised conclusion",
        "correct_answer_rule": "must connect the graph direction to the researchers' conclusion logic",
        "distractor_generators": ("correct_graph_wrong_claim", "correct_claim_wrong_data", "misread_trend"),
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
    "notes_task_selection": {
        "passage_template": "4-6 bullet notes with relevant facts, irrelevant details, and overlapping information",
        "logic_rule": "select notes by the stated writing task before combining evidence",
        "correct_answer_rule": "must match the task exactly, include only relevant information, and combine two or more notes when needed",
        "distractor_generators": ("true_but_wrong_task", "single_fact_only", "irrelevant_detail_focus"),
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
    constraints_required: int = 1
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
    "notes_task_selection",
    "cross_text_basic",
    "cross_text_response",
    "central_competing",
    "inference_combined",
    "quant_graph_support",
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
    RWModuleSlot("notes_task_selection", "Rhetorical Synthesis", "notes_task_selection", 5),
    RWModuleSlot("cross_text_basic", "CROSS_TEXT_CONNECTION", "claim_vs_empirical_evidence", 5),
    RWModuleSlot("cross_text_response", "CROSS_TEXT_CONNECTION", "model_vs_data", 5),
    RWModuleSlot("central_competing", "Main Idea", "example_vs_general", 6),
    RWModuleSlot("inference_combined", "Inference", "causal_gap", 6),
    RWModuleSlot("quant_graph_support", "command_of_evidence_quantitative_graph", "graph_trend_claim_shift", 6),
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


MODULE2_HARD_ORDER = [
    "inference", "inference", "inference",
    "function", "function", "function",
    "cross_text", "cross_text", "cross_text",
    "command_text", "command_text", "command_text",
    "command_graph", "command_graph",
    "transition", "transition",
    "central_idea", "central_idea", "central_idea",
    "rhetorical", "rhetorical", "rhetorical",
    "grammar", "grammar", "grammar", "grammar", "grammar",
]


MODULE2_HARD_BLUEPRINT: tuple[RWModuleSlot, ...] = (
    RWModuleSlot("m2_inference_1", "Inference", "causal_gap", 8),
    RWModuleSlot("m2_inference_2", "Inference", "contradiction_inference", 9),
    RWModuleSlot("m2_inference_3", "Inference", "expectation_violation", 10),
    RWModuleSlot("m2_function_1", "Function", "setup_refutation", 8),
    RWModuleSlot("m2_function_2", "Function", "local_explanation", 9),
    RWModuleSlot("m2_function_3", "Function", "evidence_support", 10),
    RWModuleSlot("m2_cross_text_1", "CROSS_TEXT_CONNECTION", "claim_vs_empirical_evidence", 8),
    RWModuleSlot("m2_cross_text_2", "CROSS_TEXT_CONNECTION", "model_vs_data", 9),
    RWModuleSlot("m2_cross_text_3", "CROSS_TEXT_CONNECTION", "hypothesis_vs_revision", 10),
    RWModuleSlot("m2_command_text_1", "Command of Evidence", "textual_claim_strength", 8),
    RWModuleSlot("m2_command_text_2", "Command of Evidence", "weaken_origin_claim", 9),
    RWModuleSlot("m2_command_text_3", "Command of Evidence", "causal_chain_support", 10),
    RWModuleSlot("m2_command_graph_1", "command_of_evidence_quantitative_graph", "graph_trend_claim_shift", 8),
    RWModuleSlot("m2_command_graph_2", "Command of Evidence", "quantitative_trend_value", 9),
    RWModuleSlot("m2_transition_1", "Transitions", "concession", 8),
    RWModuleSlot("m2_transition_2", "Transitions", "conclusion", 9),
    RWModuleSlot("m2_central_idea_1", "Main Idea", "study_vs_conclusion", 8),
    RWModuleSlot("m2_central_idea_2", "Main Idea", "example_vs_general", 9),
    RWModuleSlot("m2_central_idea_3", "Main Idea", "study_vs_conclusion", 10),
    RWModuleSlot("m2_rhetorical_1", "Rhetorical Synthesis", "contrast", 8),
    RWModuleSlot("m2_rhetorical_2", "Rhetorical Synthesis", "compare", 9),
    RWModuleSlot("m2_rhetorical_3", "Rhetorical Synthesis", "present_conclusion", 10),
    RWModuleSlot("m2_grammar_1", "Standard English Conventions", "sentence_boundary_resolution", 8),
    RWModuleSlot("m2_grammar_2", "Standard English Conventions", "modifier_attachment", 9),
    RWModuleSlot("m2_grammar_3", "Standard English Conventions", "referent_precision", 10),
    RWModuleSlot("m2_grammar_4", "Standard English Conventions", "clause_integration", 9),
    RWModuleSlot("m2_grammar_5", "Standard English Conventions", "modifier_attachment", 10),
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
    if module == 2 and MODULE2_MODE == "hard":
        return "hard"
    return ("hard", "medium", "easy")[index % 3]


def difficulty_for(module: int, index: int) -> int:
    if module == 1:
        return 3 + (index % 5)
    return {"easy": 3, "medium": 6, "hard": 8}[adaptive_level(module, index)] + (index % 2)


def rw_difficulty_for(module: int, index: int) -> int:
    if module == 2 and MODULE2_MODE == "hard":
        return MODULE2_HARD_BLUEPRINT[index].difficulty
    return RW_MODULE_BLUEPRINT[index].difficulty


def source_for(index: int) -> QuestionSource:
    return QuestionSource.generated_variant if index % 10 in (7, 8, 9) else QuestionSource.database


def reading_writing_question(module: int, index: int) -> QuestionSpec:
    slot = rw_slot_for(module, index)
    spec = generate(slot.question_type, slot.pattern, module=module, index=index)
    validate_reading_writing_spec(spec)
    validate_reading_writing_slot(spec, slot, index)
    return spec


def rw_slot_for(module: int, index: int) -> RWModuleSlot:
    if module == 2 and MODULE2_MODE == "hard":
        return MODULE2_HARD_BLUEPRINT[index]
    return RW_MODULE_BLUEPRINT[index]


def generate(question_type: str, pattern: str, *, module: int, index: int) -> QuestionSpec:
    if question_type == "Rhetorical Synthesis" and pattern == "notes_task_selection":
        item = rw_notes_task_selection_item(index)
    else:
        item = rw_pattern_item(question_type, pattern)
    if module == 2 and MODULE2_MODE == "hard" and item.constraints_required < 2:
        item = replace(item, constraints_required=2)
    return rw_ambiguity_first_base(module, index, item)


def rw_notes_task_selection_item(index: int) -> AmbiguityFirstItem:
    goal = ("contrast", "summarize", "support a claim", "describe difference", "highlight purpose")[index % 5]
    goal_payloads = {
        "contrast": {
            "notes": (
                "- Project Delta often hosted weekend workshops for residents.\n"
                "- Project Mira was designed mainly for quiet individual study.\n"
                "- Both projects used recycled materials.\n"
                "- Project Delta had a rooftop garden that opened in 2021.\n"
                "- Project Mira won a regional design award.\n"
                "- Several cost estimates may seem relevant but do not address the writing task."
            ),
            "constraint": "However, the student's goal is to contrast the two projects' community use, not summarize their awards or materials.",
            "prompt": "Which choice best uses relevant information from the notes to contrast the two projects?",
            "answers": (
                "Both projects used recycled materials and received regional design awards.",
                "One project invited collective public participation, whereas the other centered on independent use.",
                "Project Delta had a rooftop garden that opened in 2021.",
                "Project Mira won a regional design award, although both projects used recycled materials.",
            ),
            "correct": 1,
        },
        "summarize": {
            "notes": (
                "- The East program paired local mentors with after-school studio access.\n"
                "- The West program paired local mentors with after-school studio access.\n"
                "- The East program displayed sketches in May.\n"
                "- The West program used donated tablets.\n"
                "- Both programs often gave students extra time to practice design skills.\n"
                "- Several room locations may seem relevant but are only background details."
            ),
            "constraint": "However, the student's goal is to summarize the main shared outcome of both programs, not list a single detail from one site.",
            "prompt": "Which choice best uses relevant information from the notes to summarize the programs' shared outcome?",
            "answers": (
                "By combining guidance from experienced adults with extra studio time, both programs expanded students' design practice.",
                "The East program met in a library basement and displayed sketches in May.",
                "The West program used donated tablets, a detail that made its posters more colorful.",
                "The programs were different because one used mentors and the other used tablets.",
            ),
            "correct": 0,
        },
        "support a claim": {
            "notes": (
                "- Visitors often added written responses beside artifacts.\n"
                "- Visitors could compare their responses with comments from earlier visitors.\n"
                "- The exhibit opened in June.\n"
                "- Several objects were borrowed from three museums.\n"
                "- Attendance rose during the exhibit's first month.\n"
                "- The curator selected rare objects that may have attracted first-time visitors."
            ),
            "constraint": "However, the student's goal is to support the claim that the exhibit encouraged active public interpretation, not merely attendance.",
            "prompt": "Which choice best uses relevant information from the notes to support the student's claim?",
            "answers": (
                "The exhibit opened in June and included objects borrowed from three museums.",
                "The exhibit asked visitors to contribute interpretations and place them in conversation with other viewers' responses.",
                "The curator selected several rare objects that may have attracted first-time visitors.",
                "The exhibit was popular because attendance rose during its first month.",
            ),
            "correct": 1,
        },
        "describe difference": {
            "notes": (
                "- Researcher N used satellite records collected over many years.\n"
                "- Researcher O relied on interviews from one fishing season.\n"
                "- Both researchers studied migration patterns that may shift as coastal weather changes.\n"
                "- Researcher O interviewed fishers in three towns along the same coast.\n"
                "- Researcher N's maps were published before Researcher O began interviewing participants.\n"
                "- Several publication dates overlap but are not the key evidence difference."
            ),
            "constraint": "However, the student's goal is to describe the difference in evidence sources, not the topic both researchers studied.",
            "prompt": "Which choice best uses relevant information from the notes to describe a difference between the researchers' evidence?",
            "answers": (
                "Both researchers studied migration patterns that may shift as coastal weather changes.",
                "One researcher drew on long-term remote measurements, whereas the other used short-term firsthand accounts.",
                "Researcher O interviewed fishers in three towns along the same coast.",
                "Researcher N's maps were published before Researcher O began interviewing participants.",
            ),
            "correct": 1,
        },
        "highlight purpose": {
            "notes": (
                "- The old entrance was narrow.\n"
                "- The new layout added ramps.\n"
                "- The new layout added clearer signs.\n"
                "- The museum reopened in September after weather-related delays.\n"
                "- The redesign used several locally produced materials.\n"
                "- The changes may help more visitors move through the building independently."
            ),
            "constraint": "However, the student's goal is to highlight the purpose of the redesign, not discuss its cost or schedule.",
            "prompt": "Which choice best uses relevant information from the notes to highlight the purpose of the redesign?",
            "answers": (
                "The redesign took six months and used several locally produced materials.",
                "The changes turned a difficult entry sequence into one that supported more independent movement through the building.",
                "The museum reopened in September after several weather-related delays.",
                "Local materials made the redesign visually similar to nearby public buildings.",
            ),
            "correct": 1,
        },
    }
    payload = goal_payloads[goal]
    return AmbiguityFirstItem(
        generation_pattern="notes_task_selection",
        ambiguous_passage=(
            "A student is reviewing notes for a writing task.\n"
            "Notes:\n"
            f"{payload['notes']}"
        ),
        constraint_sentence=payload["constraint"],
        prompt=payload["prompt"],
        answer_options=payload["answers"],
        correct_index=payload["correct"],
        topic="Rhetorical Synthesis",
        subtopic=f"Pattern: notes_task_selection; goal={goal}",
        question_type="Rhetorical Synthesis",
        trap_type="notes task selection trap",
        explanation=(
            f"Task={goal}; correct answer combines two or more relevant notes and filters overlapping or irrelevant details; "
            "distractor_types=true_but_wrong_task,single_fact_only,irrelevant_detail_focus."
        ),
        constraints_required=2,
    )


def rw_pattern_item(question_type: str, pattern: str) -> AmbiguityFirstItem:
    items: dict[tuple[str, str], AmbiguityFirstItem] = {
        ("Vocabulary in Context", "literal_vs_abstract"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, the curator described the restored mural as bright, though the pigments often remained muted after cleaning."
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
                "Early field notes called the sensor's reading sharp, though the plain display often made the word seem visual."
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
                "At first, the review called the memoir restrained, which may sound like criticism despite the reviewer's often admiring tone."
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
            answer_options=("One library increased student visits by adding evening hours.", "Libraries may need longer hours when student demand is high.", "Student routines are difficult for libraries to measure.", "A specific library example supports a broader claim about adapting services to users' routines."),
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
                "A study tracked urban bees visiting balcony gardens as well as park and roadside plants, and several measurements may seem important on their own."
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
            answer_options=("By accepting Text 1's claim with limited qualification", "By adding evidence that narrows Text 1's interpretation", "By shifting attention from line length to reader movement", "By arguing that Text 1 overlooks evidence that short lines can slow readers down"),
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
            answer_options=("Text 2 puts less emphasis on Text 1's claim.", "Text 2 agrees with Text 1 but adds a condition.", "Text 2 focuses more on maintenance than on social ties.", "Text 2 qualifies Text 1's claim by identifying a condition for the effect."),
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
                "At first, engineers expected a lightweight bridge panel could vibrate more than the older steel panel because the new material was thinner and less dense."
            ),
            constraint_sentence="However, embedded ribs distributed force across the panel, and measurements showed less vibration than in the older design.",
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
                "target_sentence": "At first, engineers expected a lightweight bridge panel could vibrate more than the older steel panel because the new material was thinner and less dense.",
                "target_role": "hypothesis",
            },
        ),
        ("CROSS_TEXT_CONNECTION", "claim_vs_empirical_evidence"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Text 1: Some art historians claim that patrons chose miniature portraits mainly because they were inexpensive substitutes for larger paintings. "
                "They reason that smaller works would have let patrons participate in portrait culture without paying for a full-size commission. "
                "Text 2: Although that explanation may hold for some commissions, purchase records from two estate inventories show that several miniatures cost nearly as much as full-size portraits. "
                "This pattern suggests that private display, not price alone, limited the claim's scope, indicating that patrons often valued miniatures as intimate keepsakes."
            ),
            constraint_sentence="Although both texts discuss why patrons chose miniatures, Text 2 uses evidence to revise Text 1's economic explanation.",
            prompt="Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
            answer_options=("By noting that the records give useful price comparisons between different portrait formats.", "By agreeing that cost may have mattered while giving less attention to the keepsake evidence.", "By suggesting that high prices make the economic explanation less complete than it first appears.", "By suggesting that the claim may need revision because evidence points to personal use as well as price."),
            correct_index=3,
            topic="CROSS_TEXT_CONNECTION",
            subtopic="Pattern: claim_vs_empirical_evidence",
            question_type="CROSS_TEXT_CONNECTION",
            trap_type="claim versus empirical evidence trap",
            explanation="Text 2 responds with empirical evidence that modifies, rather than simply repeats, Text 1's claim.",
            constraints_required=2,
            data_payload={
                "type": "cross_text",
                "text_1": "Some art historians claim that patrons chose miniature portraits mainly because they were inexpensive substitutes for larger paintings. They reason that smaller works would have let patrons participate in portrait culture without paying for a full-size commission.",
                "text_2": "Although that explanation may hold for some commissions, purchase records from two estate inventories show that several miniatures cost nearly as much as full-size portraits. This pattern suggests that private display, not price alone, limited the claim's scope, indicating that patrons often valued miniatures as intimate keepsakes.",
            },
        ),
        ("CROSS_TEXT_CONNECTION", "model_vs_data"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Text 1: A climate model proposes that urban trees cool nearby streets mostly by casting shade during midday. "
                "The model emphasizes shade because pavement temperatures tend to peak when direct sunlight is strongest. "
                "Text 2: Although midday shade may explain part of the cooling, sensor data from several blocks show that streets with sparse shade but high leaf moisture often stayed cooler into the evening. "
                "The pattern suggests that moisture and time of day constrain the model, indicating that shade captures only one part of the cooling effect."
            ),
            constraint_sentence="Although Text 2 does not reject the model entirely, it reframes the cooling effect as depending partly on moisture and time of day.",
            prompt="Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
            answer_options=("By noting that the block-level sensor data are relevant to evaluating the model.", "By agreeing that shade may matter while giving less weight to evening moisture effects.", "By suggesting that the model may describe midday cooling better than evening cooling.", "By suggesting that the model tends to understate factors besides shade in the cooling pattern."),
            correct_index=3,
            topic="CROSS_TEXT_CONNECTION",
            subtopic="Pattern: model_vs_data",
            question_type="CROSS_TEXT_CONNECTION",
            trap_type="model versus data trap",
            explanation="Text 2 uses data to qualify the model without fully rejecting it.",
            constraints_required=2,
            data_payload={
                "type": "cross_text",
                "text_1": "A climate model proposes that urban trees cool nearby streets mostly by casting shade during midday. The model emphasizes shade because pavement temperatures tend to peak when direct sunlight is strongest.",
                "text_2": "Although midday shade may explain part of the cooling, sensor data from several blocks show that streets with sparse shade but high leaf moisture often stayed cooler into the evening. The pattern suggests that moisture and time of day constrain the model, indicating that shade captures only one part of the cooling effect.",
            },
        ),
        ("CROSS_TEXT_CONNECTION", "hypothesis_vs_revision"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Text 1: A linguist hypothesizes that borrowed words could spread rapidly when speakers need names for new technologies. "
                "The hypothesis treats practical usefulness as a strong reason for communities to adopt unfamiliar terms. "
                "Text 2: Although practical need may encourage borrowing in some speech communities, a study of radio terminology found that borrowed terms spread slowly when local words already carried social prestige. "
                "The evidence suggests that social value can limit adoption, indicating that the hypothesis works best when local alternatives lack strong cultural status."
            ),
            constraint_sentence="Although Text 2 accepts that need can matter, it revises the hypothesis by adding a social condition.",
            prompt="Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
            answer_options=("By treating radio terminology as evidence that technology can create naming needs.", "By agreeing that practical need may encourage borrowing while understating local prestige.", "By suggesting that social prestige can slow borrowing even when new terms are useful.", "By suggesting that the hypothesis tends to fit communities where existing terms carry less status."),
            correct_index=3,
            topic="CROSS_TEXT_CONNECTION",
            subtopic="Pattern: hypothesis_vs_revision",
            question_type="CROSS_TEXT_CONNECTION",
            trap_type="hypothesis revision trap",
            explanation="Text 2 modifies the hypothesis by adding a condition about existing local terms.",
            constraints_required=2,
            data_payload={
                "type": "cross_text",
                "text_1": "A linguist hypothesizes that borrowed words could spread rapidly when speakers need names for new technologies. The hypothesis treats practical usefulness as a strong reason for communities to adopt unfamiliar terms.",
                "text_2": "Although practical need may encourage borrowing in some speech communities, a study of radio terminology found that borrowed terms spread slowly when local words already carried social prestige. The evidence suggests that social value can limit adoption, indicating that the hypothesis works best when local alternatives lack strong cultural status.",
            },
        ),
        ("Inference", "expectation_violation"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, researchers expected older seeds to germinate more slowly than newer seeds because older seeds often lose moisture."
            ),
            constraint_sentence="However, seeds stored in cooler rooms sprouted nearly as quickly as new seeds from warmer rooms.",
            prompt="Which inference is best supported by the text?",
            answer_options=("Seed age may matter less under some storage conditions.", "Storage conditions may affect germination speed.", "Older seeds can sprout quickly when storage conditions are favorable.", "Cool storage may reduce the expected disadvantage of seed age."),
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
            answer_options=("Rainfall was lower during several months of the study.", "Runoff may affect how much soil enters a stream.", "Clearer water can occur in streams for many different reasons.", "The report traces the change through runoff and soil load before reaching the water-clarity claim."),
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
            answer_options=("Quiet rooms may help some recall tasks more than others.", "Moderate noise may not affect all kinds of recall in the same way.", "Students prefer noisy rooms for spoken examples.", "The results contradict the prediction for spoken examples more than for silent reading."),
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
            answer_options=("East had the strongest weekend approval result.", "West and East showed equal return-visitor totals.", "North was strongest on both measured outcomes.", "The weekend approval comparison favors West, whereas the visitor-count comparison favors East."),
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
            answer_options=("Harbor City traded woven goods with several villages.", "Inventories often preserve commercial names rather than makers' names.", "Some Harbor City records mention expensive dyes.", "Evidence places the pattern outside Harbor City before the city records can establish it there."),
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
                "At first, the collection of field notes, along with several sketches from the trip, ___ often stored in the archive's climate-controlled room."
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
                "The prototype seemed simple at first ___ however, its internal sensors often required careful calibration."
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
                "The mural's surface looked uniform at first ___ later imaging often revealed two separate paint layers."
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
                "After often comparing the fossil under angled light, ___ noticed a faint ridge along its edge."
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
                "At first, Maya told Lina that the archive's map was missing a label, and ___ often made the catalog confusing."
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
                "At first, when Dr. Mensah gave Rivera the revised catalog entry, ___ often still contained an unclear date range."
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
                "At first, the satellite detected a faint heat signal over the ridge ___ the research team often treated the result cautiously because cloud cover can distort readings."
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
                "At first, after often comparing the restored panels with older photographs, ___ noticed that the border had been repainted in a slightly different blue."
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
                "A student is comparing two restoration projects.\nNotes:\n- Project A often reused original stone but required longer closures.\n- Project B used newer stone and reopened sooner.\n- Both projects preserved the buildings' original outlines.\n- Several budget details are available but not relevant."
            ),
            constraint_sentence="However, the student's goal is to compare the projects' preservation approaches while acknowledging one shared outcome.",
            prompt="Which choice best uses relevant information from the notes to accomplish the student's goal?",
            answer_options=("Project A took longer than Project B, and both had budget records.", "Project B reopened sooner because it used newer stone.", "Both projects involved historic buildings, although Project A took longer.", "One project emphasized material continuity, the other prioritized replacement, and both maintained the same basic architectural form."),
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
                "A student is contrasting two community archives.\nNotes:\n- Archive A often invites residents to annotate photographs online.\n- Archive B relies on staff-written labels and in-person exhibits.\n- Both preserve neighborhood images.\n- Several funding details may seem relevant at first."
            ),
            constraint_sentence="However, the student's goal is to emphasize the difference in how each archive involves the public.",
            prompt="Which choice best uses the notes to emphasize the contrast between the two archives?",
            answer_options=("Both archives preserve historical photographs for community members.", "Archive A and Archive B received grants in different years.", "Archive B has in-person exhibits, so it is more historically accurate than Archive A.", "One archive gives residents a direct interpretive role, whereas the other keeps interpretation mainly with staff."),
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
                "A student is reviewing notes about a school garden.\nNotes:\n- Pollinator counts often rose near native flowers.\n- Vegetable yields changed little.\n- Maintenance took fewer hours after paths were redesigned.\n- A local newspaper praised the garden's appearance."
            ),
            constraint_sentence="However, the student's goal is to present a conclusion about ecological impact, not appearance or labor.",
            prompt="Which choice best uses relevant information from the notes to accomplish the student's goal?",
            answer_options=("The garden became easier to maintain after its paths were redesigned.", "A local newspaper praised the garden's appearance.", "Vegetable yields changed little after the redesign.", "Greater pollinator activity around native plantings supports an ecological-benefit conclusion."),
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
        ("command_of_evidence_quantitative_graph", "graph_trend_claim_shift"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Researchers studying rooftop gardens first found that increasing weekly watering often improved plant growth. Several early notes made watering frequency seem like the main explanation."
            ),
            constraint_sentence="However, after comparing soil-depth groups in the graph, they concluded that the advantage shifted under heavier watering.",
            prompt="Which choice best describes data from the graph that supports the researchers' conclusion?",
            answer_options=(
                "Both soil groups show higher growth as watering increases, but that pattern focuses on watering rather than the revised shift between groups.",
                "The deep-soil group has higher growth at one watering event, which partly fits the soil-depth claim but misses the later crossover.",
                "The deep-soil series remains above the shallow-soil series at every watering level, misreading the trend after the crossover point.",
                "The deep-soil group is higher at low watering, but the shallow-soil group is higher at three watering events, supporting the conclusion that the advantage shifts under heavier watering.",
            ),
            correct_index=3,
            topic="command_of_evidence_quantitative_graph",
            subtopic="Pattern: graph_trend_claim_shift",
            question_type="command_of_evidence_quantitative_graph",
            trap_type="graph trend versus conclusion trap",
            explanation="Graph evidence type=quantitative; pattern=crossover_point; the correct answer requires the graph trend and revised conclusion because the passage does not state which series overtakes the other.",
            constraints_required=2,
            data_type="graph",
            data_payload={
                "x_label": "Weekly watering events",
                "y_label": "Average growth increase (cm)",
                "reasoning_pattern": "crossover_point",
                "graph_dependency": "necessary",
                "series": [
                    {"name": "Deep soil", "values": [(1, 6), (2, 7), (3, 8)]},
                    {"name": "Shallow soil", "values": [(1, 4), (2, 7), (3, 11)]},
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
    constraints_required: int = 1,
    data_type: str = "none",
    data_payload: dict | None = None,
) -> QuestionSpec:
    difficulty = rw_difficulty_for(module, index)
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
        constraints_required=constraints_required,
        choices=choices,
        data_type=data_type,
        data_payload=data_payload or {},
    )


def rw_ambiguity_first_base(module: int, index: int, item: AmbiguityFirstItem) -> QuestionSpec:
    validate_ambiguity_first_item(item)
    difficulty = rw_difficulty_for(module, index)
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
    passage = f"{item.ambiguous_passage} {item.constraint_sentence}"
    if module == 2 and MODULE2_MODE == "hard":
        passage = harden_module2_passage(passage, item)
    return rw_base(
        module,
        index,
        topic=item.topic,
        subtopic=item.subtopic,
        question_type=item.question_type,
        passage=passage,
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
        constraints_required=item.constraints_required,
        choices=tuple(choices),
        data_type=item.data_type,
        data_payload=item.data_payload,
    )


def harden_module2_passage(passage: str, item: AmbiguityFirstItem) -> str:
    if item.question_type in {"Standard English Conventions", "CROSS_TEXT_CONNECTION", "Rhetorical Synthesis"}:
        return passage
    if passage_sentence_count(passage) >= 3:
        return passage
    return f"{passage} Taken together, the details make the initial reading less secure than it first appears."


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
                "Plants in deserts may conserve water when flowers open later.",
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
                "Transit access may contribute to commercial growth in many neighborhoods.",
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
                "The conductor thought energetic percussion could distract from some melodies.",
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
                "Artificial reefs can attract young fish under some habitat conditions.",
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
        "CONTEXT MISMATCH": "incomplete_reasoning",
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
        "CONTEXT MISMATCH": "incomplete reasoning from a partially relevant clue",
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
    max_final_sentences = 6 if item.question_type in {"CROSS_TEXT_CONNECTION", "Rhetorical Synthesis"} else 4
    if item.generation_pattern == "notes_task_selection":
        return
    if final_sentence_count < 2 or final_sentence_count > max_final_sentences:
        raise ValueError(f"Constrained final passage must be 2-{max_final_sentences} sentences.")


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
        if slot.slot_key.startswith("quant_") and slot.pattern not in {"quantitative_trend_value", "data_mapping_table", "graph_trend_claim_shift"}:
            raise ValueError(f"Quant slot {slot.slot_key} must use a table- or graph-backed quantitative pattern.")
        if index >= 18 and slot.difficulty < 8:
            raise ValueError("Hard-zone Reading & Writing slots cannot contain easy or medium questions.")
    validate_module2_hard_blueprint()


def validate_module2_hard_blueprint() -> None:
    if MODULE2_MODE != "hard":
        raise ValueError("Only module2_mode='hard' is implemented.")
    if len(MODULE2_HARD_BLUEPRINT) != 27:
        raise ValueError("Module 2 hard blueprint must contain exactly 27 slots.")
    actual_order = [slot.slot_key.split("_", 2)[1] if slot.slot_key.startswith("m2_") else slot.slot_key for slot in MODULE2_HARD_BLUEPRINT]
    normalized = [
        "cross_text" if value == "cross" else
        "command_text" if value == "command" and "command_text" in slot.slot_key else
        "command_graph" if value == "command" and "command_graph" in slot.slot_key else
        "central_idea" if value == "central" else
        value
        for value, slot in zip(actual_order, MODULE2_HARD_BLUEPRINT, strict=True)
    ]
    if normalized != MODULE2_HARD_ORDER:
        raise ValueError(f"Module 2 hard blueprint order mismatch: {normalized}.")
    for index, slot in enumerate(MODULE2_HARD_BLUEPRINT):
        if slot.difficulty < 8 or slot.difficulty > 10:
            raise ValueError(f"Module 2 hard slot {index + 1} must use difficulty 8-10.")
        if slot.pattern not in RW_GENERATION_PATTERNS.get(slot.question_type, set()):
            raise ValueError(f"Module 2 hard slot {index + 1} has invalid pattern {slot.pattern}.")


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
        "graph_trend_claim_shift",
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
        "notes_task_selection",
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
    if slot.slot_key.startswith("quant_") and spec.data_type not in {"table", "graph"}:
        raise ValueError(f"RW slot {index + 1} ({slot.slot_key}) must include structured table or graph data.")
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
    if spec.module == 2 and MODULE2_MODE == "hard":
        validate_module2_hard_item(spec, slot, index)
    if spec.question_type == "Standard English Conventions":
        validate_single_grammar_rule(spec, slot.pattern)


def validate_reading_writing_spec(spec: QuestionSpec) -> None:
    allowed_types = set(RW_GENERATION_PATTERNS)
    if spec.question_type not in allowed_types:
        raise ValueError(f"Unsupported Reading & Writing question type: {spec.question_type}")
    if not spec.passage:
        raise ValueError("Reading & Writing questions require a passage.")
    validate_passage_length_by_type_and_difficulty(spec)
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
    validate_answer_choice_quality(spec)
    if not any(word in spec.passage.lower() for word in ("although", "however", "yet", "by contrast", "instead", "opposite", "rather than")):
        raise ValueError(f"Passage needs contrast language to create SAT-style ambiguity: {spec.question_type}.")
    if not any(qualifier in spec.passage.lower() for qualifier in ("often", "may", "tends", "tended", "could")):
        raise ValueError(f"Passage needs a qualifier to avoid over-direct conclusions: {spec.question_type}.")
    if spec.question_type != "Standard English Conventions" and not any(marker in spec.passage.lower() for marker in ("at first", "first", "early", "initially", "expected", "seemed", "several", "notes", "though", "although", "not a simple")):
        raise ValueError(f"Passage needs human-like noise or delayed clarity: {spec.question_type}.")
    weak_phrases = ("the finding suggests", "the observation suggests", "the result points to", "therefore, the answer")
    if any(phrase in spec.passage.lower() for phrase in weak_phrases):
        raise ValueError(f"Passage contains a direct conclusion cue that makes the answer too obvious: {spec.question_type}.")
    if spec.question_type == "TEXT_STRUCTURE_FUNCTION":
        validate_text_structure_function(spec)
    if spec.question_type == "CROSS_TEXT_CONNECTION":
        validate_cross_text_connection(spec)
    if extract_metadata_value(spec.explanation, "pattern") == "notes_task_selection":
        validate_notes_task_selection(spec)
    validate_cognitive_depth(spec)
    validate_question_data_contract(spec)


def validate_cognitive_depth(spec: QuestionSpec) -> None:
    validate_distractor_quality_taxonomy(spec)
    if spec.question_type == "TEXT_STRUCTURE_FUNCTION":
        validate_text_structure_cognitive_shift(spec)
    if spec.question_type == "CROSS_TEXT_CONNECTION":
        validate_cross_text_cognitive_relationship(spec)
    if spec.data_type == "table":
        validate_quant_cognitive_depth(spec)
    if spec.data_type == "graph":
        validate_graph_cognitive_depth(spec)
    if spec.difficulty >= 8:
        validate_hard_zone_cognitive_depth(spec)


def validate_passage_length_by_type_and_difficulty(spec: QuestionSpec) -> None:
    sentence_count = passage_sentence_count(spec.passage or "")
    position = spec.order_index + 1

    if spec.module == 2 and MODULE2_MODE == "hard":
        validate_module2_hard_passage_contract(spec, sentence_count)
        return

    if spec.question_type == "Vocabulary in Context":
        if sentence_count > 2:
            raise ValueError("Words in Context passages must stay short.")
        return

    if spec.question_type == "Standard English Conventions":
        if sentence_count > 2:
            raise ValueError("Grammar questions must not exceed two sentences.")
        return

    if spec.question_type == "CROSS_TEXT_CONNECTION":
        validate_cross_text_length_contract(spec)
        return

    if spec.question_type == "Rhetorical Synthesis":
        if position >= 19 and not has_bullet_notes(spec.passage or ""):
            raise ValueError("Hard Rhetorical Synthesis questions must use bullet notes.")
        return

    if position <= 5:
        if sentence_count > 2:
            raise ValueError(f"Easy RW question {position} must be 1-2 sentences, not {sentence_count}.")
        if has_extra_clause_density(spec.passage or ""):
            raise ValueError(f"Easy RW question {position} has too many extra clauses.")
    elif position <= 12:
        if not 2 <= sentence_count <= 3:
            raise ValueError(f"Medium RW question {position} must be 2-3 sentences, not {sentence_count}.")
        if not has_distractor_detail(spec.passage or ""):
            raise ValueError(f"Medium RW question {position} needs one distractor detail.")
    elif position <= 18:
        if not 2 <= sentence_count <= 4:
            raise ValueError(f"Upper RW question {position} must be 2-4 sentences, not {sentence_count}.")
        if not re.search(r"\b(although|however|while)\b", (spec.passage or "").lower()):
            raise ValueError(f"Upper RW question {position} needs a qualifier such as although/however/while.")
    else:
        if sentence_count < 3 or sentence_count > 5:
            raise ValueError(f"Hard RW question {position} must be 3-5 sentences or bullet notes, not {sentence_count}.")
        validate_hard_passage_layers(spec)

    if spec.question_type in {"Command of Evidence", "command_of_evidence_quantitative_graph"}:
        validate_command_evidence_length_contract(spec, sentence_count)


def passage_sentence_count(text: str) -> int:
    normalized = re.sub(r"\b(Dr|Mr|Ms|Mrs)\.", r"\1", text)
    return len([sentence for sentence in re.split(r"[.!?]+", normalized) if sentence.strip()])


def has_bullet_notes(text: str) -> bool:
    return "Notes:" in text and bool(re.search(r"(?m)^\s*-\s+", text))


def has_extra_clause_density(text: str) -> bool:
    return len(re.findall(r"[,;:]", text)) > 3


def has_distractor_detail(text: str) -> bool:
    return bool(re.search(r"\b(at first|several|unrelated|may seem|seemed|notes|details|though|although)\b", text.lower()))


def validate_cross_text_length_contract(spec: QuestionSpec) -> None:
    payload = spec.data_payload or {}
    text_1 = payload.get("text_1", "")
    text_2 = payload.get("text_2", "")
    if not isinstance(text_1, str) or not isinstance(text_2, str):
        raise ValueError("Cross-text length validation requires text_1 and text_2.")
    if passage_sentence_count(text_1) != 2:
        raise ValueError("Cross-text Text 1 must be exactly two sentences.")
    text_2_count = passage_sentence_count(text_2)
    if not 2 <= text_2_count <= 3:
        raise ValueError("Cross-text Text 2 must be 2-3 sentences.")


def validate_hard_passage_layers(spec: QuestionSpec) -> None:
    passage = (spec.passage or "").lower()
    layer_checks = (
        bool(re.search(r"\b(at first|initially|expected|seemed|although|however|while|but)\b", passage)),
        bool(re.search(r"\b(suggests|indicating|implies|likely|therefore|found|revealed|recorded|recommended)\b", passage)),
        bool(re.search(r"\b(however|ultimately|taken together|not just|rather than|instead|___)\b", passage)),
    )
    if sum(layer_checks) < 2:
        raise ValueError(f"Hard {spec.question_type} passage needs at least two logical layers.")


def validate_command_evidence_length_contract(spec: QuestionSpec, sentence_count: int) -> None:
    text = f"{spec.passage or ''} {spec.prompt}".lower()
    if sentence_count < 2:
        raise ValueError("Command of Evidence questions must be medium-long enough to require evidence alignment.")
    if not re.search(r"\b(data|table|study|report|evidence|records?|fragment|review|claim)\b", text):
        raise ValueError("Command of Evidence questions must include explicit evidence or data context.")


def validate_module2_hard_passage_contract(spec: QuestionSpec, sentence_count: int) -> None:
    if spec.question_type == "Standard English Conventions":
        if sentence_count > 2:
            raise ValueError("Module 2 hard grammar questions must stay short.")
        return
    if spec.question_type == "CROSS_TEXT_CONNECTION":
        validate_cross_text_length_contract(spec)
        return
    if spec.question_type == "Rhetorical Synthesis":
        if not has_bullet_notes(spec.passage or ""):
            raise ValueError("Module 2 hard rhetorical questions must use bullet notes.")
        return
    if sentence_count < 3 or sentence_count > 5:
        raise ValueError(f"Module 2 hard {spec.question_type} must be 3-5 sentences, not {sentence_count}.")
    validate_hard_passage_layers(spec)


def validate_distractor_quality_taxonomy(spec: QuestionSpec) -> None:
    distractor_bases = [choice_spec.basis or "" for choice_spec in spec.choices if choice_spec.role != ChoiceTrapRole.correct]
    for taxonomy in ("taxonomy=semantic_twin", "taxonomy=scope_error", "taxonomy=incomplete_reasoning"):
        if not any(taxonomy in basis for basis in distractor_bases):
            raise ValueError(f"{spec.question_type} must include distractor quality {taxonomy}.")


def validate_text_structure_cognitive_shift(spec: QuestionSpec) -> None:
    passage = (spec.passage or "").lower()
    logical_shift_pairs = (
        ("belief", ("however", "logs", "evidence", "qualif")),
        ("hypothesis", ("however", "data", "measurements", "result")),
        ("expected", ("however", "result", "showed", "measurements")),
        ("expectation", ("however", "result", "showed", "measurements")),
        ("claim", ("however", "tests", "evidence", "refut", "overturn")),
    )
    if not any(start in passage and any(end in passage for end in endings) for start, endings in logical_shift_pairs):
        raise ValueError("TEXT_STRUCTURE_FUNCTION must contain a cognitive shift such as belief->contradiction, hypothesis->evidence, or expectation->result.")


def validate_notes_task_selection(spec: QuestionSpec) -> None:
    passage = spec.passage or ""
    bullet_count = len(re.findall(r"(?m)^\s*-\s+", passage))
    if bullet_count < 4:
        raise ValueError("notes_task_selection requires at least four bullet notes.")
    if bullet_count > 6:
        raise ValueError("notes_task_selection must stay within 4-6 bullet notes.")
    explanation = spec.explanation
    for distractor_type in ("true_but_wrong_task", "single_fact_only", "irrelevant_detail_focus"):
        if distractor_type not in explanation:
            raise ValueError(f"notes_task_selection missing distractor type {distractor_type}.")
    correct_choices = [choice_spec for choice_spec in spec.choices if choice_spec.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        raise ValueError("notes_task_selection requires exactly one correct answer.")
    correct_text = correct_choices[0].text.lower()
    if not any(joiner in correct_text for joiner in (" and ", " whereas ", " while ", ";")):
        raise ValueError("notes_task_selection correct answer must combine two or more notes.")
    if "Task=" not in explanation:
        raise ValueError("notes_task_selection must record the randomized question goal.")
    if len(simulate_first_pass_elimination(spec)) < 2:
        raise ValueError("notes_task_selection distractors are too obvious.")


def validate_cross_text_cognitive_relationship(spec: QuestionSpec) -> None:
    passage = (spec.passage or "").lower()
    direct_contradiction_markers = (
        "text 2 directly contradicts",
        "text 2 completely rejects",
        "text 2 proves text 1 false",
        "text 2 shows text 1 is wrong",
    )
    if any(marker in passage for marker in direct_contradiction_markers):
        raise ValueError("CROSS_TEXT_CONNECTION must not be direct contradiction.")
    relationship_markers = ("revise", "revises", "reframe", "reframes", "limitation", "condition", "qualif", "modif", "captures only part", "incomplete")
    combined = f"{spec.passage or ''} {spec.explanation}".lower()
    if not any(marker in combined for marker in relationship_markers):
        raise ValueError("CROSS_TEXT_CONNECTION relationship must be refinement, reinterpretation, or limitation.")


def validate_quant_cognitive_depth(spec: QuestionSpec) -> None:
    passage = (spec.passage or "").lower()
    prompt = spec.prompt.lower()
    if not re.search(r"\b(claim|conclusion|statement|when|only|while|because|supports|evaluates|maps)\b", f"{passage} {prompt}"):
        raise ValueError("Quant/table question must require textual reasoning in addition to data interpretation.")
    if re.search(r"\b(which (route|museum|row)|what (number|value|percent))\b", prompt):
        raise ValueError("Quant/table question is answerable by table lookup alone.")
    if "required_skills" not in (spec.data_payload or {}) or "apply_condition" not in (spec.data_payload or {}).get("required_skills", []):
        raise ValueError("Quant/table question must explicitly require applying a textual condition.")


def validate_graph_cognitive_depth(spec: QuestionSpec) -> None:
    text = f"{spec.passage or ''} {spec.prompt} {spec.explanation}".lower()
    if spec.question_type != "command_of_evidence_quantitative_graph":
        raise ValueError("RW graph questions must use command_of_evidence_quantitative_graph.")
    if not re.search(r"\b(study|researchers|found)\b", text):
        raise ValueError("Graph question passage must include a study description.")
    if not re.search(r"\b(initial|first|early)\b", text):
        raise ValueError("Graph question passage must include an initial finding.")
    if not re.search(r"\b(however|when factoring|concluded|conclusion|revised)\b", text):
        raise ValueError("Graph question passage must include a revised conclusion shift.")
    if not re.search(r"\b(graph trend|graph direction|revised conclusion|both graph|trend and)\b", text):
        raise ValueError("Graph question answer logic must require both graph and text.")
    if graph_is_text_solvable(spec):
        raise ValueError("Graph question is solvable from text alone; graph must introduce necessary new information.")


def validate_hard_zone_cognitive_depth(spec: QuestionSpec) -> None:
    survivors = simulate_first_pass_elimination(spec)
    if len(survivors) < 3:
        raise ValueError(f"Hard-zone {spec.question_type} must retain at least three first-pass survivors.")
    wrong_survivors = [choice_spec for choice_spec in survivors if choice_spec.role != ChoiceTrapRole.correct]
    if len(wrong_survivors) < 2:
        raise ValueError(f"Hard-zone {spec.question_type} correct answer is too obviously unique.")


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
    payload = spec.data_payload or {}
    text_1 = payload.get("text_1")
    text_2 = payload.get("text_2")
    if payload.get("type") != "cross_text" or not isinstance(text_1, str) or not isinstance(text_2, str):
        raise ValueError("CROSS_TEXT_CONNECTION questions must include data_payload.type='cross_text', text_1, and text_2.")
    if not text_1.strip() or not text_2.strip():
        raise ValueError("CROSS_TEXT_CONNECTION text_1 and text_2 must both be nonempty.")
    if text_1.strip() == text_2.strip():
        raise ValueError("CROSS_TEXT_CONNECTION text_1 and text_2 must be distinct.")
    text_1_sentences = [sentence for sentence in re.split(r"[.!?]+", text_1) if sentence.strip()]
    if len(text_1_sentences) < 2 and not re.search(r"\b(because|since|as|reason|so that|therefore)\b", text_1.lower()):
        raise ValueError("CROSS_TEXT_CONNECTION Text 1 must be two sentences or include context/reasoning.")
    if "author of Text 2" not in spec.prompt:
        raise ValueError("CROSS_TEXT_CONNECTION prompt must ask how Text 2 would respond to Text 1.")
    if not re.search(r"\b(however|although|revises|qualifies|modifies|contradicts|supports)\b", passage.lower()):
        raise ValueError("CROSS_TEXT_CONNECTION must have a clear logical relationship.")
    text_2_lower = text_2.lower()
    text_2_sentences = [sentence for sentence in re.split(r"[.!?]+", text_2) if sentence.strip()]
    if len(text_2_sentences) < 2:
        raise ValueError("CROSS_TEXT_CONNECTION Text 2 must contain at least two sentences.")
    if not re.search(r"\b(although|while|however)\b", text_2_lower):
        raise ValueError("CROSS_TEXT_CONNECTION Text 2 must include a logical connector such as although, while, or however.")
    if not re.search(r"\b(suggests that|indicating that|implies that)\b", text_2_lower):
        raise ValueError("CROSS_TEXT_CONNECTION Text 2 must include an interpretation phrase.")
    if not re.search(r"\b(although|while|however|but|not .+ alone|rather than)\b", text_2_lower):
        raise ValueError("CROSS_TEXT_CONNECTION Text 2 must include a contrast.")
    if not re.search(r"\b(may|often|some|part|partly|can|tends|usually|best when|only when)\b", text_2_lower):
        raise ValueError("CROSS_TEXT_CONNECTION Text 2 must include a qualifier.")
    if not re.search(r"\b(suggests|indicating|implies|therefore|points to)\b", text_2_lower):
        raise ValueError("CROSS_TEXT_CONNECTION Text 2 must include an inference.")
    revision_text = f"{text_2} {spec.passage} {spec.explanation}".lower()
    if not re.search(r"\b(revis|refin|refram|limit|scope|condition|constrain|incomplete|only part|not .+ alone|best when)\b", revision_text):
        raise ValueError("CROSS_TEXT_CONNECTION Text 2 must answer what changes about the original claim.")
    text_1_terms = set(re.findall(r"[a-z]+", text_1.lower()))
    text_2_terms = set(re.findall(r"[a-z]+", text_2.lower()))
    if len(text_1_terms & text_2_terms) < 2:
        raise ValueError("CROSS_TEXT_CONNECTION texts must be connected by shared subject matter.")
    validate_cross_text_answer_competition(spec, text_1, text_2)


def validate_cross_text_answer_competition(spec: QuestionSpec, text_1: str, text_2: str) -> None:
    correct_choices = [choice_spec for choice_spec in spec.choices if choice_spec.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        raise ValueError("CROSS_TEXT_CONNECTION must have exactly one correct answer.")

    correct_text = correct_choices[0].text.lower()
    absolute_words = {"only", "always", "never", "every", "completely", "entirely", "proves", "must"}
    if any(re.search(rf"\b{re.escape(word)}\b", correct_text) for word in absolute_words):
        raise ValueError("CROSS_TEXT_CONNECTION correct answer must avoid absolute wording.")
    if not re.search(r"\b(may|tends?|suggests?|likely|partly|can|could)\b", correct_text):
        raise ValueError("CROSS_TEXT_CONNECTION correct answer must use soft logic.")

    direct_source_text = f"{text_1} {text_2}".lower()
    correct_tokens = re.findall(r"[a-z]+", correct_text)
    direct_match_found = any(
        " ".join(correct_tokens[index:index + 4]) in direct_source_text
        for index in range(max(0, len(correct_tokens) - 3))
    )
    if direct_match_found:
        raise ValueError("CROSS_TEXT_CONNECTION correct answer matches text wording too directly.")

    distractors = [choice_spec for choice_spec in spec.choices if choice_spec.role != ChoiceTrapRole.correct]
    extreme_distractor_words = {"always", "never", "completely", "entirely", "unrelated", "denying", "proves", "false"}
    for choice_spec in distractors:
        text = choice_spec.text.lower()
        if any(re.search(rf"\b{re.escape(word)}\b", text) for word in extreme_distractor_words):
            raise ValueError("CROSS_TEXT_CONNECTION distractors must not be extreme.")
        if not re.search(r"\b(may|can|could|relevant|evidence|data|cost|costs|price|prices|portrait|portraits|shade|cooling|moisture|midday|evening|need|useful|usefulness|prestige|social|terminology|terms|adoption|local|model|hypothesis|claim)\b", text):
            raise ValueError("CROSS_TEXT_CONNECTION distractors must contain partial truth from the texts.")

    survivors = simulate_first_pass_elimination(spec)
    if len(survivors) < 3:
        raise ValueError("CROSS_TEXT_CONNECTION must leave at least three answers after first-pass elimination.")
    survivor_labels = {choice_spec.label for choice_spec in survivors}
    if "B" not in survivor_labels or "C" not in survivor_labels:
        raise ValueError("CROSS_TEXT_CONNECTION should create hesitation between answer choices B and C.")


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
        if spec.question_type == "command_of_evidence_quantitative_graph" or (spec.data_payload or {}).get("series"):
            validate_graph_payload_contract(spec)
        elif not spec.graph_path and not (spec.data_payload or {}).get("graph_path"):
            raise ValueError(f"Graph question missing graph_path or structured graph payload: {spec.question_type}.")
        if not re.search(r"\b(graph|figure)\b", text):
            raise ValueError(f"Graph question wording must reference graph/figure: {spec.question_type}.")
    elif mentions_visual:
        raise ValueError(f"Question mentions visual source without matching data_type/data_payload: {spec.question_type}.")


def validate_graph_payload_contract(spec: QuestionSpec) -> None:
    payload = spec.data_payload or {}
    if not isinstance(payload.get("x_label"), str) or not payload["x_label"].strip():
        raise ValueError(f"Graph question missing data_payload.x_label: {spec.question_type}.")
    if not isinstance(payload.get("y_label"), str) or not payload["y_label"].strip():
        raise ValueError(f"Graph question missing data_payload.y_label: {spec.question_type}.")
    series = payload.get("series")
    if not isinstance(series, list) or not series:
        raise ValueError(f"Graph question missing data_payload.series: {spec.question_type}.")
    reasoning_pattern = payload.get("reasoning_pattern")
    if spec.question_type == "command_of_evidence_quantitative_graph" and reasoning_pattern not in GRAPH_REASONING_PATTERNS:
        raise ValueError(f"Graph question needs crossover, threshold, or divergence/convergence pattern, got {reasoning_pattern!r}.")
    for item in series:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            raise ValueError(f"Graph series must include a name: {spec.question_type}.")
        values = item.get("values")
        if not isinstance(values, list) or len(values) < 2:
            raise ValueError(f"Graph series must include at least two values: {spec.question_type}.")
        for point in values:
            if (
                not isinstance(point, (list, tuple))
                or len(point) != 2
                or not all(isinstance(value, (int, float)) for value in point)
            ):
                raise ValueError(f"Graph values must be numeric (x, y) pairs: {spec.question_type}.")
    if spec.question_type == "command_of_evidence_quantitative_graph":
        validate_quantitative_graph_answer_design(spec)


def validate_quantitative_graph_answer_design(spec: QuestionSpec) -> None:
    combined_wrong = " ".join(choice.text.lower() for choice in spec.choices if choice.role != ChoiceTrapRole.correct)
    required_distractor_logic = (
        r"watering rather than|focuses on watering",
        r"partly fits|misses the later crossover",
        r"misreading|misread",
    )
    if not all(re.search(marker, combined_wrong) for marker in required_distractor_logic):
        raise ValueError("Graph question distractors must include correct graph/wrong conclusion, correct conclusion/wrong data, and misread trend.")
    correct_choices = [choice for choice in spec.choices if choice.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        raise ValueError("Graph question must have one correct answer.")
    correct_text = correct_choices[0].text.lower()
    if not re.search(r"\b(deep|shallow|higher|crossover|shifts|watering|support)\b", correct_text):
        raise ValueError("Graph correct answer must match both trend and conclusion logic.")
    graph_partial_distractors = [
        choice
        for choice in spec.choices
        if choice.role != ChoiceTrapRole.correct
        and re.search(r"\b(group|series|growth|watering|higher|trend|crossover|level)\b", choice.text.lower())
    ]
    if len(graph_partial_distractors) < 2:
        raise ValueError("Graph question needs at least two distractors that partially match the graph.")
    graph_aligned_choices = [
        choice
        for choice in spec.choices
        if re.search(r"\b(supporting|supports|support)\b", choice.text.lower())
        and re.search(r"\b(conclusion|shift|advantage)\b", choice.text.lower())
    ]
    if len(graph_aligned_choices) != 1 or graph_aligned_choices[0].role != ChoiceTrapRole.correct:
        raise ValueError("Only one answer may match both graph data and conclusion logic.")


def graph_is_text_solvable(spec: QuestionSpec) -> bool:
    text_without_graph = (spec.passage or "").lower()
    correct_choices = [choice for choice in spec.choices if choice.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        return True
    correct_text = correct_choices[0].text.lower()
    graph_only_terms = ("crossover", "overtakes", "higher at low", "higher at three", "three watering", "series")
    if any(term in text_without_graph for term in graph_only_terms):
        return True
    correct_specifics = ("deep-soil group is higher at low", "shallow-soil group is higher", "three watering events")
    return any(specific in text_without_graph for specific in correct_specifics) or not any(term in correct_text for term in graph_only_terms)


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


def validate_module2_hard_item(spec: QuestionSpec, slot: RWModuleSlot, index: int) -> None:
    if spec.adaptive_level != "hard" or spec.difficulty < 8:
        raise ValueError(f"Module 2 hard slot {index + 1} must be hard difficulty.")
    constraints_required = int(extract_metadata_value(spec.explanation, "constraints_required") or str(spec.constraints_required))
    if constraints_required < 2 or spec.constraints_required < 2:
        raise ValueError(f"Module 2 hard slot {index + 1} must require at least two constraints.")
    if len(simulate_first_pass_elimination(spec)) < 3:
        raise ValueError(f"Module 2 hard slot {index + 1} must retain at least three first-pass survivors.")
    if keyword_match_solves_question(spec):
        raise ValueError(f"Module 2 hard slot {index + 1} is too keyword-matchable.")
    if spec.question_type == "CROSS_TEXT_CONNECTION":
        validate_module2_cross_text_hard_mode(spec)
    if slot.slot_key.startswith("m2_command_graph"):
        validate_module2_graph_hard_mode(spec)
    if spec.question_type == "Rhetorical Synthesis":
        validate_module2_rhetorical_hard_mode(spec)
    if spec.question_type == "Standard English Conventions":
        validate_module2_grammar_hard_mode(slot)


def keyword_match_solves_question(spec: QuestionSpec) -> bool:
    correct_choices = [choice for choice in spec.choices if choice.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1 or spec.question_type == "Standard English Conventions":
        return False
    return longest_common_token_run(correct_choices[0].text, spec.passage or "") >= 4


def validate_module2_cross_text_hard_mode(spec: QuestionSpec) -> None:
    text_2 = ((spec.data_payload or {}).get("text_2") or "").lower()
    if not re.search(r"\b(although|while|admittedly)\b", text_2):
        raise ValueError("Module 2 hard cross-text Text 2 must include concession.")
    if not re.search(r"\b(limit|scope|condition|constrain|less|part|only)\b", text_2):
        raise ValueError("Module 2 hard cross-text Text 2 must include limitation.")
    if not re.search(r"\b(suggests|indicating|implies|revis|refin|refram)\b", text_2):
        raise ValueError("Module 2 hard cross-text Text 2 must include refinement.")


def validate_module2_graph_hard_mode(spec: QuestionSpec) -> None:
    if spec.data_type not in {"graph", "table"}:
        raise ValueError("Module 2 hard quantitative slots must include graph or table data.")
    if spec.data_type == "graph":
        payload = spec.data_payload or {}
        if payload.get("reasoning_pattern") not in GRAPH_REASONING_PATTERNS:
            raise ValueError("Module 2 hard graph must use crossover, threshold, or divergence/convergence.")
        if graph_answer_found_from_single_point(spec):
            raise ValueError("Module 2 hard graph cannot be answerable from a single point.")


def graph_answer_found_from_single_point(spec: QuestionSpec) -> bool:
    correct_choices = [choice for choice in spec.choices if choice.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        return True
    correct_text = correct_choices[0].text.lower()
    comparison_markers = ("but", "whereas", "while", "both", "each", "crossover", "shifts")
    return not any(marker in correct_text for marker in comparison_markers)


def validate_module2_rhetorical_hard_mode(spec: QuestionSpec) -> None:
    text = f"{spec.passage or ''} {spec.prompt}".lower()
    if not re.search(r"\b(goal|emphasize|highlight|limit|filter|relevant|not)\b", text):
        raise ValueError("Module 2 hard rhetorical question needs a filtering condition.")
    if not re.search(r"\b(compare|contrast|similar|difference|relationship|shared|whereas|impact|conclusion about)\b", text):
        raise ValueError("Module 2 hard rhetorical question needs a relationship constraint.")


def validate_module2_grammar_hard_mode(slot: RWModuleSlot) -> None:
    allowed = {"sentence_boundary_resolution", "modifier_attachment", "clause_integration", "referent_precision"}
    if slot.pattern not in allowed:
        raise ValueError("Module 2 hard grammar must use subject separation, modifier ambiguity, or parallel/clause interruption traps.")


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


def validate_answer_choice_quality(spec: QuestionSpec) -> None:
    correct_choices = [choice_spec for choice_spec in spec.choices if choice_spec.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        raise ValueError(f"{spec.question_type} must have exactly one correct answer for answer-quality validation.")

    correct_text = correct_choices[0].text
    if spec.question_type != "Standard English Conventions":
        direct_overlap = longest_common_token_run(correct_text, spec.passage or "")
        if direct_overlap >= 4:
            raise ValueError(f"{spec.question_type} correct answer reuses passage wording too directly.")
        if content_token_overlap(correct_text, spec.passage or "") >= 0.72:
            raise ValueError(f"{spec.question_type} correct answer is too obviously paraphrased from the passage.")

    distractors = [choice_spec for choice_spec in spec.choices if choice_spec.role != ChoiceTrapRole.correct]
    absolute_words = {"always", "never", "completely", "entirely", "obviously", "certainly"}
    for choice_spec in distractors:
        text = choice_spec.text.lower()
        if any(re.search(rf"\b{re.escape(word)}\b", text) for word in absolute_words):
            raise ValueError(f"{spec.question_type} distractor uses extreme language: {choice_spec.text}")

    partial_distractors = [
        choice_spec
        for choice_spec in distractors
        if "plausibility=high" in (choice_spec.basis or "")
        or any(f"taxonomy={taxonomy}" in (choice_spec.basis or "") for taxonomy in ("semantic_twin", "scope_error", "incomplete_reasoning"))
    ]
    if len(partial_distractors) < 2:
        raise ValueError(f"{spec.question_type} must include at least two partially correct distractors.")

    survivors = simulate_first_pass_elimination(spec)
    if len(survivors) < 3:
        raise ValueError(f"{spec.question_type} eliminates too many answers instantly; students need 2-3 plausible survivors.")
    clearly_wrong = [choice_spec for choice_spec in distractors if choice_spec not in survivors]
    if len(clearly_wrong) > 1:
        raise ValueError(f"{spec.question_type} has too many clearly wrong distractors.")


def content_tokens(text: str) -> list[str]:
    stopwords = {
        "a", "an", "and", "are", "as", "at", "be", "because", "by", "for", "from", "in", "is", "it",
        "its", "of", "on", "or", "that", "the", "their", "they", "this", "to", "with", "would",
    }
    return [token for token in re.findall(r"[a-z]+", text.lower()) if len(token) > 2 and token not in stopwords]


def longest_common_token_run(answer_text: str, passage: str) -> int:
    answer_tokens = content_tokens(answer_text)
    passage_joined = " ".join(content_tokens(passage))
    longest = 0
    for start in range(len(answer_tokens)):
        for end in range(start + 1, len(answer_tokens) + 1):
            phrase = " ".join(answer_tokens[start:end])
            if phrase and phrase in passage_joined:
                longest = max(longest, end - start)
    return longest


def content_token_overlap(answer_text: str, passage: str) -> float:
    answer_tokens = set(content_tokens(answer_text))
    if not answer_tokens:
        return 0.0
    passage_tokens = set(content_tokens(passage))
    return len(answer_tokens & passage_tokens) / len(answer_tokens)


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
        elif spec.question_type == "CROSS_TEXT_CONNECTION":
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
