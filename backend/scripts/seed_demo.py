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
        rw_vocabulary,
        rw_transition,
        rw_command_of_evidence,
        rw_inference,
        rw_rhetorical_synthesis,
    ]
    spec = templates[index % len(templates)](module, index)
    validate_reading_writing_spec(spec)
    return spec


def rw_base(module: int, index: int, *, topic: str, subtopic: str, question_type: str, passage: str, prompt: str, correct: str, choices: tuple[ChoiceSpec, ...], explanation: str, trap_type: str) -> QuestionSpec:
    difficulty = difficulty_for(module, index)
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
    )


def rw_vocabulary(module: int, index: int) -> QuestionSpec:
    records = (
        {
            "word": "clear",
            "passage": (
                "The astronomer's first images were blurred by dust on the lens. "
                "After the instrument was cleaned, the outline of the distant moon became clear enough for the team to map its ridges, although several shadows still required cautious interpretation."
            ),
            "correct": "easy to see",
            "too_broad": "successful",
            "too_narrow": "transparent like glass",
            "context_mismatch": "free from obstruction",
        },
        {
            "word": "marked",
            "passage": (
                "In early trials, the new coating changed the metal's temperature only slightly. "
                "When the researchers added a thin mineral layer, however, the difference became marked, forcing them to revise their explanation of how heat moved through the sample."
            ),
            "correct": "noticeable",
            "too_broad": "important",
            "too_narrow": "labeled with a symbol",
            "context_mismatch": "damaged by scratches",
        },
        {
            "word": "fine",
            "passage": (
                "The curator first thought the woven cloth was plain because its colors had faded. "
                "Under angled light, however, fine threads of silver appeared between the darker fibers, revealing a workmanship more delicate than bold."
            ),
            "correct": "delicate and precise",
            "too_broad": "acceptable",
            "too_narrow": "very thin",
            "context_mismatch": "requiring payment as punishment",
        },
        {
            "word": "temper",
            "passage": (
                "The critic praised the novelist's anger at injustice but noted that the final chapter tempers that anger with sympathy for characters who had made harmful choices under pressure. "
                "This shift does not excuse them; instead, it makes the judgment less severe."
            ),
            "correct": "softens or moderates",
            "too_broad": "changes",
            "too_narrow": "heats and hardens metal",
            "context_mismatch": "loses emotional control",
        },
        {
            "word": "register",
            "passage": (
                "Sensors placed near the wetland did not register the brief afternoon shower because the rain evaporated before reaching the lower leaves. "
                "By contrast, the slower overnight storm produced a signal across nearly every device."
            ),
            "correct": "detect or record",
            "too_broad": "respond to",
            "too_narrow": "enroll officially",
            "context_mismatch": "speak in a particular tone",
        },
    )
    record = records[index % len(records)]
    return rw_base(
        module,
        index,
        topic="Vocabulary in Context",
        subtopic="Words in context",
        question_type="Vocabulary in Context",
        passage=record["passage"],
        prompt=f"As used in the text, what does \"{record['word']}\" most nearly mean?",
        correct="C",
        explanation=f"The context selects the sense \"{record['correct']}\" and rules out other common meanings of \"{record['word']}\".",
        trap_type="context-controlled vocabulary meaning",
        choices=(
            rw_choice("A", record["too_broad"], "TOO BROAD", ChoiceTrapRole.common_mistake),
            rw_choice("B", record["too_narrow"], "TOO NARROW", ChoiceTrapRole.conceptual_misunderstanding),
            rw_choice("C", record["correct"], "CORRECT", ChoiceTrapRole.correct),
            rw_choice("D", record["context_mismatch"], "CONTEXT MISMATCH", ChoiceTrapRole.extreme_wrong_logic),
        ),
    )


