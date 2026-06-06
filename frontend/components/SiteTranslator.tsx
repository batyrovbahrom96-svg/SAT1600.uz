"use client";

import { useEffect } from "react";
import { languages, useLanguage, type Language } from "@/lib/i18n";

type TranslationMap = Record<string, string>;

const ru: TranslationMap = {
  "SAT1600.uz": "SATTEST.UZ",
  "Question": "Вопрос",
  "of": "из",
  "Score": "Балл",
  "Step": "Шаг",
  "Day": "День",
  "Tests": "Тесты",
  "Analytics": "Аналитика",
  "Admin": "Админ",
  "Student access": "Доступ ученика",
  "Return to your score path.": "Вернитесь к своему пути роста балла.",
  "Continue your mock tests, review score reports, and keep every missed question connected to the next study move.": "Продолжайте mock tests, просматривайте отчеты и связывайте каждую ошибку со следующим учебным шагом.",
  "Adaptive practice. Clear feedback. Better execution.": "Адаптивная практика. Понятная обратная связь. Лучшее выполнение.",
  "Login": "Войти",
  "Use the account you created to continue your SAT practice.": "Используйте созданный аккаунт, чтобы продолжить SAT-практику.",
  "Email": "Email",
  "Password": "Пароль",
  "Create account": "Создать аккаунт",
  "Begin preparation": "Начать подготовку",
  "Create your testing workspace.": "Создайте свое тестовое пространство.",
  "Start with a full mock test, then use the score report to identify weak topics, traps, and the next best practice set.": "Начните с полного mock test, затем используйте отчет, чтобы найти слабые темы, ловушки и следующий лучший набор практики.",
  "Built for students who want measurable score growth.": "Создано для учеников, которым нужен измеримый рост балла.",
  "Full name": "Полное имя",
  "Email code": "Код из email",
  "6-digit code": "6-значный код",
  "Sending code...": "Отправляем код...",
  "Send email code": "Отправить код на email",
  "Register": "Зарегистрироваться",
  "Already have account?": "Уже есть аккаунт?",
  "Email bot is not deployed on the backend yet. Redeploy the SATTEST.UZ API with the latest code, then set SMTP in Railway.": "Email-бот еще не развернут на backend. Разверните последнюю версию SATTEST.UZ API и настройте SMTP в Railway.",
  "Email bot is unavailable right now. Check the SATTEST.UZ API deployment and SMTP settings in Railway.": "Email-бот сейчас недоступен. Проверьте деплой SATTEST.UZ API и SMTP-настройки в Railway.",
  "Registration failed": "Регистрация не удалась",
  "Verification code sent. Check your email and paste the 6-digit code below.": "Код подтверждения отправлен. Проверьте email и вставьте 6-значный код ниже.",
  "Unable to send verification code": "Не удалось отправить код подтверждения",
  "Login failed": "Вход не удался",

  "About SATTEST.UZ": "О SATTEST.UZ",
  "An AI-powered SAT organization built to make progress visible.": "SAT-платформа с AI, созданная, чтобы сделать прогресс видимым.",
  "SATTEST.UZ is not a simple practice website. It is a diagnostic SAT platform that turns every mock test into a personal study route, score report, weakness map, and 1400+ preparation plan.": "SATTEST.UZ — не просто сайт для практики. Это диагностическая SAT-платформа, которая превращает каждый mock test в личный учебный маршрут, отчет, карту слабых мест и план подготовки к 1400+.",
  "Start Free Diagnostic": "Начать бесплатную диагностику",
  "Choose Plan": "Выбрать план",
  "AI Diagnostic Engine": "AI-движок диагностики",
  "Reading": "Reading",
  "Writing": "Writing",
  "Math": "Math",
  "Trap Pattern": "Паттерн ловушки",
  "Daily Plan": "Ежедневный план",
  "Our mission": "Наша миссия",
  "To help ambitious students in Uzbekistan understand exactly why they lose SAT points and what to do next.": "Помочь амбициозным ученикам в Узбекистане точно понять, почему они теряют SAT-баллы и что делать дальше.",
  "Real Diagnostic First": "Сначала реальная диагностика",
  "Every route starts from a timed SAT-style diagnostic, not from guesswork or a generic worksheet.": "Каждый маршрут начинается с timed SAT-style диагностики, а не с догадок или общих worksheet.",
  "AI-Guided Weakness Map": "Карта слабых мест с AI",
  "The platform classifies mistakes by section, skill, trap pattern, timing pressure, and next study priority.": "Платформа классифицирует ошибки по разделу, навыку, ловушке, давлению времени и следующему приоритету.",
  "Transparent Progress": "Прозрачный прогресс",
  "Students can see scores, section gaps, missed topics, daily work, and the reason behind each practice route.": "Ученики видят баллы, пробелы по разделам, пропущенные темы, ежедневную работу и причину каждого маршрута.",
  "Secure Student Cabinet": "Безопасный кабинет ученика",
  "Accounts keep attempts, results, curriculum, and practice history connected to the same learner profile.": "Аккаунты связывают попытки, результаты, curriculum и историю практики с одним профилем ученика.",
  "Not a shortcut. A system.": "Не shortcut. Система.",
  "Trust is created by showing the work.": "Доверие создается, когда видно работу.",
  "Students do not need vague promises. They need a clear exam attempt, an honest report, a visible curriculum, and practice that is connected to their own mistakes.": "Ученикам не нужны расплывчатые обещания. Им нужна понятная попытка экзамена, честный отчет, видимый curriculum и практика, связанная с их собственными ошибками.",
  "Built around SAT-style timing and section logic": "Построено вокруг SAT-style тайминга и логики разделов",
  "Designed for Uzbek students aiming at international universities": "Создано для узбекских учеников, нацеленных на международные университеты",
  "Uses partner ecosystem signals and local learning center proof": "Использует сигналы партнерской экосистемы и доказательства местных учебных центров",
  "Focused on measurable improvement, not empty marketing": "Фокус на измеримом улучшении, а не на пустом маркетинге",
  "How it works": "Как это работает",
  "One diagnostic. One report. One personal route.": "Одна диагностика. Один отчет. Один личный маршрут.",
  "Take the diagnostic SAT mock": "Пройдите диагностический SAT mock",
  "The student starts with a realistic digital SAT experience so the platform can collect meaningful performance data.": "Ученик начинает с реалистичного Digital SAT, чтобы платформа собрала полезные данные о результате.",
  "Read the score intelligence": "Изучите аналитику балла",
  "SATTEST.UZ separates Reading, Writing, and Math into concrete weaknesses instead of showing only a final number.": "SATTEST.UZ разделяет Reading, Writing и Math на конкретные слабые места, а не показывает только итоговое число.",
  "Follow the 1400+ route": "Следуйте маршруту 1400+",
  "The study plan is built around weak skills first, then reinforced with section practice and progress checks.": "Учебный план сначала строится вокруг слабых навыков, затем закрепляется section practice и проверками прогресса.",
  "What we stand for": "Наши принципы",
  "Evidence before advice": "Сначала доказательства, потом советы",
  "Practice before promise": "Сначала практика, потом обещания",
  "Progress that can be checked": "Прогресс, который можно проверить",
  "Premium SAT preparation for Uzbekistan": "Премиальная SAT-подготовка для Узбекистана",
  "Built for serious preparation": "Создано для серьезной подготовки",
  "SATTEST.UZ exists to make SAT preparation measurable, transparent, and worthy of student trust.": "SATTEST.UZ существует, чтобы сделать SAT-подготовку измеримой, прозрачной и достойной доверия учеников.",
  "Create Account": "Создать аккаунт",

  "Practice": "Практика",
  "Checking your account": "Проверяем аккаунт",
  "Practice unlocked": "Практика открыта",
  "Choose what you want to practice.": "Выберите, что хотите практиковать.",
  "Select a SAT practice area. The next step will connect this choice to targeted drills and section practice.": "Выберите область SAT-практики. Следующий шаг свяжет выбор с целевыми drills и section practice.",
  "Practice section": "Раздел практики",
  "SAT Reading": "SAT Reading",
  "SAT Writing": "SAT Writing",
  "SAT Math": "SAT Math",
  "Practice command of evidence, inference, main idea, text structure, and words in context.": "Практикуйте command of evidence, inference, main idea, text structure и words in context.",
  "Practice transitions, grammar, punctuation, rhetorical synthesis, and sentence boundaries.": "Практикуйте transitions, grammar, punctuation, rhetorical synthesis и sentence boundaries.",
  "Practice algebra, advanced math, problem solving, data analysis, geometry, and precision.": "Практикуйте algebra, advanced math, problem solving, data analysis, geometry и precision.",
  "Start practice": "Начать практику",
  "Choose": "Выбрать",
  "Practice preview": "Предпросмотр практики",
  "Your account is ready. Pro unlocks the full practice engine.": "Ваш аккаунт готов. Pro открывает полный practice engine.",
  "Try the sample questions below, then unlock Pro to use every Reading, Writing, and Math drill with progress tracking.": "Попробуйте примеры ниже, затем откройте Pro, чтобы использовать все drills по Reading, Writing и Math с отслеживанием прогресса.",
  "Payment required": "Требуется оплата",
  "After payment approval, this page switches to the unlocked practice dashboard automatically on refresh.": "После подтверждения оплаты эта страница автоматически переключится на открытый dashboard практики при обновлении.",
  "Unlock Pro": "Открыть Pro",
  "Practice engine preview": "Предпросмотр practice engine",
  "Feel the targeted SAT practice before creating an account.": "Почувствуйте целевую SAT-практику до создания аккаунта.",
  "See how Reading, Writing, and Math practice turns diagnostic mistakes into topic drills, unit tests, and visible mastery progress.": "Посмотрите, как практика Reading, Writing и Math превращает диагностические ошибки в topic drills, unit tests и видимый прогресс mastery.",
  "Save your real progress": "Сохраните реальный прогресс",
  "This preview is public. Create an account when you are ready for saved drills, score history, and a personal weakness route.": "Этот предпросмотр публичный. Создайте аккаунт, когда будете готовы к сохраненным drills, истории баллов и личному маршруту слабых мест.",
  "Try 3 real samples": "Попробуйте 3 реальных примера",
  "Answer first. Then see why the trap worked.": "Сначала ответьте. Потом увидьте, почему ловушка сработала.",
  "Explanation unlocked": "Объяснение открыто",
  "Choose an answer to reveal the explanation.": "Выберите ответ, чтобы открыть объяснение.",
  "Pro practice active": "Pro-практика активна",
  "Pro wall": "Pro-доступ",
  "Your full targeted practice sets are open.": "Полные целевые practice sets открыты.",
  "27 targeted questions are waiting after these samples.": "После этих примеров ждут 27 целевых вопросов.",
  "Continue into Reading, Writing, or Math practice. Your paid account can use the full drill sets, topic practice, and mastery map.": "Продолжайте Reading, Writing или Math practice. Платный аккаунт открывает полные drill sets, topic practice и mastery map.",
  "Pro unlocks the full drill, timed retake, mistake notebook, and the next weak-topic assignment.": "Pro открывает полный drill, timed retake, mistake notebook и следующее задание по слабой теме.",
  "Start full practice": "Начать полную практику",
  "Progress in process": "Прогресс в работе",
  "Track mastery for both SAT subjects.": "Отслеживайте mastery по двум SAT-предметам.",
  "Every quiz, topic drill, and section test moves a unit from not started to mastered, so students can see exactly where improvement is happening.": "Каждый quiz, topic drill и section test переводит unit от not started к mastered, чтобы ученик видел, где идет улучшение.",
  "Sample mastery map": "Пример mastery map",
  "A student can see which units are mastered, familiar, attempted, or untouched.": "Ученик видит, какие units mastered, familiar, attempted или untouched.",
  "The real account version updates this map after every drill, quiz, and section test.": "В реальном аккаунте эта карта обновляется после каждого drill, quiz и section test.",
  "Course mastery": "Освоение курса",
  "in process": "в процессе",
  "Mastered": "Освоено",
  "Proficient": "Уверенно",
  "Familiar": "Знакомо",
  "Attempted": "Попытка",
  "Not started": "Не начато",
  "Quiz": "Quiz",
  "Unit test": "Unit test",
  "Course challenge": "Вызов курса",
  "Finish weak units, then retake the section challenge to move more skills into mastered status.": "Завершите слабые units, затем пересдайте section challenge, чтобы перевести больше навыков в mastered.",

  "Practice areas": "Области практики",
  "SAT Reading practice": "Практика SAT Reading",
  "SAT Writing practice": "Практика SAT Writing",
  "SAT Math practice": "Практика SAT Math",
  "Choose your Reading difficulty first.": "Сначала выберите сложность Reading.",
  "Choose your Writing difficulty first.": "Сначала выберите сложность Writing.",
  "Choose your Math difficulty first.": "Сначала выберите сложность Math.",
  "Pick Foundations, Medium, or Advanced, then train the exact Reading question type.": "Выберите Foundations, Medium или Advanced, затем тренируйте точный тип вопросов Reading.",
  "Pick Foundations, Medium, or Advanced, then train the exact Writing question type.": "Выберите Foundations, Medium или Advanced, затем тренируйте точный тип вопросов Writing.",
  "Start with Foundations, Medium, or Advanced. After that, choose the exact SAT Math question type.": "Начните с Foundations, Medium или Advanced. Затем выберите точный тип SAT Math вопросов.",
  "Difficulty": "Сложность",
  "Foundations": "Основы",
  "Medium": "Средний",
  "Advanced": "Продвинутый",
  "Core reading skills: main idea, evidence, and literal support.": "Базовые навыки чтения: main idea, evidence и literal support.",
  "SAT-level passages with tighter wording and stronger distractors.": "SAT-level тексты с более точной формулировкой и сильными distractors.",
  "Harder inference, evidence, and cross-text traps for high-score practice.": "Более сложные inference, evidence и cross-text traps для высокого балла.",
  "Core grammar, punctuation, transitions, and sentence control.": "Базовая grammar, punctuation, transitions и контроль предложения.",
  "SAT-level writing choices with stronger context and wording traps.": "SAT-level Writing choices с более сильным контекстом и wording traps.",
  "High-score drills for synthesis, boundaries, and precise expression.": "High-score drills для synthesis, boundaries и precise expression.",
  "Core SAT Math skills with direct numbers and one main step.": "Базовые SAT Math навыки с прямыми числами и одним главным шагом.",
  "Mixed reasoning with stronger traps and multi-step setup.": "Смешанное рассуждение с сильными ловушками и multi-step setup.",
  "Harder SAT-style drills for precision, modeling, and speed.": "Более сложные SAT-style drills на precision, modeling и speed.",
  "Change difficulty": "Сменить сложность",
  "Change topic": "Сменить тему",
  "Domain": "Домен",
  "Start": "Начать",
  "Set complete": "Набор завершен",
  "Repeat topic": "Повторить тему",
  "All topics": "Все темы",
  "Correct": "Верно",
  "Wrong": "Неверно",
  "Confirm answer": "Подтвердить ответ",
  "Finish set": "Завершить набор",
  "Next question": "Следующий вопрос",

  "Saved diagnostic mock test": "Сохраненный диагностический mock test",
  "Your SAT mock test is connected to your account.": "Ваш SAT mock test связан с аккаунтом.",
  "SATTEST.UZ remembers your diagnostic attempt and keeps your total score, Reading and Writing score, and Math score attached to your personal cabinet.": "SATTEST.UZ сохраняет диагностическую попытку и привязывает общий балл, Reading and Writing и Math к личному кабинету.",
  "Diagnostic score": "Диагностический балл",
  "Your latest completed SAT mock diagnostic result.": "Ваш последний завершенный diagnostic SAT mock результат.",
  "No completed diagnostic score is saved yet.": "Пока нет сохраненного diagnostic score.",
  "Overall": "Общий",
  "English": "English",
  "Take the diagnostic mock SAT test once, and your score will appear here automatically.": "Пройдите diagnostic mock SAT один раз, и балл появится здесь автоматически.",
  "Retake Diagnostic": "Пересдать диагностику",
  "Start Diagnostic": "Начать диагностику",
  "Open Score Report": "Открыть отчет",
  "Mini diagnostic": "Мини-диагностика",
  "Try the SAT diagnostic before signing in.": "Попробуйте SAT-диагностику до входа.",
  "Answer 5 SAT-style questions. SATTEST.UZ will show a quick weakness snapshot, then you can create an account to save the full mock test.": "Ответьте на 5 SAT-style вопросов. SATTEST.UZ покажет быстрый снимок слабых мест, затем вы сможете создать аккаунт для полного mock test.",
  "No login required": "Вход не нужен",
  "Instant feedback": "Мгновенная обратная связь",
  "Weak-topic snapshot": "Снимок слабых тем",
  "Full mock saved after signup": "Полный mock сохраняется после регистрации",
  "Your mini diagnostic snapshot": "Ваш снимок мини-диагностики",
  "This is a short preview, not a saved SAT score. The full diagnostic creates your real score report and 1400+ route.": "Это короткий preview, не сохраненный SAT score. Полная диагностика создает настоящий отчет и маршрут 1400+.",
  "Projected range": "Прогнозируемый диапазон",
  "Questions": "Вопросы",
  "Priority weakness": "Приоритетная слабость",
  "Next step": "Следующий шаг",
  "Create an account to take the full diagnostic. Your real report will save every mistake, timing pattern, and daily route.": "Создайте аккаунт для полной диагностики. Реальный отчет сохранит каждую ошибку, timing pattern и daily route.",
  "Save full diagnostic": "Сохранить полную диагностику",
  "Restart mini diagnostic": "Перезапустить мини-диагностику",
  "answered": "отвечено",
  "Correct.": "Верно.",
  "Trap found.": "Ловушка найдена.",
  "See snapshot": "Показать снимок",
  "SAT Diagnostic Mock Test": "Диагностический SAT Mock Test",
  "Timing": "Тайминг",
  "Scores": "Баллы",
  "Personal 1400+ route": "Личный маршрут 1400+",
  "Test mode": "Режим теста",
  "Back": "Назад",
  "Continue to diagnostic": "Перейти к диагностике",
  "We're preparing your SAT diagnostic mock test": "Готовим ваш диагностический SAT mock test",
  "This may take up to a minute. Please do not refresh this page or close the browser.": "Это может занять до минуты. Не обновляйте страницу и не закрывайте браузер.",

  "Student cabinet": "Кабинет ученика",
  "Checking your cabinet access": "Проверяем доступ к кабинету",
  "Practice and personal track are available after registration and the diagnostic mock SAT test.": "Практика и личный трек доступны после регистрации и diagnostic mock SAT.",
  "Diagnostic required": "Требуется диагностика",
  "Practice unlocks after your SAT mock test.": "Практика открывается после SAT mock test.",
  "Your personal SAT track, weak-skill analysis, daily hours, and study curriculum appear only after your diagnostic result is available.": "Личный SAT track, анализ слабых навыков, daily hours и curriculum появятся после диагностического результата.",
  "No diagnostic result yet": "Пока нет диагностического результата",
  "Take the diagnostic mock SAT test first. After submission, this cabinet becomes your personal study track.": "Сначала пройдите diagnostic mock SAT. После отправки кабинет станет личным учебным track.",
  "Personal SAT track": "Личный SAT track",
  "Start with the diagnostic mock test. After submission, this cabinet becomes your personal 1400+ roadmap with weaknesses, daily hours, and practice curriculum.": "Начните с diagnostic mock test. После отправки кабинет станет личной 1400+ roadmap со слабостями, daily hours и practice curriculum.",
  "Attempts": "Попытки",
  "Diagnostic completed": "Диагностика завершена",
  "Step 1": "Шаг 1",
  "Your diagnostic evaluation is inside this cabinet.": "Ваша диагностическая оценка находится в этом кабинете.",
  "Take your diagnostic mock test first.": "Сначала пройдите diagnostic mock test.",
  "Retake diagnostic": "Пересдать диагностику",
  "Start diagnostic": "Начать диагностику",
  "Loading diagnostic": "Загружаем диагностику",
  "Open 1400+ plan": "Открыть план 1400+",
  "Target": "Цель",
  "Study plan": "Учебный план",
  "Daily hours": "Ежедневные часы",
  "Locked": "Закрыто",
  "After mock": "После mock",
  "Diagnostic evaluation": "Диагностическая оценка",
  "SAT result classified by section": "SAT-результат по разделам",
  "Full report": "Полный отчет",
  "Total score": "Общий балл",
  "Reading & Writing": "Reading & Writing",
  "Overall accuracy": "Общая точность",
  "Priority topics": "Приоритетные темы",
  "Strengths": "Сильные стороны",
  "Weaknesses": "Слабые места",
  "No clear strengths yet.": "Пока нет явных сильных сторон.",
  "No urgent weak topic.": "Нет срочной слабой темы.",
  "Mistakes and setbacks": "Ошибки и откаты",
  "These mistakes will drive the future personal practice curriculum.": "Эти ошибки будут формировать будущий личный practice curriculum.",
  "missed": "пропущено",
  "Progress track": "Трек прогресса",
  "Practice curriculum": "Practice curriculum",
  "Weakness report": "Отчет о слабостях",
  "Available mock tests": "Доступные mock tests",
  "Diagnostic and practice attempts": "Диагностические и practice попытки",
  "Required": "Обязательно",
  "Premium": "Premium",
  "Loading available mock tests...": "Загружаем доступные mock tests...",

  "My 1400+": "My 1400+",
  "Opening your personal curriculum": "Открываем ваш личный curriculum",
  "My 1400+ preview": "Предпросмотр My 1400+",
  "See exactly what to study next.": "Увидьте точно, что изучать дальше.",
  "Choose plan": "Выбрать план",
  "Start free diagnostic": "Начать бесплатную диагностику",
  "Sample student dashboard": "Пример student dashboard",
  "Today: Advanced Math repair": "Сегодня: исправление Advanced Math",
  "Next mock retake": "Следующая пересдача mock",
  "The route updates after the score report.": "Маршрут обновляется после score report.",
  "Today unlocked preview": "Открытый preview на сегодня",
  "Try the first 2 tasks from the route.": "Попробуйте первые 2 задания маршрута.",
  "Route feedback": "Обратная связь маршрута",
  "Choose an answer to see how My 1400+ corrects the mistake.": "Выберите ответ, чтобы увидеть, как My 1400+ исправляет ошибку.",
  "Locked after preview": "Закрыто после preview",
  "Today still has 28 tasks, a timed set, and parent progress snapshot locked.": "Сегодня еще закрыты 28 заданий, timed set и snapshot прогресса для родителей.",

  "Personal curriculum": "Личный curriculum",
  "1400+ SAT route": "SAT-маршрут 1400+",
  "This plan is built from your diagnostic mistakes, weak topics, and section scores. Start with the weakest skills, then prove improvement through Reading/Writing and Math section tests.": "Этот план построен на диагностических ошибках, слабых темах и section scores. Начните со слабейших навыков, затем докажите улучшение через Reading/Writing и Math section tests.",
  "Current": "Текущий",
  "Plan length": "Длина плана",
  "30 days": "30 дней",
  "Daily study": "Ежедневная учеба",
  "Score gap": "Разрыв до цели",
  "Pro access active": "Pro-доступ активен",
  "Exercises require Pro": "Упражнения требуют Pro",
  "Your route is unlocked. Start the practice engine.": "Ваш маршрут открыт. Начните practice engine.",
  "Your route is ready. The exact exercises are locked below.": "Ваш маршрут готов. Точные упражнения закрыты ниже.",
  "Start Pro route": "Начать Pro-маршрут",
  "Open exercise": "Открыть упражнение",
  "Locked exercise": "Закрытое упражнение",
  "Bound test": "Связанный тест",
  "Start exercises": "Начать упражнения",
  "Unlock exercises": "Открыть упражнения",
  "First 7 days": "Первые 7 дней",

  "Post-test analytics": "Аналитика после теста",
  "Score report": "Отчет по баллам",
  "Your score, accuracy, weak topics, missed-question explanations, and the next study moves are all in one place.": "Ваш балл, точность, слабые темы, объяснения пропущенных вопросов и следующие учебные шаги собраны в одном месте.",
  "Print report": "Печать отчета",
  "New test": "Новый тест",
  "Loading score report": "Загружаем отчет",
  "We are preparing your score, mistakes, and next study plan.": "Готовим ваш балл, ошибки и следующий учебный план.",
  "Back to dashboard": "Назад в dashboard",

  "SAT pricing": "Цены SAT",
  "Tariffs and prices for serious SAT improvement.": "Тарифы для серьезного роста результата SAT.",
  "Choose a plan when you are ready to unlock practice, analytics, and My 1400+. If you are unsure, take the free diagnostic first.": "Выберите план, когда будете готовы открыть practice, analytics и My 1400+. Если сомневаетесь, сначала пройдите бесплатную диагностику.",
  "For parents": "Для родителей",
  "Short payment note": "Кратко об оплате",
  "Payment can be made through Click, Payme, Paynet, card, or transfer. Send the receipt to the Telegram bot with the email used during registration. After confirmation, access opens for 30 days.": "Оплату можно сделать через Click, Payme, Paynet, карту или перевод. Отправьте чек в Telegram-бот вместе с email регистрации. После подтверждения доступ откроется на 30 дней.",
  "Free plan": "Бесплатный план",
  "For students who want to see their real SAT level before choosing a paid route.": "Для учеников, которые хотят увидеть реальный уровень SAT перед выбором платного маршрута.",
  "Pay and activate": "Оплатить и активировать",
  "Most useful": "Самый полезный",
  "Main funnel": "Основной путь",
  "Ready to continue? Choose Pro, pay by Click, Payme, Paynet, card, or transfer, then activate through Telegram.": "Готовы продолжить? Выберите Pro, оплатите через Click, Payme, Paynet, карту или перевод, затем активируйте через Telegram.",
  "Choose Pro": "Выбрать Pro",

  "Our Trusted Partners": "Наши надежные партнеры",
  "Diagnostic first. Clear plan next.": "Сначала диагностика. Затем ясный план.",
  "Your SAT Growth Plan": "Ваш план роста SAT",
  "Your SAT": "Ваш SAT",
  "Growth Plan": "План роста",
  "Take one mock test and get a personal route for steady score growth.": "Пройдите один пробный тест и получите личный маршрут для стабильного роста балла.",
  "Free Diagnostic Start": "Начать бесплатную диагностику",
  "Results Proof": "Доказательство результата",
  "Verified SAT growth with student videos and score reports.": "Подтвержденный рост SAT: видео учеников и отчеты с баллами.",
  "Tap a result to see the student video and official SAT score report where available.": "Нажмите на результат, чтобы посмотреть видео ученика и официальный отчет SAT, если он доступен.",
  "Parent Feedback": "Отзыв родителя",
  "Muslima's mother - Telegram": "Мама Муслимы - Telegram",
  "Thank you. Your contribution to these results is truly important. May Allah support you, and may all your students achieve high scores that make their parents proud. Amen.": "Спасибо. В этих результатах есть и ваш большой вклад. Пусть Аллах поддерживает вас, а ваши ученики получают высокие баллы и радуют родителей. Амин.",
  "Growth": "Рост",
  "Reached 1330 SAT in 3 months": "Достигла 1330 SAT за 3 месяца",
  "Scored 1200 SAT": "Получил 1200 SAT",
  "Improved from 1000 to 1200": "Выросла с 1000 до 1200",
  "Improved from 900 to 1100 at age 16": "Вырос с 900 до 1100 в 16 лет",
  "Video + SAT score report": "Видео + отчет SAT",
  "Diagnostic plan + targeted SAT practice": "Диагностический план + целевая SAT-практика",
  "SAT preparation + score report review": "SAT-подготовка + разбор score report",
  "SATTEST.UZ practice route + mock review": "Маршрут SATTEST.UZ + разбор mock test",
  "Diagnostic review + targeted weak-topic drills": "Разбор диагностики + целевые drills по слабым темам",
  "Diagnostic analytics + targeted SAT practice": "Диагностическая аналитика + целевая SAT-практика",
  "Digital SAT practice engine": "Движок практики Digital SAT",
  "Founder trust": "Доверие к основателям",
  "SATTEST.UZ was initiated and crafted by the Botirov Brothers.": "SATTEST.UZ был инициирован и создан братьями Ботировыми.",
  "Particularly, Bakhrom Botirov is the founder and CEO of Richmond School, a CELTA and PGCEi holder, a 1540 SAT scorer, and has been teaching since 2021. Doniyor Botirov is the founder of Mr. Doniyor Learning Center and brings the same serious academic standard with a 1590 SAT result.": "В частности, Бахром Ботиров — основатель и CEO Richmond School, обладатель CELTA и PGCEi, результат SAT 1540, преподает с 2021 года. Дониёр Ботиров — основатель Mr. Doniyor Learning Center и поддерживает такой же высокий академический стандарт с результатом SAT 1590.",
  "Botirov Brothers SAT proof": "SAT-доказательство братьев Ботировых",
  "Bakhrom Botirov 1540 · Doniyor Botirov 1590": "Бахром Ботиров 1540 · Дониёр Ботиров 1590",
  "Bakhrom Botirov score proof": "Доказательство результата Бахрома Ботирова",
  "Doniyor Botirov, founder of Mr. Doniyor Learning Center": "Дониёр Ботиров, основатель Mr. Doniyor Learning Center",
  "Teaching experience": "Опыт преподавания",
  "International teacher qualifications": "Международные квалификации преподавателя",
  "Bakhrom 1540 SAT proof": "SAT-доказательство Бахрома 1540",
  "Doniyor 1590 SAT proof": "SAT-доказательство Дониёра 1590",
  "Why SATTEST.UZ exists": "Зачем существует SATTEST.UZ",
  "The platform was built so students do not waste months guessing what to study. A diagnostic should show the exact weak skills, then turn them into daily repair work.": "Платформа создана, чтобы ученики не тратили месяцы на догадки, что учить. Диагностика должна показывать точные слабые навыки, а затем превращать их в ежедневную работу над исправлением.",
  "Telegram: @FounderSATTESTUZ": "Telegram: @FounderSATTESTUZ",
  "Why SATTEST.UZ works": "Почему SATTEST.UZ работает",
  "A diagnostic SAT platform that turns mistakes into a plan.": "Диагностическая SAT-платформа, которая превращает ошибки в план.",
  "Students do not just finish a mock test. They receive score reports, weakness maps, mistake analysis, and targeted practice routes built around Reading, Writing, and Math.": "Ученики не просто заканчивают mock test. Они получают score reports, карты слабых мест, анализ ошибок и целевые practice routes по Reading, Writing и Math.",
  "Bluebook-style mock tests": "Mock tests в стиле Bluebook",
  "Timed modules, review flow, and realistic SAT pressure.": "Timed modules, review flow и реалистичное SAT-давление.",
  "Personal weakness tracking": "Отслеживание личных слабостей",
  "Every missed pattern becomes a focused practice target.": "Каждый пропущенный паттерн становится целевой practice-задачей.",
  "1400+ curriculum direction": "Направление curriculum 1400+",
  "Students know exactly what to study after the diagnostic.": "Ученики точно знают, что изучать после диагностики.",
  "Sound on": "Включить звук",
  "Sound off": "Выключить звук",
  "Diagnostic preview": "Предпросмотр диагностики",
  "Before a student practices, SATTEST.UZ shows exactly what is holding the score down.": "Перед практикой SATTEST.UZ точно показывает, что удерживает балл ниже.",
  "The mock test becomes a personal report: section scores, weak question types, repeated mistake patterns, timing pressure, and the first study tasks needed to start improving.": "Mock test становится личным отчетом: баллы по разделам, слабые типы вопросов, повторяющиеся ошибки, давление времени и первые учебные задачи для старта улучшения.",
  "Weak areas": "Слабые области",
  "Inference": "Inference",
  "Algebra": "Algebra",
  "Grammar precision": "Точность грамматики",
  "Mistake patterns": "Паттерны ошибок",
  "Causal gap trap": "Ловушка причинного разрыва",
  "Comma boundary error": "Ошибка границы с запятой",
  "Linear equation setup": "Постановка линейного уравнения",
  "The report does not only mark answers wrong. It explains why the wrong choice looked tempting and what rule the student must use next time.": "Отчет не просто отмечает неверные ответы. Он объясняет, почему неправильный вариант казался привлекательным и какое правило нужно применить в следующий раз.",
  "First 7 days generated from this report": "Первые 7 дней, созданные из этого отчета",
  "Inference drills + explanation review": "Inference drills + разбор объяснений",
  "Algebra equation setup and timed practice": "Постановка algebra-уравнений и timed practice",
  "Grammar punctuation targets and mixed review": "Цели по grammar punctuation и смешанный review",
  "Personal study plan": "Личный учебный план",
  "A 30-day route built from the exact mistakes in the diagnostic test.": "30-дневный маршрут, построенный на точных ошибках диагностического теста.",
  "SATTEST.UZ does not give random practice. After the mock test, every wrong answer becomes a weakness target, every weakness becomes a daily task, and every task is connected to Reading, Writing, or Math drills that move the score upward.": "SATTEST.UZ не дает случайную практику. После mock test каждый неверный ответ становится целью слабости, каждая слабость — ежедневной задачей, а каждая задача связана с drills по Reading, Writing или Math, которые поднимают балл.",
  "30-day minimum target": "Минимальная цель на 30 дней",
  "Built for steady improvement when the student completes the assigned daily work.": "Создано для стабильного улучшения, когда ученик выполняет ежедневные задания.",
  "Projected growth": "Прогноз роста",
  "Diagnostic to 30 days": "От диагностики до 30 дней",
  "Diagnostic": "Диагностика",
  "Week 1": "Неделя 1",
  "Week 2": "Неделя 2",
  "Diagnose": "Диагностировать",
  "Find the exact question types, traps, timing issues, and weak topics holding the student back.": "Найти точные типы вопросов, ловушки, проблемы времени и слабые темы, которые удерживают ученика.",
  "Assign": "Назначить",
  "Convert mistakes into daily Reading, Writing, and Math work with a clear hour-by-hour plan.": "Превратить ошибки в ежедневную работу по Reading, Writing и Math с понятным почасовым планом.",
  "Improve": "Улучшать",
  "Repeat targeted drills, review explanations, and confirm progress with section tests.": "Повторять целевые drills, разбирать объяснения и подтверждать прогресс section tests.",

  "Question quality control": "Контроль качества вопросов",
  "Review telemetry, distractor effectiveness, manual difficulty, and weak item status before public launch.": "Проверьте telemetry, эффективность distractors, ручную сложность и статус слабых вопросов перед публичным запуском.",
  "Generate graphs": "Сгенерировать графики",
  "Refresh": "Обновить",
  "Approve": "Одобрить",
  "Flag": "Отметить",
  "Disable": "Отключить",
  "Manual difficulty": "Ручная сложность",
  "Validation notes": "Заметки проверки",
  "Write what felt weird, confusing, too easy, or unfair.": "Напишите, что показалось странным, запутанным, слишком легким или несправедливым.",
  "Mark reviewed": "Отметить проверенным",
  "Distractor effectiveness": "Эффективность distractors",
  "Choice": "Вариант",
  "Trap role": "Роль ловушки",
  "Selected": "Выбрано",
  "Error basis": "Основа ошибки",

  "1400+ exercise route unlocked": "Маршрут упражнений 1400+ открыт",
  "1400+ exercise route ready": "Маршрут упражнений 1400+ готов",
  "Your weak topics are clear. Open your exercise route now.": "Слабые темы ясны. Откройте маршрут упражнений сейчас.",
  "You now know why the score is stuck. The exact exercises are waiting.": "Теперь вы знаете, почему балл застрял. Точные упражнения ждут.",
  "Current score": "Текущий балл",
  "First priority weaknesses": "Первые приоритетные слабости",
  "Next proof point": "Следующая точка проверки",
  "Next mini mock scheduled": "Следующий mini mock запланирован",
  "Stay on report": "Остаться в отчете",
  "Open exercise route": "Открыть маршрут упражнений",
  "Unlock exercise route": "Открыть маршрут упражнений"
};

