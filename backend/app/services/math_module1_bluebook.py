from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import ChoiceTrapRole, Question, QuestionChoice, QuestionFormat, QuestionSource, SATSection


@dataclass(frozen=True)
class MathChoiceSpec:
    label: str
    text: str


@dataclass(frozen=True)
class MathQuestionSpec:
    index: int
    topic: str
    subtopic: str
    question_type: str
    prompt: str
    correct_answer: str
    explanation: str
    choices: tuple[MathChoiceSpec, ...] = ()
    format: QuestionFormat = QuestionFormat.multiple_choice
    passage: str | None = None
    data_type: str = "none"
    data_payload: dict | None = None
    graph_reasoning_type: str | None = None
    difficulty: int = 4
    estimated_time: int = 75
    trap_type: str = "structure_trap"


MATH_MODULE1_SPECS: tuple[MathQuestionSpec, ...] = (
    MathQuestionSpec(
        1,
        "Algebra",
        "linear equation modeling",
        "linear_equation_model",
        "Lorenzo purchased a box of cereal and some strawberries at a grocery store. The box of cereal cost $2, and the strawberries cost $1.90 per pound. If Lorenzo paid $9.60 total, which equation can be used to find p, the number of pounds of strawberries he purchased?",
        "A",
        "The fixed cereal cost is 2 and the strawberry cost is 1.90 times p, so 1.90p + 2 = 9.60.",
        (
            MathChoiceSpec("A", "1.90p + 2 = 9.60"),
            MathChoiceSpec("B", "1.90p - 2 = 9.60"),
            MathChoiceSpec("C", "1.90 + 2p = 9.60"),
            MathChoiceSpec("D", "1.90 - 2p = 9.60"),
        ),
        difficulty=3,
        estimated_time=55,
        trap_type="variable_mapping",
    ),
    MathQuestionSpec(
        2,
        "Algebra",
        "proportional reasoning",
        "ratio_scaling",
        "The ratio of x to y is equivalent to the ratio of 9 to 5. If x = 162, what is the value of y?",
        "90",
        "Since x/y = 9/5, 162/y = 9/5. Thus y = 162(5)/9 = 90.",
        format=QuestionFormat.grid_in,
        difficulty=3,
        estimated_time=60,
        trap_type="ratio_direction",
    ),
    MathQuestionSpec(
        3,
        "Advanced Math",
        "function notation",
        "function_substitution",
        "The function f is defined by f(x) = 25x + 30. What is the value of f(x) when x = 2?",
        "C",
        "Substituting 2 for x gives f(2) = 25(2) + 30 = 80.",
        (
            MathChoiceSpec("A", "50"),
            MathChoiceSpec("B", "57"),
            MathChoiceSpec("C", "80"),
            MathChoiceSpec("D", "110"),
        ),
        difficulty=3,
        estimated_time=50,
        trap_type="substitution_trap",
    ),
    MathQuestionSpec(
        4,
        "Geometry and Trigonometry",
        "congruent triangles",
        "geometry_correspondence",
        "Triangles EFG and JKL are congruent, where E, F, and G correspond to J, K, and L, respectively. The measure of angle E is 45 degrees, and the measure of angle F is 20 degrees. What is the measure of angle J?",
        "B",
        "Corresponding angles in congruent triangles are equal. Since E corresponds to J, angle J is 45 degrees.",
        (
            MathChoiceSpec("A", "20 degrees"),
            MathChoiceSpec("B", "45 degrees"),
            MathChoiceSpec("C", "115 degrees"),
            MathChoiceSpec("D", "135 degrees"),
        ),
        difficulty=3,
        estimated_time=60,
        trap_type="correspondence_trap",
    ),
    MathQuestionSpec(
        5,
        "Advanced Math",
        "graph interpretation",
        "graph_interpretation",
        "The graph shown gives the estimated value, in dollars, of a tablet as a function of the number of months since it was purchased. What is the best interpretation of the y-intercept of the graph in this context?",
        "A",
        "The y-intercept is the value when the number of months after purchase is 0, so it represents the tablet's estimated value when it was purchased.",
        (
            MathChoiceSpec("A", "The estimated value of the tablet was $225 when it was purchased."),
            MathChoiceSpec("B", "The estimated value of the tablet 24 months after it was purchased was $225."),
            MathChoiceSpec("C", "The estimated value of the tablet decreased by $225 during the 24 months after it was purchased."),
            MathChoiceSpec("D", "The estimated value of the tablet decreased by approximately 2.25% each month after it was purchased."),
        ),
        data_type="graph",
        data_payload={
            "x_label": "Number of months after purchase",
            "y_label": "Value (dollars)",
            "series": [{"name": "Tablet value", "values": [[0, 225], [4, 170], [8, 130], [12, 100], [16, 78], [20, 61], [24, 50]]}],
        },
        graph_reasoning_type="intercept_meaning",
        difficulty=4,
        estimated_time=85,
        trap_type="graph_misread",
    ),
    MathQuestionSpec(
        6,
        "Algebra",
        "absolute value equations",
        "absolute_value_equation",
        "Which value is a solution to the equation |p| + 61 = 65?",
        "B",
        "Subtracting 61 gives |p| = 4, so p can be 4 or -4. Of the choices, 4 is a solution.",
        (
            MathChoiceSpec("A", "65/61"),
            MathChoiceSpec("B", "4"),
            MathChoiceSpec("C", "126"),
            MathChoiceSpec("D", "130"),
        ),
        difficulty=4,
        estimated_time=55,
        trap_type="absolute_value_trap",
    ),
    MathQuestionSpec(
        7,
        "Algebra",
        "linear expression interpretation",
        "parameter_interpretation",
        "At a state fair, tokens are worth a different number of points depending on their shape. One attendee won S square tokens and C circle tokens worth a total of 1,120 points. The equation 80S + 90C = 1,120 represents this situation. How many more points is a circle token worth than a square token?",
        "D",
        "The coefficient of C is 90 and the coefficient of S is 80, so a circle token is worth 90 - 80 = 10 more points.",
        (
            MathChoiceSpec("A", "950"),
            MathChoiceSpec("B", "90"),
            MathChoiceSpec("C", "80"),
            MathChoiceSpec("D", "10"),
        ),
        difficulty=4,
        estimated_time=65,
        trap_type="coefficient_meaning",
    ),
    MathQuestionSpec(
        8,
        "Advanced Math",
        "expression rewriting",
        "expression_rewrite",
        "The equation 12t + b = c relates the variables t, b, and c. Which expression gives the value of c - b in terms of t?",
        "D",
        "Subtracting b from both sides gives c - b = 12t.",
        (
            MathChoiceSpec("A", "t/12"),
            MathChoiceSpec("B", "t"),
            MathChoiceSpec("C", "t + 1/12"),
            MathChoiceSpec("D", "12t"),
        ),
        difficulty=4,
        estimated_time=55,
        trap_type="isolate_expression_not_variable",
    ),
    MathQuestionSpec(
        9,
        "Advanced Math",
        "rational equations",
        "rational_equation_trap",
        "For x != -9, what is the solution to the equation ((x + 9)(x - 9))/(x + 9) = 7?",
        "C",
        "Since x is not -9, the factor x + 9 can be canceled, giving x - 9 = 7. Thus x = 16.",
        (
            MathChoiceSpec("A", "7"),
            MathChoiceSpec("B", "9"),
            MathChoiceSpec("C", "16"),
            MathChoiceSpec("D", "63"),
        ),
        difficulty=5,
        estimated_time=70,
        trap_type="cancellation_domain",
    ),
    MathQuestionSpec(
        10,
        "Algebra",
        "systems of equations",
        "system_equation",
        "The solution to the given system of equations is (x, y).\n\n3y = 4x + 17\n-3y = 9x - 23\n\nWhat is the value of 39x?",
        "D",
        "Adding the equations gives 0 = 13x - 6, so x = 6/13. Therefore 39x = 18.",
        (
            MathChoiceSpec("A", "-18"),
            MathChoiceSpec("B", "-6"),
            MathChoiceSpec("C", "6"),
            MathChoiceSpec("D", "18"),
        ),
        difficulty=5,
        estimated_time=85,
        trap_type="target_expression",
    ),
    MathQuestionSpec(
        11,
        "Advanced Math",
        "polynomial roots",
        "polynomial_roots_gridin",
        "What is an x-coordinate of a positive x-intercept of the graph of y = 3(x - 14)(x + 5)(x + 4) in the xy-plane?",
        "14",
        "The x-intercepts occur when one factor is 0. The positive solution is x = 14.",
        format=QuestionFormat.grid_in,
        difficulty=5,
        estimated_time=70,
        trap_type="root_sign",
    ),
    MathQuestionSpec(
        12,
        "Advanced Math",
        "function evaluation",
        "function_interpretation",
        "The function f is defined by f(x) = 5(1/4 - x)^2 + 11/4. What is the value of f(1/4)? Enter the decimal equivalent.",
        "2.75",
        "When x = 1/4, the squared term is 0, so f(1/4) = 11/4 = 2.75.",
        format=QuestionFormat.grid_in,
        difficulty=5,
        estimated_time=75,
        trap_type="fraction_decimal",
    ),
    MathQuestionSpec(
        13,
        "Geometry and Trigonometry",
        "circle equation",
        "circle_equation",
        "A circle in the xy-plane has equation (x - 13)^2 + (y - k)^2 = 64. Which choice gives the center of the circle and its radius?",
        "A",
        "In standard form, (x - h)^2 + (y - k)^2 = r^2. The center is (13, k), and r = sqrt(64) = 8.",
        (
            MathChoiceSpec("A", "The center is at (13, k), and the radius is 8."),
            MathChoiceSpec("B", "The center is at (k, 13), and the radius is 8."),
            MathChoiceSpec("C", "The center is at (k, 13), and the radius is 64."),
            MathChoiceSpec("D", "The center is at (13, k), and the radius is 64."),
        ),
        difficulty=5,
        estimated_time=70,
        trap_type="center_radius_confusion",
    ),
    MathQuestionSpec(
        14,
        "Geometry and Trigonometry",
        "circle area",
        "circle_equation_gridin",
        "A circle has a radius of 2.1 inches. The area of the circle is b pi square inches, where b is a constant. What is the value of b?",
        "4.41",
        "The area is pi r^2 = pi(2.1)^2 = 4.41pi, so b = 4.41.",
        format=QuestionFormat.grid_in,
        difficulty=5,
        estimated_time=70,
        trap_type="radius_squared",
    ),
    MathQuestionSpec(
        15,
        "Advanced Math",
        "x-intercepts",
        "linear_interpretation",
        "The function f(x) is defined as 19 more than 4 times a number x. If y = f(x) is graphed in the xy-plane, what is the best interpretation of the x-intercept?",
        "A",
        "The x-intercept is the value of x when y = f(x) = 0. Since f(x) = 4x + 19, this occurs at x = -19/4.",
        (
            MathChoiceSpec("A", "When f(x) = 0, the number is -19/4."),
            MathChoiceSpec("B", "When the number is 0, f(x) = 19."),
            MathChoiceSpec("C", "The value of f(x) increases by 1 for each increase of 4 in the value of the number."),
            MathChoiceSpec("D", "For each increase of 1 in the value of the number, f(x) increases by 4."),
        ),
        difficulty=6,
        estimated_time=80,
        trap_type="intercept_vs_slope",
    ),
    MathQuestionSpec(
        16,
        "Advanced Math",
        "exponential growth",
        "exponential_growth",
        "The function f(t) = 40,000(2)^(t/790) gives the number of bacteria in a population t minutes after an initial observation. How many minutes does it take for the number of bacteria in the population to double?",
        "B",
        "The population doubles when the exponent t/790 increases by 1, so t = 790.",
        (
            MathChoiceSpec("A", "2"),
            MathChoiceSpec("B", "790"),
            MathChoiceSpec("C", "1,580"),
            MathChoiceSpec("D", "40,000"),
        ),
        difficulty=6,
        estimated_time=75,
        trap_type="exponent_parameter",
    ),
    MathQuestionSpec(
        17,
        "Algebra",
        "linear equation structure",
        "expression_rewrite_gridin",
        "If 5 - 7(2 - 4x) = 16 - 8(2 - 4x), what is the value of 2 - 4x?",
        "11",
        "Let u = 2 - 4x. Then 5 - 7u = 16 - 8u, so u = 11.",
        format=QuestionFormat.grid_in,
        difficulty=6,
        estimated_time=80,
        trap_type="substitution_structure",
    ),
    MathQuestionSpec(
        18,
        "Problem Solving and Data Analysis",
        "percent increase",
        "percent_base_trap",
        "A scientist counted dragonflies in a habitat each day. On February 15, there were 99 dragonflies. The percent increase in the number of dragonflies from January 1 to February 15 was 12.5%. How many dragonflies were in the habitat on January 1?",
        "A",
        "If n was the January 1 amount, then 1.125n = 99. Thus n = 88.",
        (
            MathChoiceSpec("A", "88"),
            MathChoiceSpec("B", "87"),
            MathChoiceSpec("C", "12"),
            MathChoiceSpec("D", "8"),
        ),
        difficulty=6,
        estimated_time=80,
        trap_type="percent_base",
    ),
    MathQuestionSpec(
        19,
        "Advanced Math",
        "quadratic formula",
        "quadratic_modeling_gridin",
        "One solution to 2x^2 - 8x - 7 = 0 can be written as (8 - sqrt(k))/4, where k is a constant. What is the value of k?",
        "120",
        "The discriminant is (-8)^2 - 4(2)(-7) = 64 + 56 = 120, so k = 120.",
        format=QuestionFormat.grid_in,
        difficulty=7,
        estimated_time=95,
        trap_type="discriminant_trap",
    ),
    MathQuestionSpec(
        20,
        "Geometry and Trigonometry",
        "trigonometric identities",
        "trig_identity",
        "Which expression is equivalent to (sin 24 degrees)(cos 66 degrees) + (cos 24 degrees)(sin 66 degrees)?",
        "D",
        "The expression has the form sin a cos b + cos a sin b = sin(a + b). Since 24 + 66 = 90, the value is sin 90 degrees = 1.",
        (
            MathChoiceSpec("A", "2(cos 66 degrees)(sin 24 degrees)"),
            MathChoiceSpec("B", "2(cos 66 degrees) + 2(cos 24 degrees)"),
            MathChoiceSpec("C", "(cos 66 degrees)^2 + (sin 24 degrees)^2"),
            MathChoiceSpec("D", "1"),
        ),
        difficulty=7,
        estimated_time=90,
        trap_type="identity_trap",
    ),
    MathQuestionSpec(
        21,
        "Advanced Math",
        "rational equation",
        "rational_equation_trap",
        "For x != -6, what is the solution to ((x + 6)(3x - 4))/(x + 6) = 17?",
        "7",
        "The factor x + 6 can be canceled because x is not -6. Then 3x - 4 = 17, so x = 7.",
        format=QuestionFormat.grid_in,
        difficulty=7,
        estimated_time=85,
        trap_type="cancellation_domain",
    ),
    MathQuestionSpec(
        22,
        "Advanced Math",
        "expression structure",
        "expression_rewrite",
        "Which expression is equivalent to 3(x + 4) - 2(2x - 5)?",
        "C",
        "Distributing gives 3x + 12 - 4x + 10 = 22 - x.",
        (
            MathChoiceSpec("A", "7x + 2"),
            MathChoiceSpec("B", "x + 22"),
            MathChoiceSpec("C", "22 - x"),
            MathChoiceSpec("D", "2 - x"),
        ),
        difficulty=7,
        estimated_time=70,
        trap_type="distribution_sign",
    ),
)


