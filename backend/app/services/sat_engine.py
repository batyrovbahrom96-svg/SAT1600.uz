def get_module_questions(db: Session, attempt: TestAttempt) -> list[Question]:
    """
    FINAL VERSION (CLEAN):

    ✔ NO database questions for Math
    ✔ NO caching
    ✔ NO adaptive routing interference
    ✔ ALWAYS fresh generated questions
    ✔ Reading/Writing stays unchanged

    This guarantees your new SAT math questions always appear.
    """

    section = attempt.current_section
    module = attempt.current_module

    # ==========================
    # 🔵 MATH MODULE 1 (CURATED)
    # ==========================
    if section == SATSection.math and module == 1:
        try:
            from backend.scripts.seed_demo import math_module1_bluebook_question
        except ModuleNotFoundError:
            from scripts.seed_demo import math_module1_bluebook_question

        print("🔥 USING FRESH GENERATED MATH MODULE 1 🔥")

        return [
            math_module1_bluebook_question(i)
            for i in range(1, 23)  # EXACTLY 22 QUESTIONS
        ]

    # ==========================
    # 🔵 MATH MODULE 2 (GENERATED)
    # ==========================
    if section == SATSection.math and module == 2:
        try:
            from backend.scripts.seed_demo import math_question
        except ModuleNotFoundError:
            from scripts.seed_demo import math_question

        print("🔥 USING FRESH GENERATED MATH MODULE 2 🔥")

        return [
            math_question(2, i)
            for i in range(1, 23)
        ]

    # ==========================
    # 🟢 READING & WRITING (KEEP DB)
    # ==========================
    query = (
        select(Question)
        .where(
            Question.test_id == attempt.test_id,
            Question.section == section,
            Question.module == module,
            Question.is_active.is_(True),
        )
        .options(selectinload(Question.choices))
        .order_by(Question.order_index)
    )

    print("📘 USING DATABASE QUESTIONS FOR READING/WRITING")

    return list(db.execute(query).scalars().unique())