const uz: TranslationMap = {
  "SAT1600.uz": "SATTEST.UZ",
  "Question": "Savol",
  "of": "dan",
  "Score": "Ball",
  "Step": "Qadam",
  "Day": "Kun",
  "Tests": "Testlar",
  "Analytics": "Tahlil",
  "Admin": "Admin",
  "Student access": "O'quvchi kirishi",
  "Return to your score path.": "Ball o'sish yo'lingizga qayting.",
  "Continue your mock tests, review score reports, and keep every missed question connected to the next study move.": "Mock testlarni davom ettiring, score reportlarni ko'ring va har bir xatoni keyingi o'quv qadami bilan bog'lang.",
  "Adaptive practice. Clear feedback. Better execution.": "Moslashuvchan practice. Aniq feedback. Yaxshiroq bajarish.",
  "Login": "Kirish",
  "Use the account you created to continue your SAT practice.": "SAT practice'ni davom ettirish uchun yaratgan accountingizdan foydalaning.",
  "Email": "Email",
  "Password": "Parol",
  "Create account": "Account yaratish",
  "Begin preparation": "Tayyorgarlikni boshlash",
  "Create your testing workspace.": "Test ish joyingizni yarating.",
  "Start with a full mock test, then use the score report to identify weak topics, traps, and the next best practice set.": "To'liq mock testdan boshlang, keyin score report orqali zaif mavzular, traps va keyingi eng yaxshi practice setni aniqlang.",
  "Built for students who want measurable score growth.": "O'lchanadigan ball o'sishini xohlaydigan o'quvchilar uchun qurilgan.",
  "Full name": "To'liq ism",
  "Email code": "Email kodi",
  "6-digit code": "6 xonali kod",
  "Sending code...": "Kod yuborilmoqda...",
  "Send email code": "Email kod yuborish",
  "Register": "Ro'yxatdan o'tish",
  "Already have account?": "Accountingiz bormi?",
  "Registration failed": "Ro'yxatdan o'tish amalga oshmadi",
  "Verification code sent. Check your email and paste the 6-digit code below.": "Tasdiqlash kodi yuborildi. Emailni tekshirib, 6 xonali kodni pastga kiriting.",
  "Unable to send verification code": "Tasdiqlash kodini yuborib bo'lmadi",
  "Login failed": "Kirish amalga oshmadi",

  "About SATTEST.UZ": "SATTEST.UZ haqida",
  "An AI-powered SAT organization built to make progress visible.": "Progressni ko'rinadigan qilish uchun qurilgan AI asosidagi SAT platforma.",
  "SATTEST.UZ is not a simple practice website. It is a diagnostic SAT platform that turns every mock test into a personal study route, score report, weakness map, and 1400+ preparation plan.": "SATTEST.UZ oddiy practice sayti emas. Bu har bir mock testni shaxsiy study route, score report, weakness map va 1400+ tayyorgarlik rejasiga aylantiradigan diagnostik SAT platforma.",
  "Start Free Diagnostic": "Bepul diagnostikani boshlash",
  "Choose Plan": "Rejani tanlash",
  "AI Diagnostic Engine": "AI diagnostika dvijogi",
  "Timing": "Vaqt",
  "Trap Pattern": "Trap pattern",
  "Daily Plan": "Kunlik reja",
  "Our mission": "Missiyamiz",
  "To help ambitious students in Uzbekistan understand exactly why they lose SAT points and what to do next.": "O'zbekistondagi maqsadli o'quvchilarga SAT ballarini nega yo'qotayotganini va keyin nima qilish kerakligini aniq tushunishga yordam berish.",
  "Real Diagnostic First": "Avval real diagnostika",
  "AI-Guided Weakness Map": "AI bilan weakness map",
  "Transparent Progress": "Shaffof progress",
  "Secure Student Cabinet": "Xavfsiz o'quvchi kabineti",
  "Not a shortcut. A system.": "Shortcut emas. Tizim.",
  "Trust is created by showing the work.": "Ish ko'rinsa, ishonch paydo bo'ladi.",
  "How it works": "Qanday ishlaydi",
  "One diagnostic. One report. One personal route.": "Bitta diagnostika. Bitta report. Bitta shaxsiy route.",
  "Take the diagnostic SAT mock": "Diagnostik SAT mock topshirish",
  "Read the score intelligence": "Ball tahlilini o'qish",
  "Follow the 1400+ route": "1400+ route bo'yicha yurish",
  "What we stand for": "Qadriyatlarimiz",
  "Evidence before advice": "Avval dalil, keyin maslahat",
  "Practice before promise": "Avval practice, keyin va'da",
  "Progress that can be checked": "Tekshiriladigan progress",
  "Premium SAT preparation for Uzbekistan": "O'zbekiston uchun premium SAT tayyorgarlik",
  "Built for serious preparation": "Jiddiy tayyorgarlik uchun qurilgan",
  "Create Account": "Account yaratish",

  "Practice": "Practice",
  "Checking your account": "Account tekshirilmoqda",
  "Practice unlocked": "Practice ochildi",
  "Choose what you want to practice.": "Nimani mashq qilishni tanlang.",
  "Practice section": "Practice bo'limi",
  "Start practice": "Practice boshlash",
  "Selected": "Tanlandi",
  "Choose": "Tanlash",
  "Practice preview": "Practice preview",
  "Payment required": "To'lov kerak",
  "Unlock Pro": "Pro ochish",
  "Practice engine preview": "Practice engine preview",
  "Save your real progress": "Real progressingizni saqlang",
  "Choose plan": "Rejani tanlash",
  "Start free diagnostic": "Bepul diagnostika boshlash",
  "Try 3 real samples": "3 ta real namunani sinab ko'ring",
  "Answer first. Then see why the trap worked.": "Avval javob bering. Keyin trap nega ishlaganini ko'ring.",
  "Explanation unlocked": "Tushuntirish ochildi",
  "Choose an answer to reveal the explanation.": "Tushuntirishni ko'rish uchun javob tanlang.",
  "Pro practice active": "Pro practice aktiv",
  "Pro wall": "Pro devori",
  "Start full practice": "To'liq practice boshlash",
  "Progress in process": "Progress jarayonda",
  "Track mastery for both SAT subjects.": "Ikkala SAT subject bo'yicha mastery'ni kuzating.",
  "Sample mastery map": "Mastery map namunasi",
  "Course mastery": "Kurs mastery",
  "in process": "jarayonda",
  "Mastered": "O'zlashtirilgan",
  "Proficient": "Yaxshi",
  "Familiar": "Tanish",
  "Attempted": "Urinilgan",
  "Not started": "Boshlanmagan",
  "Quiz": "Quiz",
  "Unit test": "Unit test",
  "Course challenge": "Kurs challenge",

  "Practice areas": "Practice yo'nalishlari",
  "SAT Reading practice": "SAT Reading practice",
  "SAT Writing practice": "SAT Writing practice",
  "SAT Math practice": "SAT Math practice",
  "Choose your Reading difficulty first.": "Avval Reading qiyinligini tanlang.",
  "Choose your Writing difficulty first.": "Avval Writing qiyinligini tanlang.",
  "Choose your Math difficulty first.": "Avval Math qiyinligini tanlang.",
  "Difficulty": "Qiyinlik",
  "Foundations": "Asoslar",
  "Medium": "O'rta",
  "Advanced": "Advanced",
  "Change difficulty": "Qiyinlikni o'zgartirish",
  "Change topic": "Mavzuni o'zgartirish",
  "Domain": "Domen",
  "Start": "Boshlash",
  "Set complete": "Set tugadi",
  "Repeat topic": "Mavzuni takrorlash",
  "All topics": "Barcha mavzular",
  "Correct": "To'g'ri",
  "Wrong": "Noto'g'ri",
  "Confirm answer": "Javobni tasdiqlash",
  "Finish set": "Setni tugatish",
  "Next question": "Keyingi savol",

  "Saved diagnostic mock test": "Saqlangan diagnostik mock test",
  "Your SAT mock test is connected to your account.": "SAT mock testingiz accountingizga ulangan.",
  "Diagnostic score": "Diagnostik ball",
  "Overall": "Umumiy",
  "Take the diagnostic mock SAT test once, and your score will appear here automatically.": "Diagnostik mock SAT testni bir marta topshiring, ball avtomatik shu yerda chiqadi.",
  "Retake Diagnostic": "Diagnostikani qayta topshirish",
  "Start Diagnostic": "Diagnostikani boshlash",
  "Open Score Report": "Score reportni ochish",
  "Mini diagnostic": "Mini diagnostika",
  "Try the SAT diagnostic before signing in.": "Kirishdan oldin SAT diagnostikani sinab ko'ring.",
  "No login required": "Login kerak emas",
  "Instant feedback": "Tezkor feedback",
  "Weak-topic snapshot": "Zaif mavzu snapshot",
  "Full mock saved after signup": "Signupdan keyin full mock saqlanadi",
  "Your mini diagnostic snapshot": "Mini diagnostika snapshotingiz",
  "Projected range": "Taxminiy diapazon",
  "Questions": "Savollar",
  "Priority weakness": "Ustuvor zaiflik",
  "Next step": "Keyingi qadam",
  "Save full diagnostic": "Full diagnostikani saqlash",
  "Restart mini diagnostic": "Mini diagnostikani qayta boshlash",
  "answered": "javob berildi",
  "Correct.": "To'g'ri.",
  "Trap found.": "Trap topildi.",
  "See snapshot": "Snapshotni ko'rish",
  "SAT Diagnostic Mock Test": "SAT diagnostik mock test",
  "Scores": "Ballar",
  "Personal 1400+ route": "Shaxsiy 1400+ route",
  "Test mode": "Test rejimi",
  "Back": "Orqaga",
  "Continue to diagnostic": "Diagnostikaga o'tish",
  "We're preparing your SAT diagnostic mock test": "SAT diagnostik mock testingiz tayyorlanmoqda",

  "Student cabinet": "O'quvchi kabineti",
  "Checking your cabinet access": "Kabinetga kirish tekshirilmoqda",
  "Diagnostic required": "Diagnostika kerak",
  "Practice unlocks after your SAT mock test.": "Practice SAT mock testdan keyin ochiladi.",
  "No diagnostic result yet": "Hali diagnostika natijasi yo'q",
  "Personal SAT track": "Shaxsiy SAT track",
  "Attempts": "Urinishlar",
  "Diagnostic completed": "Diagnostika tugadi",
  "Step 1": "1-qadam",
  "Retake diagnostic": "Diagnostikani qayta topshirish",
  "Start diagnostic": "Diagnostikani boshlash",
  "Loading diagnostic": "Diagnostika yuklanmoqda",
  "Open 1400+ plan": "1400+ planni ochish",
  "Target": "Maqsad",
  "Study plan": "Study plan",
  "Daily hours": "Kunlik soatlar",
  "Locked": "Yopiq",
  "After mock": "Mockdan keyin",
  "Diagnostic evaluation": "Diagnostik baholash",
  "SAT result classified by section": "SAT natijasi bo'limlar bo'yicha",
  "Full report": "To'liq report",
  "Total score": "Umumiy ball",
  "Reading & Writing": "Reading & Writing",
  "Overall accuracy": "Umumiy aniqlik",
  "Priority topics": "Ustuvor mavzular",
  "Strengths": "Kuchli tomonlar",
  "Weaknesses": "Zaifliklar",
  "Mistakes and setbacks": "Xatolar va setbacks",
  "Progress track": "Progress track",
  "Practice curriculum": "Practice curriculum",
  "Weakness report": "Weakness report",
  "Available mock tests": "Mavjud mock testlar",
  "Diagnostic and practice attempts": "Diagnostika va practice urinishlari",
  "Required": "Majburiy",
  "Premium": "Premium",
  "Loading available mock tests...": "Mavjud mock testlar yuklanmoqda...",

  "My 1400+": "My 1400+",
  "Opening your personal curriculum": "Shaxsiy curriculum ochilmoqda",
  "My 1400+ preview": "My 1400+ preview",
  "See exactly what to study next.": "Keyin nimani o'qishni aniq ko'ring.",
  "Sample student dashboard": "Student dashboard namunasi",
  "Today: Advanced Math repair": "Bugun: Advanced Math repair",
  "Next mock retake": "Keyingi mock retake",
  "Today unlocked preview": "Bugungi ochiq preview",
  "Try the first 2 tasks from the route.": "Route'dan birinchi 2 taskni sinab ko'ring.",
  "Route feedback": "Route feedback",
  "Locked after preview": "Previewdan keyin yopiq",

  "Personal curriculum": "Shaxsiy curriculum",
  "1400+ SAT route": "1400+ SAT route",
  "Current": "Hozirgi",
  "Plan length": "Plan uzunligi",
  "30 days": "30 kun",
  "Daily study": "Kunlik o'qish",
  "Score gap": "Ball farqi",
  "Pro access active": "Pro kirish aktiv",
  "Exercises require Pro": "Exercises uchun Pro kerak",
  "Start Pro route": "Pro routeni boshlash",
  "Open exercise": "Exercise ochish",
  "Locked exercise": "Yopiq exercise",
  "Bound test": "Bog'langan test",
  "Start exercises": "Exercises boshlash",
  "Unlock exercises": "Exercises ochish",
  "First 7 days": "Birinchi 7 kun",

  "Post-test analytics": "Testdan keyingi analytics",
  "Score report": "Score report",
  "Print report": "Reportni chop etish",
  "New test": "Yangi test",
  "Loading score report": "Score report yuklanmoqda",
  "Back to dashboard": "Dashboardga qaytish",

  "SAT pricing": "SAT narxlari",
  "Tariffs and prices for serious SAT improvement.": "Jiddiy SAT o'sishi uchun tariflar va narxlar.",
  "Choose a plan when you are ready to unlock practice, analytics, and My 1400+. If you are unsure, take the free diagnostic first.": "Practice, analytics va My 1400+ yo'nalishini ochishga tayyor bo'lsangiz, rejani tanlang. Ishonchingiz komil bo'lmasa, avval bepul diagnostikadan o'ting.",
  "For parents": "Ota-onalar uchun",
  "Short payment note": "Qisqa to'lov izohi",
  "Payment can be made through Click, Payme, Paynet, card, or transfer. Send the receipt to the Telegram bot with the email used during registration. After confirmation, access opens for 30 days.": "To'lov Click, Payme, Paynet, karta yoki o'tkazma orqali qilinadi. Chekni Telegram botga ro'yxatdan o'tgan email bilan yuboring. Tasdiqlangandan keyin kirish 30 kunga ochiladi.",
  "Free plan": "Bepul reja",
  "For students who want to see their real SAT level before choosing a paid route.": "Pullik yo'nalishni tanlashdan oldin real SAT darajasini ko'rmoqchi bo'lgan o'quvchilar uchun.",
  "Pay and activate": "To'lash va faollashtirish",
  "Most useful": "Eng foydali",
  "Main funnel": "Asosiy yo'l",
  "Ready to continue? Choose Pro, pay by Click, Payme, Paynet, card, or transfer, then activate through Telegram.": "Davom etishga tayyormisiz? Pro'ni tanlang, Click, Payme, Paynet, karta yoki o'tkazma orqali to'lang, keyin Telegram orqali faollashtiring.",
  "Choose Pro": "Pro tanlash",

  "Our Trusted Partners": "Ishonchli hamkorlarimiz",
  "Diagnostic first. Clear plan next.": "Avval diagnostika. Keyin aniq reja.",
  "Your SAT Growth Plan": "SAT o'sish rejangiz",
  "Your SAT": "SAT",
  "Growth Plan": "O'sish rejangiz",
  "Take one mock test and get a personal route for steady score growth.": "Bitta sinov testini topshiring va barqaror ball o'sishi uchun shaxsiy yo'nalish oling.",
  "Free Diagnostic Start": "Bepul diagnostikani boshlash",
  "Results Proof": "Natija isboti",
  "Verified SAT growth with student videos and score reports.": "O'quvchi videolari va score reportlar bilan tasdiqlangan SAT o'sishi.",
  "Tap a result to see the student video and official SAT score report where available.": "O'quvchi videosi va mavjud bo'lsa rasmiy SAT score reportni ko'rish uchun natijani bosing.",
  "Parent Feedback": "Ota-ona fikri",
  "Muslima's mother - Telegram": "Muslimaning onasi - Telegram",
  "Thank you. Your contribution to these results is truly important. May Allah support you, and may all your students achieve high scores that make their parents proud. Amen.": "Rahmat, bu natijalarda sizning hissangiz ham katta. Allohim sizni qo'llab-quvvatlasin. O'quvchilaringiz yuqori ballari bilan ota-onasini xursand qilsin. Amin.",
  "Growth": "O'sish",
  "Reached 1330 SAT in 3 months": "3 oyda 1330 SAT natijaga yetdi",
  "Scored 1200 SAT": "1200 SAT natija oldi",
  "Improved from 1000 to 1200": "1000 dan 1200 gacha o'sdi",
  "Improved from 900 to 1100 at age 16": "16 yoshida 900 dan 1100 gacha o'sdi",
  "Video + SAT hisobot": "Video + SAT hisobot",
  "Video + SAT score report": "Video + SAT hisobot",
  "Diagnostic plan + targeted SAT practice": "Diagnostik reja + targeted SAT practice",
  "SAT preparation + score report review": "SAT tayyorgarlik + score report review",
  "SATTEST.UZ practice route + mock review": "SATTEST.UZ practice route + mock review",
  "Diagnostic review + targeted weak-topic drills": "Diagnostika review + zaif mavzu drills",
  "Diagnostic analytics + targeted SAT practice": "Diagnostik analytics + targeted SAT practice",
  "Digital SAT practice engine": "Digital SAT practice dvijogi",
  "Founder trust": "Asoschilar ishonchi",
  "SATTEST.UZ was initiated and crafted by the Botirov Brothers.": "SATTEST.UZ Botirov Brothers tomonidan boshlangan va yaratilgan.",
  "Particularly, Bakhrom Botirov is the founder and CEO of Richmond School, a CELTA and PGCEi holder, a 1540 SAT scorer, and has been teaching since 2021. Doniyor Botirov is the founder of Mr. Doniyor Learning Center and brings the same serious academic standard with a 1590 SAT result.": "Xususan, Bakhrom Botirov Richmond School asoschisi va CEO'si, CELTA va PGCEi egasi, 1540 SAT natija sohibi va 2021 yildan beri dars beradi. Doniyor Botirov Mr. Doniyor Learning Center asoschisi bo'lib, 1590 SAT natijasi bilan xuddi shunday jiddiy akademik standart olib keladi.",
  "Botirov Brothers SAT proof": "Botirov Brothers SAT isboti",
  "Bakhrom Botirov 1540 · Doniyor Botirov 1590": "Bakhrom Botirov 1540 · Doniyor Botirov 1590",
  "Bakhrom Botirov score proof": "Bakhrom Botirov natija isboti",
  "Doniyor Botirov, founder of Mr. Doniyor Learning Center": "Doniyor Botirov, Mr. Doniyor Learning Center asoschisi",
  "Teaching experience": "Dars berish tajribasi",
  "International teacher qualifications": "Xalqaro o'qituvchi malakalari",
  "Bakhrom 1540 SAT proof": "Bakhrom 1540 SAT isboti",
  "Doniyor 1590 SAT proof": "Doniyor 1590 SAT isboti",
  "Why SATTEST.UZ exists": "SATTEST.UZ nega mavjud",
  "The platform was built so students do not waste months guessing what to study. A diagnostic should show the exact weak skills, then turn them into daily repair work.": "Platforma o'quvchilar nimani o'qishni oylar davomida taxmin qilib vaqt yo'qotmasligi uchun qurilgan. Diagnostika aniq zaif ko'nikmalarni ko'rsatishi va ularni kundalik tuzatish ishiga aylantirishi kerak.",
  "Telegram: @FounderSATTESTUZ": "Telegram: @FounderSATTESTUZ",
  "Why SATTEST.UZ works": "Nega SATTEST.UZ ishlaydi",
  "A diagnostic SAT platform that turns mistakes into a plan.": "Xatolarni rejaga aylantiradigan diagnostik SAT platforma.",
  "Students do not just finish a mock test. They receive score reports, weakness maps, mistake analysis, and targeted practice routes built around Reading, Writing, and Math.": "O'quvchilar shunchaki mock test tugatmaydi. Ular score reports, weakness maps, mistake analysis va Reading, Writing, Math atrofida qurilgan targeted practice routes oladi.",
  "Bluebook-style mock tests": "Bluebook uslubidagi mock testlar",
  "Timed modules, review flow, and realistic SAT pressure.": "Timed modules, review flow va real SAT pressure.",
  "Personal weakness tracking": "Shaxsiy weakness tracking",
  "Every missed pattern becomes a focused practice target.": "Har bir missed pattern focused practice targetga aylanadi.",
  "1400+ curriculum direction": "1400+ curriculum yo'nalishi",
  "Students know exactly what to study after the diagnostic.": "O'quvchilar diagnostikadan keyin nimani o'qishni aniq biladi.",
  "Sound on": "Ovozni yoqish",
  "Sound off": "Ovozni o'chirish",
  "Diagnostic preview": "Diagnostika preview",
  "Before a student practices, SATTEST.UZ shows exactly what is holding the score down.": "O'quvchi practice boshlashidan oldin SATTEST.UZ ballni nima past ushlab turganini aniq ko'rsatadi.",
  "The mock test becomes a personal report: section scores, weak question types, repeated mistake patterns, timing pressure, and the first study tasks needed to start improving.": "Mock test shaxsiy reportga aylanadi: section scores, weak question types, takroriy mistake patterns, timing pressure va yaxshilanishni boshlash uchun birinchi study tasks.",
  "Weak areas": "Zaif joylar",
  "Inference": "Inference",
  "Algebra": "Algebra",
  "Grammar precision": "Grammar aniqligi",
  "Mistake patterns": "Xato patternlari",
  "Causal gap trap": "Causal gap trap",
  "Comma boundary error": "Comma boundary xatosi",
  "Linear equation setup": "Linear equation setup",
  "The report does not only mark answers wrong. It explains why the wrong choice looked tempting and what rule the student must use next time.": "Report faqat javobni noto'g'ri deb belgilamaydi. U noto'g'ri variant nega tempting ko'ringanini va keyingi safar qaysi rule ishlatilishi kerakligini tushuntiradi.",
  "First 7 days generated from this report": "Ushbu reportdan yaratilgan birinchi 7 kun",
  "Inference drills + explanation review": "Inference drills + explanation review",
  "Algebra equation setup and timed practice": "Algebra equation setup va timed practice",
  "Grammar punctuation targets and mixed review": "Grammar punctuation targets va mixed review",
  "Personal study plan": "Shaxsiy study plan",
  "A 30-day route built from the exact mistakes in the diagnostic test.": "Diagnostik testdagi aniq xatolardan qurilgan 30 kunlik route.",
  "SATTEST.UZ does not give random practice. After the mock test, every wrong answer becomes a weakness target, every weakness becomes a daily task, and every task is connected to Reading, Writing, or Math drills that move the score upward.": "SATTEST.UZ random practice bermaydi. Mock testdan keyin har bir noto'g'ri javob weakness targetga, har bir weakness daily taskga, har bir task esa ballni oshiradigan Reading, Writing yoki Math drillsga ulanadi.",
  "30-day minimum target": "30 kunlik minimal maqsad",
  "Built for steady improvement when the student completes the assigned daily work.": "O'quvchi berilgan kundalik ishni bajarganda barqaror improvement uchun qurilgan.",
  "Projected growth": "Kutilgan o'sish",
  "Diagnostic to 30 days": "Diagnostikadan 30 kungacha",
  "Diagnostic": "Diagnostika",
  "Week 1": "1-hafta",
  "Week 2": "2-hafta",
  "Diagnose": "Diagnostika qilish",
  "Find the exact question types, traps, timing issues, and weak topics holding the student back.": "O'quvchini ushlab turgan aniq question types, traps, timing issues va weak topicsni topish.",
  "Assign": "Tayinlash",
  "Convert mistakes into daily Reading, Writing, and Math work with a clear hour-by-hour plan.": "Xatolarni aniq hour-by-hour plan bilan kundalik Reading, Writing va Math ishiga aylantirish.",
  "Improve": "Yaxshilash",
  "Repeat targeted drills, review explanations, and confirm progress with section tests.": "Targeted drillsni takrorlash, explanationsni review qilish va progressni section tests bilan tasdiqlash.",

  "Question quality control": "Savol sifati nazorati",
  "Generate graphs": "Graphlarni yaratish",
  "Refresh": "Yangilash",
  "Approve": "Tasdiqlash",
  "Flag": "Flag",
  "Disable": "O'chirish",
  "Manual difficulty": "Qo'lda qiyinlik",
  "Validation notes": "Validation notes",
  "Mark reviewed": "Reviewed deb belgilash",
  "Distractor effectiveness": "Distractor effectiveness",
  "Choice": "Variant",
  "Trap role": "Trap roli",
  "Error basis": "Xato asosi",

  "1400+ exercise route unlocked": "1400+ exercise route ochildi",
  "1400+ exercise route ready": "1400+ exercise route tayyor",
  "Your weak topics are clear. Open your exercise route now.": "Zaif mavzularingiz aniq. Exercise routeni hozir oching.",
  "You now know why the score is stuck. The exact exercises are waiting.": "Ball nega qotib qolganini endi bilasiz. Aniq exercises kutmoqda.",
  "Current score": "Hozirgi ball",
  "First priority weaknesses": "Birinchi ustuvor zaifliklar",
  "Next proof point": "Keyingi proof point",
  "Next mini mock scheduled": "Keyingi mini mock rejalashtirilgan",
  "Stay on report": "Reportda qolish",
  "Open exercise route": "Exercise routeni ochish",
  "Unlock exercise route": "Exercise routeni ochish"
};

