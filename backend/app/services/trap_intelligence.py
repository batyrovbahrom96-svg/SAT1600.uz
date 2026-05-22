from collections import Counter

from app.models import ChoiceTrapRole, Question, QuestionFormat

REQUIRED_TRAP_ROLES = {
    ChoiceTrapRole.correct,
    ChoiceTrapRole.common_mistake,
    ChoiceTrapRole.conceptual_misunderstanding,
    ChoiceTrapRole.extreme_wrong_logic,
}

GRAPH_REASONING_TYPES = {
    "crossover_point",
    "threshold_shift",
    "divergence",
    "rate_change",
    "slope_meaning",
    "rate_of_change",
    "intersection_reasoning",
    "transformation_comparison",
    "domain_range_analysis",
    "graph_matching",
    "multi_graph_comparison",
}

DIRECT_LOOKUP_PHRASES = (
    "what is the value of y",
    "what is the y-value",
    "what is the x-value",
    "read the value",
    "according to the graph, what is the value",
)


def is_deliverable_question(question: Question) -> bool:
    if question.format == QuestionFormat.multiple_choice and not has_meaningful_distractors(question):
        return False
    if question.graph_path and not has_graph_reasoning_binding(question):
        return False
    return True


def has_meaningful_distractors(question: Question) -> bool:
    roles = Counter(choice.trap_role for choice in question.choices)
    if any(roles[role] != 1 for role in REQUIRED_TRAP_ROLES):
        return False
    correct = next((choice for choice in question.choices if choice.trap_role == ChoiceTrapRole.correct), None)
    if not correct or correct.label.strip().lower() != question.correct_answer.strip().lower():
        return False
    distractors = [choice for choice in question.choices if choice.trap_role != ChoiceTrapRole.correct]
    if any(not (choice.error_basis and len(choice.error_basis.strip()) >= 12) for choice in distractors):
        return False
    texts = [choice.text.strip().lower() for choice in question.choices]
    return len(texts) == len(set(texts))


def has_graph_reasoning_binding(question: Question) -> bool:
    if not question.graph_required:
        return False
    if question.graph_reasoning_type not in GRAPH_REASONING_TYPES:
        return False
    prompt = question.prompt.lower()
    if any(phrase in prompt for phrase in DIRECT_LOOKUP_PHRASES):
        return False
    reasoning_words = ("meaning", "rate", "slope", "intersection", "solution", "shift", "transformation", "domain", "range", "compare", "model")
    return any(word in prompt for word in reasoning_words)


def trap_sequence_priority(question: Question, missed_traps: Counter[str]) -> int:
    if not missed_traps:
        return 0
    return 0 if question.trap_type in missed_traps else 1
