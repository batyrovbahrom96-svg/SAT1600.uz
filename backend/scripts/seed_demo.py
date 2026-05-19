from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_session_local
from app.models import ChoiceTrapRole, Question, QuestionChoice, QuestionFormat, QuestionSource, SATSection, Test

TEST_TITLE = "SAT1600 Diagnostic Mock 1"


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
    questions: list[QuestionSpec] = []
    for module in (1, 2):
        for index in range(27):
            questions.append(reading_writing_question(module, index))
    for module in (1, 2):
        for index in range(22):
            questions.append(math_question(module, index))
    return questions


def adaptive_level(module: int, index: int) -> str:
    if module == 1:
        return "standard"
    return ("hard", "medium", "easy")[index % 3]


def difficulty_for(module: int, index: int) -> int:
    if module == 1:
        return 3 + (index % 5)
    return {"easy": 3, "medium": 6, "hard": 8}[adaptive_level(module, index)] + (index % 2)


def source_for(index: int) -> QuestionSource:
    return QuestionSource.generated_variant if index % 10 in (7, 8, 9) else QuestionSource.database


def reading_writing_question(module: int, index: int) -> QuestionSpec:
    templates = [
        rw_main_idea,
        rw_vocabulary,
        rw_boundaries,
        rw_transition,
        rw_rhetoric,
    ]
    return templates[index % len(templates)](module, index)


def rw_base(module: int, index: int, *, topic: str, subtopic: str, question_type: str, passage: str, prompt: str, correct: str, choices: tuple[ChoiceSpec, ...], explanation: str, trap_type: str) -> QuestionSpec:
    return QuestionSpec(
        section=SATSection.reading_writing,
        module=module,
        order_index=index,
        difficulty=difficulty_for(module, index),
        adaptive_level=adaptive_level(module, index),
        source=source_for(index),
        topic=topic,
        subtopic=subtopic,
        structure_key=f"rw-{question_type.lower().replace(' ', '-')}-{index % 4}",
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
    )


def rw_main_idea(module: int, index: int) -> QuestionSpec:
    subject = ("urban tree canopies", "ocean sediment cores", "bilingual classrooms", "public transit maps")[index % 4]
    passage = (
        f"Researchers studying {subject} found that small, repeated measurements often revealed patterns that a single broad survey missed. "
        "The team argued that the value of the method was not its speed but its ability to show gradual change over time."
    )
    return rw_base(
        module,
        index,
        topic="Reading comprehension",
        subtopic="Central idea",
        question_type="Reading comprehension",
        passage=passage,
        prompt="Which choice best states the main idea of the text?",
        correct="B",
        explanation="Choice B captures both the repeated-measurement method and the reason the researchers valued it.",
        trap_type="overgeneralization",
        choices=(
            choice("A", "A single broad survey is usually more accurate than repeated measurements.", ChoiceTrapRole.extreme_wrong_logic, "This reverses the contrast in the text."),
            choice("B", "Repeated measurements can reveal gradual patterns that broad surveys may overlook.", ChoiceTrapRole.correct, "This matches the text's central claim."),
            choice("C", "Researchers prefer fast methods even when those methods miss long-term change.", ChoiceTrapRole.common_mistake, "This latches onto method choice but contradicts the stated reason."),
            choice("D", "The study showed that gradual change is impossible to measure reliably.", ChoiceTrapRole.conceptual_misunderstanding, "This misreads the purpose of the repeated measurements."),
        ),
    )


def rw_vocabulary(module: int, index: int) -> QuestionSpec:
    word = ("subtle", "robust", "novel", "constrained")[index % 4]
    passage = (
        f"The historian called the archive's influence {word}: it did not immediately overturn existing interpretations, "
        "but it slowly changed which questions scholars considered worth asking."
    )
    answers = {
        "subtle": ("not immediately obvious", "decorative", "fragile", "unusually loud"),
        "robust": ("strong and reliable", "physically large", "brief", "confusing"),
        "novel": ("new or original", "fictional", "ordinary", "unproven"),
        "constrained": ("limited by conditions", "careless", "expanded without limit", "certain"),
    }
    correct_text, trap_a, trap_c, trap_d = answers[word]
    return rw_base(
        module,
        index,
        topic="Vocabulary in context",
        subtopic="Words in context",
        question_type="Vocabulary in context",
        passage=passage,
        prompt=f"As used in the text, what does \"{word}\" most nearly mean?",
        correct="B",
        explanation=f"In context, \"{word}\" means {correct_text}; the surrounding sentence explains the intended sense.",
        trap_type="wrong sense of word",
        choices=(
            choice("A", trap_a, ChoiceTrapRole.common_mistake, "This is another possible sense or association, but not the contextual meaning."),
            choice("B", correct_text, ChoiceTrapRole.correct, "This meaning fits the sentence's logic."),
            choice("C", trap_c, ChoiceTrapRole.conceptual_misunderstanding, "This conflicts with the described effect."),
            choice("D", trap_d, ChoiceTrapRole.extreme_wrong_logic, "This is too extreme or opposite in meaning."),
        ),
    )


