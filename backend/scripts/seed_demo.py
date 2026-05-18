from app.core.security import hash_password
from app.db.session import get_session_local
from app.models import ChoiceTrapRole, Question, QuestionChoice, QuestionFormat, QuestionSource, SATSection, Test, User

RW_TYPES = [
    ("Reading comprehension", "Reading comprehension", "Main idea"),
    ("Vocabulary in context", "Vocabulary in context", "Precision"),
    ("Grammar", "Grammar and sentence correction", "Boundaries"),
    ("Transitions", "Transitions and logical connections", "Logic"),
    ("Rhetoric", "Rhetorical effectiveness", "Purpose"),
]
MATH_TYPES = [
    ("Algebra", "Linear equations", "multiple_choice"),
    ("Advanced Math", "Quadratics", "multiple_choice"),
    ("Functions", "Function notation", "grid_in"),
    ("Geometry and Trigonometry", "Angles", "multiple_choice"),
    ("Data Analysis", "Scatterplots", "multiple_choice"),
    ("Word Problems", "Rates", "grid_in"),
    ("Graph Interpretation", "Slope and intercepts", "multiple_choice"),
]


def seed() -> None:
    db = get_session_local()()
    try:
        if db.query(Test).count():
            print("Seed data already exists.")
            return

        admin = User(email="admin@sat1600.uz", full_name="SAT1600 Admin", password_hash=hash_password("admin123"), role="admin")
        student = User(email="student@sat1600.uz", full_name="Demo Student", password_hash=hash_password("student123"))
        test = Test(title="SAT1600 Diagnostic Mock 1", description="Database-driven adaptive Digital SAT diagnostic.", is_active=True)
        db.add_all([admin, student, test])
        db.flush()

        for module in (1, 2):
            for index in range(27):
                category, question_type, subtopic = RW_TYPES[index % len(RW_TYPES)]
                adaptive = "standard" if module == 1 else ("hard" if index % 3 == 0 else "medium" if index % 3 == 1 else "easy")
                difficulty = 3 + (index % 5) if module == 1 else {"easy": 3, "medium": 6, "hard": 8}[adaptive] + (index % 2)
                q = Question(
                    test_id=test.id,
                    section=SATSection.reading_writing,
                    module=module,
                    difficulty=difficulty,
                    adaptive_level=adaptive,
                    source=QuestionSource.generated_variant if index % 10 in (7, 8, 9) else QuestionSource.database,
                    topic=category,
                    subtopic=subtopic,
                    structure_key=f"rw-{question_type.lower().replace(' ', '-')}-{index % 3}",
                    graph_required=False,
                    passage=(
                        "A researcher studying student practice habits found that short, consistent review sessions "
                        "often produced stronger retention than long, irregular sessions."
                    ),
                    prompt=f"Module {module} question {index + 1}: Which choice best completes the task?",
                    correct_answer="B",
                    explanation="Choice B follows the passage logic and avoids the common trap in the wording.",
                    trap_type="overgeneralization",
                    question_type=question_type,
                    format=QuestionFormat.multiple_choice,
                    estimated_time=65 + (index % 4) * 10,
                    discrimination_score=round(0.35 + (index % 6) * 0.08, 2),
                    order_index=index,
                )
                db.add(q)
                db.flush()
                for label, text, role, basis in [
                    ("A", "Too broad", ChoiceTrapRole.common_mistake, "This repeats a real detail but overextends the passage claim."),
                    ("B", "Best supported", ChoiceTrapRole.correct, "This is the only choice directly supported by the passage logic."),
                    ("C", "Unrelated detail", ChoiceTrapRole.conceptual_misunderstanding, "This confuses the topic with evidence that does not answer the task."),
                    ("D", "Opposite meaning", ChoiceTrapRole.extreme_wrong_logic, "This reverses the relationship described in the passage."),
                ]:
                    db.add(QuestionChoice(question_id=q.id, label=label, text=text, trap_role=role, error_basis=basis))

        for module in (1, 2):
            for index in range(22):
                topic, subtopic, fmt = MATH_TYPES[index % len(MATH_TYPES)]
                adaptive = "standard" if module == 1 else ("hard" if index % 3 == 0 else "medium" if index % 3 == 1 else "easy")
                difficulty = 3 + (index % 5) if module == 1 else {"easy": 3, "medium": 6, "hard": 8}[adaptive] + (index % 2)
                answer = "12" if fmt == "grid_in" else "C"
                graph_path = None
                prompt = f"Module {module} math question {index + 1}: Solve the problem and enter the best answer."
                if topic == "Graph Interpretation":
                    graph_path = "/static/graphs/sample-linear.png"
                    prompt = "Which statement best interprets the slope as a rate of change in the context represented by the graph?"
                q = Question(
                    test_id=test.id,
                    section=SATSection.math,
                    module=module,
                    difficulty=difficulty,
                    adaptive_level=adaptive,
                    source=QuestionSource.generated_variant if index % 10 in (7, 8, 9) else QuestionSource.database,
                    topic=topic,
                    subtopic=subtopic,
                    structure_key=f"math-{subtopic.lower().replace(' ', '-')}-{index % 3}",
                    graph_path=graph_path,
                    graph_reasoning_type="slope_meaning" if graph_path else None,
                    graph_required=bool(graph_path),
                    passage=None,
                    prompt=prompt,
                    correct_answer=answer,
                    explanation="Use the relevant SAT math relationship, then check units and answer format.",
                    trap_type="calculation slip",
                    question_type=subtopic,
                    format=QuestionFormat.grid_in if fmt == "grid_in" else QuestionFormat.multiple_choice,
                    estimated_time=75 + (index % 5) * 15,
                    discrimination_score=round(0.38 + (index % 6) * 0.07, 2),
                    order_index=index,
                )
                db.add(q)
                db.flush()
                if fmt != "grid_in":
                    for label, text, role, basis in [
                        ("A", "4", ChoiceTrapRole.common_mistake, "This comes from using only one visible value instead of the full relationship."),
                        ("B", "8", ChoiceTrapRole.conceptual_misunderstanding, "This confuses the input quantity with the requested output."),
                        ("C", answer, ChoiceTrapRole.correct, "This follows the equation or graph relationship with the correct operation."),
                        ("D", "24", ChoiceTrapRole.extreme_wrong_logic, "This applies an unsupported operation and gives an extreme value."),
                    ]:
                        db.add(QuestionChoice(question_id=q.id, label=label, text=text, trap_role=role, error_basis=basis))
        db.commit()
        print("Seeded admin@sat1600.uz/admin123 and student@sat1600.uz/student123.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
