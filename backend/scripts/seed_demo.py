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
HARD_TRAP_CALIBRATION_TYPES = {"near_correct", "scope_error", "partial_support", "logic_flip"}
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
    "Transitions": {"addition", "cause_effect", "reinforcement", "clarification", "concession", "conclusion"},
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
    "notes_task_selection",
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
GRAPH_REASONING_PATTERNS = {
    "crossover_point",
    "threshold_shift",
    "divergence",
    "threshold_reversal",
    "partial_support_region",
    "conflicting_variable_dominance",
    "lag_effect",
    "diminishing_returns",
    "vertical_shift",
}
GRAPH_QUESTION_INTENTS = {"direct_read", "trend_description", "claim_support", "inference", "role_in_argument", "transformation_match"}
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
    "addition": {
        "passage_template": "second sentence adds a parallel function or effect",
        "logic_rule": "choose a transition that adds a related function rather than contrasting or concluding",
        "correct_answer_rule": "must signal addition without implying sequence or reversal",
        "distractor_generators": ("sequence_valid_syntax", "conclusion_valid_syntax", "contrast_valid_syntax"),
    },
    "cause_effect": {
        "passage_template": "second sentence presents a consequence of the first",
        "logic_rule": "choose a transition that marks result rather than similarity or example",
        "correct_answer_rule": "must signal consequence while preserving the causal relationship",
        "distractor_generators": ("similarity_valid_syntax", "example_valid_syntax", "contrast_valid_syntax"),
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
    question_signature: dict | None = None


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


@dataclass(frozen=True)
class MathModuleSlot:
    slot_key: str
    question_type: str
    reasoning_type: str
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
    "quant_graph_trend",
    "inference_hypothesis",
    "grammar_sva",
    "grammar_modifier",
    "grammar_boundary",
    "grammar_ambiguous_boundary",
    "grammar_pronoun",
    "transition_logic",
    "notes_task_selection_hard",
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
    RWModuleSlot("quant_graph_trend", "Data Analysis", "data_mapping_table", 7),
    RWModuleSlot("inference_hypothesis", "Inference", "contradiction_inference", 7),
    RWModuleSlot("grammar_sva", "Standard English Conventions", "grammar_subject_verb", 7),
    RWModuleSlot("grammar_modifier", "Standard English Conventions", "grammar_modifier", 7),
    RWModuleSlot("grammar_boundary", "Standard English Conventions", "grammar_clause_boundary", 7),
    RWModuleSlot("grammar_ambiguous_boundary", "Standard English Conventions", "sentence_boundary_resolution", 8),
    RWModuleSlot("grammar_pronoun", "Standard English Conventions", "grammar_pronoun_reference", 8),
    RWModuleSlot("transition_logic", "Transitions", "cause_effect", 8),
    RWModuleSlot("notes_task_selection_hard", "Transitions", "addition", 9),
    RWModuleSlot("transition_precision", "Transitions", "reinforcement", 9),
    RWModuleSlot("transition_hard", "Transitions", "clarification", 9),
    RWModuleSlot("rhetorical_contrast", "Rhetorical Synthesis", "contrast", 10),
    RWModuleSlot("rhetorical_conclusion", "Rhetorical Synthesis", "present_conclusion", 10),
    RWModuleSlot("rhetorical_comparison", "Rhetorical Synthesis", "compare", 10),
)


MODULE2_HARD_ORDER = [
    "inference", "inference", "inference",
    "function", "function", "function",
    "cross_text", "cross_text", "cross_text",
    "command_text",
    "command_graph", "command_graph", "command_graph", "command_graph",
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
    RWModuleSlot("m2_command_graph_1", "command_of_evidence_quantitative_graph", "graph_trend_claim_shift", 8),
    RWModuleSlot("m2_command_graph_2", "command_of_evidence_quantitative_graph", "graph_trend_claim_shift", 9),
    RWModuleSlot("m2_command_graph_3", "command_of_evidence_quantitative_graph", "graph_trend_claim_shift", 9),
    RWModuleSlot("m2_command_graph_4", "command_of_evidence_quantitative_graph", "graph_trend_claim_shift", 10),
    RWModuleSlot("m2_transition_1", "Transitions", "concession", 8),
    RWModuleSlot("m2_transition_2", "Transitions", "conclusion", 9),
    RWModuleSlot("m2_central_idea_1", "Main Idea", "study_vs_conclusion", 8),
    RWModuleSlot("m2_central_idea_2", "Main Idea", "example_vs_general", 9),
    RWModuleSlot("m2_central_idea_3", "Main Idea", "study_vs_conclusion", 10),
    RWModuleSlot("m2_rhetorical_1", "Rhetorical Synthesis", "notes_task_selection", 8),
    RWModuleSlot("m2_rhetorical_2", "Rhetorical Synthesis", "notes_task_selection", 9),
    RWModuleSlot("m2_rhetorical_3", "Rhetorical Synthesis", "present_conclusion", 10),
    RWModuleSlot("m2_grammar_1", "Standard English Conventions", "sentence_boundary_resolution", 8),
    RWModuleSlot("m2_grammar_2", "Standard English Conventions", "modifier_attachment", 9),
    RWModuleSlot("m2_grammar_3", "Standard English Conventions", "referent_precision", 10),
    RWModuleSlot("m2_grammar_4", "Standard English Conventions", "clause_integration", 9),
    RWModuleSlot("m2_grammar_5", "Standard English Conventions", "modifier_attachment", 10),
)


MATH_TYPES = {
    "linear_equation",
    "system_equation",
    "function_interpretation",
    "graph_reasoning",
    "percent_ratio",
    "probability",
    "geometry",
    "quadratic_modeling",
    "exponential_growth",
    "word_problem",
    "rational_equation_trap",
    "expression_rewrite",
    "graph_transformation",
    "parameter_interpretation",
    "ratio_scaling",
    "absolute_value_equation",
    "geometry_correspondence",
    "polynomial_roots_gridin",
    "circle_equation",
}
MATH_TRAPS = {
    "sign_trap",
    "unit_trap",
    "variable_confusion",
    "condition_ignored",
    "extraneous_solution",
    "percent_base_trap",
    "graph_misread",
}
MATH_HARD_TRAPS = set(MATH_TRAPS)

MODULE1_MATH_BLUEPRINT: tuple[MathModuleSlot, ...] = (
    MathModuleSlot("m1_linear_1", "linear_equation", "context_isolation", 3),
    MathModuleSlot("m1_ratio_scaling_1", "ratio_scaling", "basic_scale", 3),
    MathModuleSlot("m1_function_1", "function_interpretation", "input_constraint", 4),
    MathModuleSlot("m1_geometry_1", "geometry", "angle_relationship", 4),
    MathModuleSlot("m1_graph_1", "graph_reasoning", "slope_meaning", 4),
    MathModuleSlot("m1_linear_2", "linear_equation", "two_step_isolation", 5),
    MathModuleSlot("m1_word_1", "word_problem", "rate_total", 5),
    MathModuleSlot("m1_graph_2", "graph_reasoning", "intercept_meaning", 5),
    MathModuleSlot("m1_rational_1", "rational_equation_trap", "domain_restriction", 6),
    MathModuleSlot("m1_expression_1", "expression_rewrite", "isolate_expression", 6),
    MathModuleSlot("m1_ratio_scaling_2", "ratio_scaling", "inverse_scaling", 6),
    MathModuleSlot("m1_function_2", "function_interpretation", "parameter_meaning", 6),
    MathModuleSlot("m1_geometry_2", "geometry", "area_constraint", 6),
    MathModuleSlot("m1_linear_3", "linear_equation", "equivalent_expression", 6),
    MathModuleSlot("m1_parameter_1", "parameter_interpretation", "coefficient_meaning", 7),
    MathModuleSlot("m1_expression_2", "expression_rewrite", "expression_comparison", 7),
    MathModuleSlot("m1_polynomial_grid_1", "polynomial_roots_gridin", "factorization_multiple_roots", 7),
    MathModuleSlot("m1_graph_3", "graph_reasoning", "rate_comparison", 7),
    MathModuleSlot("m1_word_2", "word_problem", "hidden_unit", 7),
    MathModuleSlot("m1_ratio_scaling_3", "ratio_scaling", "compound_scale", 7),
    MathModuleSlot("m1_rational_2", "rational_equation_trap", "cancellation_domain", 7),
    MathModuleSlot("m1_geometry_3", "geometry", "angle_sum_layered", 7),
)

MODULE2_HARD_MATH_BLUEPRINT: tuple[MathModuleSlot, ...] = (
    MathModuleSlot("m2h_linear_1", "linear_equation", "parameter_constraint", 8),
    MathModuleSlot("m2h_graph_1", "graph_reasoning", "claim_support_slope", 8),
    MathModuleSlot("m2h_geometry_1", "geometry", "similarity_scale", 8),
    MathModuleSlot("m2h_ratio_scaling_1", "ratio_scaling", "inverse_scaling_hard", 8),
    MathModuleSlot("m2h_rational_1", "rational_equation_trap", "domain_restriction_hard", 9),
    MathModuleSlot("m2h_graph_transform_1", "graph_transformation", "vertical_horizontal_shift_hard", 9),
    MathModuleSlot("m2h_parameter_1", "parameter_interpretation", "coefficient_meaning_hard", 9),
    MathModuleSlot("m2h_absolute_1", "absolute_value_equation", "two_solution_check_hard", 9),
    MathModuleSlot("m2h_geometry_3", "geometry", "vertex_mapping_hard", 9),
    MathModuleSlot("m2h_linear_2", "linear_equation", "inequality_boundary", 9),
    MathModuleSlot("m2h_graph_2", "graph_reasoning", "threshold_intersection", 9),
    MathModuleSlot("m2h_rational_2", "rational_equation_trap", "cancellation_domain_hard", 9),
    MathModuleSlot("m2h_polynomial_grid_1", "polynomial_roots_gridin", "factorization_multiple_roots_hard", 10),
    MathModuleSlot("m2h_circle_1", "circle_equation", "center_radius_hard", 10),
    MathModuleSlot("m2h_parameter_2", "parameter_interpretation", "coefficient_comparison_hard", 10),
    MathModuleSlot("m2h_graph_transform_2", "graph_transformation", "shape_vs_shift_hard", 10),
    MathModuleSlot("m2h_geometry_2", "geometry", "circle_triangle_constraint", 10),
    MathModuleSlot("m2h_ratio_scaling_2", "ratio_scaling", "compound_scale_hard", 10),
    MathModuleSlot("m2h_absolute_2", "absolute_value_equation", "solution_count_hard", 10),
    MathModuleSlot("m2h_polynomial_grid_2", "polynomial_roots_gridin", "sum_distinct_roots_hard", 10),
    MathModuleSlot("m2h_circle_2", "circle_equation", "radius_area_hard", 10),
    MathModuleSlot("m2h_graph_3", "graph_reasoning", "piecewise_rate", 10),
)

MODULE2_MEDIUM_MATH_BLUEPRINT: tuple[MathModuleSlot, ...] = tuple(
    MathModuleSlot(slot.slot_key.replace("m2h_", "m2m_"), slot.question_type, slot.reasoning_type, max(6, min(8, slot.difficulty - 2)))
    for slot in MODULE2_HARD_MATH_BLUEPRINT
)

MATH_TRAP_SEQUENCE = sorted(MATH_TRAPS)
MATH_STUDENT_RESPONSE_SLOT_KEYS = {
    "m1_polynomial_grid_1",
    "m1_word_2",
    "m2h_polynomial_grid_1",
    "m2h_polynomial_grid_2",
    "m2m_polynomial_grid_1",
    "m2m_polynomial_grid_2",
}
MATH_MISDIRECTION_TYPES = ("irrelevant_number", "misleading_phrasing", "alternate_interpretation", "extra_variable", "hidden_condition")
MATH_MISDIRECTION_BY_TYPE = {
    "linear_equation": "irrelevant_number",
    "system_equation": "extra_variable",
    "function_interpretation": "misleading_phrasing",
    "graph_reasoning": "irrelevant_number",
    "percent_ratio": "irrelevant_number",
    "probability": "hidden_condition",
    "geometry": "irrelevant_number",
    "quadratic_modeling": "alternate_interpretation",
    "exponential_growth": "hidden_condition",
    "word_problem": "irrelevant_number",
    "rational_equation_trap": "alternate_interpretation",
    "expression_rewrite": "misleading_phrasing",
    "graph_transformation": "misleading_phrasing",
    "parameter_interpretation": "misleading_phrasing",
    "ratio_scaling": "alternate_interpretation",
    "absolute_value_equation": "alternate_interpretation",
    "geometry_correspondence": "misleading_phrasing",
    "polynomial_roots_gridin": "alternate_interpretation",
    "circle_equation": "alternate_interpretation",
}
MATH_PATTERN_REGISTRY = {
    slot.slot_key: {
        "type": slot.question_type,
        "subtype": slot.reasoning_type,
        "trap": MATH_TRAP_SEQUENCE[index % len(MATH_TRAP_SEQUENCE)],
        "difficulty": slot.difficulty,
    }
    for index, slot in enumerate((*MODULE1_MATH_BLUEPRINT, *MODULE2_HARD_MATH_BLUEPRINT, *MODULE2_MEDIUM_MATH_BLUEPRINT))
}


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
        validate_notes_task_count(module_questions)
        validate_graph_intent_distribution(module_questions)
        validate_graph_coverage(module_questions, module)
        if module == 2:
            validate_module2_uniqueness(module_questions)
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
        validate_graph_intent_distribution(module_questions)
        validate_math_module(module_questions, module)
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


def validate_graph_intent_distribution(module_questions: list[QuestionSpec]) -> None:
    seen: set[tuple[str, str]] = set()
    for question in module_questions:
        if question.data_type != "graph":
            continue
        payload = question.data_payload or {}
        pair = (payload.get("graph_pattern"), payload.get("question_intent"))
        if pair in seen:
            raise ValueError(f"Graph pattern/intent pair repeats within module: {pair}.")
        seen.add(pair)


def validate_graph_coverage(module_questions: list[QuestionSpec], module: int) -> None:
    graph_questions = [question for question in module_questions if question.data_type == "graph"]
    if module == 1:
        required_intents = {"claim_support"}
        if len(graph_questions) < 1:
            raise ValueError("Module 1 must include at least one graph question.")
    else:
        required_intents = {"claim_support", "role_in_argument", "inference"}
        if len(graph_questions) < 4:
            raise ValueError("Module 2 must include at least four graph questions.")
    intents = {str((question.data_payload or {}).get("question_intent")) for question in graph_questions}
    if not required_intents.issubset(intents):
        raise ValueError(f"Module {module} graph questions missing required intents: {required_intents - intents}.")
    prompt_templates = [str((question.data_payload or {}).get("prompt_template")) for question in graph_questions]
    if len(prompt_templates) != len(set(prompt_templates)):
        raise ValueError(f"Module {module} graph prompt templates cannot repeat.")
    reasoning_counts = Counter(str((question.data_payload or {}).get("reasoning_type")) for question in graph_questions)
    repeated = {reasoning_type: count for reasoning_type, count in reasoning_counts.items() if count > 2}
    if repeated:
        raise ValueError(f"Module {module} uses the same graph reasoning type too often: {repeated}.")


def validate_module2_uniqueness(module_questions: list[QuestionSpec]) -> None:
    signatures = [question.question_signature or build_question_signature(question) for question in module_questions]
    serialized = [tuple(sorted(signature.items())) for signature in signatures]
    if len(set(serialized)) != len(module_questions):
        raise ValueError("Module 2 contains duplicate question signatures.")
    graph_structures: set[tuple] = set()
    graph_reasoning_counts: Counter[str] = Counter()
    for question in module_questions:
        if question.data_type != "graph":
            continue
        payload = question.data_payload or {}
        structure = graph_structure_signature(payload)
        if structure in graph_structures:
            raise ValueError(f"Module 2 graph structure repeats: {structure}.")
        graph_structures.add(structure)
        graph_reasoning_counts[str(payload.get("reasoning_type"))] += 1
    repeated_reasoning = {reasoning_type: count for reasoning_type, count in graph_reasoning_counts.items() if count > 1}
    if repeated_reasoning:
        raise ValueError(f"Module 2 graph reasoning_type repeats: {repeated_reasoning}.")
    required_reasoning = {"support", "weaken", "conditional/threshold", "limitation", "inference"}
    module_reasoning = {module2_reasoning_bucket(question) for question in module_questions}
    missing = required_reasoning - module_reasoning
    if missing:
        raise ValueError(f"Module 2 missing required reasoning buckets: {missing}.")
    validate_module2_passage_similarity(module_questions)
    validate_hard_trap_diversity(module_questions)


def build_question_signature(question: QuestionSpec) -> dict:
    payload = question.data_payload or {}
    pattern_type = extract_metadata_value(question.explanation, "pattern") or payload.get("reasoning_pattern") or question.question_type
    reasoning_type = payload.get("reasoning_type") or reasoning_bucket_from_question(question)
    graph_pattern = payload.get("graph_pattern") or "none"
    answer_logic_type = payload.get("answer_logic_type") or answer_logic_signature(question)
    return {
        "pattern_type": str(pattern_type),
        "reasoning_type": str(reasoning_type),
        "graph_pattern": str(graph_pattern),
        "answer_logic_type": str(answer_logic_type),
    }