def ensure_math_module1_bluebook_questions(db: Session, test_id: UUID) -> list[Question]:
    changed = False
    for spec in MATH_MODULE1_SPECS:
        structure_key = f"math_m1_bluebook_runtime_{spec.index:02d}_{spec.question_type}"
        question = db.execute(
            select(Question).where(Question.test_id == test_id, Question.structure_key == structure_key)
        ).scalar_one_or_none()

        if question is None:
            question = Question(test_id=test_id, section=SATSection.math, module=1, structure_key=structure_key)
            db.add(question)
            changed = True

        payload = spec.data_payload or {}
        question.section = SATSection.math
        question.module = 1
        question.difficulty = spec.difficulty
        question.adaptive_level = "standard"
        question.source = QuestionSource.database
        question.topic = spec.topic
        question.subtopic = spec.subtopic
        question.graph_path = None
        question.graph_reasoning_type = spec.graph_reasoning_type
        question.graph_required = spec.data_type == "graph"
        question.data_type = spec.data_type
        question.data_payload = payload
        question.passage = spec.passage
        question.prompt = spec.prompt
        question.correct_answer = spec.correct_answer
        question.explanation = spec.explanation
        question.trap_type = spec.trap_type
        question.question_type = spec.question_type
        question.format = spec.format
        question.estimated_time = spec.estimated_time
        question.discrimination_score = 0.66
        question.is_active = True
        question.validation_status = "approved"
        question.order_index = spec.index

        question.choices.clear()
        if spec.format == QuestionFormat.multiple_choice:
            for choice in sorted(spec.choices, key=lambda item: item.label):
                question.choices.append(
                    QuestionChoice(
                        label=choice.label,
                        text=choice.text,
                        trap_role=ChoiceTrapRole.correct
                        if choice.label == spec.correct_answer
                        else ChoiceTrapRole.common_mistake,
                        error_basis="runtime_bluebook_math_module1",
                    )
                )
        changed = True

    if changed:
        db.commit()

    return list(
        db.execute(
            select(Question)
            .where(
                Question.test_id == test_id,
                Question.section == SATSection.math,
                Question.module == 1,
                Question.structure_key.like("math_m1_bluebook_runtime_%"),
                Question.is_active.is_(True),
            )
            .options(selectinload(Question.choices))
            .order_by(Question.order_index)
        )
        .scalars()
        .unique()
    )