def rw_transition(module: int, index: int) -> QuestionSpec:
    records = (
        (
            "The first climate model predicted that the algae would decline as the water warmed. The follow-up samples showed the opposite pattern, with the population increasing near the heated vents. ___ the team revised its account of the algae's nutrient source.",
            "therefore",
            "cause-effect after contrast",
        ),
        (
            "The museum expected visitors to spend less time in the smaller photography exhibit. The gallery's quiet layout encouraged longer conversations and repeat viewing. ___ attendance surveys showed that visitors described the exhibit as unusually absorbing.",
            "however",
            "contrast with expectation",
        ),
        (
            "The first poem presents the city as a place shaped by memory rather than by maps. The second poem also treats streets as emotional landmarks. ___ both poems connect geography with personal history.",
            "similarly",
            "parallel relationship",
        ),
        (
            "The engineer knew the prototype used more expensive materials than the older model. The new design reduced maintenance costs so sharply that the total five-year expense was lower. ___ she recommended the prototype for the transit project.",
            "nevertheless",
            "concession followed by decision",
        ),
    )
    passage, correct_word, relationship = records[index % len(records)]
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
        explanation=f"The sentence relationship is {relationship}, so {choices[correct_label].strip(',')} is the only transition that fits.",
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
        (
            "A botanist studying desert flowers found that one species opened later in the day during unusually dry weeks. This delay reduced water loss, but it also meant fewer visits from morning pollinators. The finding suggests that the plant's response to drought involves a trade-off rather than a simple improvement.",
            "The plant conserves water in dry conditions but may receive fewer pollinator visits.",
            "Plants in deserts always benefit when flowers open later.",
            "The species opened later during unusually dry weeks.",
            "Morning pollinators stopped visiting desert flowers because temperatures were too high.",
        ),
        (
            "A literary scholar argues that the narrator's brief jokes do not make the novel lighthearted. Instead, they interrupt scenes of grief in a way that makes the grief feel more controlled and, therefore, more intense. The humor functions as restraint, not escape.",
            "The jokes intensify grief by briefly containing it rather than replacing it.",
            "Humor in novels usually makes painful scenes easier to read.",
            "The narrator includes brief jokes during scenes of grief.",
            "The novel is mainly a comedy that avoids serious emotion.",
        ),
        (
            "An economist compared neighborhoods with identical transit access but different street designs. Shops on narrower streets received more foot traffic, even when rent and population density were similar. The result points to street design as a factor in local commerce.",
            "Street design may influence local shopping activity even when transit access is the same.",
            "Transit access is the main cause of commercial growth in every neighborhood.",
            "The comparison used neighborhoods with identical transit access.",
            "Narrow streets increase rent, which then produces more foot traffic.",
        ),
    )
    passage, correct_text, too_broad, too_narrow, mismatch = records[index % len(records)]
    return rw_base(
        module,
        index,
        topic="Command of Evidence",
        subtopic="Evidence-based conclusion",
        question_type="Command of Evidence",
        passage=passage,
        prompt="Which choice best describes the conclusion that is most strongly supported by the text?",
        correct="A",
        explanation="Choice A follows from the specific evidence without overstating or narrowing the claim.",
        trap_type="evidence scope mismatch",
        choices=(
            rw_choice("A", correct_text, "CORRECT", ChoiceTrapRole.correct),
            rw_choice("B", too_broad, "TOO BROAD", ChoiceTrapRole.common_mistake),
            rw_choice("C", too_narrow, "TOO NARROW", ChoiceTrapRole.conceptual_misunderstanding),
            rw_choice("D", mismatch, "CONTEXT MISMATCH", ChoiceTrapRole.extreme_wrong_logic),
        ),
    )


def rw_inference(module: int, index: int) -> QuestionSpec:
    records = (
        (
            "During rehearsals, the orchestra's conductor asked the percussionists to play more softly, even though reviewers had praised their energy. She wanted the audience to notice a quiet flute melody that returns near the end of the piece. Her request suggests that the performance's effect depended on balance rather than force.",
            "The conductor believed a less forceful percussion part would help listeners hear an important melody.",
            "The conductor thought every energetic performance prevents audiences from hearing melodies.",
            "The flute melody appears near the end of the piece.",
            "Reviewers caused the conductor to remove the percussion section from the performance.",
        ),
        (
            "A marine biologist expected young fish to avoid artificial reefs because the structures lacked mature coral. Yet many young fish gathered there when nearby grasses were dense enough to hide them from predators. The observation suggests that shelter can partly compensate for the absence of coral.",
            "For young fish, protection from predators may matter as much as the reef material itself.",
            "Artificial reefs are always better habitats than natural coral reefs.",
            "Young fish gathered near artificial reefs with dense grasses.",
            "The fish preferred artificial reefs because mature coral is dangerous.",
        ),
        (
            "The novelist describes a village festival through smells from kitchens and fragments of overheard songs rather than through a full explanation of the event. This technique gives the scene an unfinished quality. Readers must assemble the festival from partial impressions, much as a visitor would.",
            "The description is designed to make readers experience the festival indirectly and piece by piece.",
            "Novels should explain public events through complete historical summaries.",
            "The passage mentions smells from kitchens and fragments of songs.",
            "The narrator cannot understand the festival's meaning at all.",
        ),
    )
    passage, correct_text, too_broad, too_narrow, mismatch = records[index % len(records)]
    return rw_base(
        module,
        index,
        topic="Inference",
        subtopic="Reasonable inference",
        question_type="Inference",
        passage=passage,
        prompt="Which choice is the most reasonable inference from the text?",
        correct="D",
        explanation="Choice D connects the text's details to a supported implication without adding an unsupported claim.",
        trap_type="unsupported inference",
        choices=(
            rw_choice("A", too_broad, "TOO BROAD", ChoiceTrapRole.common_mistake),
            rw_choice("B", too_narrow, "TOO NARROW", ChoiceTrapRole.conceptual_misunderstanding),
            rw_choice("C", mismatch, "CONTEXT MISMATCH", ChoiceTrapRole.extreme_wrong_logic),
            rw_choice("D", correct_text, "CORRECT", ChoiceTrapRole.correct),
        ),
    )