def reasoning_bucket_from_question(question: QuestionSpec) -> str:
    text = f"{question.prompt} {question.explanation} {question.trap_type}".lower()
    if "weaken" in text:
        return "weaken"
    if "support" in text:
        return "support"
    if re.search(r"\b(only when|threshold|condition|conditional)\b", text):
        return "conditional/threshold"
    if re.search(r"\b(limit|exception|except)\b", text):
        return "limitation"
    if re.search(r"\b(infer|inference|suggests)\b", text):
        return "inference"
    return question.question_type


def answer_logic_signature(question: QuestionSpec) -> str:
    correct_choices = [choice for choice in question.choices if choice.role == ChoiceTrapRole.correct]
    correct_text = correct_choices[0].text.lower() if len(correct_choices) == 1 else question.correct_answer.lower()
    context_suffix = "-".join(sorted(content_keywords(f"{question.passage or ''} {correct_text}"))[:4])
    if re.search(r"\b(weaken|weakening|contradict)\b", correct_text):
        return f"weaken:{context_suffix}"
    if re.search(r"\b(support|supporting)\b", correct_text):
        return f"support:{context_suffix}"
    if re.search(r"\b(only|when|threshold|after|below|condition)\b", correct_text):
        return f"conditional/threshold:{context_suffix}"
    if re.search(r"\b(limit|exception|except|outside)\b", correct_text):
        return f"limitation:{context_suffix}"
    if re.search(r"\b(infer|suggest|should be)\b", correct_text):
        return f"inference:{context_suffix}"
    normalized_prompt = re.sub(r"[^a-z0-9]+", "-", question.prompt.lower()).strip("-")
    return f"{normalized_prompt[:48]}:{context_suffix}" or question.correct_answer.lower()


def module2_reasoning_bucket(question: QuestionSpec) -> str:
    if question.data_type == "graph":
        payload = question.data_payload or {}
        template = str(payload.get("prompt_template") or "")
        if template == "supports_the_conclusion":
            return "support"
        if template == "weakens_the_conclusion":
            return "weaken"
        if payload.get("graph_pattern") == "threshold_reversal":
            return "conditional/threshold"
        if template == "shows_a_limitation":
            return "limitation"
        if template == "completes_the_conclusion":
            return "inference"
    return reasoning_bucket_from_question(question)


def graph_structure_signature(payload: dict) -> tuple:
    series = payload.get("series") or []
    line_count = len(series)
    directions = tuple(trend_direction(item.get("values") or []) for item in series)
    crossover_structure = detect_crossover_structure(series)
    relationship = payload.get("variable_relationship") or payload.get("graph_pattern")
    return line_count, crossover_structure, directions, relationship


def trend_direction(values: list) -> str:
    y_values = [point[1] for point in values if isinstance(point, (list, tuple)) and len(point) == 2]
    if len(y_values) < 2:
        return "insufficient"
    deltas = [y_values[index + 1] - y_values[index] for index in range(len(y_values) - 1)]
    if any(delta == 0 for delta in deltas) and any(delta > 0 for delta in deltas):
        return "plateau_then_rise"
    if all(delta > 0 for delta in deltas):
        return "increasing"
    if all(delta < 0 for delta in deltas):
        return "decreasing"
    if any(delta > 0 for delta in deltas) and any(delta < 0 for delta in deltas):
        return "mixed"
    return "flat"


def detect_crossover_structure(series: list) -> str:
    if len(series) < 2:
        return "no_comparison"
    first = series[0].get("values") or []
    second = series[1].get("values") or []
    pairs = zip(first, second, strict=False)
    signs = []
    for first_point, second_point in pairs:
        if not isinstance(first_point, (list, tuple)) or not isinstance(second_point, (list, tuple)):
            continue
        delta = first_point[1] - second_point[1]
        signs.append(1 if delta > 0 else -1 if delta < 0 else 0)
    if any(signs[index] * signs[index + 1] < 0 for index in range(len(signs) - 1)):
        return "crossover"
    if 0 in signs:
        return "touch"
    return "no_crossover"


def validate_module2_passage_similarity(module_questions: list[QuestionSpec]) -> None:
    seen_flows: dict[str, list[set[str]]] = {}
    seen_keywords: list[set[str]] = []
    for question in module_questions:
        flow = logical_flow_signature(question.passage or "")
        keywords = content_keywords(f"{question.passage or ''} {question.prompt}")
        for previous_flow_keywords in seen_flows.get(flow, []):
            union = keywords | previous_flow_keywords
            if union and len(keywords & previous_flow_keywords) / len(union) >= 0.5:
                raise ValueError(f"Module 2 passage repeats both logical flow and topic structure: {flow}.")
        seen_flows.setdefault(flow, []).append(keywords)
        for previous in seen_keywords:
            union = keywords | previous
            if union and len(keywords & previous) / len(union) >= 0.7:
                raise ValueError("Module 2 passage keyword overlap is too high.")
        seen_keywords.append(keywords)


def logical_flow_signature(text: str) -> str:
    lower = text.lower()
    markers = []
    for marker in ("researchers", "student", "text 1", "notes", "graph", "hypothesis", "however", "although", "claim", "conclusion"):
        if marker in lower:
            markers.append(marker)
    return ">".join(markers[:4]) or "generic"


def content_keywords(text: str) -> set[str]:
    stopwords = {
        "the", "and", "that", "this", "with", "from", "which", "choice", "best", "when", "only",
        "however", "although", "researchers", "student", "claim", "conclusion", "graph", "text",
    }
    return {word for word in re.findall(r"[a-z]{4,}", text.lower()) if word not in stopwords}


def validate_notes_task_count(module_questions: list[QuestionSpec]) -> None:
    count_notes = sum(
        1
        for question in module_questions
        if question.question_type == "Rhetorical Synthesis"
        and (
            extract_metadata_value(question.explanation, "pattern") == "notes_task_selection"
            or (question.data_payload or {}).get("type") == "notes"
        )
    )
    print("NOTES QUESTIONS:", count_notes)
    if count_notes < 2:
        raise ValueError("Reading & Writing module must include at least two notes_task_selection questions.")


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


def math_difficulty_for(module: int, index: int) -> int:
    return math_slot_for(module, index).difficulty


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


def math_slot_for(module: int, index: int) -> MathModuleSlot:
    if module == 1:
        return MODULE1_MATH_BLUEPRINT[index]
    if MODULE2_MODE == "hard":
        return MODULE2_HARD_MATH_BLUEPRINT[index]
    return MODULE2_MEDIUM_MATH_BLUEPRINT[index]


def generate(question_type: str, pattern: str, *, module: int, index: int) -> QuestionSpec:
    if question_type == "Rhetorical Synthesis" and pattern == "notes_task_selection":
        item = rw_notes_task_selection_item(index)
    elif question_type == "command_of_evidence_quantitative_graph":
        item = rw_graph_item(pattern, module, index)
    else:
        item = rw_pattern_item(question_type, pattern)
    item = module2_unique_variant(item, module, index)
    if module == 2 and MODULE2_MODE == "hard" and item.constraints_required < 2:
        item = replace(item, constraints_required=2)
    return rw_ambiguity_first_base(module, index, item)


def module2_unique_variant(item: AmbiguityFirstItem, module: int, index: int) -> AmbiguityFirstItem:
    if module != 2 or MODULE2_MODE != "hard":
        return item
    if item.question_type == "Inference" and index == 0:
        return replace(
            item,
            ambiguous_passage=(
                "In the 1990s, astronomers used extensive calculations to predict that a collision involving two neutron stars may release a brief but massive burst of gamma rays. "
                "At first, the prediction seemed difficult to test directly, since such events were expected to be rare and hard to observe."
            ),
            constraint_sentence=(
                "However, observations in 2017 matched the predicted signal closely enough that this ____ was treated as confirmed."
            ),
            prompt="Which choice completes the text with the most logical and precise word or phrase?",
            answer_options=(
                "theory",
                "evidence",
                "constant",
                "experiment",
            ),
            correct_index=0,
            trap_type="prediction-versus-proof vocabulary trap",
            explanation=(
                "The blank refers to the earlier prediction or explanatory account that later observations confirmed, not to the evidence or the observation itself."
            ),
        )
    if item.question_type == "Inference" and index == 1:
        return replace(
            item,
            ambiguous_passage=(
                "Taking photographs in the mid-1800s was often complicated and costly, although the 1854 invention of the carte de visite made small portraits inexpensive to produce. "
                "The format soon circulated through shops and family albums, and people tended to exchange the images as ordinary social objects rather than rare luxuries."
            ),
            constraint_sentence=(
                "This change suggests that cartes de visite helped to ____ photography, making it familiar to a much wider public."
            ),
            prompt="Which choice completes the text with the most logical and precise word or phrase?",
            answer_options=(
                "weaken",
                "praise",
                "popularize",
                "isolate",
            ),
            correct_index=2,
            trap_type="effect versus attitude vocabulary trap",
            explanation=(
                "The context points to expanding public use of photography, so the precise verb is popularize."
            ),
        )
    if item.question_type == "Inference" and index == 2:
        return replace(
            item,
            ambiguous_passage=(
                "Painter Alma W. Thomas was fascinated by colors and forms in the natural world, although she did not simply copy garden scenes. "
                "In several works, broken bands of color echo the way sunlight may pass through leaves, turning a familiar view into an abstract pattern."
            ),
            constraint_sentence=(
                "The flowers and trees near her Washington, DC, home therefore ____ the visual decisions she made in her art."
            ),
            prompt="Which choice completes the text with the most logical and precise word or phrase?",
            answer_options=(
                "restricted",
                "announced",
                "distracted",
                "influenced",
            ),
            correct_index=3,
            trap_type="source of inspiration versus limitation trap",
            explanation=(
                "The garden supplied ideas for Thomas's visual choices, so influenced best captures the relationship."
            ),
        )
    if item.question_type == "Function" and index == 3:
        return replace(
            item,
            ambiguous_passage=(
                "In the 1990s, conservationists began planting native trees in the habitat of the Azores bullfinch, a bird whose numbers had fallen sharply. "
                "At first, the effort may have seemed unlikely to reverse decades of decline, and several other threats to the species remained."
            ),
            constraint_sentence=(
                "However, the population increased from roughly 100 birds in the late 1980s to about 1,300 in 2023, suggesting that the approach was apparently ____."
            ),
            prompt="Which choice completes the text with the most logical and precise word or phrase?",
            answer_options=(
                "amusing",
                "costly",
                "successful",
                "disastrous",
            ),
            correct_index=2,
            trap_type="outcome evaluation vocabulary trap",
            explanation=(
                "The numerical increase shows that the conservation approach worked; successful is the only choice that fits that outcome."
            ),
        )
    if item.question_type == "Function" and index == 4:
        return replace(
            item,
            ambiguous_passage=(
                "At first, most plastics today often end up in landfills or are recycled into materials with a limited range of uses. "
                "However, chemist Guoliang Liu and colleagues designed a reactor that can melt polyethylene and polypropylene--two widely used plastics--into a wax."
            ),
            constraint_sentence=(
                "The wax can then be transformed into a surfactant, a chemical compound usable as a detergent, so the parenthetical detail tells readers what the unfamiliar term means."
            ),
            prompt="Which choice best states the function of the underlined portion of the text?",
            answer_options=(
                "It clarifies the meaning of a scientific term.",
                "It describes an environmental concern.",
                "It explains the significance of a scientific discovery.",
                "It identifies a result that confused the team.",
            ),
            correct_index=0,
            trap_type="definition versus broader significance trap",
            explanation=(
                "The phrase defines surfactant locally; it does not explain the whole discovery or introduce a new environmental problem."
            ),
        )
    if item.question_type == "Function" and index == 5:
        return replace(
            item,
            ambiguous_passage=(
                "Archaeologists studying Pompeii recently uncovered a well-preserved food shop known as a thermopolium. "
                "The site contains food remains, artworks, and decorations, although any single object may reveal only a narrow detail about daily life."
            ),
            constraint_sentence=(
                "Taken together, these materials help researchers reconstruct how some residents may have bought and consumed prepared food."
            ),
            prompt="Which choice best states the main purpose of the text?",
            answer_options=(
                "To compare ancient artworks with modern ones",
                "To discuss the political system of Italy",
                "To present a recent archaeological discovery and explain what it may reveal",
                "To describe a region's climate",
            ),
            correct_index=2,
            trap_type="specific detail versus main purpose trap",
            explanation=(
                "The text introduces the thermopolium discovery and explains its value for understanding daily life in Pompeii."
            ),
        )
    if item.question_type == "CROSS_TEXT_CONNECTION" and index == 6:
        text_1 = (
            "Technology investors sometimes predict that conventional books will be displaced by newer interactive media. "
            "They often treat reader interaction as a feature that belongs mainly to digital platforms."
        )
        text_2 = (
            "Although digital formats may expand reader participation, literary scholar Jeremy Douglass notes that interactive reading has older precedents, such as marginal annotations. "
            "This limit suggests that new media refine rather than replace earlier forms, with books and digital works often coexisting."
        )
        return replace(
            item,
            ambiguous_passage=f"Text 1\n{text_1}\n\nText 2\n{text_2}",
            constraint_sentence=(
                "However, the response must account for Text 2's concession, its limiting condition, and its refined conclusion."
            ),
            prompt='Based on the texts, how would the author of Text 2 most likely respond to the claim about books in Text 1?',
            answer_options=(
                "By suggesting that digital platforms may be less interactive than conventional books in some older reading practices",
                "By suggesting that the claim may overlook older forms of reader participation and overstate the likelihood of replacement",
                "By agreeing with the replacement claim but adding that printed books may need to imitate digital media",
                "By suggesting that investors may have a useful claim about media adoption but less evidence about older reading habits",
            ),
            correct_index=1,
            trap_type="refinement versus replacement trap",
            explanation=(
                "Text 2 partly acknowledges digital interactivity but limits Text 1's replacement claim by pointing to older interactive practices and coexistence."
            ),
            data_payload={
                "type": "cross_text",
                "text_1": text_1,
                "text_2": text_2,
                "relationship": "limitation_refinement",
            },
        )
    if item.question_type == "CROSS_TEXT_CONNECTION" and index == 7:
        text_1 = (
            "Rubber production from Hevea brasiliensis is sometimes explained mainly by the quality of the tree's latex. "
            "On this view, the substance itself may be the key feature that makes the tree commercially useful."
        )
        text_2 = (
            "Although latex quality matters, botanists emphasize a limiting condition: the bark contains inner tubes that may let latex flow when small cuts are made. "
            "This suggests that the tree's usefulness depends not only on producing latex but also on a structure that makes the latex easy to collect."
        )
        return replace(
            item,
            ambiguous_passage=f"Text 1\n{text_1}\n\nText 2\n{text_2}",
            constraint_sentence=(
                "However, the response must account for Text 2's concession, its limiting condition, and its refined conclusion."
            ),
            prompt="Based on the texts, how would the author of Text 2 most likely respond to the explanation in Text 1?",
            answer_options=(
                "By suggesting that latex may have a role in making rubber but is less relevant than climate",
                "By suggesting that the explanation may need to shift from latex quality alone to the bark structure that helps people collect latex",
                "By claiming that Hevea brasiliensis may be useful because it grows in many climates",
                "By suggesting that latex production may matter mainly because several Amazon trees produce it",
            ),
            correct_index=1,
            trap_type="feature versus collection mechanism trap",
            explanation=(
                "Text 2 refines Text 1 by adding that collectability, not latex alone, explains the tree's value."
            ),
            data_payload={
                "type": "cross_text",
                "text_1": text_1,
                "text_2": text_2,
                "relationship": "mechanism_refinement",
            },
        )
    if item.question_type == "CROSS_TEXT_CONNECTION" and index == 8:
        text_1 = (
            "The Nacional cacao tree was thought to have disappeared after a fungus infected many cacao populations in the twentieth century. "
            "Because the fungus can spread through the air from nearby trees, researchers expected any surviving Nacional trees to be unlikely."
        )
        text_2 = (
            "Although that expectation seemed reasonable, cacao expert Servio Pachard later located Nacional trees in the isolated Piedra de Plata valley. "
            "This implies that there was a limit on the earlier assumption: distance from infected trees may have reduced exposure enough for the valley trees to survive."
        )
        return replace(
            item,
            ambiguous_passage=f"Text 1\n{text_1}\n\nText 2\n{text_2}",
            constraint_sentence=(
                "However, the response must account for Text 2's concession, its limiting condition, and its refined conclusion."
            ),
            prompt="Based on the texts, which response would the author of Text 2 most likely make to the expectation described in Text 1?",
            answer_options=(
                "The fungus's ability to spread through the air may have been relevant but was not the whole explanation.",
                "The isolated location of some Nacional trees may have limited their exposure to the fungus.",
                "The chocolate made from Nacional cacao pods may explain why researchers still valued the trees.",
                "Early researchers may have had evidence that Nacional trees could become infected in nearby forests.",
            ),
            correct_index=1,
            trap_type="isolation condition versus disease fact trap",
            explanation=(
                "Text 2 does not deny the fungus threat; it refines the expectation by adding that isolation may have limited exposure."
            ),
            data_payload={
                "type": "cross_text",
                "text_1": text_1,
                "text_2": text_2,
                "relationship": "limitation_refinement",
            },
        )
    if item.question_type == "Command of Evidence" and index == 9:
        return replace(
            item,
            ambiguous_passage=(
                "Robert Frost's poem The Mountain describes a speaker visiting a town beside a mountain. "
                "Although the mountain may be physically distant from the speaker at moments, the speaker claims to feel protected by it."
            ),
            constraint_sentence=(
                "However, the best evidence must show not merely that the mountain is present but that the speaker experiences it as shelter."
            ),
            prompt='Which quotation from "The Mountain" most effectively illustrates the claim?',
            answer_options=(
                "\"A dry ravine emerged under boughs / Into the pasture.\"",
                "\"The mountain stood there to be pointed at.\"",
                "\"I felt it like a wall / Behind which I was sheltered from a wind.\"",
                "\"I crossed the river and swung round the mountain.\"",
            ),
            correct_index=2,
            trap_type="related image versus exact evidence trap",
            explanation=(
                "The correct quotation directly supports the claim of feeling protected by comparing the mountain to a sheltering wall."
            ),
        )
    if item.question_type == "Main Idea" and item.generation_pattern == "study_vs_conclusion" and index >= 18:
        return replace(
            item,
            ambiguous_passage=(
                "An investigation of clay jars from a coastal market recorded fish-oil residue, grain dust, and repair marks; at first, each trace may seem to point to a separate use. "
                "However, the pattern tended to vary by season, while repeated repairs appeared most often on containers carried inland."
            ),
            constraint_sentence=(
                "Taken together, these details suggest the jars were not single-purpose storage vessels but adaptable containers in a shifting trade network."
            ),
            answer_options=(
                "The study cataloged several residues found on jars from a coastal market.",
                "Seasonal fish-oil residue was the strongest evidence that the jars were used only near the coast.",
                "Repair marks prove that inland sellers valued durability more than trade flexibility.",
                "Residue and repair evidence together suggest the jars served flexible roles within a changing trade network.",
            ),
            trap_type="artifact evidence versus network conclusion trap",
            explanation=(
                "The residue and repair details compete for attention, but the combined seasonal and inland evidence supports a broader conclusion about flexible trade use."
            ),
        )
    if item.question_type == "Standard English Conventions" and item.generation_pattern == "modifier_attachment" and index >= 26:
        return replace(
            item,
            ambiguous_passage=(
                "At first, while often reviewing wind-tunnel images from the prototype, ___ noticed a small distortion near the wingtip."
            ),
            constraint_sentence="However, only the engineer can logically be reviewing the images.",
            answer_options=(
                "the prototype revealed that the engineer",
                "the wind-tunnel images led the engineer to notice",
                "a small distortion was noticed by the engineer, who",
                "the engineer",
            ),
            trap_type="modifier attachment with subject separation trap",
            explanation="This pattern tests only modifier_attachment; the intended reviewer must immediately follow the opening modifier.",
        )
    return item