def rw_boundaries(module: int, index: int) -> QuestionSpec:
    noun = ("the enzyme", "the mural", "the satellite", "the committee")[index % 4]
    passage = f"While reviewing the data, the researchers noticed that {noun} had produced an unexpected result ___ they repeated the trial to confirm it."
    return rw_base(
        module,
        index,
        topic="Grammar and sentence correction",
        subtopic="Sentence boundaries",
        question_type="Grammar and sentence correction",
        passage=passage,
        prompt="Which choice completes the text so that it conforms to the conventions of Standard English?",
        correct="C",
        explanation="A semicolon correctly joins two closely related independent clauses.",
        trap_type="comma splice",
        choices=(
            choice("A", "result, they", ChoiceTrapRole.common_mistake, "A comma alone creates a comma splice."),
            choice("B", "result they", ChoiceTrapRole.conceptual_misunderstanding, "This run-on lacks needed punctuation."),
            choice("C", "result; they", ChoiceTrapRole.correct, "The semicolon correctly separates independent clauses."),
            choice("D", "result, which they", ChoiceTrapRole.extreme_wrong_logic, "This creates an illogical modifier and incomplete idea."),
        ),
    )


def rw_transition(module: int, index: int) -> QuestionSpec:
    context = ("city planners expected bike traffic to fall", "the first model predicted a weaker signal", "critics assumed attendance would decline", "the initial survey suggested little interest")[index % 4]
    passage = f"{context}. The updated data showed the opposite pattern, with participation increasing for three consecutive months. ___ the team revised its explanation."
    return rw_base(
        module,
        index,
        topic="Transitions and logical connections",
        subtopic="Logical transitions",
        question_type="Transitions and logical connections",
        passage=passage,
        prompt="Which choice completes the text with the most logical transition?",
        correct="D",
        explanation="The second sentence contrasts with the expectation, and the final sentence gives the result of that contrast.",
        trap_type="transition mismatch",
        choices=(
            choice("A", "For example,", ChoiceTrapRole.common_mistake, "The final sentence is not an example of the previous claim."),
            choice("B", "Similarly,", ChoiceTrapRole.conceptual_misunderstanding, "The ideas contrast rather than match."),
            choice("C", "Nevertheless,", ChoiceTrapRole.extreme_wrong_logic, "This implies resistance to the data rather than a response to it."),
            choice("D", "Consequently,", ChoiceTrapRole.correct, "This shows that the revision followed from the new data."),
        ),
    )


def rw_rhetoric(module: int, index: int) -> QuestionSpec:
    topic = ("a local wetland", "a robotics club", "an oral-history project", "a school garden")[index % 4]
    passage = f"A student wants to emphasize that {topic} benefits the wider community, not just the students who work on it."
    return rw_base(
        module,
        index,
        topic="Rhetorical effectiveness",
        subtopic="Purpose and support",
        question_type="Rhetorical effectiveness",
        passage=passage,
        prompt="Which choice best accomplishes the student's goal?",
        correct="A",
        explanation="Choice A directly connects the project to a community-level benefit.",
        trap_type="goal mismatch",
        choices=(
            choice("A", "Residents also use the project as a resource for learning, volunteering, and local planning.", ChoiceTrapRole.correct, "This addresses the wider community."),
            choice("B", "The students meet twice each week and keep detailed notes about their progress.", ChoiceTrapRole.common_mistake, "This focuses on student activity, not community impact."),
            choice("C", "Several participants said the project was more difficult than they first expected.", ChoiceTrapRole.conceptual_misunderstanding, "This addresses difficulty rather than purpose."),
            choice("D", "The project replaced every other extracurricular activity at the school.", ChoiceTrapRole.extreme_wrong_logic, "This unsupported claim is too broad and off purpose."),
        ),
    )


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