const dictionaries: Record<Exclude<Language, "en">, TranslationMap> = { ru, uz };
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();
let activeTranslatorLanguage: Language = "en";

function withWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function dynamicTranslate(value: string, dictionary: TranslationMap) {
  const trimmed = value.trim();
  const exact = dictionary[trimmed];
  if (exact) return withWhitespace(value, exact);

  const question = trimmed.match(/^Question (\d+) of (\d+)$/);
  if (question) {
    const phrase = dictionary.Question || "Question";
    const of = dictionary.of || "of";
    return withWhitespace(value, `${phrase} ${question[1]} ${of} ${question[2]}`);
  }

  const score = trimmed.match(/^Score: (\d+)\/(\d+)$/);
  if (score) {
    const phrase = dictionary.Score || "Score";
    return withWhitespace(value, `${phrase}: ${score[1]}/${score[2]}`);
  }

  const step = trimmed.match(/^Step (\d+)$/);
  if (step) {
    const phrase = dictionary.Step || "Step";
    return withWhitespace(value, `${phrase} ${step[1]}`);
  }

  const day = trimmed.match(/^Day (\d+)$/);
  if (day) {
    const phrase = dictionary.Day || "Day";
    return withWhitespace(value, `${phrase} ${day[1]}`);
  }

  return value;
}