def rw_notes_task_selection_item(index: int) -> AmbiguityFirstItem:
    goal = ("contrast", "summarize", "support")[index % 3]
    hard_zone = index >= 18
    goal_payloads = {
        "contrast": {
            "notes": (
                "- Composers in several countries have written public works responding to environmental change.\n"
                "- In 1998, Canadian composer Rina Okafor premiered Shore Ledger, a chamber piece based on recorded fishing logs from Nova Scotia.\n"
                "- Shore Ledger focuses on families adapting to smaller seasonal catches after ocean temperatures shifted.\n"
                "- In 2016, Peruvian composer Mateo Ibarra premiered Glacier Letters, an orchestral work incorporating testimony from mountain villages.\n"
                "- Glacier Letters emphasizes communities losing access to reliable meltwater as nearby glaciers retreated.\n"
                "- Both works were later performed at university climate festivals, where audiences discussed local conservation efforts."
            ) if hard_zone else (
                "- Project Delta often hosted weekend workshops for residents.\n"
                "- Project Mira was designed mainly for quiet individual study.\n"
                "- Both projects used recycled materials.\n"
                "- Project Delta had a rooftop garden that opened in 2021.\n"
                "- Project Mira won a regional design award.\n"
                "- Several cost estimates may seem relevant but do not address the writing task."
            ),
            "constraint": (
                "However, the student's goal is to contrast the specific environmental problems the two works may represent, not merely identify their shared public purpose."
                if hard_zone
                else "However, the student's goal is to contrast the two projects' community use, not summarize their awards or materials."
            ),
            "prompt": (
                "The student wants to contrast Shore Ledger with Glacier Letters. Which choice most effectively uses relevant information from the notes to accomplish this goal?"
                if hard_zone
                else "The student wants to contrast the two projects' community use. Which choice most effectively uses relevant information from the notes to accomplish this goal?"
            ),
            "answers": (
                (
                    "Both Shore Ledger and Glacier Letters were public works about environmental change that were later discussed at university climate festivals."
                    if hard_zone
                    else "Both projects used recycled materials and received regional design awards."
                ),
                (
                    "Shore Ledger concerns fishing families adjusting to reduced seasonal catches, whereas Glacier Letters concerns mountain villages facing less reliable glacier-fed water."
                    if hard_zone
                    else "One project invited collective public participation, whereas the other centered on independent use."
                ),
                (
                    "Glacier Letters, which premiered in 2016, incorporates testimony from mountain villages affected by retreating glaciers."
                    if hard_zone
                    else "Project Delta had a rooftop garden that opened in 2021."
                ),
                (
                    "Rina Okafor and Mateo Ibarra both used community records or testimony to connect music with climate-related concerns."
                    if hard_zone
                    else "Project Mira won a regional design award, although both projects used recycled materials."
                ),
            ),
            "correct": 1,
        },
        "summarize": {
            "notes": (
                "- A researcher compared two city programs intended to increase teenagers' access to design education.\n"
                "- The East program paired students with local architects and provided studio space after school.\n"
                "- The West program paired students with local product designers and provided studio space after school.\n"
                "- Students in both programs revised projects after receiving adult feedback.\n"
                "- The East program held a public sketch display in May, while the West program used donated tablets for digital modeling.\n"
                "- Organizers reported that participants in both programs spent more time refining design ideas than students without access to the programs."
            ) if hard_zone else (
                "- The East program paired local mentors with after-school studio access.\n"
                "- The West program paired local mentors with after-school studio access.\n"
                "- The East program displayed sketches in May.\n"
                "- The West program used donated tablets.\n"
                "- Both programs often gave students extra time to practice design skills.\n"
                "- Several room locations may seem relevant but are only background details."
            ),
            "constraint": (
                "However, the student's goal is to summarize the shared result the two programs may have produced, not emphasize a site-specific feature."
                if hard_zone
                else "However, the student's goal is to summarize the main shared outcome of both programs, not list a single detail from one site."
            ),
            "prompt": (
                "The student wants to summarize the shared effect of the two programs. Which choice most effectively uses relevant information from the notes to accomplish this goal?"
                if hard_zone
                else "The student wants to summarize the programs' shared outcome. Which choice most effectively uses relevant information from the notes to accomplish this goal?"
            ),
            "answers": (
                "Both programs combined guidance from experienced adults with dedicated studio time, giving students more opportunity to revise and develop design ideas.",
                (
                    "The East program culminated in a public sketch display, whereas the West program emphasized digital modeling with donated tablets."
                    if hard_zone
                    else "The East program met in a library basement and displayed sketches in May."
                ),
                (
                    "The West program's use of donated tablets gave students a technology resource not mentioned in the description of the East program."
                    if hard_zone
                    else "The West program used donated tablets, a detail that made its posters more colorful."
                ),
                (
                    "Because both programs worked with local professionals, they were designed primarily to introduce students to career options."
                    if hard_zone
                    else "The programs were different because one used mentors and the other used tablets."
                ),
            ),
            "correct": 0,
        },
        "support": {
            "notes": (
                "- The exhibit invited visitors to write short responses beside selected artifacts.\n"
                "- Visitors could read and respond to comments left earlier by other visitors.\n"
                "- The exhibit opened in June and included objects borrowed from three regional museums.\n"
                "- Attendance rose during the exhibit's first month.\n"
                "- The curator selected rare objects that may have attracted first-time visitors.\n"
                "- Some wall labels asked questions rather than supplying a single interpretation of each object."
            ) if hard_zone else (
                "- Visitors often added written responses beside artifacts.\n"
                "- Visitors could compare their responses with comments from earlier visitors.\n"
                "- The exhibit opened in June.\n"
                "- Several objects were borrowed from three museums.\n"
                "- Attendance rose during the exhibit's first month.\n"
                "- The curator selected rare objects that may have attracted first-time visitors."
            ),
            "constraint": (
                "However, the student's goal is to support the claim that the exhibit encouraged visitors to help interpret the objects, not simply to show that the exhibit was popular."
                if hard_zone
                else "However, the student's goal is to support the claim that the exhibit encouraged active public interpretation, not merely attendance."
            ),
            "prompt": (
                "The student wants to support a conclusion about the relationship between visitor participation and interpretation in the exhibit. Which choice most effectively uses relevant information from the notes to accomplish this goal?"
                if hard_zone
                else "The student wants to support the claim that the exhibit encouraged active public interpretation. Which choice most effectively uses relevant information from the notes to accomplish this goal?"
            ),
            "answers": (
                "The exhibit opened in June and included rare objects borrowed from three regional museums.",
                "The exhibit asked visitors to contribute interpretations and place those interpretations in conversation with responses from other viewers.",
                "The curator's selection of rare objects may have helped attract first-time visitors during the exhibit's first month.",
                "Because some wall labels asked questions, the exhibit avoided giving visitors any historical information about the objects.",
            ),
            "correct": 1,
        },
    }
    payload = goal_payloads[goal]
    notes = [line.removeprefix("- ").strip() for line in payload["notes"].splitlines() if line.strip()]
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
        data_payload={
            "type": "notes",
            "task_goal": goal,
            "entities": {
                "contrast": ["Project Delta", "Project Mira"],
                "summarize": ["East program", "West program"],
                "support": ["visitor responses", "earlier visitor comments"],
            }[goal],
            "notes": notes,
            "distractor_types": ["true_but_wrong_task", "single_fact_only", "irrelevant_detail_focus"],
        },
    )


def rw_graph_item(pattern: str, module: int, index: int) -> AmbiguityFirstItem:
    module_one_variants = (
        {
            "graph_pattern": "divergence",
            "question_intent": "claim_support",
            "reasoning_type": "multi_point_synthesis",
            "prompt_template": "supports_the_conclusion",
            "prompt": "Which choice best describes data from the graph that support the researchers' conclusion?",
            "passage": "Researchers presented participants with descriptions of fictional candidates whose traits were either broadly admirable or broadly undesirable. At first, the team expected participants' own trait scores may affect likability ratings for both kinds of candidates.",
            "constraint": "However, after comparing the two candidate groups in the graph, they revised their conclusion about how participants' own trait scores related to candidate likability.",
            "answers": (
                "Ratings for the two candidate groups diverge as participants' undesirable-trait scores rise: ratings for undesirable-trait candidates increase sharply, while ratings for admirable-trait candidates remain nearly flat, providing support for the revised conclusion.",
                "Ratings for admirable-trait candidates are high overall, which partly fits the study context but misses the later crossover in the researchers' reasoning about trait scores.",
                "Both candidate groups become much more likable as participants' scores rise, misreading the graph trend for admirable-trait candidates.",
                "Undesirable-trait candidates receive lower ratings than admirable-trait candidates at the first score level, focusing on the first score rather than the full trend.",
            ),
            "correct": 0,
            "series": [
                {"name": "Admirable-trait candidates", "values": [(1, 68), (2, 68), (3, 68), (4, 68), (5, 68), (6, 69), (7, 69)]},
                {"name": "Undesirable-trait candidates", "values": [(1, 22), (2, 31), (3, 41), (4, 50), (5, 61), (6, 70), (7, 82)]},
            ],
        },
        {
            "graph_pattern": "divergence",
            "question_intent": "trend_description",
            "reasoning_type": "trend_reading",
            "prompt_template": "describes_the_relationship",
            "prompt": "Which choice best describes the relationship shown in the graph?",
            "passage": "Researchers comparing two classroom ventilation systems first expected both systems may perform similarly as room occupancy increased. Several setup notes describe fan size, although those notes do not determine the relationship shown in the graph.",
            "constraint": "However, the graph is needed to describe how the systems' performance changes as occupancy rises.",
            "answers": (
                "System A starts with a slightly higher score, a true local detail that does not describe how the relationship changes.",
                "Both systems are ventilation designs, which matches the study context but not the graph relationship.",
                "The systems move farther apart as occupancy rises, with System B improving more sharply than System A.",
                "System B is higher at every occupancy level, so the gap is constant across the graph.",
            ),
            "correct": 2,
            "series": [
                {"name": "System A", "values": [(10, 72), (20, 74), (30, 75), (40, 76)]},
                {"name": "System B", "values": [(10, 70), (20, 76), (30, 83), (40, 91)]},
            ],
        },
    )
    module_two_variants = (
        {
            "graph_pattern": "threshold_reversal",
            "question_intent": "claim_support",
            "reasoning_type": "conditional_comparison",
            "prompt_template": "supports_the_conclusion",
            "prompt": "Which choice gives data from the graph that supports the researchers' conditional conclusion?",
            "answer_role": "supporting",
            "correct": "Panel T is strongest below the threshold, but Panel S overtakes it after the plateau while Panel R changes little, supporting the claim only for higher-noise conditions.",
        },
        {
            "graph_pattern": "partial_support_region",
            "question_intent": "role_in_argument",
            "reasoning_type": "contradiction_detection",
            "prompt_template": "weakens_the_conclusion",
            "prompt": "Which choice gives data from the graph that weakens the researchers' broad conclusion?",
            "answer_role": "weakening",
            "correct": "The pattern supports the hypothesis only after the middle condition; below that range, Formula Q remains stronger, weakening the claim that Formula S is generally superior.",
        },
        {
            "graph_pattern": "conflicting_variable_dominance",
            "question_intent": "inference",
            "reasoning_type": "multi_point_synthesis",
            "prompt_template": "completes_the_conclusion",
            "prompt": "Which choice most logically completes the researchers' conclusion using the graph?",
            "answer_role": "completing",
            "correct": "The conclusion should be limited: Sensor M becomes preferable only after the middle condition, while Sensor K better fits the lower-activity cases and Sensor L stays comparatively flat.",
        },
        {
            "graph_pattern": "diminishing_returns",
            "question_intent": "inference",
            "reasoning_type": "exception_identification",
            "prompt_template": "shows_a_limitation",
            "prompt": "Which choice shows a limitation or exception to the researchers' reasoning?",
            "answer_role": "limiting",
            "correct": "The graph shows a plateau before the late increase, so the practice claim works only outside the middle interval rather than across the full range.",
        },
    )
    variant = module_two_variants[(index - 10) % len(module_two_variants)] if module == 2 and MODULE2_MODE == "hard" else module_one_variants[index % len(module_one_variants)]
    if module == 2 and MODULE2_MODE == "hard":
        return rw_module2_hard_graph_item(pattern, variant)
    return rw_graph_variant_item(pattern, variant, hard_mode=False)


def rw_module2_hard_graph_item(pattern: str, variant: dict) -> AmbiguityFirstItem:
    graph_pattern = variant["graph_pattern"]
    base_by_pattern = {
        "threshold_reversal": {
            "passage": (
                "Researchers testing three sound-dampening panels first expected the thickest panel may be the best overall choice. "
                "A competing hypothesis was that material density mattered only when background noise passed a moderate level."
            ),
            "constraint": (
                "However, the researchers argued only when performance at low and high noise levels is considered together, except for the middle condition, can the graph be used to evaluate that hypothesis."
            ),
            "answers": (
                "Panel R has the highest score at the first noise level, a true local detail that does not address the conditional change across the range.",
                "All panels improve somewhere in the graph, which matches the early expectation but not the graph's threshold-dependent reversal.",
                variant["correct"],
                "Panel S has the highest final score, so it is the best panel at every noise level.",
            ),
            "series": [
                {"name": "Panel R", "values": [(1, 7), (2, 7), (3, 8), (4, 8), (5, 8)]},
                {"name": "Panel S", "values": [(1, 4), (2, 6), (3, 6), (4, 10), (5, 13)]},
                {"name": "Panel T", "values": [(1, 8), (2, 9), (3, 9), (4, 9), (5, 10)]},
            ],
            "variable_relationship": "noise_panel_threshold",
        },
        "partial_support_region": {
            "passage": (
                "Researchers evaluating three restoration adhesives first expected the fastest-setting formula may also be the most reliable. "
                "A competing hypothesis was that drying speed mattered only when humidity stayed within a narrow test range."
            ),
            "constraint": (
                "However, the researchers argued only when low, middle, and high humidity trials are considered together, except for the driest condition, can the graph be used to evaluate that hypothesis."
            ),
            "answers": (
                "Formula Q has the strongest result in the driest trial, a true local detail that does not address the conditional change across the range.",
                "Each adhesive performs well in at least one trial, which matches the early expectation but not the graph's threshold-dependent reversal.",
                variant["correct"],
                "Formula S has the highest final score, so it is the best option at every level.",
            ),
            "series": [
                {"name": "Formula Q", "values": [(1, 11), (2, 10), (3, 8), (4, 7), (5, 7)]},
                {"name": "Formula R", "values": [(1, 7), (2, 8), (3, 10), (4, 11), (5, 10)]},
                {"name": "Formula S", "values": [(1, 5), (2, 6), (3, 8), (4, 12), (5, 14)]},
            ],
            "variable_relationship": "humidity_adhesive_region",
        },
        "conflicting_variable_dominance": {
            "passage": (
                "Researchers comparing three shoreline sensors first expected the model with the strongest battery may be most useful. "
                "A competing hypothesis was that battery strength mattered only when wave activity remained below a certain range."
            ),
            "constraint": (
                "However, the researchers argued only when calm and rough-water trials are considered together, except for the middle readings, can the graph be used to evaluate that hypothesis."
            ),
            "answers": (
                "Sensor K is strongest in the calmest trial, a true local detail that does not address the conditional change across the range.",
                "Every sensor improves somewhere in the graph, which matches the early expectation but not the graph's threshold-dependent reversal.",
                variant["correct"],
                "Sensor M has the highest final score, so it is the best option at every level.",
            ),
            "series": [
                {"name": "Sensor K", "values": [(1, 13), (2, 11), (3, 9), (4, 8), (5, 8)]},
                {"name": "Sensor L", "values": [(1, 8), (2, 9), (3, 11), (4, 10), (5, 9)]},
                {"name": "Sensor M", "values": [(1, 6), (2, 7), (3, 8), (4, 12), (5, 15)]},
            ],
            "variable_relationship": "wave_sensor_dominance",
        },
        "diminishing_returns": {
            "passage": (
                "Researchers studying three memory-training schedules first expected that adding more practice blocks may steadily improve recall. "
                "A competing hypothesis was that extra practice mattered only when sessions were spaced beyond an initial range."
            ),
            "constraint": (
                "However, the researchers argued only when early and late practice intervals are considered together, except for the middle interval, can the graph be used to evaluate that hypothesis."
            ),
            "answers": (
                "Schedule C has the highest first score, a true local detail that does not address the conditional change across the range.",
                "The schedules all improve somewhere in the graph, which matches the early expectation but not the graph's threshold-dependent reversal.",
                variant["correct"],
                "Schedule B has the highest final score, so it is the best option at every level.",
            ),
            "series": [
                {"name": "Schedule A", "values": [(1, 6), (2, 9), (3, 9), (4, 10), (5, 10)]},
                {"name": "Schedule B", "values": [(1, 4), (2, 7), (3, 7), (4, 12), (5, 15)]},
                {"name": "Schedule C", "values": [(1, 9), (2, 10), (3, 10), (4, 10), (5, 11)]},
            ],
            "variable_relationship": "practice_recall_returns",
        },
    }
    base = base_by_pattern[graph_pattern]
    return rw_graph_variant_item(pattern, {**variant, **base}, hard_mode=True)


