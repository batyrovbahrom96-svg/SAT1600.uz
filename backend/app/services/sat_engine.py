def get_module_questions(db: Session, attempt: TestAttempt) -> list[Question]:
    section = attempt.current_section
    module = attempt.current_module

    if section == SATSection.math and module == 1:
        try:
            from backend.scripts.seed_demo import math_module1_bluebook_question
        except ModuleNotFoundError:
            from scripts.seed_demo import math_module1_bluebook_question

        return [math_module1_bluebook_question(i) for i in range(1, 23)]

    if section == SATSection.math and module == 2:
        try:
            from backend.scripts.seed_demo import math_question
        except ModuleNotFoundError:
            from scripts.seed_demo import math_question

        return [math_question(2, i) for i in range(1, 23)]

    return []