function translateElementAttributes(element: Element, dictionary: TranslationMap | null) {
  const attrs = ["aria-label", "title", "placeholder", "alt"];
  const saved = originalAttributes.get(element) ?? {};

  attrs.forEach((attr) => {
    const current = element.getAttribute(attr);
    if (!current) return;
    if (!saved[attr]) saved[attr] = current;
    const original = saved[attr];
    element.setAttribute(attr, dictionary ? dynamicTranslate(original, dictionary) : original);
  });

  if (Object.keys(saved).length) originalAttributes.set(element, saved);
}

function translateNode(root: ParentNode, language: Language) {
  const dictionary = language === "en" ? null : dictionaries[language];
  document.documentElement.lang = language;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue ?? "");
    const original = originalText.get(node) ?? "";
    node.nodeValue = dictionary ? dynamicTranslate(original, dictionary) : original;
  });

  if (root instanceof Element) translateElementAttributes(root, dictionary);
  root.querySelectorAll?.("*").forEach((element) => translateElementAttributes(element, dictionary));
}

function languageHref(language: Language) {
  if (typeof window === "undefined") return `?lang=${language}`;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function SiteTranslator() {
  const { language, setLanguage } = useLanguage();
  const applyLanguage = (next: Language) => {
    activeTranslatorLanguage = next;
    setLanguage(next);
    if (typeof document !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      translateNode(document.body, next);
      window.requestAnimationFrame(() => translateNode(document.body, next));
    }
  };

  useEffect(() => {
    activeTranslatorLanguage = language;
    const apply = () => translateNode(document.body, activeTranslatorLanguage);
    apply();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [language]);

  useEffect(() => {
    const onLanguageClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("[data-sattest-language]") : null;
      const next = target?.getAttribute("data-sattest-language");
      if (next === "en" || next === "ru" || next === "uz") {
        event.preventDefault();
        applyLanguage(next);
      }
    };

    document.addEventListener("click", onLanguageClick);
    return () => {
      document.removeEventListener("click", onLanguageClick);
    };
  }, [setLanguage]);

  return (
    <div
      className="fixed bottom-4 left-4 z-[999] flex items-center border border-white/12 bg-black/70 p-1 text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-md"
      aria-label="Global language selector"
    >
      {languages.map((item) => (
        <a
          className={[
            "flex h-8 items-center px-2 text-[9px] font-black uppercase tracking-[0.12em] transition-colors",
            language === item.code ? "bg-white text-black" : "text-white/55 hover:text-white"
          ].join(" ")}
          data-sattest-language={item.code}
          href={languageHref(item.code)}
          key={item.code}
          onClick={(event) => {
            event.preventDefault();
            applyLanguage(item.code);
          }}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