def rw_graph_variant_item(pattern: str, variant: dict, *, hard_mode: bool) -> AmbiguityFirstItem:
    series = variant.get("series") or [
        {"name": "Panel R", "values": [(1, 7), (2, 7), (3, 8), (4, 8), (5, 8)]},
        {"name": "Panel S", "values": [(1, 4), (2, 6), (3, 6), (4, 10), (5, 13)]},
        {"name": "Panel T", "values": [(1, 8), (2, 9), (3, 9), (4, 9), (5, 10)]},
    ]
    complexity_features = (
        ["threshold-dependent change", "plateau / non-linear behavior", "partial support only"]
        if hard_mode
        else ["crossover + divergence" if variant["graph_pattern"] == "crossover_point" else "conflicting trends across variables"]
    )
    answer_options = variant["answers"] if "answers" in variant else (
        "Panel R has the highest score at the first noise level, a true local detail that does not address the conditional change across the range.",
        "All panels improve somewhere in the graph, which matches the early expectation but not the graph's threshold-dependent reversal.",
        variant["correct"],
        "Panel S has the highest final score, so it is the best panel at every noise level.",
    )
    correct_index = variant.get("correct", 2)
    if isinstance(correct_index, str):
        correct_index = 2
    return AmbiguityFirstItem(
        generation_pattern=pattern,
        ambiguous_passage=variant["passage"],
        constraint_sentence=variant["constraint"],
        prompt=variant["prompt"],
        answer_options=answer_options,
        correct_index=correct_index,
        topic="command_of_evidence_quantitative_graph",
        subtopic=f"Pattern: graph_trend_claim_shift; graph={variant['graph_pattern']}; intent={variant['question_intent']}",
        question_type="command_of_evidence_quantitative_graph",
        trap_type="hard graph conditional reasoning trap" if hard_mode else "graph trend versus conclusion trap",
        explanation=(
            f"Graph evidence type=quantitative; pattern={variant['graph_pattern']}; prompt_template={variant['prompt_template']}; "
            f"reasoning_type={variant['reasoning_type']}; hard_graph_features={','.join(complexity_features)}; "
            "the correct answer combines graph observations with the stated claim and does not rely on text alone."
        ),
        constraints_required=3 if hard_mode else 2,
        data_type="graph",
        data_payload={
            "x_label": "Background noise level" if hard_mode else "Study condition",
            "y_label": "Sound reduction score" if hard_mode else "Measured result",
            "graph_pattern": variant["graph_pattern"],
            "question_intent": variant["question_intent"],
            "prompt_template": variant["prompt_template"],
            "reasoning_type": variant["reasoning_type"],
            "variable_relationship": variant.get("variable_relationship"),
            "reasoning_pattern": variant["graph_pattern"],
            "graph_dependency": "necessary",
            "hard_mode": hard_mode,
            "complexity_features": complexity_features,
            "distractor_types": [
                "globally_true_but_irrelevant",
                "locally_true_but_incomplete",
                "matches_text_not_graph",
                "overgeneralizes_trend",
            ],
            "series": series,
        },
    )