def rw_rhetorical_synthesis(module: int, index: int) -> QuestionSpec:
    records = (
        (
            "A student is writing about architect Lina Bo Bardi. The notes say that Bo Bardi designed buildings in Brazil, often reused industrial materials, wanted public spaces to feel informal and welcoming, and placed theaters, walkways, and gathering areas inside a former factory.",
            "To emphasize Bo Bardi's goal of making public spaces welcoming, which choice best uses relevant information from the notes?",
            "By turning a former factory into a cultural center with theaters, walkways, and gathering areas, Bo Bardi showed how reused industrial spaces could invite public use.",
            "Lina Bo Bardi designed several buildings after moving to Brazil.",
            "Bo Bardi reused industrial materials in some projects.",
            "The cultural center included theaters, so it was more important than her other buildings.",
        ),
        (
            "A student is writing about a citizen-science bird survey. The notes say that volunteers counted birds each spring, professional ornithologists checked unusual reports, the project lasted twelve years, and the data helped reveal a northward shift in two species' nesting ranges.",
            "To show why the survey's design made its findings credible, which choice best uses relevant information from the notes?",
            "Because volunteers collected observations for twelve years and ornithologists checked unusual reports, the survey produced evidence strong enough to reveal nesting-range shifts.",
            "The survey was about birds that nested farther north over time.",
            "Volunteers counted birds each spring for more than a decade.",
            "Citizen-science surveys prove that professional ornithologists are unnecessary.",
        ),
        (
            "A student is writing about chemist Alice Ball. The notes say that Ball developed an injectable treatment from chaulmoogra oil, earlier forms of the oil were difficult for patients to absorb, her method was used to treat Hansen's disease, and she died before her work received full public credit.",
            "To emphasize the practical importance of Ball's method, which choice best uses relevant information from the notes?",
            "Ball's injectable treatment made chaulmoogra oil easier for patients to absorb, allowing the method to be used in treating Hansen's disease.",
            "Alice Ball died before her work received full public credit.",
            "Chaulmoogra oil existed before Ball developed her method.",
            "Because Ball was not fully credited, her treatment could not have helped patients.",
        ),
    )
    passage, prompt, correct_text, too_broad, too_narrow, mismatch = records[index % len(records)]
    return rw_base(
        module,
        index,
        topic="Rhetorical Synthesis",
        subtopic="Use notes to meet a goal",
        question_type="Rhetorical Synthesis",
        passage=passage,
        prompt=prompt,
        correct="B",
        explanation="Choice B selects the notes that directly accomplish the stated rhetorical goal and avoids irrelevant or exaggerated claims.",
        trap_type="rhetorical goal mismatch",
        choices=(
            rw_choice("A", too_broad, "TOO BROAD", ChoiceTrapRole.common_mistake),
            rw_choice("B", correct_text, "CORRECT", ChoiceTrapRole.correct),
            rw_choice("C", too_narrow, "TOO NARROW", ChoiceTrapRole.conceptual_misunderstanding),
            rw_choice("D", mismatch, "CONTEXT MISMATCH", ChoiceTrapRole.extreme_wrong_logic),
        ),
    )


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
    return choice(label, text, role, explanations[pattern])


def validate_reading_writing_spec(spec: QuestionSpec) -> None:
    allowed_types = {"Vocabulary in Context", "Transitions", "Command of Evidence", "Inference", "Rhetorical Synthesis"}
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