def rw_pattern_item(question_type: str, pattern: str) -> AmbiguityFirstItem:
    items: dict[tuple[str, str], AmbiguityFirstItem] = {
        ("Vocabulary in Context", "literal_vs_abstract"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, botanist Mara Sato noted that paper birches grow across many climates and thus may ___ temperature shifts better than related tree species can."
            ),
            constraint_sentence="However, the changes birches undergo in response to a warming climate often appear small and achievable rather than requiring movement to an entirely new habitat.",
            prompt="Which choice completes the text with the most logical and precise word or phrase?",
            answer_options=("relocate from", "refer to", "originate from", "adapt to"),
            correct_index=3,
            topic="Vocabulary in Context",
            subtopic="Pattern: literal_vs_abstract",
            question_type="Vocabulary in Context",
            trap_type="precise phrase completion trap",
            explanation="The later sentence rules out movement or origin and points to adjusting to climate shifts.",
        ),
        ("Vocabulary in Context", "functional_precision"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Although morning clouds often made the shoreline difficult to judge from above, the lagoon water was so clear that the shells on the bottom seemed almost suspended in air."
            ),
            constraint_sentence="However, when the boat crossed the shallows, the passengers could see grasses and fish through the water as if there were no surface at all.",
            prompt="As used in the text, what does \"clear\" most nearly mean?",
            answer_options=("simple", "understandable", "obvious", "transparent"),
            correct_index=3,
            topic="Vocabulary in Context",
            subtopic="Pattern: functional_precision",
            question_type="Vocabulary in Context",
            trap_type="multiple-meaning vocabulary trap",
            explanation="The visual details force the transparent sense of clear, not the intellectual senses simple, understandable, or obvious.",
        ),
        ("Vocabulary in Context", "tone_alignment"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A recently observed radio burst lasted nearly three minutes, ___ for a signal thought to come from a merger that usually produces emissions lasting only a few seconds."
            ),
            constraint_sentence="However, astronomers often avoid calling such results impossible until more observations confirm whether the source was correctly identified.",
            prompt="Which choice completes the text with the most logical and precise word or phrase?",
            answer_options=("a coincidence", "a reprieve", "an incident", "an oddity"),
            correct_index=3,
            topic="Vocabulary in Context",
            subtopic="Pattern: tone_alignment",
            question_type="Vocabulary in Context",
            trap_type="tone and precision trap",
            explanation="The unusual duration makes the burst an oddity; the other nouns are grammatical but do not capture the scientific surprise.",
        ),
        ("Function", "setup_refutation"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "In the early years of television, many broadcasters thought programs would be funded mostly by advertisers, much as radio programs had been. "
                "But advertisers hesitated to enter the new medium, particularly while wartime limits slowed the manufacture of home television sets."
            ),
            constraint_sentence="However, networks often still had to persuade sponsors to support programs before anyone knew whether a large viewing audience would develop.",
            prompt="Which choice best describes the function of the underlined phrase in the text as a whole?",
            answer_options=("It compares radio and television as equally successful advertising markets.", "It identifies one reason advertisers were cautious about supporting television.", "It explains why broadcasters no longer needed commercial sponsors.", "It presents the final evidence that advertisers preferred radio to television."),
            correct_index=3,
            topic="Function",
            subtopic="Pattern: setup_refutation",
            question_type="Function",
            trap_type="local function trap",
            explanation="The underlined phrase supplies a specific reason for hesitation rather than making the broader claim by itself.",
            constraints_required=2,
            data_payload={
                "target_sentence": "But advertisers hesitated to enter the new medium, particularly while wartime limits slowed the manufacture of home television sets.",
                "target_role": "evidence",
            },
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
            correct_index=1,
            topic="Function",
            subtopic="Pattern: evidence_support",
            question_type="Function",
            trap_type="evidence role trap",
            explanation="The recordings are evidence; the subtlety is that their repetition, not their location alone, supports the claim.",
        ),
        ("Main Idea", "example_vs_general"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, conservation groups may seem to protect ecosystems mainly by building new infrastructure, but many work by restoring natural features. "
                "In one river project, a tribal government and a conservation organization restored naturally occurring logjams that create shady pools where salmon can rest and spawn."
            ),
            constraint_sentence="However, the example is used to show that nature-based interventions may help achieve conservation goals when they restore processes animals already rely on.",
            prompt="Which choice best states the main idea of the text?",
            answer_options=("A river project restored logjams that make shady pools for salmon.", "Nature-based approaches can be effective ways to address conservation challenges.", "Salmon need shady pools to rest and spawn in restored rivers.", "A partnership between conservation groups shows how collaboration may support habitat restoration."),
            correct_index=1,
            topic="Main Idea",
            subtopic="Pattern: example_vs_general",
            question_type="Main Idea",
            trap_type="example versus general claim trap",
            explanation="The details about one project support the broader claim about nature-based conservation approaches.",
        ),
        ("Main Idea", "study_vs_conclusion"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, marine biologists often described pteropods as highly vulnerable to ocean acidification because their thin shells contain calcium carbonate."
            ),
            constraint_sentence="However, one study found that pteropods may slow or repair some shell damage.",
            prompt="Which choice best states the main idea of the text?",
            answer_options=("Pteropods are sometimes described as vulnerable because calcium carbonate can dissolve in acidic water.", "A study suggests that pteropods may have protective responses that complicate assumptions about their vulnerability.", "The outer coating of a pteropod shell is more important than any inner shell-repair process.", "Researchers have shown that ocean acidification does not affect pteropods when their outer coating remains intact."),
            correct_index=1,
            topic="Main Idea",
            subtopic="Pattern: study_vs_conclusion",
            question_type="Main Idea",
            trap_type="study detail versus conclusion trap",
            explanation="The study details support a qualified conclusion about biological protection, not a denial of vulnerability.",
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
                "At first, many scientists often held the belief that the ocean floor was mostly flat."
            ),
            constraint_sentence="However, later sonar evidence revealed ridges and trenches and overturned that view.",
            prompt="Which choice best describes the function of the underlined sentence in the text as a whole?",
            answer_options=("It identifies a scientific belief that later evidence showed to be wrong.", "It describes the method used to map the ocean floor.", "It emphasizes a disagreement between two named researchers.", "It presents data that support the later sonar surveys."),
            correct_index=0,
            topic="TEXT_STRUCTURE_FUNCTION",
            subtopic="Pattern: setup_vs_result",
            question_type="TEXT_STRUCTURE_FUNCTION",
            trap_type="setup versus result trap",
            explanation="The target sentence states the earlier belief that the later sonar evidence overturns.",
            constraints_required=2,
            data_payload={
                "target_sentence": "At first, many scientists often held the belief that the ocean floor was mostly flat.",
                "target_role": "belief / claim",
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
                "Text 1: Some geologists contend that plate movement on early Earth began around three billion years ago. "
                "They often cite computer models suggesting that mantle temperatures then may have been high enough to allow large slabs of crust to move. "
                "Text 2: Although those models may identify one plausible condition for movement, mineral evidence from ancient crystals suggests that some crust was still too chemically stable to be regularly recycled at that time. "
                "This finding indicates that the modeled temperatures alone may not be sufficient to establish widespread plate movement."
            ),
            constraint_sentence="Although Text 2 does not dismiss modeling, it limits Text 1's claim by requiring geological evidence in addition to temperature estimates.",
            prompt="Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
            answer_options=("By suggesting that simulations can inform the claim but cannot settle the timing without independent geological support.", "By arguing that crystal evidence can determine the exact time plate movement began.", "By agreeing that the model evidence would confirm widespread movement if the temperature estimates are internally consistent.", "By treating the chemical evidence as relevant mainly to crystal formation rather than to the plate-movement claim."),
            correct_index=0,
            topic="CROSS_TEXT_CONNECTION",
            subtopic="Pattern: model_vs_data",
            question_type="CROSS_TEXT_CONNECTION",
            trap_type="model versus data trap",
            explanation="Text 2 uses data to qualify the model without fully rejecting it.",
            constraints_required=2,
            data_payload={
                "type": "cross_text",
                "text_1": "Some geologists contend that plate movement on early Earth began around three billion years ago. They often cite computer models suggesting that mantle temperatures then may have been high enough to allow large slabs of crust to move.",
                "text_2": "Although those models may identify one plausible condition for movement, mineral evidence from ancient crystals suggests that some crust was still too chemically stable to be regularly recycled at that time. This finding indicates that the modeled temperatures alone may not be sufficient to establish widespread plate movement.",
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
                "Narwhals are shy Arctic whales, and some of them have a long tusk with sensitive nerves. At first, one group of scientists proposed in 2014 that the tusk may help narwhals determine when nearby water is likely to start freezing and become dangerous."
            ),
            constraint_sentence="However, marine biologist Kristin Laidre disagrees, reasoning that if the tusk served such an important survival function, the trait would likely be more consistently present among narwhals than observations suggest.",
            prompt="Which choice most logically completes the text?",
            answer_options=("some narwhals would seek a new habitat when water begins freezing.", "fewer Arctic marine animals would rely on sensory organs to detect environmental change.", "the trait would appear in a larger share of the population.", "narwhals would become less shy over time."),
            correct_index=2,
            topic="Inference",
            subtopic="Pattern: contradiction_inference",
            question_type="Inference",
            trap_type="contradiction scope trap",
            explanation="The disagreement depends on a limited inference: if the tusk had an essential function, it would likely be more widespread among narwhals.",
        ),
        ("Data Analysis", "data_mapping_table"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "A student is researching rotating radio transients (RRATs), a subclass of pulsar stars characterized by short pulses of radio waves. Although frequency may seem like the most direct measure of pulse timing, the table lists several properties of five select RRATs."
            ),
            constraint_sentence="In this context, period refers to the interval separating one pulse from the next, so the student must use that column rather than the frequency column to identify the briefest interval.",
            prompt="Which choice most effectively uses data from the table to complete the statement?",
            answer_options=("Of the listed objects, J0614-03 has the smallest period value and therefore the briefest pulse interval.", "J0545-03 and J0121+53 have equal pulse intervals once frequency is considered.", "J1654-2335 has the longest pulse interval because its right ascension is greatest.", "J0103+54 has the highest frequency but the longest period among the RRATs listed."),
            correct_index=0,
            topic="Data Analysis",
            subtopic="Pattern: data_mapping_table",
            question_type="Data Analysis",
            trap_type="wrong row or column trap",
            explanation="The answer must map the definition of period to the correct column and compare all rows, not substitute frequency or right ascension.",
            constraints_required=2,
            data_type="table",
            data_payload={
                "title": "Properties of Select Rotating Radio Transients",
                "reasoning_pattern": "conditional_comparison",
                "required_constraints": 2,
                "constraint_types": ["subset_filtering", "comparison_across_rows_columns"],
                "required_skills": ["scan_multiple_rows", "apply_condition"],
                "reject_shortcuts": ["max_min_lookup", "single_value_reading", "direct_row_match"],
                "columns": ["Name", "Right ascension (hours)", "Period (seconds)", "Frequency (hertz)"],
                "rows": [
                    {"Name": "J0545-03", "Right ascension (hours)": "5:45", "Period (seconds)": 1.074, "Frequency (hertz)": 0.931},
                    {"Name": "J1654-2335", "Right ascension (hours)": "16:54:03", "Period (seconds)": 0.545, "Frequency (hertz)": 1.834},
                    {"Name": "J0103+54", "Right ascension (hours)": "1:03:37", "Period (seconds)": 0.354, "Frequency (hertz)": 2.822},
                    {"Name": "J0121+53", "Right ascension (hours)": "1:21", "Period (seconds)": 2.725, "Frequency (hertz)": 0.367},
                    {"Name": "J0614-03", "Right ascension (hours)": "6:15", "Period (seconds)": 0.136, "Frequency (hertz)": 7.353},
                ],
            },
        ),
        ("Command of Evidence", "weaken_origin_claim"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Archaeologists know that guinea pigs were raised on Isla Verde about 1,700 years ago. At first, trade-route evidence seemed to suggest that the animals were brought from the mainland city of Calama, since documented routes connected Calama with the island but did not connect the island with a second mainland region, Luma."
            ),
            constraint_sentence="However, the origin claim may depend on ancestry, not merely on which trade routes are easiest to document.",
            prompt="Which choice would most weaken the historian's origin claim?",
            answer_options=("Ancient island guinea pigs were genetically less similar to guinea pigs from Calama than to guinea pigs from Luma.", "Guinea pig bones are common in ancient island pottery workshops and household refuse.", "Modern guinea pig breeds on Isla Verde differ from both mainland populations because of recent selective breeding.", "Calama traders also exchanged shells and dyed cloth with several island communities."),
            correct_index=0,
            topic="Command of Evidence",
            subtopic="Pattern: weaken_origin_claim",
            question_type="Command of Evidence",
            trap_type="origin evidence trap",
            explanation="Genetic evidence pointing away from the proposed source weakens the route-based origin claim most directly.",
        ),
        ("Standard English Conventions", "grammar_subject_verb"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Although zydeco music originated in the French Creole community of southwest Louisiana, one instrument often credited with giving zydeco its unique sound is the vest frottoir."
            ),
            constraint_sentence="The vest frottoir ___ a wearable washboard that is played by rubbing spoons or bottle openers against it.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=("have been", "is", "were", "are"),
            correct_index=1,
            topic="Standard English Conventions",
            subtopic="Pattern: grammar_subject_verb",
            question_type="Standard English Conventions",
            trap_type="subject-verb agreement trap",
            explanation="This pattern tests only subject-verb agreement; the singular subject vest frottoir requires is.",
        ),
        ("Standard English Conventions", "grammar_clause_boundary"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Although in his Naturalis historia Pliny the Elder praised Hipparchus's star catalog, a second-century BCE list of roughly 850 different stars' celestial positions, scholars often lacked a surviving copy."
            ),
            constraint_sentence="For centuries, scholars dreamed about locating a copy of this legendary lost ___ fantasy partially became reality in 2022, when researchers uncovered traces of the star catalog on a palimpsest, a reused parchment.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=("work, that", "work that", "work. That", "work and that"),
            correct_index=1,
            topic="Standard English Conventions",
            subtopic="Pattern: grammar_clause_boundary",
            question_type="Standard English Conventions",
            trap_type="clause boundary trap",
            explanation="This pattern tests only clause boundaries; work that keeps the noun and relative clause integrated without an unnecessary comma, sentence break, or compound structure.",
        ),
        ("Standard English Conventions", "sentence_boundary_resolution"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Although some interiors use traditional design elements, such as arched Gothic ceilings, and modern ones, such as floor-to-ceiling ___ design often splits the difference between old and new, a mixture increasingly seen in US homes."
            ),
            constraint_sentence="The phrase after the blank begins a new independent clause that describes the design as a whole.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=("windows; transitional", "windows--transitional", "windows. Transitional", "windows, transitional"),
            correct_index=0,
            topic="Standard English Conventions",
            subtopic="Pattern: sentence_boundary_resolution",
            question_type="Standard English Conventions",
            trap_type="ambiguous boundary trap",
            explanation="This pattern tests only sentence_boundary_resolution; a semicolon correctly joins two related independent clauses without a comma splice or abrupt sentence break.",
            constraints_required=2,
        ),
        ("Standard English Conventions", "grammar_modifier"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Although Zhang Daqian's 1983 painting Panorama of Mount Lu features jagged peaks of black ink, it is often associated with the tradition of qingli shanshui."
            ),
            constraint_sentence="Qingli shanshui is a type of Chinese landscape painting ___ by the use of blue and green hues to depict ethereal, otherworldly landscapes.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=("has been characterized", "will be characterized", "characterized", "is characterized"),
            correct_index=2,
            topic="Standard English Conventions",
            subtopic="Pattern: grammar_modifier",
            question_type="Standard English Conventions",
            trap_type="modifier placement trap",
            explanation="This pattern tests only modifier placement; characterized creates a reduced relative clause that describes the painting type without adding an unnecessary finite verb.",
        ),
        ("Standard English Conventions", "grammar_pronoun_reference"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Although a given industry--water and electricity are two well-known examples--may carry high infrastructural start-up costs and other barriers that discourage competition, ___ of just one or two suppliers per municipality."
            ),
            constraint_sentence="Such industries are known as natural monopolies.",
            prompt="Which choice completes the text so that it conforms to Standard English and makes the reference clear?",
            answer_options=("these often consist", "they often consist", "it often consists", "this often consists"),
            correct_index=1,
            topic="Standard English Conventions",
            subtopic="Pattern: grammar_pronoun_reference",
            question_type="Standard English Conventions",
            trap_type="pronoun reference trap",
            explanation="This pattern tests only pronoun reference; they clearly refers to plural industries and agrees with consist.",
            constraints_required=2,
        ),
        ("Transitions", "cause_effect"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, famous for its four-degree tilt, the leaning Garisenda Tower was treated mainly as a popular attraction in Bologna's city center. However, measurements taken in 2023 showed that the tower was rotating in a concerning way."
            ),
            constraint_sentence="___ city officials closed the area around the tower so experts could explore solutions to stabilize the historical twelfth-century structure.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Similarly,", "As a result,", "For example,", "In comparison,"),
            correct_index=1,
            topic="Transitions",
            subtopic="Pattern: cause_effect",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=cause_effect; the closure is a result of the concerning measurements, not a similarity, example, or comparison.",
            constraints_required=2,
        ),
        ("Transitions", "addition"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "At first, guard cells were described mainly as specialized cells that are part of a plant's pores. However, researchers found that these cells often help regulate the amount of carbon dioxide a plant takes in."
            ),
            constraint_sentence="___ they help regulate a plant's water loss.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Additionally,", "Previously,", "In conclusion,", "Instead,"),
            correct_index=0,
            topic="Transitions",
            subtopic="Pattern: addition",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=addition; the second sentence adds another related function of guard cells rather than marking time, conclusion, or replacement.",
            constraints_required=2,
        ),
        ("Transitions", "reinforcement"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "Although Marcel Duchamp intended his 1917 so-called ready-made sculpture Fountain to challenge then-prevailing conceptions about the nature of art, at first some viewers saw the work mainly as a rejection of traditional artistic skill. Some critics may have treated the object itself as less important than the debate it provoked."
            ),
            constraint_sentence="___ Duchamp's Fountain did just that, raising the question of whether displaying any object in an art gallery could be said to transform the object--even, as Duchamp's sculpture was, a urinal--into a legitimate work of art.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Similarly,", "Indeed,", "Instead,", "In addition,"),
            correct_index=1,
            topic="Transitions",
            subtopic="Pattern: reinforcement",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=reinforcement; the second sentence confirms that Fountain achieved the stated aim rather than adding a separate example or reversing the idea.",
            constraints_required=2,
        ),
        ("Transitions", "clarification"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "In 2021, a model developed by astrophysicist Catherine Zucker and her research team revealed that the same supernovas responsible for the creation and ongoing expansion of the Local Bubble--a 14-million-year-old cavity in the Milky Way--are likely responsible for the formation of new stars. At first, the bubble had often been described mainly as a cavity rather than as a star-forming structure."
            ),
            constraint_sentence="___ this model detailed how the bubble's expansion trapped interstellar clouds of gas and dust that became stars upon their eventual collapse.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Hence,", "However,", "Admittedly,", "Specifically,"),
            correct_index=3,
            topic="Transitions",
            subtopic="Pattern: clarification",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=clarification; the second sentence gives the specific mechanism behind the model's broad claim, rather than contrasting or drawing a separate conclusion.",
            constraints_required=2,
        ),
        ("Transitions", "concession"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The ceramic coating was costly to apply and, at first, several engineers questioned whether the added step would be practical. The coating often reduced heat loss, however, even on older equipment with uneven surfaces."
            ),
            constraint_sentence="___, the team recommended testing the coating in a small set of factories before rejecting it, despite the added expense.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Therefore,", "Specifically,", "In fact,", "Nevertheless,"),
            correct_index=3,
            topic="Transitions",
            subtopic="Pattern: concession",
            question_type="Transitions",
            trap_type="fine-grained transition trap",
            explanation="Hard transition category=concession; the sentence preserves the recommendation despite the limitation already introduced.",
            constraints_required=2,
        ),
        ("Transitions", "conclusion"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "The excavation team found imported beads, local pottery, and repair marks on several tools, although no single object proved how the settlement was used. Taken together, the finds often point to both trade and everyday residence rather than to a temporary market alone."
            ),
            constraint_sentence="___, the site was likely not just a trading stop but a place where people lived for extended periods.",
            prompt="Which choice completes the text with the most logical transition?",
            answer_options=("Specifically,", "Meanwhile,", "For example,", "Ultimately,"),
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
                "At first, when Dr. Mensah gave Rivera the revised catalog entry, ___ often still contained an unclear date range, even though the surrounding notes had been corrected."
            ),
            constraint_sentence="However, the sentence must refer precisely to the catalog entry, not to either researcher or the broader set of notes.",
            prompt="Which choice completes the text so that it conforms to Standard English and resolves the reference?",
            answer_options=("she", "the notes", "that", "the entry"),
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
                "At first, the satellite detected a faint heat signal over the ridge ___ the research team often treated the result cautiously because cloud cover can distort readings from that area."
            ),
            constraint_sentence="However, the second clause explains why the team qualified the first observation.",
            prompt="Which choice completes the text so that it conforms to Standard English?",
            answer_options=(", the research team", "; although the research team", "which led the research team to", ", but the research team"),
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
                "While researching a topic, a student has taken the following notes:\nNotes:\n"
                "- Bike-share programs often provide bicycles for shared use.\n"
                "- In docked bike sharing, riders rent a bike and return it to designated docking stations.\n"
                "- Docked programs are orderly and offer consistency to riders but require significant space and money to implement.\n"
                "- In dockless bike sharing, riders locate a bike and leave it wherever they choose.\n"
                "- Dockless programs are relatively simple and inexpensive to implement and offer flexibility to riders.\n"
                "- Dockless programs can be disorganized."
            ),
            constraint_sentence="However, the student's goal is to compare some disadvantages of docked and dockless bike-share programs.",
            prompt="Which choice most effectively uses relevant information from the notes to accomplish this goal?",
            answer_options=(
                "Dockless programs can be disorganized; docked programs, on the other hand, offer order and consistency.",
                "Worth noting is that while dockless programs are relatively easy and inexpensive to implement, they are less predictable than docked programs.",
                "Docked bike sharing requires designated stations, whereas dockless bike sharing lets riders leave bikes wherever they choose.",
                "Station-based systems demand substantial infrastructure, whereas dockless systems may create order problems.",
            ),
            correct_index=3,
            topic="Rhetorical Synthesis",
            subtopic="Pattern: compare",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical task filtering trap",
            explanation="Hard synthesis task=compare; the correct answer filters for disadvantages of both systems and avoids advantages or neutral definitions.",
            constraints_required=3,
            data_payload={
                "type": "notes",
                "task_goal": "compare",
                "notes": [
                    "Bike-share programs often provide bicycles for shared use.",
                    "In docked bike sharing, riders rent a bike and return it to designated docking stations.",
                    "Docked programs are orderly and offer consistency to riders but require significant space and money to implement.",
                    "In dockless bike sharing, riders locate a bike and leave it wherever they choose.",
                    "Dockless programs are relatively simple and inexpensive to implement and offer flexibility to riders.",
                    "Dockless programs can be disorganized.",
                ],
            },
        ),
        ("Rhetorical Synthesis", "contrast"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "While researching a topic, a student has taken the following notes:\nNotes:\n"
                "- Musicians around the world have often used protest songs to raise awareness about human rights violations.\n"
                "- US folk singer Aunt Molly Jackson released the protest song \"Poor Miner's Farewell\" in 1932.\n"
                "- It exposed the unlivable wages and dangerous working conditions coal miners faced in Kentucky during the 1920s and 1930s.\n"
                "- South African singer-songwriter Hugh Masekela released the protest song \"Bring Him Back Home\" in 1987.\n"
                "- It called on the South African government to free Nelson Mandela, an anti-apartheid leader who had been unjustly imprisoned.\n"
                "- Both songs are examples of music used to address human rights issues."
            ),
            constraint_sentence="However, the student's goal is to contrast the song \"Poor Miner's Farewell\" with the song \"Bring Him Back Home.\"",
            prompt="Which choice most effectively uses relevant information from the notes to accomplish this goal?",
            answer_options=(
                "The songs \"Poor Miner's Farewell\" and \"Bring Him Back Home\" both raised awareness about human rights violations.",
                "While both songs are protest works, one targets coal miners' working conditions in Kentucky and the other urges Mandela's release in South Africa.",
                "Hugh Masekela's song \"Bring Him Back Home,\" released in 1987, called on the South African government to free Nelson Mandela.",
                "Released in 1932 by Aunt Molly Jackson, the song \"Poor Miner's Farewell\" was a protest against dangerous working conditions faced by Kentucky coal miners.",
            ),
            correct_index=1,
            topic="Rhetorical Synthesis",
            subtopic="Pattern: contrast",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical contrast trap",
            explanation="Hard synthesis task=contrast; the correct answer uses relevant details about both songs and foregrounds their different subjects rather than only a similarity or one-song detail.",
            constraints_required=3,
            data_payload={
                "type": "notes",
                "task_goal": "contrast",
                "notes": [
                    "Musicians around the world have often used protest songs to raise awareness about human rights violations.",
                    "US folk singer Aunt Molly Jackson released the protest song \"Poor Miner's Farewell\" in 1932.",
                    "\"Poor Miner's Farewell\" exposed the unlivable wages and dangerous working conditions coal miners faced in Kentucky during the 1920s and 1930s.",
                    "South African singer-songwriter Hugh Masekela released the protest song \"Bring Him Back Home\" in 1987.",
                    "\"Bring Him Back Home\" called on the South African government to free Nelson Mandela, an anti-apartheid leader who had been unjustly imprisoned.",
                    "Both songs are examples of music used to address human rights issues.",
                ],
            },
        ),
        ("Rhetorical Synthesis", "present_conclusion"): AmbiguityFirstItem(
            generation_pattern=pattern,
            ambiguous_passage=(
                "While researching a topic, a student has taken the following notes:\nNotes:\n"
                "- Tibetan mastiffs are often large dogs native to the Himalayas.\n"
                "- A mutation in their EPAS1 gene prevents excess hemoglobin production.\n"
                "- A mutation in their HBB gene boosts hemoglobin's oxygen-carrying ability.\n"
                "- These mutations enable the dogs to withstand hypoxic (low-oxygen) conditions at high altitudes.\n"
                "- In a 2016 study, Zhen Wang and colleagues noted that Tibetan wolves' DNA has the same EPAS1 and HBB mutations.\n"
                "- Wang and colleagues determined that the dogs first acquired these mutations by interbreeding with Tibetan wolves around 24,000 years ago."
            ),
            constraint_sentence="However, the student's goal is to present the conclusion of Zhen Wang and colleagues' 2016 study about the relationship between Tibetan mastiffs and Tibetan wolves.",
            prompt="Which choice best uses relevant information from the notes to accomplish the student's goal?",
            answer_options=(
                "Like Tibetan mastiffs, Tibetan wolves can withstand hypoxic conditions at high altitudes.",
                "Both Tibetan mastiffs and Tibetan wolves have mutations in their EPAS1 and HBB genes, which help them withstand low-oxygen conditions.",
                "The researchers concluded that genetic exchange with Tibetan wolves supplied Tibetan mastiffs with high-altitude adaptations.",
                "Tibetan mastiffs are large Himalayan dogs with genetic adaptations that help regulate hemoglobin in low-oxygen environments.",
            ),
            correct_index=2,
            topic="Rhetorical Synthesis",
            subtopic="Pattern: present_conclusion",
            question_type="Rhetorical Synthesis",
            trap_type="rhetorical task filtering trap",
            explanation="Hard synthesis task=present_conclusion; the correct answer states the study's conclusion, not just background about the dogs, wolves, or the mutations' effects.",
            constraints_required=3,
            data_payload={
                "type": "notes",
                "task_goal": "summarize",
                "notes": [
                    "Tibetan mastiffs are often large dogs native to the Himalayas.",
                    "A mutation in their EPAS1 gene prevents excess hemoglobin production.",
                    "A mutation in their HBB gene boosts hemoglobin's oxygen-carrying ability.",
                    "These mutations enable the dogs to withstand hypoxic conditions at high altitudes.",
                    "In a 2016 study, Zhen Wang and colleagues noted that Tibetan wolves' DNA has the same EPAS1 and HBB mutations.",
                    "Wang and colleagues determined that the dogs first acquired these mutations by interbreeding with Tibetan wolves around 24,000 years ago.",
                ],
            },
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
                "graph_pattern": "crossover_point",
                "question_intent": "claim_support",
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
                "At first, advertising researchers defined ad recall as how well people remember a campaign after encountering it online. They hypothesized that interactions requiring more cognitive effort, such as commenting on or sharing a post, would often produce higher recall than quick interactions such as clicking a link or a like button."
            ),
            constraint_sentence="However, the strongest evidence must compare levels of engagement while keeping the focus on recall rather than purchase intention or popularity.",
            prompt="Which finding, if true, would most directly support the researchers' hypothesis?",
            answer_options=("Users who shared or commented on an ad were more likely to remember it later than users who only clicked an embedded link or like button.", "Users who clicked a like button on an ad were more likely to purchase the product than users who merely viewed the ad.", "Ads that received many comments were sometimes rated as more entertaining than ads that received fewer comments.", "Users who remembered an ad were often unable to identify whether they had clicked, shared, or commented on it."),
            correct_index=0,
            topic="Command of Evidence",
            subtopic="Pattern: textual_claim_strength",
            question_type="Command of Evidence",
            trap_type="claim strength trap",
            explanation="Hard evidence type=textual; the answer must match the cognitive-engagement comparison and the recall outcome rather than a related popularity or purchase measure.",
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
    payload = dict(data_payload or {})
    signature_seed = QuestionSpec(
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
        graph_reasoning_type=payload.get("graph_pattern") if data_type == "graph" else None,
        graph_required=data_type == "graph",
        data_type=data_type,
        data_payload=payload,
    )
    signature = build_question_signature(signature_seed)
    payload["question_signature"] = signature
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
        graph_reasoning_type=payload.get("graph_pattern") if data_type == "graph" else None,
        graph_required=data_type == "graph",
        data_type=data_type,
        data_payload=payload,
        question_signature=signature,
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
    trap_calibration = {
        "CORRECT": "correct",
        "TOO BROAD": "scope_error",
        "TOO NARROW": "near_correct,partial_support",
        "CONTEXT MISMATCH": "logic_flip",
    }[pattern]
    plausibility = {
        "CORRECT": "correct",
        "TOO BROAD": "high",
        "TOO NARROW": "high",
        "CONTEXT MISMATCH": "high",
    }[pattern]
    competition = "top" if pattern in {"CORRECT", "TOO NARROW", "CONTEXT MISMATCH"} else "first_pass"
    return choice(
        label,
        text,
        role,
        (
            f"{explanations[pattern]} taxonomy={taxonomy}; plausibility={plausibility}; "
            f"competition={competition}; trap_calibration={trap_calibration}; "
            f"why_wrong={internal_distractor_explanation(pattern)}"
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
    if item.question_type == "Rhetorical Synthesis" and "Notes:" in item.ambiguous_passage:
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
        "addition",
        "cause_effect",
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
    if not re.search(r"\b(data|graph|table|study|report|evidence|records?|fragment|review|claim)\b", text):
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
    payload = spec.data_payload or {}
    if payload.get("type") != "notes":
        raise ValueError("notes_task_selection must expose data_payload.type='notes'.")
    if payload.get("task_goal") not in {"contrast", "summarize", "support"}:
        raise ValueError("notes_task_selection task_goal must be contrast, summarize, or support.")
    notes = payload.get("notes")
    if not isinstance(notes, list) or not 4 <= len(notes) <= 6 or not all(isinstance(note, str) and note.strip() for note in notes):
        raise ValueError("notes_task_selection data_payload.notes must contain 4-6 bullet strings.")
    entities = payload.get("entities")
    if not isinstance(entities, list) or len([entity for entity in entities if isinstance(entity, str) and entity.strip()]) < 2:
        raise ValueError("notes_task_selection must include at least two entities.")
    if payload.get("distractor_types") != ["true_but_wrong_task", "single_fact_only", "irrelevant_detail_focus"]:
        raise ValueError("notes_task_selection must classify each wrong answer by the required distractor rule.")
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
    graph_pattern = payload.get("graph_pattern")
    if graph_pattern not in GRAPH_REASONING_PATTERNS:
        raise ValueError(f"Graph question needs graph_pattern in {sorted(GRAPH_REASONING_PATTERNS)}, got {graph_pattern!r}.")
    question_intent = payload.get("question_intent")
    if question_intent not in GRAPH_QUESTION_INTENTS:
        raise ValueError(f"Graph question needs question_intent in {sorted(GRAPH_QUESTION_INTENTS)}, got {question_intent!r}.")
    if spec.graph_reasoning_type != graph_pattern:
        raise ValueError("Graph question must persist graph_pattern as graph_reasoning_type.")
    if payload.get("reasoning_pattern") and payload.get("reasoning_pattern") != graph_pattern:
        raise ValueError("Graph reasoning_pattern must match graph_pattern when both are present.")
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
    if graph_is_text_solvable(spec):
        raise ValueError("Graph question is answerable without interpreting graph data.")


def validate_quantitative_graph_answer_design(spec: QuestionSpec) -> None:
    if spec.module == 2 and MODULE2_MODE == "hard":
        validate_hard_quantitative_graph_answer_design(spec)
        return
    payload = spec.data_payload or {}
    if payload.get("prompt_template") == "describes_the_relationship":
        correct_choices = [choice for choice in spec.choices if choice.role == ChoiceTrapRole.correct]
        if len(correct_choices) != 1:
            raise ValueError("Graph question must have one correct answer.")
        correct_text = correct_choices[0].text.lower()
        if not re.search(r"\b(farther apart|relationship|rises|improving|sharply|gap)\b", correct_text):
            raise ValueError("Trend-description graph answer must describe the graph relationship.")
        if len([choice for choice in spec.choices if choice.role != ChoiceTrapRole.correct and re.search(r"\b(true local detail|study context|constant|relationship)\b", choice.text.lower())]) < 2:
            raise ValueError("Trend-description graph distractors must include local, context, and overgeneralization traps.")
        return
    combined_wrong = " ".join(choice.text.lower() for choice in spec.choices if choice.role != ChoiceTrapRole.correct)
    required_distractor_logic = (
        r"watering rather than|focuses on watering|full trend|rather than the full trend",
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


def validate_hard_quantitative_graph_answer_design(spec: QuestionSpec) -> None:
    payload = spec.data_payload or {}
    correct_choices = [choice for choice in spec.choices if choice.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        raise ValueError("Hard graph question must have one correct answer.")
    correct_text = correct_choices[0].text.lower()
    if not re.search(r"\b(but|while|except|only|after|below|above|threshold|plateau)\b", correct_text):
        raise ValueError("Hard graph correct answer must include a condition or constraint.")
    observation_markers = ("below", "after", "plateau", "middle", "range", "overtakes", "changes little", "highest", "first", "final")
    if sum(1 for marker in observation_markers if marker in correct_text) < 2:
        raise ValueError("Hard graph correct answer must combine at least two graph observations.")
    combined_wrong = " ".join(choice.text.lower() for choice in spec.choices if choice.role != ChoiceTrapRole.correct)
    required_traps = (
        r"true local detail|local detail",
        r"matches the early expectation|early expectation",
        r"best panel at every|every noise level|every level",
    )
    if not all(re.search(marker, combined_wrong) for marker in required_traps):
        raise ValueError("Hard graph distractors must include local, text-match, and overgeneralization traps.")
    distractor_types = set(payload.get("distractor_types") or [])
    required_types = {
        "globally_true_but_irrelevant",
        "locally_true_but_incomplete",
        "matches_text_not_graph",
        "overgeneralizes_trend",
    }
    if not required_types.issubset(distractor_types):
        raise ValueError("Hard graph payload must declare all required trap distractor types.")
    if len(simulate_first_pass_elimination(spec)) < 3:
        raise ValueError("Hard graph must leave trap distractors alive after first-pass elimination.")


def graph_is_text_solvable(spec: QuestionSpec) -> bool:
    text_without_graph = (spec.passage or "").lower()
    correct_choices = [choice for choice in spec.choices if choice.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        return True
    correct_text = correct_choices[0].text.lower()
    graph_pattern = (spec.data_payload or {}).get("graph_pattern")
    graph_only_terms_by_pattern = {
        "crossover_point": ("crossover", "overtakes", "higher at low", "higher at three", "three watering", "series", "advantage shifts"),
        "threshold_shift": ("threshold", "after", "before", "exceeds", "falls below"),
        "divergence": ("diverge", "gap", "farther apart", "closer together", "converge"),
        "threshold_reversal": ("threshold", "plateau", "overtakes", "below", "higher-noise", "changes little"),
        "partial_support_region": ("only after", "below that range", "generally superior", "limited range"),
        "conflicting_variable_dominance": ("limited", "lower-noise", "preferable", "comparatively flat"),
        "lag_effect": ("lag", "delayed", "one interval later"),
        "diminishing_returns": ("plateau", "late increase", "outside the middle", "full range"),
        "vertical_shift": ("vertical shift", "horizontal shift", "f(x) +", "f(x +", "outputs"),
    }
    graph_only_terms = graph_only_terms_by_pattern.get(graph_pattern, ())
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
    validate_hard_trap_calibration(spec)
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
        hard_graph_patterns = {
            "threshold_reversal",
            "partial_support_region",
            "conflicting_variable_dominance",
            "lag_effect",
            "diminishing_returns",
        }
        if payload.get("graph_pattern") not in hard_graph_patterns:
            raise ValueError("Module 2 hard graph must use a hard-mode graph pattern.")
        if len(payload.get("series") or []) <= 2:
            raise ValueError("Module 2 hard graph cannot use only two lines.")
        if graph_series_are_simple_monotonic(payload):
            raise ValueError("Module 2 hard graph cannot rely on simple linear monotonic trends.")
        complexity_features = set(payload.get("complexity_features") or [])
        required_complexity = {
            "crossover + divergence",
            "plateau / non-linear behavior",
            "threshold-dependent change",
            "conflicting trends across variables",
            "partial support only",
        }
        if len(complexity_features & required_complexity) < 2:
            raise ValueError("Module 2 hard graph must include at least two hard graph complexity features.")
        text = f"{spec.passage or ''} {spec.prompt}".lower()
        forbidden_text_reveals = ("crossover", "overtakes", "trend direction", "threshold-dependent", "higher than", "lower than")
        if any(phrase in text for phrase in forbidden_text_reveals):
            raise ValueError("Module 2 hard graph text reveals the key graph relationship.")
        if not re.search(r"\b(first expected|early|initial|misleading)\b", text):
            raise ValueError("Module 2 hard graph text must include a misleading early interpretation.")
        if not re.search(r"\b(competing hypothesis|hypothesis|alternative)\b", text):
            raise ValueError("Module 2 hard graph text must include a competing hypothesis.")
        if not re.search(r"\b(only when|except|unless)\b", text):
            raise ValueError("Module 2 hard graph text must include conditional language.")
        if graph_answer_found_from_single_point(spec):
            raise ValueError("Module 2 hard graph cannot be answerable from a single point.")


def graph_series_are_simple_monotonic(payload: dict) -> bool:
    simple_count = 0
    for series in payload.get("series") or []:
        values = [point[1] for point in series.get("values", []) if isinstance(point, (list, tuple)) and len(point) == 2]
        if len(values) < 3:
            return True
        deltas = [values[index + 1] - values[index] for index in range(len(values) - 1)]
        nondecreasing = all(delta >= 0 for delta in deltas)
        nonincreasing = all(delta <= 0 for delta in deltas)
        constant_delta = len(set(deltas)) == 1
        has_plateau = any(delta == 0 for delta in deltas)
        if (nondecreasing or nonincreasing) and constant_delta and not has_plateau:
            simple_count += 1
    return simple_count == len(payload.get("series") or [])


def graph_answer_found_from_single_point(spec: QuestionSpec) -> bool:
    correct_choices = [choice for choice in spec.choices if choice.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        return True
    correct_text = correct_choices[0].text.lower()
    comparison_markers = ("but", "whereas", "while", "both", "each", "only", "after", "below", "plateau", "crossover", "shifts")
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


def validate_hard_trap_calibration(spec: QuestionSpec) -> None:
    correct_choices = [choice_spec for choice_spec in spec.choices if choice_spec.role == ChoiceTrapRole.correct]
    if len(correct_choices) != 1:
        raise ValueError(f"Hard {spec.question_type} must have exactly one correct answer before trap calibration.")
    distractors = [choice_spec for choice_spec in spec.choices if choice_spec.role != ChoiceTrapRole.correct]
    if len(distractors) != 3:
        raise ValueError(f"Hard {spec.question_type} must preserve SAT four-choice format with three distractors.")

    calibration_types = set().union(*(extract_trap_calibration_types(choice_spec) for choice_spec in distractors))
    if not HARD_TRAP_CALIBRATION_TYPES.issubset(calibration_types):
        raise ValueError(f"Hard {spec.question_type} missing trap calibration types: {HARD_TRAP_CALIBRATION_TYPES - calibration_types}.")

    correct_text = correct_choices[0].text
    topic_vocabulary = set(content_tokens(f"{spec.passage or ''} {spec.prompt} {spec.topic} {spec.subtopic}"))
    for choice_spec in distractors:
        basis = choice_spec.basis or ""
        if not choice_spec.text.strip() or (spec.question_type != "Standard English Conventions" and not re.search(r"[a-zA-Z]", choice_spec.text)):
            raise ValueError(f"Hard {spec.question_type} distractor is not grammatically usable text.")
        if "plausibility=high" not in basis:
            raise ValueError(f"Hard {spec.question_type} distractor is too weak: {choice_spec.text}")
        if spec.question_type not in {"Standard English Conventions", "Transitions"} and not choice_matches_topic_vocabulary(choice_spec.text, topic_vocabulary):
            raise ValueError(f"Hard {spec.question_type} distractor has mismatched topic vocabulary: {choice_spec.text}")
        if (
            spec.question_type
            not in {"Standard English Conventions", "Transitions", "Rhetorical Synthesis", "Main Idea"}
            and not aligns_with_correct_reasoning(choice_spec.text, correct_text)
        ):
            raise ValueError(f"Hard {spec.question_type} distractor does not align with enough correct reasoning: {choice_spec.text}")
        if distractor_fails_multiple_constraints(basis):
            raise ValueError(f"Hard {spec.question_type} distractor fails more than one logical constraint: {choice_spec.text}")

    survivors = simulate_strong_student_elimination(spec)
    eliminated_count = len(spec.choices) - len(survivors)
    if eliminated_count > 1:
        raise ValueError(f"Hard {spec.question_type} removes too many choices in the strong-student first pass.")
    if len(survivors) < 3:
        raise ValueError(f"Hard {spec.question_type} must leave three plausible choices after first-pass elimination.")
    competitive = [choice_spec for choice_spec in survivors if "competition=top" in (choice_spec.basis or "") or choice_spec.role == ChoiceTrapRole.correct]
    if len(competitive) < 2:
        raise ValueError(f"Hard {spec.question_type} lacks decision pressure between competitive answers.")


def extract_trap_calibration_types(choice_spec: ChoiceSpec) -> set[str]:
    basis = choice_spec.basis or ""
    match = re.search(r"trap_calibration=([^;]+)", basis)
    if not match:
        return set()
    return {item.strip() for item in match.group(1).split(",") if item.strip()}


def choice_matches_topic_vocabulary(answer_text: str, topic_vocabulary: set[str]) -> bool:
    answer_tokens = set(content_tokens(answer_text))
    if not answer_tokens:
        return False
    if len(answer_tokens & topic_vocabulary) >= 1:
        return True
    if len(answer_tokens) <= 3:
        return True
    return False


def aligns_with_correct_reasoning(distractor_text: str, correct_text: str) -> bool:
    correct_tokens = set(content_tokens(correct_text))
    distractor_tokens = set(content_tokens(distractor_text))
    if not correct_tokens:
        return True
    overlap = len(correct_tokens & distractor_tokens) / len(correct_tokens)
    return overlap >= 0.25 or len(correct_tokens & distractor_tokens) >= 2


def distractor_fails_multiple_constraints(basis: str) -> bool:
    why_wrong = re.search(r"why_wrong=([^;]+)", basis)
    if not why_wrong:
        return True
    text = why_wrong.group(1).lower()
    return text.count(" and ") > 1 or text.count(",") > 1


def simulate_strong_student_elimination(spec: QuestionSpec) -> list[ChoiceSpec]:
    survivors = []
    for choice_spec in spec.choices:
        basis = choice_spec.basis or ""
        if choice_spec.role == ChoiceTrapRole.correct or "plausibility=high" in basis:
            survivors.append(choice_spec)
    return survivors


def validate_hard_trap_diversity(module_questions: list[QuestionSpec]) -> None:
    primary_trap_counts: Counter[str] = Counter()
    for question in module_questions:
        if question.difficulty < 8:
            continue
        primary = primary_hard_trap_type(question)
        primary_trap_counts[primary] += 1
    repeated = {trap_type: count for trap_type, count in primary_trap_counts.items() if count > 2}
    if repeated:
        raise ValueError(f"Hard module repeats the same primary trap type too often: {repeated}.")


def primary_hard_trap_type(question: QuestionSpec) -> str:
    pattern = extract_metadata_value(question.explanation, "pattern") or question.question_type
    if question.data_type == "graph":
        return f"graph:{(question.data_payload or {}).get('reasoning_type')}"
    if pattern == "notes_task_selection":
        return f"notes:{(question.data_payload or {}).get('task_goal')}"
    return f"{question.question_type}:{pattern}"


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


def validate_math_module(module_questions: list[QuestionSpec], module: int) -> None:
    expected_blueprint = MODULE1_MATH_BLUEPRINT if module == 1 else MODULE2_HARD_MATH_BLUEPRINT
    if len(module_questions) != len(expected_blueprint):
        raise ValueError(f"Math module {module} must contain {len(expected_blueprint)} slots.")
    seen_signatures: set[tuple] = set()
    graph_structures: set[tuple] = set()
    graph_reasoning: set[str] = set()
    categories = {question.question_type for question in module_questions}
    student_response_count = sum(1 for question in module_questions if question.format == QuestionFormat.grid_in)
    if student_response_count != 2:
        raise ValueError(f"Math module {module} must include exactly two student-response questions, got {student_response_count}.")
    if not 8 <= len(categories) <= 10:
        raise ValueError(f"Math module {module} must use 8-10 unique patterns, got {len(categories)}: {sorted(categories)}.")
    category_counts = Counter(question.question_type for question in module_questions)
    invalid_counts = {category: count for category, count in category_counts.items() if count < 1 or count > 3}
    if invalid_counts:
        raise ValueError(f"Math module {module} pattern counts must stay between 1 and 3: {invalid_counts}.")
    repeated_categories = {category for category, count in category_counts.items() if count >= 2}
    if len(repeated_categories) < 3:
        raise ValueError(f"Math module {module} needs at least three repeated patterns for depth.")
    subtype_counts: Counter[str] = Counter()
    trap_window: list[str] = []
    previous_subtype = ""
    for question, slot in zip(module_questions, expected_blueprint, strict=True):
        validate_math_question_against_slot(question, slot, module)
        if slot.reasoning_type == previous_subtype:
            raise ValueError(f"Math module {module} repeats subtype consecutively: {slot.reasoning_type}.")
        previous_subtype = slot.reasoning_type
        pattern = (question.data_payload or {}).get("pattern") or {}
        primary_trap = str(pattern.get("trap") or "")
        subtype_counts[slot.reasoning_type] += 1
        trap_window.append(primary_trap)
        if len(trap_window) > 7:
            trap_window.pop(0)
        if primary_trap and trap_window.count(primary_trap) > 2:
            raise ValueError(f"Math module {module} repeats trap {primary_trap} too often in a short span.")
        signature = math_question_signature(question)
        if signature in seen_signatures:
            raise ValueError(f"Duplicate math question signature: {signature}.")
        seen_signatures.add(signature)
        if question.data_type == "graph":
            payload = question.data_payload or {}
            graph_structure = graph_structure_signature(payload)
            if graph_structure in graph_structures:
                raise ValueError(f"Repeated math graph structure: {graph_structure}.")
            graph_structures.add(graph_structure)
            reasoning_type = str(payload.get("reasoning_type") or slot.reasoning_type)
            if module == 2 and reasoning_type in graph_reasoning:
                raise ValueError(f"Repeated Module 2 math graph reasoning type: {reasoning_type}.")
            graph_reasoning.add(reasoning_type)
    if len(seen_signatures) != len(module_questions):
        raise ValueError("Math module signature validation failed.")
    repeated_subtypes = {subtype: count for subtype, count in subtype_counts.items() if count > 2}
    if repeated_subtypes:
        raise ValueError(f"Math module repeats subtypes too often: {repeated_subtypes}.")


def validate_math_question_against_slot(question: QuestionSpec, slot: MathModuleSlot, module: int) -> None:
    if question.question_type != slot.question_type:
        raise ValueError(f"Math slot {slot.slot_key} expected {slot.question_type}, got {question.question_type}.")
    payload = question.data_payload or {}
    if payload.get("reasoning_type") != slot.reasoning_type:
        raise ValueError(f"Math slot {slot.slot_key} expected reasoning {slot.reasoning_type}.")
    pattern = payload.get("pattern")
    if not isinstance(pattern, dict):
        raise ValueError(f"Math slot {slot.slot_key} missing SAT pattern registry payload.")
    for key in ("type", "subtype", "trap", "difficulty"):
        if key not in pattern:
            raise ValueError(f"Math pattern for {slot.slot_key} missing {key}.")
    if pattern["type"] != slot.question_type or pattern["subtype"] != slot.reasoning_type or pattern["difficulty"] != slot.difficulty:
        raise ValueError(f"Math pattern payload does not match slot {slot.slot_key}.")
    if pattern["trap"] not in MATH_TRAPS:
        raise ValueError(f"Math slot {slot.slot_key} uses unknown trap {pattern['trap']}.")
    if question.difficulty != slot.difficulty:
        raise ValueError(f"Math slot {slot.slot_key} expected difficulty {slot.difficulty}, got {question.difficulty}.")
    if slot.reasoning_type in {"direct_substitution", "one_step_isolation"}:
        raise ValueError(f"Math slot {slot.slot_key} is too simple for SAT pattern generation.")
    if int(payload.get("constraints_required") or question.constraints_required) < 1:
        raise ValueError(f"Math slot {slot.slot_key} must require at least one reasoning step beyond calculation.")
    if question.format == QuestionFormat.grid_in:
        validate_math_student_response(question, slot)
    if module == 2 and MODULE2_MODE == "hard":
        validate_hard_math_question(question)


def validate_hard_math_question(question: QuestionSpec) -> None:
    if question.difficulty < 8 or question.difficulty > 10:
        raise ValueError("Module 2 hard math must use difficulty 8-10.")
    constraints_required = int((question.data_payload or {}).get("constraints_required") or question.constraints_required)
    if constraints_required < 2:
        raise ValueError(f"Hard math question needs at least two constraints: {question.prompt}")
    validate_hard_math_misdirection(question)
    if question.data_type != "graph" and not re.search(r"\b(if|when|after|only|given|for which|for x|under|at least|greater than|less than|positive|exact|rather than|corresponds|which statement|not equal)\b", question.prompt.lower()):
        raise ValueError(f"Hard math question lacks a hidden condition: {question.prompt}")
    if question.format == QuestionFormat.grid_in:
        return
    distractors = [choice_spec for choice_spec in question.choices if choice_spec.role != ChoiceTrapRole.correct]
    if len(distractors) != 3:
        raise ValueError("Hard math multiple-choice questions need three distractors.")
    trap_types = set().union(*(extract_math_trap_types(choice_spec) for choice_spec in distractors))
    if not MATH_HARD_TRAPS.issubset(trap_types):
        raise ValueError(f"Hard math question missing trap types: {MATH_HARD_TRAPS - trap_types}.")
    survivors = simulate_math_first_pass_elimination(question)
    if len(survivors) < 3:
        raise ValueError("Hard math question must retain three plausible survivors.")
    if not any(choice_spec.role != ChoiceTrapRole.correct and "competition=top" in (choice_spec.basis or "") for choice_spec in survivors):
        raise ValueError("Hard math question needs at least one surviving trap answer.")
    if question.data_type == "graph":
        payload = question.data_payload or {}
        if not payload.get("graph_pattern") or not payload.get("question_intent"):
            raise ValueError("Hard math graph needs graph_pattern and question_intent.")


def validate_hard_math_misdirection(question: QuestionSpec) -> None:
    payload = question.data_payload or {}
    misdirection = payload.get("misdirection")
    if misdirection not in MATH_MISDIRECTION_TYPES:
        raise ValueError(f"Hard math question needs one declared misdirection element: {question.prompt}")
    text = f"{question.prompt} {question.explanation}".lower()
    markers = {
        "irrelevant_number": r"\b(extra|not needed|irrelevant|unused|also mentions)\b",
        "misleading_phrasing": r"\b(how much greater|not the value|not x|rather than|instead of|compared with|corresponds|in that order)\b",
        "alternate_interpretation": r"\b(could be read|interpret|positive|domain|model|inverse|two possible|confusing|restriction|repeated|distinct)\b",
        "extra_variable": r"\b[a-z]\s*[+=-]|extra variable|another variable|where [a-z]\b",
        "hidden_condition": r"\b(if|when|given|only|under|provided|condition)\b",
    }
    if not re.search(markers[misdirection], text):
        raise ValueError(f"Hard math misdirection {misdirection} is declared but not present.")
    if equation_directly_visible(question):
        raise ValueError(f"Hard math equation is too directly visible: {question.prompt}")
    if variable_mapping_obvious(question):
        raise ValueError(f"Hard math variable mapping is too obvious: {question.prompt}")
    if question.format == QuestionFormat.grid_in:
        validate_grid_in_misdirection_upgrade(question)


def equation_directly_visible(question: QuestionSpec) -> bool:
    prompt = question.prompt.lower()
    if question.data_type == "graph":
        return False
    equation_count = len(re.findall(r"[a-z]\s*[-+*/]?\s*\d*\s*=", prompt))
    has_context = bool(re.search(r"\b(value|number|tank|pump|population|angle|tiles|function|solution|period|rate|minutes|liters|triangle|side|circle|radius|center)\b", prompt))
    return equation_count >= 1 and not has_context


def variable_mapping_obvious(question: QuestionSpec) -> bool:
    prompt = question.prompt.lower()
    if question.data_type == "graph":
        return False
    return bool(re.fullmatch(r"if [^?]+ what is (?:the value of )?[a-z]\\?", prompt.strip()))


def validate_grid_in_misdirection_upgrade(question: QuestionSpec) -> None:
    text = f"{question.prompt} {question.explanation} {question.trap_type}".lower()
    if not re.search(r"\b(round|nearest|fraction|decimal|exact|convert|minutes|multi-step)\b", text):
        raise ValueError("Hard grid-in must include rounding, fraction/decimal, or multi-step setup.")


def math_question_signature(question: QuestionSpec) -> tuple[str, str, str, str]:
    payload = question.data_payload or {}
    return (
        question.question_type,
        str(payload.get("reasoning_type") or "direct"),
        question.trap_type,
        question.structure_key,
    )


def validate_math_student_response(question: QuestionSpec, slot: MathModuleSlot) -> None:
    if slot.slot_key not in MATH_STUDENT_RESPONSE_SLOT_KEYS:
        raise ValueError(f"Unexpected student-response math slot: {slot.slot_key}.")
    if question.choices:
        raise ValueError("Student-response math questions must not include choices.")
    text = f"{question.prompt} {question.explanation} {question.trap_type}".lower()
    if not re.search(r"\b(round|nearest|fraction|decimal|exact)\b", text):
        raise ValueError("Student-response math questions must include rounding, fraction, decimal, or exact-value traps.")


def extract_math_trap_types(choice_spec: ChoiceSpec) -> set[str]:
    match = re.search(r"math_traps=([^;]+)", choice_spec.basis or "")
    if not match:
        return set()
    return {item.strip() for item in match.group(1).split(",") if item.strip()}


def simulate_math_first_pass_elimination(question: QuestionSpec) -> list[ChoiceSpec]:
    return [
        choice_spec
        for choice_spec in question.choices
        if choice_spec.role == ChoiceTrapRole.correct or "plausibility=high" in (choice_spec.basis or "")
    ]


def math_question(module: int, index: int) -> QuestionSpec:
    slot = math_slot_for(module, index)
    generators = {
        "linear_equation": math_linear,
        "system_equation": math_system,
        "function_interpretation": math_function,
        "graph_reasoning": math_graph,
        "percent_ratio": math_percent_ratio,
        "probability": math_probability,
        "geometry": math_geometry,
        "quadratic_modeling": math_quadratic,
        "exponential_growth": math_exponential,
        "word_problem": math_word_problem,
        "rational_equation_trap": math_rational_equation,
        "expression_rewrite": math_expression_rewrite,
        "graph_transformation": math_graph_transformation,
        "parameter_interpretation": math_parameter_interpretation,
        "ratio_scaling": math_ratio_scaling,
        "absolute_value_equation": math_absolute_value,
        "geometry_correspondence": math_geometry_correspondence,
        "polynomial_roots_gridin": math_polynomial_roots_gridin,
        "circle_equation": math_circle_equation,
    }
    return generators[slot.question_type](module, index)


def math_base(
    module: int,
    index: int,
    *,
    topic: str,
    subtopic: str,
    question_type: str,
    prompt: str,
    correct: str,
    explanation: str,
    trap_type: str,
    fmt: QuestionFormat,
    choices: tuple[ChoiceSpec, ...] = (),
    graph_path: str | None = None,
    graph_payload: dict | None = None,
) -> QuestionSpec:
    slot = math_slot_for(module, index)
    difficulty = math_difficulty_for(module, index)
    has_graph = bool(graph_payload)
    graph_data = dict(graph_payload or {})
    graph_data.setdefault("reasoning_type", slot.reasoning_type)
    graph_data.setdefault("constraints_required", 2 if module == 2 else 1)
    graph_data.setdefault("math_type", slot.question_type)
    graph_data.setdefault("pattern", MATH_PATTERN_REGISTRY[slot.slot_key])
    if module == 2:
        graph_data.setdefault("misdirection", MATH_MISDIRECTION_BY_TYPE[slot.question_type])
    signature_seed = QuestionSpec(
        section=SATSection.math,
        module=module,
        order_index=index,
        difficulty=difficulty,
        adaptive_level=adaptive_level(module, index),
        source=source_for(index),
        topic=topic,
        subtopic=subtopic,
        structure_key=f"math-{slot.question_type}-{slot.reasoning_type}-{index % 5}",
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
        graph_reasoning_type=graph_data.get("graph_pattern") if has_graph else None,
        graph_required=has_graph,
        data_type="graph" if has_graph else "none",
        data_payload=graph_data,
    )
    signature = build_question_signature(signature_seed)
    graph_data["question_signature"] = signature
    explanation = f"{explanation} reasoning_type={slot.reasoning_type}; constraints_required={graph_data['constraints_required']};"
    return QuestionSpec(
        section=SATSection.math,
        module=module,
        order_index=index,
        difficulty=difficulty,
        adaptive_level=adaptive_level(module, index),
        source=source_for(index),
        topic=topic,
        subtopic=subtopic,
        structure_key=f"math-{slot.question_type}-{slot.reasoning_type}-{index % 5}",
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
        graph_reasoning_type=graph_data.get("graph_pattern") if has_graph else None,
        graph_required=has_graph,
        data_type="graph" if has_graph else "none",
        data_payload=graph_data,
        question_signature=signature,
    )


def math_linear(module: int, index: int) -> QuestionSpec:
    a = 2 + index % 5
    b = 7 + index % 4
    x = 4 + index % 4
    result = a * x + b
    condition = " and x is greater than 0; the worksheet also lists 12 as an unused check value" if module == 2 else ""
    prompt = f"If {a}x + {b} = {result}{condition}, what is the value of x?"
    return math_base(
        module,
        index,
        topic="Algebra",
        subtopic="Linear equations",
        question_type="linear_equation",
        prompt=prompt,
        correct="C",
        explanation=f"Subtract {b} from both sides to get {a}x = {a * x}, so x = {x}; the extra check value is irrelevant and not needed.",
        trap_type="inverse operation error",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(-x), str(x + 1), str(x), str(result), correct="C"),
    )


def math_system(module: int, index: int) -> QuestionSpec:
    x, y = 3 + index % 4, 2 + index % 3
    s = x + y
    d = x - y
    prompt = f"If x + y = {s} and x - y = {d}, and z = {x + y + 4} is recorded but not used, what is the value of x under these two conditions?"
    return math_base(
        module,
        index,
        topic="Algebra",
        subtopic="Systems of equations",
        question_type="system_equation",
        prompt=prompt,
        correct="B",
        explanation=f"Adding the equations gives 2x = {s + d}, so x = {x}; z is an extra variable and is not part of the required system.",
        trap_type="variable_confusion",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(y), str(x), str(s), str(d), correct="B"),
    )


def math_quadratic(module: int, index: int) -> QuestionSpec:
    slot = math_slot_for(module, index)
    root = 3 + index % 4
    prompt = f"The equation (x - {root})(x + 2) = 0 has one positive solution, though the negative solution could be read as another answer. Given that condition, what is that solution?"
    if slot.slot_key in MATH_STUDENT_RESPONSE_SLOT_KEYS:
        prompt = f"The equation (x - {root})(x + 2) = 0 has one positive solution, though the negative solution could be read as another answer. Give the exact numeric value of that solution as an integer."
        return math_base(
            module,
            index,
            topic="Advanced Math",
            subtopic="Quadratics",
            question_type="quadratic_modeling",
            prompt=prompt,
            correct=str(root),
            explanation=f"The negative solution is an extraneous choice under the positive-solution condition; the exact integer answer is {root}. This alternate interpretation is the trap.",
            trap_type="exact fraction or extraneous solution trap",
            fmt=QuestionFormat.grid_in,
        )
    return math_base(
        module,
        index,
        topic="Advanced Math",
        subtopic="Quadratics",
        question_type="quadratic_modeling",
        prompt=prompt,
        correct="B",
        explanation=f"By the zero product property, x - {root} = 0 gives the positive solution x = {root}; the alternate interpretation using the negative root is rejected.",
        trap_type="sign error",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(-2), str(root), str(-root), str(root + 2), correct="B"),
    )


def math_function(module: int, index: int) -> QuestionSpec:
    m = 2 + index % 3
    c = 5 + index % 4
    x_high = 4
    x_low = 2
    answer = str(m * (x_high - x_low))
    correct = "C"
    return math_base(
        module,
        index,
        topic="Functions",
        subtopic="Function notation",
        question_type="function_interpretation",
        prompt=f"For the function f(x) = {m}x + {c}, how much greater is f({x_high}) than f({x_low}) when both input values are used, rather than finding a single output?",
        correct=correct,
        explanation=f"The misleading phrasing asks for how much greater one output is compared with another, not the value of one output; f({x_high}) - f({x_low}) = {m}({x_high - x_low}) = {answer}.",
        trap_type="substitution error",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(m + c), str(m * c), answer, str(m * x_high + c), correct=correct),
    )


def math_geometry(module: int, index: int) -> QuestionSpec:
    angle = 35 + (index % 5) * 5
    answer = 180 - angle
    return math_base(
        module,
        index,
        topic="Geometry and Trigonometry",
        subtopic="Angles",
        question_type="geometry",
        prompt=f"Two angles form a straight line. One angle measures {angle} degrees, and a nearby triangle label of 60 degrees is extra information. Given that the angles are supplementary, what is the measure, in degrees, of the other angle?",
        correct="D",
        explanation=f"Angles on a straight line sum to 180 degrees, so the other angle is 180 - {angle} = {answer}; the 60-degree label is irrelevant.",
        trap_type="angle sum confusion",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(angle), str(90 - angle), str(answer - 10), str(answer), correct="D"),
    )


def math_percent_ratio(module: int, index: int) -> QuestionSpec:
    base = 80 + (index % 5) * 10
    pct = 15 + (index % 3) * 5
    answer = base * pct // 100
    prompt = f"A value of {answer} is {pct}% of a number. A second note says {pct + 10}% was used in another class, but that is not needed. Given this percent-base condition, what is the number?"
    return math_base(
        module,
        index,
        topic="Problem-Solving and Data Analysis",
        subtopic="Percent and ratios",
        question_type="percent_ratio",
        prompt=prompt,
        correct="D",
        explanation=f"If {answer} is {pct}% of n, then 0.{pct:02d}n = {answer}, so n = {base}; the second percent is irrelevant.",
        trap_type="percent base trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(answer), str(base - answer), str(base + answer), str(base), correct="D"),
    )


def math_probability(module: int, index: int) -> QuestionSpec:
    red = 3 + index % 4
    blue = 5 + index % 3
    total = red + blue
    prompt = f"A bag contains {red} red tiles and {blue} blue tiles. If one tile is selected at random, and the color order is not considered, what is the probability it is red?"
    return math_base(
        module,
        index,
        topic="Problem-Solving and Data Analysis",
        subtopic="Probability",
        question_type="probability",
        prompt=prompt,
        correct="A",
        explanation=f"The favorable outcomes are {red} red tiles out of {total} total tiles; the condition is that only one tile is selected.",
        trap_type="denominator confusion",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(f"{red}/{total}", f"{blue}/{total}", f"{red}/{blue}", f"{total}/{red}", correct="A"),
    )


def math_word_problem(module: int, index: int) -> QuestionSpec:
    slot = math_slot_for(module, index)
    rate = 4 + index % 4
    hours = 3 + index % 3
    start = 5
    answer = rate * hours + start
    if slot.slot_key in MATH_STUDENT_RESPONSE_SLOT_KEYS:
        total_minutes = 45 + (index % 4) * 15
        per_hour = 12 + index % 5
        exact = per_hour * total_minutes / 60
        exact_text = f"{exact:g}"
        return math_base(
            module,
            index,
            topic="Word Problems",
            subtopic="Rates",
            question_type="word_problem",
            prompt=f"A pump moves {per_hour} liters per hour. It runs for {total_minutes} minutes, and a second pump rate is listed but not used. What is the exact number of liters moved? Do not round.",
            correct=exact_text,
            explanation=f"Convert minutes to hours before multiplying: {total_minutes}/60 hours times {per_hour} liters per hour = {exact_text}. This exact-value setup includes a decimal/fraction trap, and the second pump rate is irrelevant.",
            trap_type="rounding and unit conversion trap",
            fmt=QuestionFormat.grid_in,
        )
    return math_base(
        module,
        index,
        topic="Word Problems",
        subtopic="Rates",
        question_type="word_problem",
        prompt=f"A tank contains {start} liters of water. Water is added at a constant rate of {rate} liters per hour for {hours} hours, while a drain rate from a different tank is also mentioned but not used. Given the starting amount, how many liters of water are in the tank after {hours} hours?",
        correct="C",
        explanation=f"Add the starting amount to the amount added: {start} + {rate}({hours}) = {answer}; the drain rate from the different tank is irrelevant.",
        trap_type="rate setup error",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(rate * hours), str(start + rate), str(answer), str(answer * hours), correct="C"),
    )


def math_exponential(module: int, index: int) -> QuestionSpec:
    start = 50 + (index % 4) * 10
    growth = 2
    periods = 3
    answer = start * (growth ** periods)
    return math_base(
        module,
        index,
        topic="Advanced Math",
        subtopic="Exponential growth",
        question_type="exponential_growth",
        prompt=f"A population starts at {start} and doubles each period. After exactly {periods} periods, not including the initial count as a growth period, what is the population?",
        correct="B",
        explanation=f"Doubling for {periods} periods gives {start} x 2^{periods} = {answer}; the hidden condition is not counting the initial amount as a period.",
        trap_type="growth factor confusion",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(start * periods), str(answer), str(start + growth * periods), str(answer // 2), correct="B"),
    )


def math_rational_equation(module: int, index: int) -> QuestionSpec:
    excluded = 2 + index % 3
    answer = excluded + 3
    prompt = (
        f"For x not equal to {excluded}, the equation (x^2 - {excluded ** 2})/(x - {excluded}) = {answer + excluded} "
        f"can be simplified. Although cancellation may seem to allow every x, what value of x satisfies the simplified equation?"
    )
    return math_base(
        module,
        index,
        topic="Advanced Math",
        subtopic="Rational equations",
        question_type="rational_equation_trap",
        prompt=prompt,
        correct="C",
        explanation=f"The expression simplifies to x + {excluded}, but the domain restriction x != {excluded} remains; x = {answer}.",
        trap_type="cancellation and domain restriction trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(excluded), str(-answer), str(answer), str(answer + excluded), correct="C"),
    )


def math_expression_rewrite(module: int, index: int) -> QuestionSpec:
    a = 3 + index % 4
    value = 18 + index
    target = value - a
    prompt = (
        f"If {a} + 2x = {value}, a student needs the value of 2x, not x. "
        f"Which value should the student use for the expression 2x?"
    )
    return math_base(
        module,
        index,
        topic="Algebra",
        subtopic="Expression rewriting",
        question_type="expression_rewrite",
        prompt=prompt,
        correct="A",
        explanation=f"Isolate the expression, not the variable: 2x = {value} - {a} = {target}.",
        trap_type="isolate expression not solve trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(target), str(target / 2), str(value + a), str(a - value), correct="A"),
    )


def math_graph_transformation(module: int, index: int) -> QuestionSpec:
    shift = 2 + index % 4
    prompt = (
        f"The function y = f(x) is transformed so that each output is {shift} greater, while the x-values stay the same. "
        f"Which equation represents the transformed function rather than a horizontal shift?"
    )
    return math_base(
        module,
        index,
        topic="Functions",
        subtopic="Graph transformations",
        question_type="graph_transformation",
        prompt=prompt,
        correct="B",
        explanation=f"Increasing each output is a vertical shift: y = f(x) + {shift}, not f(x + {shift}).",
        trap_type="vertical versus horizontal shift trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(f"y = f(x + {shift})", f"y = f(x) + {shift}", f"y = {shift}f(x)", f"y = f(x - {shift})", correct="B"),
    )


def math_parameter_interpretation(module: int, index: int) -> QuestionSpec:
    slope = 4 + index % 5
    intercept = 20 + index
    prompt = (
        f"In the model C = {slope}n + {intercept}, C is total cost and n is the number of notebooks. "
        f"Rather than solving for n, what does the coefficient {slope} mean?"
    )
    return math_base(
        module,
        index,
        topic="Functions",
        subtopic="Parameter interpretation",
        question_type="parameter_interpretation",
        prompt=prompt,
        correct="D",
        explanation=f"The coefficient of n is the cost added for each additional notebook, so {slope} is the per-notebook cost.",
        trap_type="coefficient meaning trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices("the starting cost", "the total number of notebooks", f"the total cost when n = {slope}", f"the cost per notebook", correct="D"),
    )


def math_ratio_scaling(module: int, index: int) -> QuestionSpec:
    scale = 3 + index % 3
    base = 12 + index
    answer = base * scale
    prompt = (
        f"A recipe uses {base} grams of spice for 2 batches. For {2 * scale} batches, the batch count is scaled by {scale}. "
        f"Which amount keeps the same ratio, rather than using the inverse scale?"
    )
    return math_base(
        module,
        index,
        topic="Problem-Solving and Data Analysis",
        subtopic="Ratio scaling",
        question_type="ratio_scaling",
        prompt=prompt,
        correct="C",
        explanation=f"Keeping the ratio means multiplying by the same scale factor: {base} x {scale} = {answer}.",
        trap_type="inverse scaling confusion trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(base / scale), str(base + scale), str(answer), str(2 * scale), correct="C"),
    )


def math_absolute_value(module: int, index: int) -> QuestionSpec:
    center = 5 + index % 3
    distance = 4
    positive = center + distance
    negative = center - distance
    prompt = (
        f"The equation |x - {center}| = {distance} has two possible values of x. "
        f"Which choice gives both solutions rather than missing one?"
    )
    return math_base(
        module,
        index,
        topic="Advanced Math",
        subtopic="Absolute value equations",
        question_type="absolute_value_equation",
        prompt=prompt,
        correct="A",
        explanation=f"The expression is {distance} units from {center}, so x = {center} - {distance} or x = {center} + {distance}.",
        trap_type="two solutions missing solution trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(f"{negative} and {positive}", f"{positive} only", f"{negative} only", f"{-positive} and {positive}", correct="A"),
    )


def math_geometry_correspondence(module: int, index: int) -> QuestionSpec:
    side = 6 + index % 4
    scale = 2
    answer = side * scale
    prompt = (
        f"Triangles ABC and DEF are similar in that order, so A corresponds to D, B to E, and C to F. "
        f"If AB = {side} and DE is the corresponding side in the larger triangle with scale factor {scale}, what is DE?"
    )
    return math_base(
        module,
        index,
        topic="Geometry and Trigonometry",
        subtopic="Corresponding sides",
        question_type="geometry_correspondence",
        prompt=prompt,
        correct="B",
        explanation=f"The order gives the vertex mapping, so AB corresponds to DE and DE = {side} x {scale} = {answer}.",
        trap_type="mapping of vertices trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(str(side), str(answer), str(side + scale), str(answer + scale), correct="B"),
    )


def math_polynomial_roots_gridin(module: int, index: int) -> QuestionSpec:
    root = 2 + index % 4
    other = root + 3
    prompt = (
        f"The polynomial (x - {root})^2(x - {other}) has roots {root} and {other}. "
        f"Give the exact sum of the distinct roots; do not count the repeated root twice."
    )
    return math_base(
        module,
        index,
        topic="Advanced Math",
        subtopic="Polynomial roots",
        question_type="polynomial_roots_gridin",
        prompt=prompt,
        correct=str(root + other),
        explanation=f"The distinct roots are {root} and {other}; the repeated factor creates a multiple-root trap, so the exact sum is {root + other}.",
        trap_type="factorization and multiple roots trap",
        fmt=QuestionFormat.grid_in,
    )


def math_circle_equation(module: int, index: int) -> QuestionSpec:
    h = 2 + index % 3
    k = 3 + index % 4
    r = 5
    prompt = (
        f"A circle has equation (x - {h})^2 + (y + {k})^2 = {r ** 2}. "
        f"Which statement correctly interprets the center and radius rather than confusing a coordinate with the radius?"
    )
    return math_base(
        module,
        index,
        topic="Geometry and Trigonometry",
        subtopic="Circle equations",
        question_type="circle_equation",
        prompt=prompt,
        correct="D",
        explanation=f"The center is ({h}, {-k}) and the radius is {r}, since the right side is r squared.",
        trap_type="center versus radius confusion trap",
        fmt=QuestionFormat.multiple_choice,
        choices=math_choices(f"center ({-h}, {k}), radius {r ** 2}", f"center ({h}, {k}), radius {r}", f"center ({h}, {-k}), radius {r ** 2}", f"center ({h}, {-k}), radius {r}", correct="D"),
    )


def math_graph(module: int, index: int) -> QuestionSpec:
    def graph_choice(label: str, text: str, role: ChoiceTrapRole, basis: str) -> ChoiceSpec:
        if role == ChoiceTrapRole.correct:
            return choice(label, text, role, "plausibility=correct; competition=top; math_traps=correct; why_wrong=correct")
        return choice(
            label,
            text,
            role,
            f"plausibility=high; competition=top; math_traps={','.join(sorted(MATH_HARD_TRAPS))}; why_wrong={basis}",
        )

    variants = (
        {
            "graph_pattern": "crossover_point",
            "question_intent": "direct_read",
            "prompt": "The graph compares memberships in Club A and Club B over four months. An annotation gives last year's total, but it is not needed. Which statement identifies the crossover point shown by the graph?",
            "explanation": "The graph shows Club B overtaking Club A at month 3, so the crossover point occurs when Club B first becomes greater; the annotation is irrelevant.",
            "series": [
                {"name": "Club A", "values": [(1, 18), (2, 21), (3, 24), (4, 27)]},
                {"name": "Club B", "values": [(1, 12), (2, 20), (3, 26), (4, 32)]},
            ],
            "choices": (
                graph_choice("A", "Club B overtakes Club A at month 3, creating the crossover point.", ChoiceTrapRole.correct, "correct"),
                graph_choice("B", "Club A remains higher than Club B for all four months.", ChoiceTrapRole.common_mistake, "misses the crossover"),
                graph_choice("C", "The two clubs have equal membership at month 4.", ChoiceTrapRole.conceptual_misunderstanding, "misreads the endpoint"),
                graph_choice("D", "Club B starts higher than Club A at month 1.", ChoiceTrapRole.extreme_wrong_logic, "reverses the starting values"),
            ),
        },
        {
            "graph_pattern": "threshold_shift",
            "question_intent": "trend_description",
            "prompt": "The graph shows a plant's growth under two light levels. A label for fertilizer amount is extra information. Which statement best describes the threshold shift in the data?",
            "explanation": "The graph shows the high-light series exceeds the threshold after day 2, while the low-light series does not; the fertilizer label is irrelevant.",
            "series": [
                {"name": "High light", "values": [(1, 4), (2, 7), (3, 11), (4, 14)]},
                {"name": "Low light", "values": [(1, 3), (2, 5), (3, 7), (4, 9)]},
            ],
            "choices": (
                graph_choice("A", "Both light levels exceed the threshold before day 2.", ChoiceTrapRole.common_mistake, "reads the threshold too early"),
                graph_choice("B", "The high-light group exceeds the threshold after day 2, while the low-light group remains below it.", ChoiceTrapRole.correct, "correct"),
                graph_choice("C", "The low-light group exceeds the threshold first.", ChoiceTrapRole.conceptual_misunderstanding, "reverses the groups"),
                graph_choice("D", "Neither light level changes after day 2.", ChoiceTrapRole.extreme_wrong_logic, "ignores the continuing trend"),
            ),
        },
        {
            "graph_pattern": "divergence",
            "question_intent": "inference",
            "prompt": "The graph shows two delivery routes over four weeks, while a third route is mentioned in the caption but not graphed. Which inference is best supported by the divergence between the two lines?",
            "explanation": "The gap between the routes grows each week, so the graph supports an inference that their delivery times diverge over time; the third route is irrelevant.",
            "series": [
                {"name": "Route X", "values": [(1, 30), (2, 31), (3, 32), (4, 33)]},
                {"name": "Route Y", "values": [(1, 31), (2, 34), (3, 38), (4, 43)]},
            ],
            "choices": (
                graph_choice("A", "The routes converge because their delivery times become closer each week.", ChoiceTrapRole.common_mistake, "reverses divergence"),
                graph_choice("B", "Route X has no recorded delivery time after week 2.", ChoiceTrapRole.extreme_wrong_logic, "invents missing data"),
                graph_choice("C", "Route Y's delivery time moves farther from Route X's over time, suggesting growing divergence.", ChoiceTrapRole.correct, "correct"),
                graph_choice("D", "Route X becomes faster every week.", ChoiceTrapRole.conceptual_misunderstanding, "misreads the direction of Route X"),
            ),
        },
    )
    graph_variant_indices = {(1, 4): 0, (1, 7): 1, (1, 17): 2, (2, 1): 0, (2, 10): 1, (2, 21): 2}
    variant = variants[graph_variant_indices.get((module, index), index % len(variants))]
    graph_payload = {
        "graph_path": "/static/graphs/sample-linear.png",
        "graph_pattern": variant["graph_pattern"],
        "question_intent": variant["question_intent"],
        "x_label": "Time",
        "y_label": "Measured value",
        "series": variant["series"],
    }
    return math_base(
        module,
        index,
        topic="Graph Interpretation",
        subtopic=f"{variant['graph_pattern']} / {variant['question_intent']}",
        question_type="graph_reasoning",
        prompt=variant["prompt"],
        correct=next(choice_spec.label for choice_spec in variant["choices"] if choice_spec.role == ChoiceTrapRole.correct),
        explanation=variant["explanation"],
        trap_type="graph pattern interpretation error",
        fmt=QuestionFormat.multiple_choice,
        graph_path="/static/graphs/sample-linear.png",
        graph_payload=graph_payload,
        choices=variant["choices"],
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
    all_traps = ",".join(sorted(MATH_HARD_TRAPS))
    bases = {
        "A": f"plausibility=high; competition=top; math_traps={all_traps}; why_wrong=single arithmetic or unit constraint error",
        "B": f"plausibility=high; competition=top; math_traps={all_traps}; why_wrong=confuses requested variable or ignores condition",
        "C": f"plausibility=high; competition=top; math_traps={all_traps}; why_wrong=uses an extraneous value or misread structure",
        "D": f"plausibility=high; competition=top; math_traps={all_traps}; why_wrong=uses wrong base or ignores condition",
    }
    correct_basis = "plausibility=correct; competition=top; math_traps=correct; why_wrong=correct"
    return (
        choice("A", a, roles["A"], correct_basis if correct == "A" else bases["A"]),
        choice("B", b, roles["B"], correct_basis if correct == "B" else bases["B"]),
        choice("C", c, roles["C"], correct_basis if correct == "C" else bases["C"]),
        choice("D", d, roles["D"], correct_basis if correct == "D" else bases["D"]),
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
