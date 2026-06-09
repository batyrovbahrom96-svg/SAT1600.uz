"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, Volume2, VolumeX, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { useLanguage, type Language } from "@/lib/i18n";
import { studentResults, type StudentResult } from "@/lib/student-results";

const slides = [
  {
    id: "practice",
    nav: "Practice",
    eyebrow: "Diagnostic first. Clear plan next.",
    title: ["Your SAT", "Growth Plan"],
    body: "Take one mock test and get a personal route for steady score growth.",
    cta: "Start free diagnostic",
    href: "/mock-test",
    vertical: ["S", "A", "T", "1", "6", "0", "0"],
    stat: "01"
  },
  {
    id: "analytics",
    nav: "Analytics",
    eyebrow: "Know every lost point",
    title: ["Weakness", "Analytics"],
    body: "See weak skills, trap patterns, timing pressure, and the next task to fix.",
    cta: "View demo report",
    href: "/results/demo",
    vertical: ["A", "N", "A", "L", "Y", "T", "I", "C", "S"],
    stat: "02"
  },
  {
    id: "growth",
    nav: "Growth",
    eyebrow: "Built for steady score growth",
    title: ["30-Day", "Improvement"],
    body: "Daily Reading, Writing, and Math work built from diagnostic mistakes.",
    cta: "See pricing",
    href: "/pricing",
    vertical: ["P", "R", "O", "G", "R", "E", "S", "S"],
    stat: "03"
  }
];

const transitionMs = 1250;

const loadingSequence = [20, 50, 70, 100];
const skipHomeIntroKey = "sattest_skip_home_intro";
const skipHomeIntroEvent = "sattest:skip-home-intro";
const partnerLogos = [
  { logo: "/assets/partners/mister%20doniyor.webp", name: "Mr. Doniyor School" },
  { logo: "/assets/partners/result-logo.jpg", name: "Result Learning Center" },
  { logo: "/assets/partners/Thompson.jpg", name: "Thompson Learning Center" },
  { logo: "/assets/partners/Screenshot%202026-05-31%20at%2022.26.00.png", name: "AzaMath" },
  { logo: "/assets/partners/Cambridge%20Learning%20Center.jpg", name: "Cambridge Learning Center" },
  { logo: "/assets/partners/Richmond%20School.png", name: "Richmond School" }
];

const studentResultCopy: Record<
  Language,
  Record<string, { evidence: string; improvement: string; method: string; testLabel: string; note: string }>
> = {
  en: {
    "Muslima Xalikova": {
      improvement: "Reached 1330 SAT in 3 months",
      method: "Diagnostic plan + targeted SAT practice",
      evidence: "Video + SAT score report",
      testLabel: "SAT test",
      note: "Result proof is shared for credibility. Parent comments will be added after written permission."
    },
    "David Sarkisov": {
      improvement: "Scored 1200 SAT",
      method: "SAT preparation + score report review",
      evidence: "Video + SAT score report",
      testLabel: "SAT test",
      note: "Result proof is shared for credibility. Parent comments will be added after written permission."
    },
    "Said Usmanov": {
      improvement: "Scored 1200 SAT",
      method: "SAT preparation + score report review",
      evidence: "Video + SAT score report",
      testLabel: "SAT test",
      note: "Result proof is shared for credibility. Parent comments will be added after written permission."
    },
    "Jasmina Abdihamidova": {
      improvement: "Improved from 1000 to 1200",
      method: "SATTEST.UZ practice route + mock review",
      evidence: "Video + SAT score report",
      testLabel: "SAT test",
      note: "Result proof is shared for credibility. Parent comments will be added after written permission."
    },
    "Ulugbek Abdurahmonov": {
      improvement: "Improved from 900 to 1100 at age 16",
      method: "Diagnostic review + targeted weak-topic drills",
      evidence: "Video + SAT score report",
      testLabel: "SAT test",
      note: "Result proof is shared for credibility. Parent comments will be added after written permission."
    },
    "Ismail Sobinov": {
      improvement: "Scored 1200 SAT",
      method: "Diagnostic analytics + targeted SAT practice",
      evidence: "Video + SAT score report",
      testLabel: "SAT test",
      note: "Result proof is shared for credibility. Parent comments will be added after written permission."
    }
  },
  ru: {
    "Muslima Xalikova": {
      improvement: "Достигла 1330 SAT за 3 месяца",
      method: "Диагностический план + целевая SAT-практика",
      evidence: "Видео + отчет SAT",
      testLabel: "Дата SAT",
      note: "Доказательства результатов показаны для доверия. Комментарии родителей добавляются только после письменного разрешения."
    },
    "David Sarkisov": {
      improvement: "Получил 1200 SAT",
      method: "SAT-подготовка + разбор отчета о баллах",
      evidence: "Видео + отчет SAT",
      testLabel: "Дата SAT",
      note: "Доказательства результатов показаны для доверия. Комментарии родителей добавляются только после письменного разрешения."
    },
    "Said Usmanov": {
      improvement: "Получил 1200 SAT",
      method: "SAT-подготовка + разбор отчета о баллах",
      evidence: "Видео + отчет SAT",
      testLabel: "Дата SAT",
      note: "Доказательства результатов показаны для доверия. Комментарии родителей добавляются только после письменного разрешения."
    },
    "Jasmina Abdihamidova": {
      improvement: "Выросла с 1000 до 1200",
      method: "Маршрут SATTEST.UZ + разбор пробного теста",
      evidence: "Видео + отчет SAT",
      testLabel: "Дата SAT",
      note: "Доказательства результатов показаны для доверия. Комментарии родителей добавляются только после письменного разрешения."
    },
    "Ulugbek Abdurahmonov": {
      improvement: "Вырос с 900 до 1100 в 16 лет",
      method: "Разбор диагностики + целевые упражнения по слабым темам",
      evidence: "Видео + отчет SAT",
      testLabel: "Дата SAT",
      note: "Доказательства результатов показаны для доверия. Комментарии родителей добавляются только после письменного разрешения."
    },
    "Ismail Sobinov": {
      improvement: "Получил 1200 SAT",
      method: "Диагностическая аналитика + целевая SAT-практика",
      evidence: "Видео + отчет SAT",
      testLabel: "Дата SAT",
      note: "Доказательства результатов показаны для доверия. Комментарии родителей добавляются только после письменного разрешения."
    }
  },
  uz: {
    "Muslima Xalikova": {
      improvement: "3 oyda 1330 SAT natijaga yetdi",
      method: "Diagnostik reja + maqsadli SAT mashqlari",
      evidence: "Video + SAT hisobot",
      testLabel: "SAT sanasi",
      note: "Natija isbotlari ishonch uchun ko'rsatilgan. Ota-ona izohlari yozma ruxsatdan keyin qo'shiladi."
    },
    "David Sarkisov": {
      improvement: "1200 SAT natija oldi",
      method: "SAT tayyorgarlik + ball hisobotini tahlil qilish",
      evidence: "Video + SAT hisobot",
      testLabel: "SAT sanasi",
      note: "Natija isbotlari ishonch uchun ko'rsatilgan. Ota-ona izohlari yozma ruxsatdan keyin qo'shiladi."
    },
    "Said Usmanov": {
      improvement: "1200 SAT natija oldi",
      method: "SAT tayyorgarlik + ball hisobotini tahlil qilish",
      evidence: "Video + SAT hisobot",
      testLabel: "SAT sanasi",
      note: "Natija isbotlari ishonch uchun ko'rsatilgan. Ota-ona izohlari yozma ruxsatdan keyin qo'shiladi."
    },
    "Jasmina Abdihamidova": {
      improvement: "1000 dan 1200 gacha o'sdi",
      method: "SATTEST.UZ mashq yo'nalishi + sinov testini tahlil qilish",
      evidence: "Video + SAT hisobot",
      testLabel: "SAT sanasi",
      note: "Natija isbotlari ishonch uchun ko'rsatilgan. Ota-ona izohlari yozma ruxsatdan keyin qo'shiladi."
    },
    "Ulugbek Abdurahmonov": {
      improvement: "16 yoshida 900 dan 1100 gacha o'sdi",
      method: "Diagnostika tahlili + zaif mavzu mashqlari",
      evidence: "Video + SAT hisobot",
      testLabel: "SAT sanasi",
      note: "Natija isbotlari ishonch uchun ko'rsatilgan. Ota-ona izohlari yozma ruxsatdan keyin qo'shiladi."
    },
    "Ismail Sobinov": {
      improvement: "1200 SAT natija oldi",
      method: "Diagnostik tahlil + maqsadli SAT mashqlari",
      evidence: "Video + SAT hisobot",
      testLabel: "SAT sanasi",
      note: "Natija isbotlari ishonch uchun ko'rsatilgan. Ota-ona izohlari yozma ruxsatdan keyin qo'shiladi."
    }
  }
};

const homepageFaqs = [
  {
    question: "When do I get access?",
    answer: "After payment, send your receipt in Telegram. Your account is activated manually after the payment is checked."
  },
  {
    question: "Can I cancel?",
    answer: "Yes. The monthly plan is not a long contract. You can stop before the next month and keep using access until the paid period ends."
  },
  {
    question: "Is there a refund?",
    answer: "Refunds are reviewed case by case before the account is actively used. After mock tests, reports, or practice access are used, the payment is normally not refundable."
  },
  {
    question: "How many mock tests?",
    answer: "The free plan includes one mini diagnostic preview and one saved diagnostic after registration. SATTEST Pro is built for repeated practice, diagnostic analytics, and the personal My 1400+ route."
  },
  {
    question: "Is this official SAT?",
    answer: "No. SATTEST.UZ is an independent SAT preparation platform. SAT is a trademark of College Board, and this site is not endorsed by College Board."
  },
  {
    question: "Do I need a teacher?",
    answer: "For self-study students, SATTEST Pro gives structure and targeted practice. If a student needs personal correction or parent updates, contact the founder separately in Telegram."
  },
  {
    question: "What happens after I pay?",
    answer: "You scan the Paynet QR or pay by Click, Payme, card, or transfer. Then send the receipt to the Telegram bot with the same email used during registration."
  },
  {
    question: "How do parents track progress?",
    answer: "Parents can follow mock scores, weak topics, completed practice, and review updates. For personal progress communication, families can contact the founder in Telegram."
  }
];

const topScoreProofs = [
  {
    image: "/assets/results/doniyor-botirov-1590-sat.jpg",
    name: "Doniyor Botirov",
    score: "1590 SAT",
    readingWriting: "790",
    math: "800",
    kind: "Founder proof",
    accent: "#d7cc95"
  },
  {
    image: "/assets/results/top-sat/rakhmonov-shokhrukh-1580-sat.png",
    name: "Rakhmonov Shokhrukh",
    score: "1580 SAT",
    readingWriting: "780",
    math: "800",
    kind: "Student proof",
    accent: "#8ff1c6"
  },
  {
    image: "/assets/results/top-sat/saidov-bekhruz-1550-sat.jpg",
    name: "Saidov Bekhruz",
    score: "1550 SAT",
    readingWriting: "760",
    math: "790",
    kind: "Student proof",
    accent: "#99d7ff"
  },
  {
    image: "/assets/results/top-sat/nurmatov-dilshod-1550-sat.png",
    name: "Nurmatov Dilshod",
    score: "1550 SAT",
    readingWriting: "770",
    math: "780",
    kind: "Student proof",
    accent: "#b7c5ff"
  },
  {
    image: "/assets/results/bakhrom-botirov-1540-sat.jpg",
    name: "Bakhrom Botirov",
    score: "1540 SAT",
    readingWriting: "760",
    math: "780",
    kind: "Founder proof",
    accent: "#f0b6b6"
  },
  {
    image: "/assets/results/top-sat/karimov-aziz-1540-sat.png",
    name: "Karimov Aziz",
    score: "1540 SAT",
    readingWriting: "760",
    math: "780",
    kind: "Student proof",
    accent: "#c4b5fd"
  },
  {
    image: "/assets/results/top-sat/abdullayev-jasur-1540-sat.png",
    name: "Abdullayev Jasur",
    score: "1540 SAT",
    readingWriting: "750",
    math: "790",
    kind: "Student proof",
    accent: "#8ff1c6"
  },
  {
    image: "/assets/results/top-sat/yusupov-islom-1500-sat.png",
    name: "Yusupov Islom",
    score: "1500 SAT",
    readingWriting: "720",
    math: "780",
    kind: "Student proof",
    accent: "#d7cc95"
  },
  {
    image: "/assets/results/top-sat/tursunov-farrukh-1500-sat.png",
    name: "Tursunov Farrukh",
    score: "1500 SAT",
    readingWriting: "720",
    math: "780",
    kind: "Student proof",
    accent: "#99d7ff"
  },
  {
    image: "/assets/results/top-sat/khasanov-mirjalol-1500-sat.png",
    name: "Khasanov Mirjalol",
    score: "1500 SAT",
    readingWriting: "740",
    math: "760",
    kind: "Student proof",
    accent: "#b7c5ff"
  }
];

const testimonialStudents = [
  {
    image: "/assets/results/muslima-xalikova-1330-sat.png",
    name: "Muslima Xalikova",
    score: "1330 SAT",
    accent: "#8ff1c6"
  },
  {
    image: "/assets/results/jasmina-abdihamidova-1200-sat.jpg",
    name: "Jasmina Abdihamidova",
    score: "1200 SAT",
    accent: "#d7cc95"
  },
  {
    image: "/assets/results/ulugbek-abdurahmonov-1100-sat.jpg",
    name: "Ulugbek Abdurahmonov",
    score: "1100 SAT",
    accent: "#b7c5ff"
  },
  {
    image: "/assets/results/said-usmanov-1200-sat.jpg",
    name: "Said Usmanov",
    score: "1200 SAT",
    accent: "#f0b6b6"
  },
  {
    image: "/assets/results/ismail-sobinov-1200-sat.jpg",
    name: "Ismail Sobinov",
    score: "1200 SAT",
    accent: "#c4b5fd"
  },
  {
    image: "/assets/results/zafar-bazarov-1150-sat.jpg",
    name: "Zafar Bazarov",
    score: "1150 SAT",
    accent: "#99d7ff"
  },
  ...topScoreProofs.map((proof) => ({
    image: proof.image,
    name: proof.name,
    score: proof.score,
    accent: proof.accent
  }))
];

type HomeSlide = (typeof slides)[number];
type TestimonialStudent = (typeof testimonialStudents)[number];
type TopScoreProof = (typeof topScoreProofs)[number];

const homeCopy: Record<
  Language,
  {
    slides: HomeSlide[];
    partnerLabel: string;
    results: {
      eyebrow: string;
      title: string;
      body: string;
      parentLabel: string;
      parentSource: string;
      parentGreeting: string;
      parentBody: string;
      close: string;
      prev: string;
      next: string;
    };
    testimonials: {
      eyebrow: string;
      title: string;
      body: string;
      verified: string;
      items: Array<{ quote: string; role: string }>;
    };
    topScores: {
      eyebrow: string;
      title: string;
      body: string;
      highestLabel: string;
      founderLabel: string;
      scoreLabel: string;
      rwLabel: string;
      mathLabel: string;
      proofLabel: string;
      founderProofLabel: string;
      studentProofLabel: string;
      reportsLine: string;
      cta: string;
    };
    parent: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      summaryReportLabel: string;
      summaryReportValue: string;
      summaryReportBody: string;
      summaryFocusLabel: string;
      summaryFocusValue: string;
      summaryFocusBody: string;
      cards: Array<{ title: string; body: string }>;
    };
    faq: {
      eyebrow: string;
      title: string;
      body: string;
      paymentLabel: string;
      paymentBody: string;
      cta: string;
      items: Array<{ question: string; answer: string }>;
    };
  }
> = {
  en: {
    slides,
    partnerLabel: "Trusted Learning Centers",
    results: {
      eyebrow: "Results Proof",
      title: "Verified SAT growth with student videos and score reports.",
      body: "Tap a result to see the student video and official SAT score report where available.",
      parentLabel: "Parent Feedback",
      parentSource: "Muslima's mother - Telegram",
      parentGreeting: "Assalomu alaykum.",
      parentBody:
        "Thank you. Your contribution to these results is truly important. May Allah support you, and may all your students achieve high scores that make their parents proud. Amen.",
      close: "Close student results",
      prev: "Previous student video",
      next: "Next student video"
    },
    testimonials: {
      eyebrow: "Student feedback",
      title: "What students say after the diagnostic becomes a real study route.",
      body: "A moving wall of student confidence, score growth, and daily practice habits built around SATTEST.UZ reports.",
      verified: "Verified score route",
      items: [
        {
          quote: "The report showed exactly where I was losing points. I stopped guessing and started fixing one weak topic at a time.",
          role: "Reading/Writing growth"
        },
        {
          quote: "The daily tasks made SAT practice feel organized. I could see what to do today instead of opening random questions.",
          role: "Daily practice routine"
        },
        {
          quote: "After every mock test, the weak areas became clear. Math and grammar practice finally felt targeted.",
          role: "Diagnostic analytics"
        },
        {
          quote: "My parents could see my progress, so preparation became more serious and consistent at home.",
          role: "Parent progress visibility"
        },
        {
          quote: "SATTEST helped me connect score reports with real practice. The plan was simple: review, drill, repeat.",
          role: "Score improvement plan"
        },
        {
          quote: "The platform made my mistakes visible. That was the first time I understood what was holding my score down.",
          role: "Mistake review"
        }
      ]
    },
    topScores: {
      eyebrow: "Top SAT score proof",
      title: "1590 founder proof. 1580 student proof. Multiple 1500+ score reports.",
      body:
        "This is the strongest selling signal for SATTEST.UZ: the founders have elite SAT scores, and students are now producing 1500+ verified score reports.",
      highestLabel: "Highest proof",
      founderLabel: "Founder standard",
      scoreLabel: "Total score",
      rwLabel: "Reading/Writing",
      mathLabel: "Math",
      proofLabel: "Official score report",
      founderProofLabel: "Founder proof",
      studentProofLabel: "Student proof",
      reportsLine: "8 student reports",
      cta: "Start free diagnostic"
    },
    parent: {
      eyebrow: "For parents",
      title: "You see real progress, not just attendance.",
      body: "Parents trust preparation more when they can see the score path, weak topics, completed work, and the next correction plan every week.",
      cta: "Open parent control",
      summaryReportLabel: "Weekly report",
      summaryReportValue: "Every Sunday",
      summaryReportBody: "Weekly report for parents",
      summaryFocusLabel: "Current focus",
      summaryFocusValue: "Advanced Math + transitions",
      summaryFocusBody: "Current focus: advanced Math and transitions in Reading/Writing",
      cards: [
        {
          title: "What parents receive each week",
          body: "Mock test score, completed task count, weak-topic list, and the plan for the next 7 days."
        },
        {
          title: "How progress is tracked",
          body: "Reading/Writing and Math scores are compared with accuracy, timing, and repeated mistakes."
        },
        {
          title: "How weak areas are shown",
          body: "Parents see exact weak skills such as transitions, evidence questions, algebra, or advanced math."
        },
        {
          title: "When to expect score growth",
          body: "Early changes can appear in 7-14 days; serious growth requires repeated mock-test cycles."
        }
      ]
    },
    faq: {
      eyebrow: "Pricing FAQ",
      title: "Clear answers before a parent pays.",
      body: "The payment process is simple for now: pay by QR, send the receipt, and get access after confirmation. These are the questions students and parents usually ask first.",
      paymentLabel: "Payment instruction",
      paymentBody:
        "After payment, send the receipt to the Telegram bot with the email used during registration. Pro access opens after confirmation.",
      cta: "Choose plan",
      items: homepageFaqs
    }
  },
  ru: {
    slides: [
      {
        ...slides[0],
        nav: "Практика",
        eyebrow: "Сначала диагностика. Затем ясный план.",
        title: ["Ваш план", "роста SAT"],
        body: "Пройдите один пробный тест и получите личный маршрут для стабильного роста балла.",
        cta: "Начать диагностику"
      },
      {
        ...slides[1],
        nav: "Аналитика",
        eyebrow: "Понимайте каждый потерянный балл",
        title: ["Аналитика", "слабых мест"],
        body: "Увидьте слабые навыки, ловушки, давление времени и следующую задачу для исправления.",
        cta: "Открыть демо-отчет"
      },
      {
        ...slides[2],
        nav: "Рост",
        eyebrow: "Система для стабильного роста",
        title: ["30 дней", "улучшения"],
        body: "Ежедневная работа по чтению, письму и математике, построенная на ошибках диагностики.",
        cta: "Смотреть цены"
      }
    ],
    partnerLabel: "Надежные учебные центры",
    results: {
      eyebrow: "Доказательство результата",
      title: "Подтвержденный рост SAT: видео учеников и отчеты с баллами.",
      body: "Нажмите на результат, чтобы посмотреть видео ученика и официальный отчет SAT, если он доступен.",
      parentLabel: "Отзыв родителя",
      parentSource: "Мама Муслимы - Telegram",
      parentGreeting: "Ассалому алайкум.",
      parentBody:
        "Спасибо. В этих результатах есть и ваш большой вклад. Пусть Аллах поддерживает вас, а ваши ученики получают высокие баллы и радуют своих родителей. Амин.",
      close: "Закрыть результаты учеников",
      prev: "Предыдущее видео ученика",
      next: "Следующее видео ученика"
    },
    testimonials: {
      eyebrow: "Отзывы учеников",
      title: "Что говорят ученики, когда диагностика превращается в реальный маршрут подготовки.",
      body: "Движущаяся лента отзывов о росте уверенности, баллов и привычки заниматься по отчетам SATTEST.UZ.",
      verified: "Проверенный маршрут",
      items: [
        {
          quote: "Отчет показал, где именно я теряю баллы. Я перестала гадать и начала исправлять одну слабую тему за другой.",
          role: "Рост по чтению и письму"
        },
        {
          quote: "Ежедневные задания сделали подготовку понятной. Я видел, что делать сегодня, а не решал случайные вопросы.",
          role: "Ежедневная практика"
        },
        {
          quote: "После каждого пробного теста слабые места становились ясными. Математика и грамматика стали точечной работой.",
          role: "Диагностическая аналитика"
        },
        {
          quote: "Родители видели мой прогресс, поэтому подготовка дома стала серьезнее и стабильнее.",
          role: "Прогресс для родителей"
        },
        {
          quote: "SATTEST связал отчет о баллах с настоящей практикой. План простой: разобрать, потренировать, повторить.",
          role: "План роста балла"
        },
        {
          quote: "Платформа сделала мои ошибки видимыми. Тогда я впервые понял, что именно держит мой балл ниже.",
          role: "Разбор ошибок"
        }
      ]
    },
    topScores: {
      eyebrow: "Доказательства топ SAT-баллов",
      title: "1590 у основателя. 1580 у ученика. Несколько отчетов 1500+.",
      body:
        "Это главный сигнал доверия SATTEST.UZ: основатели имеют элитные SAT-баллы, а ученики уже показывают подтвержденные результаты 1500+.",
      highestLabel: "Высший результат",
      founderLabel: "Стандарт основателей",
      scoreLabel: "Общий балл",
      rwLabel: "Чтение и письмо",
      mathLabel: "Математика",
      proofLabel: "Официальный отчет",
      founderProofLabel: "Доказательство основателя",
      studentProofLabel: "Доказательство ученика",
      reportsLine: "8 отчетов учеников",
      cta: "Начать диагностику"
    },
    parent: {
      eyebrow: "Для родителей",
      title: "Вы видите реальный прогресс, а не просто факт занятий.",
      body: "Родителям легче доверять подготовке, когда они каждую неделю видят путь к баллу, слабые темы, выполненные задания и следующий план исправления.",
      cta: "Открыть контроль",
      summaryReportLabel: "Еженедельный отчет",
      summaryReportValue: "Каждое воскресенье",
      summaryReportBody: "Еженедельный отчет для родителей",
      summaryFocusLabel: "Текущий фокус",
      summaryFocusValue: "Сложная математика + переходы",
      summaryFocusBody: "Текущий фокус: сложная математика и переходы в чтении и письме",
      cards: [
        {
          title: "Что родители получают каждую неделю",
          body: "Балл за пробный тест, количество выполненных заданий, список слабых тем и план на следующие 7 дней."
        },
        {
          title: "Как отслеживается прогресс",
          body: "Баллы по чтению, письму и математике сравниваются с точностью, временем и повторяющимися ошибками."
        },
        {
          title: "Как показываются слабые места",
          body: "Родители видят конкретные слабые навыки: переходы, вопросы на доказательства, алгебра или сложная математика."
        },
        {
          title: "Когда ожидать рост балла",
          body: "Первые изменения возможны через 7-14 дней; серьезный рост требует повторных циклов пробных тестов."
        }
      ]
    },
    faq: {
      eyebrow: "Вопросы по оплате",
      title: "Понятные ответы до оплаты.",
      body: "Процесс оплаты простой: оплатите по QR или другим способом, отправьте чек и получите доступ после подтверждения.",
      paymentLabel: "Инструкция по оплате",
      paymentBody:
        "После оплаты отправьте чек в Telegram-бот вместе с email, указанным при регистрации. После подтверждения откроется доступ Pro.",
      cta: "Выбрать план",
      items: [
        {
          question: "Когда я получу доступ?",
          answer: "После оплаты отправьте чек в Telegram. Аккаунт активируется вручную после проверки платежа."
        },
        {
          question: "Можно ли отменить подписку?",
          answer: "Да. Месячный план не является долгим контрактом. Вы можете остановиться до следующего месяца и пользоваться доступом до конца оплаченного периода."
        },
        {
          question: "Есть ли возврат?",
          answer: "Возврат рассматривается индивидуально до активного использования аккаунта. После пробных тестов, отчетов или практики платеж обычно не возвращается."
        },
        {
          question: "Сколько пробных тестов доступно?",
          answer: "Бесплатный план включает диагностический просмотр. SATTEST Pro создан для повторной практики, аналитики и личного маршрута к 1400+."
        },
        {
          question: "Это официальный SAT?",
          answer: "Нет. SATTEST.UZ — независимая платформа подготовки к SAT. SAT является товарным знаком College Board."
        },
        {
          question: "Нужен ли преподаватель?",
          answer: "Для самостоятельной подготовки Pro дает структуру и целевую практику. Для личной коррекции можно связаться с основателем в Telegram."
        },
        {
          question: "Что происходит после оплаты?",
          answer: "Вы оплачиваете через Paynet QR или другим способом, затем отправляете чек в Telegram-бот с email регистрации."
        },
        {
          question: "Как родители отслеживают прогресс?",
          answer: "Родители видят баллы пробных тестов, слабые темы, выполненную практику и план следующего исправления."
        }
      ]
    }
  },
  uz: {
    slides: [
      {
        ...slides[0],
        nav: "Mashq",
        eyebrow: "Avval diagnostika. Keyin aniq reja.",
        title: ["SAT o'sish", "rejangiz"],
        body: "Bitta sinov testini topshiring va barqaror ball o'sishi uchun shaxsiy yo'nalish oling.",
        cta: "Diagnostikani boshlash"
      },
      {
        ...slides[1],
        nav: "Tahlil",
        eyebrow: "Har bir yo'qotilgan ballni tushuning",
        title: ["Zaif joylar", "tahlili"],
        body: "Zaif ko'nikmalar, chalg'ituvchi xatolar, vaqt bosimi va keyingi tuzatish vazifasini ko'ring.",
        cta: "Demo hisobot"
      },
      {
        ...slides[2],
        nav: "O'sish",
        eyebrow: "Barqaror ball o'sishi uchun tizim",
        title: ["30 kunlik", "o'sish"],
        body: "Diagnostika xatolaridan tuzilgan kundalik o'qish, yozish va matematika ishlari.",
        cta: "Narxlarni ko'rish"
      }
    ],
    partnerLabel: "Ishonchli o'quv markazlari",
    results: {
      eyebrow: "Natija isboti",
      title: "O'quvchi videolari va rasmiy ball hisobotlari bilan tasdiqlangan SAT o'sishi.",
      body: "O'quvchi videosi va mavjud bo'lsa rasmiy SAT ball hisobotini ko'rish uchun natijani bosing.",
      parentLabel: "Ota-ona fikri",
      parentSource: "Muslimaning onasi - Telegram",
      parentGreeting: "Assalomu alaykum.",
      parentBody:
        "Rahmat, bu natijalarda sizning hissangiz ham katta. Allohim sizni qo'llab-quvvatlasin. O'quvchilaringiz yuqori ballari bilan ota-onasini xursand qilsin. Amin.",
      close: "O'quvchi natijalarini yopish",
      prev: "Oldingi o'quvchi videosi",
      next: "Keyingi o'quvchi videosi"
    },
    testimonials: {
      eyebrow: "O'quvchilar fikri",
      title: "Diagnostika real tayyorgarlik yo'nalishiga aylanganda o'quvchilar nima deydi.",
      body: "SATTEST.UZ hisobotlari orqali ishonch, ball o'sishi va kundalik mashq odatini ko'rsatadigan harakatdagi fikrlar devori.",
      verified: "Tekshirilgan ball yo'nalishi",
      items: [
        {
          quote: "Hisobot qayerda ball yo'qotayotganimni aniq ko'rsatdi. Taxmin qilishni to'xtatib, zaif mavzularni bittalab tuzata boshladim.",
          role: "O'qish va yozish bo'yicha o'sish"
        },
        {
          quote: "Kundalik vazifalar tayyorgarlikni tartibli qildi. Endi random savol emas, bugun nima qilishni bilaman.",
          role: "Kundalik mashq"
        },
        {
          quote: "Har bir sinov testidan keyin zaif joylar aniq ko'rindi. Matematika va grammatika mashqlari aniq maqsadga yo'naltirildi.",
          role: "Diagnostik tahlil"
        },
        {
          quote: "Ota-onam progressimni ko'ra oldi, shuning uchun uyda tayyorgarlik jiddiyroq va barqarorroq bo'ldi.",
          role: "Ota-ona nazorati"
        },
        {
          quote: "SATTEST ball hisobotini real mashqlar bilan bog'ladi. Reja oddiy: tahlil qilish, mashq qilish, takrorlash.",
          role: "Ball o'sish rejasi"
        },
        {
          quote: "Platforma xatolarimni ko'rinadigan qildi. Birinchi marta ballimni nima ushlab turganini tushundim.",
          role: "Xatolar tahlili"
        }
      ]
    },
    topScores: {
      eyebrow: "Eng yuqori SAT natija isbotlari",
      title: "Asoschida 1590. O'quvchida 1580. Bir nechta 1500+ rasmiy hisobotlar.",
      body:
        "Bu SATTEST.UZ uchun eng kuchli ishonch dalili: asoschilar yuqori SAT natijalariga ega, o'quvchilar esa tasdiqlangan 1500+ natijalarni ko'rsatmoqda.",
      highestLabel: "Eng yuqori isbot",
      founderLabel: "Asoschilar standarti",
      scoreLabel: "Umumiy ball",
      rwLabel: "O'qish va yozish",
      mathLabel: "Matematika",
      proofLabel: "Rasmiy ball hisoboti",
      founderProofLabel: "Asoschi isboti",
      studentProofLabel: "O'quvchi isboti",
      reportsLine: "8 ta o'quvchi hisoboti",
      cta: "Diagnostikani boshlash"
    },
    parent: {
      eyebrow: "Ota-onalar uchun",
      title: "Siz faqat darsga qatnashishni emas, real progressni ko'rasiz.",
      body: "Ota-onalar har hafta ball yo'nalishi, zaif mavzular, bajarilgan mashqlar va keyingi tuzatish rejasini ko'rsa, tayyorgarlikka ishonch kuchayadi.",
      cta: "Nazoratni ochish",
      summaryReportLabel: "Haftalik hisobot",
      summaryReportValue: "Har yakshanba",
      summaryReportBody: "Ota-onalar uchun haftalik hisobot",
      summaryFocusLabel: "Hozirgi fokus",
      summaryFocusValue: "Murakkab matematika + o'tish bog'lovchilari",
      summaryFocusBody: "Hozirgi fokus: murakkab matematika hamda o'qish va yozishdagi o'tish bog'lovchilari",
      cards: [
        {
          title: "Ota-onalar har hafta nima oladi",
          body: "Sinov testi bali, bajarilgan mashqlar soni, zaif mavzular ro'yxati va keyingi 7 kunlik reja."
        },
        {
          title: "Progress qanday kuzatiladi",
          body: "O'qish, yozish va matematika ballari aniqlik, vaqt va takroriy xatolar bilan solishtiriladi."
        },
        {
          title: "Zaif joylar qanday ko'rsatiladi",
          body: "Ota-onalar o'tish bog'lovchilari, dalilga asoslangan savollar, algebra yoki murakkab matematika kabi aniq zaif ko'nikmalarni ko'radi."
        },
        {
          title: "Ball o'sishini qachon kutish mumkin",
          body: "Dastlabki o'zgarishlar 7-14 kunda ko'rinishi mumkin; katta o'sish uchun takroriy sinov testlari kerak."
        }
      ]
    },
    faq: {
      eyebrow: "To'lov bo'yicha savollar",
      title: "Ota-ona to'lov qilishidan oldin aniq javoblar.",
      body: "To'lov jarayoni hozircha oddiy: QR orqali to'lang, chekni yuboring va tasdiqlangandan keyin kirish ochiladi.",
      paymentLabel: "To'lov yo'riqnomasi",
      paymentBody:
        "To'lovdan keyin chekni Telegram botga ro'yxatdan o'tgan email bilan yuboring. Tasdiqlangandan keyin Pro kirish ochiladi.",
      cta: "Rejani tanlash",
      items: [
        {
          question: "Kirish qachon ochiladi?",
          answer: "To'lovdan keyin chekni Telegramga yuboring. To'lov tekshirilgandan so'ng akkaunt qo'lda faollashtiriladi."
        },
        {
          question: "Bekor qilsam bo'ladimi?",
          answer: "Ha. Oylik reja uzoq muddatli shartnoma emas. Keyingi oy oldidan to'xtatishingiz mumkin."
        },
        {
          question: "Pul qaytariladimi?",
          answer: "Akkaunt faol ishlatilishidan oldin qaytarish alohida ko'rib chiqiladi. Sinov testi, hisobot yoki mashqlar ishlatilgandan keyin to'lov odatda qaytarilmaydi."
        },
        {
          question: "Nechta sinov testi bor?",
          answer: "Bepul reja diagnostik ko'rishni beradi. SATTEST Pro takroriy mashq, tahlil va My 1400+ yo'nalishi uchun qurilgan."
        },
        {
          question: "Bu rasmiy SAT saytimi?",
          answer: "Yo'q. SATTEST.UZ mustaqil SAT tayyorgarlik platformasi. SAT — College Board savdo belgisi."
        },
        {
          question: "O'qituvchi kerakmi?",
          answer: "Mustaqil tayyorlanadigan o'quvchilar uchun Pro tartibli mashq beradi. Shaxsiy tuzatish uchun Telegram orqali bog'lanish mumkin."
        },
        {
          question: "To'lovdan keyin nima bo'ladi?",
          answer: "Paynet QR yoki boshqa usul orqali to'laysiz, keyin chekni ro'yxatdan o'tgan email bilan Telegram botga yuborasiz."
        },
        {
          question: "Ota-onalar progressni qanday kuzatadi?",
          answer: "Ota-onalar sinov testi ballari, zaif mavzular, bajarilgan mashqlar va keyingi tuzatish rejasini ko'radi."
        }
      ]
    }
  }
};

function shouldSkipHomeIntro() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const shouldSkipFromUrl = params.get("skipIntro") === "1";
  let shouldSkipFromStorage = false;

  try {
    shouldSkipFromStorage = window.sessionStorage.getItem(skipHomeIntroKey) === "1";
  } catch {
    shouldSkipFromStorage = false;
  }

  const shouldSkip = shouldSkipFromUrl || shouldSkipFromStorage;
  if (shouldSkip) {
    try {
      window.sessionStorage.removeItem(skipHomeIntroKey);
    } catch {
      // Ignore storage access issues; URL-based skip still works.
    }
  }
  if (shouldSkipFromUrl) {
    params.delete("skipIntro");
    const nextQuery = params.toString();
    window.history.replaceState(null, "", nextQuery ? `/?${nextQuery}` : "/");
  }
  return shouldSkip;
}

function getLoaderDigits(value: number) {
  return value
    .toString()
    .padStart(3, " ")
    .split("")
    .map((digit) => (digit === " " ? "\u00a0" : digit));
}

function TestimonialCard({
  student,
  quote,
  role,
  verified
}: {
  student: TestimonialStudent;
  quote: string;
  role: string;
  verified: string;
}) {
  const isScoreReport = student.image.includes("/top-sat/") || student.image.includes("botirov-");

  return (
    <article
      className={`student-testimonials-section__card${isScoreReport ? " has-score-report" : ""}`}
      style={{ "--accent": student.accent } as CSSProperties & Record<"--accent", string>}
    >
      <div className="student-testimonials-section__student">
        <img src={student.image} alt={`${student.name} SAT result student`} />
        <div>
          <strong>{student.name}</strong>
          <span>{student.score}</span>
        </div>
      </div>
      <p>{quote}</p>
      <div className="student-testimonials-section__meta">
        <span>{role}</span>
        <em>{verified}</em>
      </div>
    </article>
  );
}

function TopScoreProofCard({
  proof,
  copy
}: {
  proof: TopScoreProof;
  copy: {
    scoreLabel: string;
    rwLabel: string;
    mathLabel: string;
    proofLabel: string;
    founderProofLabel: string;
    studentProofLabel: string;
  };
}) {
  const kindLabel = proof.kind === "Founder proof" ? copy.founderProofLabel : copy.studentProofLabel;

  return (
    <article
      className="top-score-proof-section__card"
      style={{ "--accent": proof.accent } as CSSProperties & Record<"--accent", string>}
    >
      <div className="top-score-proof-section__certificate">
        <img src={proof.image} alt={`${proof.name} ${proof.score} SAT score report`} />
      </div>
      <div className="top-score-proof-section__cardCopy">
        <span>{kindLabel}</span>
        <h3>{proof.name}</h3>
        <strong>{proof.score}</strong>
        <div>
          <p>
            <em>{copy.rwLabel}</em>
            <b>{proof.readingWriting}</b>
          </p>
          <p>
            <em>{copy.mathLabel}</em>
            <b>{proof.math}</b>
          </p>
        </div>
        <small>{copy.proofLabel}</small>
      </div>
    </article>
  );
}

export default function Home() {
  const { language } = useLanguage();
  const copy = homeCopy[language];
  const slides = copy.slides;
  const getStudentResultCopy = useCallback(
    (result: StudentResult) => studentResultCopy[language][result.name] ?? studentResultCopy.en[result.name],
    [language]
  );
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loadingFrame, setLoadingFrame] = useState({
    previous: loadingSequence[0],
    current: loadingSequence[0],
    step: 0
  });
  const [loadingStage, setLoadingStage] = useState<"numbers" | "brand" | "intro">("numbers");
  const [isLoaderExiting, setIsLoaderExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !shouldSkipHomeIntro());
  const [showResultsWall, setShowResultsWall] = useState(false);
  const [activeResultVideo, setActiveResultVideo] = useState<StudentResult | null>(null);
  const [activeFounderProof, setActiveFounderProof] = useState<"bakhrom" | "doniyor" | null>(null);
  const [isPlatformVideoMuted, setIsPlatformVideoMuted] = useState(true);
  const activeRef = useRef(active);
  const lockRef = useRef(false);
  const touchStartRef = useRef({ y: 0, time: 0 });
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const platformVideoRef = useRef<HTMLVideoElement | null>(null);
  const resultsCardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const skipIntroNow = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("skipIntro");
    const nextQuery = params.toString();
    window.history.replaceState(null, "", nextQuery ? `/?${nextQuery}` : "/");
    setIsLoaderExiting(false);
    setIsLoading(false);
    setLoadingStage("numbers");
    setLoadingFrame({
      previous: loadingSequence[0],
      current: loadingSequence[0],
      step: 0
    });
  }, []);

  useEffect(() => {
    if (shouldSkipHomeIntro()) {
      skipIntroNow();
    }
  }, [skipIntroNow]);

  useEffect(() => {
    window.addEventListener(skipHomeIntroEvent, skipIntroNow);

    return () => {
      window.removeEventListener(skipHomeIntroEvent, skipIntroNow);
    };
  }, [skipIntroNow]);

  const finishLoading = useCallback(() => {
    setIsLoaderExiting(true);

    window.setTimeout(() => {
      setIsLoading(false);
    }, 1250);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }

    const timers = [
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[1], step: frame.step + 1 }));
      }, 1800),
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[2], step: frame.step + 1 }));
      }, 3600),
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[3], step: frame.step + 1 }));
      }, 5400),
      window.setTimeout(() => setLoadingStage("brand"), 7600),
      window.setTimeout(() => setLoadingStage("intro"), 13200)
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isLoading]);

  useEffect(() => {
    if (loadingStage !== "intro") {
      return undefined;
    }

    const video = introVideoRef.current;
    video?.play().catch(() => undefined);

    const fallbackTimer = window.setTimeout(() => {
      finishLoading();
    }, 6200);

    return () => window.clearTimeout(fallbackTimer);
  }, [finishLoading, loadingStage]);

  useEffect(() => {
    const previousOverflowX = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";

    return () => {
      document.body.style.overflowX = previousOverflowX;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowResultsWall(true);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const goTo = useCallback((targetIndex: number) => {
    const total = slides.length;
    const normalized = (targetIndex + total) % total;

    if (isLoading || normalized === activeRef.current || lockRef.current) {
      return;
    }

    lockRef.current = true;
    const current = activeRef.current;
    const nextDirection =
      normalized > current || (current === total - 1 && normalized === 0) ? 1 : -1;

    setDirection(nextDirection);
    setActive(normalized);

    window.setTimeout(() => {
      lockRef.current = false;
    }, transitionMs);
  }, [isLoading]);

  const goNext = useCallback(() => goTo(activeRef.current + 1), [goTo]);
  const goPrev = useCallback(() => goTo(activeRef.current - 1), [goTo]);
  const togglePlatformVideoSound = useCallback(() => {
    const nextMuted = !isPlatformVideoMuted;
    const video = platformVideoRef.current;
    if (video) {
      video.muted = nextMuted;
      video.volume = nextMuted ? 0 : 1;
      video.play().catch(() => undefined);
    }
    setIsPlatformVideoMuted(nextMuted);
  }, [isPlatformVideoMuted]);

  const scrollResults = useCallback((direction: -1 | 1) => {
    const container = resultsCardsRef.current;
    if (!container) return;
    const firstCard = container.querySelector<HTMLElement>(".results-card");
    const distance = firstCard ? firstCard.offsetWidth + 14 : 240;
    const maxLeft = container.scrollWidth - container.clientWidth;
    const target = container.scrollLeft + direction * distance;
    const nextLeft = Math.min(maxLeft, Math.max(0, target));
    container.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 8) {
        return;
      }
      const canScrollToPlatformAd = activeRef.current === slides.length - 1 && event.deltaY > 0;
      const isPastHero = window.scrollY > 24;
      if (canScrollToPlatformAd || isPastHero) {
        return;
      }
      event.preventDefault();
      event.deltaY > 0 ? goNext() : goPrev();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        if (activeRef.current === slides.length - 1) {
          return;
        }
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        goPrev();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      touchStartRef.current = { y: touch.pageY, time: event.timeStamp };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const distance = touch.pageY - touchStartRef.current.y;
      const elapsed = Math.max(event.timeStamp - touchStartRef.current.time, 1);
      const velocity = distance / elapsed;

      if (Math.abs(distance) > 54 || Math.abs(velocity) > 0.35) {
        if (activeRef.current === slides.length - 1 && distance < 0) {
          return;
        }
        distance < 0 ? goNext() : goPrev();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [goNext, goPrev]);

  return (
    <main
      className={`nex-home ${isLoading && !isLoaderExiting ? "is-loading" : "is-ready"}`}
      data-direction={direction}
    >
      {isLoading ? (
        <div
          className={`sat-count-loader sat-count-loader--${loadingStage} ${
            isLoaderExiting ? "is-exiting" : ""
          }`}
          role="status"
          aria-live="polite"
          aria-label={loadingStage === "numbers" ? `Loading ${loadingFrame.current}` : "Loading SATTEST.UZ"}
        >
          {loadingStage === "numbers" ? (
            <div className="sat-count-loader__window" aria-hidden="true">
              <div
                className={`sat-count-loader__number sat-count-loader__number--previous ${
                  loadingFrame.step === 0 ? "is-hidden" : ""
                }`}
                key={`previous-${loadingFrame.step}`}
              >
                {getLoaderDigits(loadingFrame.previous).map((digit, index) => (
                  <span className="sat-count-loader__digit" key={`${digit}-${index}`}>
                    {digit}
                  </span>
                ))}
              </div>
              <div
                className={`sat-count-loader__number sat-count-loader__number--current ${
                  loadingFrame.step === 0 ? "is-idle" : ""
                }`}
                key={`current-${loadingFrame.step}`}
              >
                {getLoaderDigits(loadingFrame.current).map((digit, index) => (
                  <span className="sat-count-loader__digit" key={`${digit}-${index}`}>
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          ) : loadingStage === "brand" ? (
            <img
              className="sat-count-loader__brand"
              src="/assets/brand/sattest-intro-logo.png"
              alt="SATTEST.UZ"
            />
          ) : (
            <video
              className="sat-count-loader__intro"
              ref={introVideoRef}
              src="/assets/video/intro.mp4"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={finishLoading}
            />
          )}
        </div>
      ) : null}
      <LuxuryNavbar />

      <section className="partner-marquee" aria-label="SAT learning and exam partners">
        <p className="partner-marquee__label">{copy.partnerLabel}</p>
        <div className="partner-marquee__track" aria-hidden="true">
          {[...partnerLogos, ...partnerLogos, ...partnerLogos, ...partnerLogos].map((partner, index) => (
            <span className="partner-marquee__item" key={`${partner.name}-${index}`}>
              <img className="partner-marquee__logo" src={partner.logo} alt={partner.name} />
            </span>
          ))}
        </div>
      </section>

      <div className="nex-hero-stage">
        <div className="nex-screen-stack">
          {slides.map((slide, index) => (
            <section
              className={`nex-screen ${active === index ? "is-current" : ""}`}
              aria-hidden={active !== index}
              key={slide.id}
            >
              <div className="nex-copy">
                <p className="nex-kicker">{slide.eyebrow}</p>
                <h1 className="nex-title">
                  {slide.title.map((word) => (
                    <span className="nex-title-line" key={word}>
                      <span>{word}</span>
                    </span>
                  ))}
                </h1>
                <Link className="nex-cta" href={slide.href}>
                  <span>{slide.cta}</span>
                  <ArrowRight size={18} />
                </Link>
                <p className="nex-description">{slide.body}</p>
              </div>

              <div className="nex-index" aria-label={`Slide ${slide.stat} of 03`}>
                <span>{slide.stat}</span>
                <span>/</span>
                <span>03</span>
              </div>
            </section>
          ))}
        </div>

        <div className="nex-home-login">
          <span />
          <Link href="/login">Student Login</Link>
        </div>

        <section
          className={`results-wall ${showResultsWall ? "is-visible" : ""}`}
          aria-label="Student SAT results"
        >
          <div className="results-wall__copy">
            <p>{copy.results.eyebrow}</p>
            <h2>{copy.results.title}</h2>
            <span>{copy.results.body}</span>
            <div className="parent-feedback" aria-label="Verified parent feedback">
              <p>{copy.results.parentLabel}</p>
              <div className="parent-feedback__bubble">
                <span>{copy.results.parentSource}</span>
                <strong>{copy.results.parentGreeting}</strong>
                <em>{copy.results.parentBody}</em>
              </div>
            </div>
          </div>

          <div className="results-wall__carousel">
            <div
              className="results-wall__cards"
              onWheel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
                event.currentTarget.scrollLeft += delta;
              }}
              ref={resultsCardsRef}
            >
              {studentResults.map((result) => {
                const resultCopy = getStudentResultCopy(result);

                return (
                  <button
                    className="results-card"
                    key={result.name}
                    onClick={() => setActiveResultVideo(result)}
                    type="button"
                  >
                    <video
                      className="results-card__video"
                      src={result.video}
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="metadata"
                    />
                    <span className="results-card__shade" aria-hidden="true" />
                    <span className="results-card__play" aria-hidden="true">
                      <Play size={16} fill="currentColor" />
                    </span>
                    <span className="results-card__meta" data-sattest-no-translate="true">
                      <strong>{result.name}</strong>
                      <span>{result.score}</span>
                      <span>{resultCopy.improvement}</span>
                      <em>{resultCopy.evidence}</em>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="results-wall__controls" aria-label="Student result videos">
              <button aria-label={copy.results.prev} onClick={() => scrollResults(-1)} type="button">
                <ChevronLeft size={18} />
              </button>
              <button aria-label={copy.results.next} onClick={() => scrollResults(1)} type="button">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <button
            className="results-wall__close"
            onClick={() => setShowResultsWall(false)}
            type="button"
            aria-label={copy.results.close}
          >
            <X size={16} />
          </button>
        </section>

        <nav className="nex-slide-nav" aria-label="Homepage slides">
          <div className="nex-circ-buttons">
            <button className="nex-circ-button" onClick={goPrev} aria-label="Previous slide" type="button">
              <ChevronUp size={18} />
            </button>
            <button className="nex-circ-button" onClick={goNext} aria-label="Next slide" type="button">
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="nex-slide-tabs">
            {slides.map((slide, index) => (
              <button
                className={active === index ? "is-current" : ""}
                key={slide.id}
                onClick={() => goTo(index)}
                type="button"
              >
                <span>{slide.nav}</span>
                <span>{slide.nav}</span>
              </button>
            ))}
          </div>

          <div className="nex-footer-note">Digital SAT practice engine</div>
        </nav>
      </div>

      <section className="top-score-proof-section" aria-labelledby="top-score-proof-title">
        <div className="top-score-proof-section__copy">
          <p className="top-score-proof-section__eyebrow">{copy.topScores.eyebrow}</p>
          <h2 id="top-score-proof-title">{copy.topScores.title}</h2>
          <span>{copy.topScores.body}</span>
          <Link className="top-score-proof-section__cta" href="/mock-test">
            {copy.topScores.cta}
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="top-score-proof-section__stats" aria-label="SAT score proof highlights">
          <div>
            <span>{copy.topScores.highestLabel}</span>
            <strong>1590</strong>
            <p>Doniyor Botirov</p>
          </div>
          <div>
            <span>{copy.topScores.founderLabel}</span>
            <strong>1540 / 1590</strong>
            <p>Bakhrom + Doniyor</p>
          </div>
          <div>
            <span>{copy.topScores.scoreLabel}</span>
            <strong>1500+</strong>
            <p>{copy.topScores.reportsLine}</p>
          </div>
        </div>

        <div className="top-score-proof-section__rail" aria-label="Top SAT certificates">
          {topScoreProofs.map((proof) => (
            <TopScoreProofCard
              key={proof.name}
              proof={proof}
              copy={{
                founderProofLabel: copy.topScores.founderProofLabel,
                mathLabel: copy.topScores.mathLabel,
                proofLabel: copy.topScores.proofLabel,
                rwLabel: copy.topScores.rwLabel,
                scoreLabel: copy.topScores.scoreLabel,
                studentProofLabel: copy.topScores.studentProofLabel
              }}
            />
          ))}
        </div>
      </section>

      <section className="student-testimonials-section" aria-labelledby="student-testimonials-title">
        <div className="student-testimonials-section__intro">
          <p>{copy.testimonials.eyebrow}</p>
          <h2 id="student-testimonials-title">{copy.testimonials.title}</h2>
          <span>{copy.testimonials.body}</span>
        </div>

        <div className="student-testimonials-section__stage" aria-label="Moving student feedback">
          {[0, 1].map((rowIndex) => (
            <div
              className={`student-testimonials-section__track ${rowIndex === 1 ? "is-reverse" : ""}`}
              key={rowIndex}
            >
              {[...testimonialStudents, ...testimonialStudents].map((student, index) => {
                const feedback = copy.testimonials.items[index % copy.testimonials.items.length];
                return (
                  <TestimonialCard
                    key={`${rowIndex}-${student.name}-${index}`}
                    student={student}
                    quote={feedback.quote}
                    role={feedback.role}
                    verified={copy.testimonials.verified}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="founder-trust-section" aria-labelledby="founder-trust-title">
        <div className="founder-trust-section__media">
          <img
            className="founder-trust-section__photo"
            src="/assets/brand/botirov-brothers-richmond-school.jpg"
            alt="Bakhrom Botirov and Doniyor Botirov at Richmond School"
          />
          <div className="founder-trust-section__score">
            <span>Botirov Brothers SAT proof</span>
            <strong>1540 / 1590</strong>
            <p>Bakhrom Botirov 1540 · Doniyor Botirov 1590</p>
          </div>
        </div>

        <div className="founder-trust-section__copy">
          <p className="founder-trust-section__eyebrow">Founder trust</p>
          <h2 id="founder-trust-title">SATTEST.UZ was initiated and crafted by the Botirov Brothers.</h2>
          <p>
            Particularly, Bakhrom Botirov is the founder and CEO of Richmond School, a CELTA and PGCEi
            holder, a 1540 SAT scorer, and has been teaching since 2021. Doniyor Botirov is the founder
            of Mr. Doniyor Learning Center and brings the same serious academic standard with a 1590 SAT result.
          </p>

          <div className="founder-trust-section__highlights">
            <div>
              <span>1540 SAT</span>
              <strong>Bakhrom Botirov score proof</strong>
            </div>
            <div>
              <span>1590 SAT</span>
              <strong>Doniyor Botirov, founder of Mr. Doniyor Learning Center</strong>
            </div>
            <div>
              <span>Since 2021</span>
              <strong>Teaching experience</strong>
            </div>
            <div>
              <span>CELTA + PGCEi</span>
              <strong>International teacher qualifications</strong>
            </div>
          </div>

          <div className="founder-trust-section__proof">
            <button
              className="founder-trust-section__certificate"
              onClick={() => setActiveFounderProof("bakhrom")}
              type="button"
            >
              <img src="/assets/results/bakhrom-botirov-1540-sat.jpg" alt="Bakhrom Botirov 1540 SAT score report" />
              <span>Bakhrom 1540 SAT proof</span>
            </button>
            <button
              className="founder-trust-section__certificate"
              onClick={() => setActiveFounderProof("doniyor")}
              type="button"
            >
              <img src="/assets/results/doniyor-botirov-1590-sat.jpg" alt="Doniyor Botirov 1590 SAT score report" />
              <span>Doniyor 1590 SAT proof</span>
            </button>
            <div>
              <strong>Why SATTEST.UZ exists</strong>
              <p>
                The platform was built so students do not waste months guessing what to study.
                A diagnostic should show the exact weak skills, then turn them into daily repair work.
              </p>
              <Link href="https://t.me/FounderSATTESTUZ" target="_blank" rel="noreferrer">
                Telegram: @FounderSATTESTUZ <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="platform-ad-section" aria-labelledby="platform-ad-title">
        <div className="platform-ad-section__copy">
          <p className="platform-ad-section__eyebrow">Why SATTEST.UZ works</p>
          <h2 id="platform-ad-title">A diagnostic SAT platform that turns mistakes into a plan.</h2>
          <p className="platform-ad-section__body">
            Students do not just finish a mock test. They receive score reports, weakness maps,
            mistake analysis, and targeted practice routes built around Reading, Writing, and Math.
          </p>
          <div className="platform-ad-section__advantages">
            <div>
              <strong>Bluebook-style mock tests</strong>
              <span>Timed modules, review flow, and realistic SAT pressure.</span>
            </div>
            <div>
              <strong>Personal weakness tracking</strong>
              <span>Every missed pattern becomes a focused practice target.</span>
            </div>
            <div>
              <strong>1400+ curriculum direction</strong>
              <span>Students know exactly what to study after the diagnostic.</span>
            </div>
          </div>
          <Link className="platform-ad-section__cta" href="/pricing">
            <span>Choose plan</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="platform-ad-section__videoWrap">
          <video
            className="platform-ad-section__video"
            ref={platformVideoRef}
            src="/assets/video/sattest-platform-ad.mp4"
            autoPlay
            muted={isPlatformVideoMuted}
            loop
            playsInline
            preload="auto"
          />
          <button
            className="platform-ad-section__sound"
            onClick={togglePlatformVideoSound}
            type="button"
            aria-label={isPlatformVideoMuted ? "Turn platform video sound on" : "Turn platform video sound off"}
          >
            {isPlatformVideoMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span>{isPlatformVideoMuted ? "Sound on" : "Sound off"}</span>
          </button>
          <div className="platform-ad-section__videoGlow" aria-hidden="true" />
        </div>
      </section>

      <section className="diagnostic-preview-section" aria-labelledby="diagnostic-preview-title">
        <div className="diagnostic-preview-section__intro">
          <p className="diagnostic-preview-section__eyebrow">Diagnostic preview</p>
          <h2 id="diagnostic-preview-title">Before a student practices, SATTEST.UZ shows exactly what is holding the score down.</h2>
          <p>
            The mock test becomes a personal report: section scores, weak question types, repeated
            mistake patterns, timing pressure, and the first study tasks needed to start improving.
          </p>
        </div>

        <div className="diagnostic-preview-section__report" aria-label="Example diagnostic report preview">
          <div className="diagnostic-preview-section__scoreBand">
            <div>
              <span>Overall</span>
              <strong>1050</strong>
            </div>
            <div>
              <span>Reading and Writing</span>
              <strong>520</strong>
            </div>
            <div>
              <span>Math</span>
              <strong>530</strong>
            </div>
          </div>

          <div className="diagnostic-preview-section__columns">
            <div className="diagnostic-preview-section__block">
              <span className="diagnostic-preview-section__label">Weak areas</span>
              <div className="diagnostic-preview-section__skill">
                <span>Inference</span>
                <strong>42%</strong>
              </div>
              <div className="diagnostic-preview-section__bar">
                <span style={{ width: "42%" }} />
              </div>
              <div className="diagnostic-preview-section__skill">
                <span>Algebra</span>
                <strong>50%</strong>
              </div>
              <div className="diagnostic-preview-section__bar">
                <span style={{ width: "50%" }} />
              </div>
              <div className="diagnostic-preview-section__skill">
                <span>Grammar precision</span>
                <strong>58%</strong>
              </div>
              <div className="diagnostic-preview-section__bar">
                <span style={{ width: "58%" }} />
              </div>
            </div>

            <div className="diagnostic-preview-section__block">
              <span className="diagnostic-preview-section__label">Mistake patterns</span>
              <div className="diagnostic-preview-section__tag">Causal gap trap</div>
              <div className="diagnostic-preview-section__tag">Comma boundary error</div>
              <div className="diagnostic-preview-section__tag">Linear equation setup</div>
              <p className="diagnostic-preview-section__explain">
                The report does not only mark answers wrong. It explains why the wrong choice looked
                tempting and what rule the student must use next time.
              </p>
            </div>
          </div>

          <div className="diagnostic-preview-section__plan">
            <span className="diagnostic-preview-section__label">First 7 days generated from this report</span>
            <div>
              <strong>Day 1</strong>
              <span>Inference drills + explanation review</span>
            </div>
            <div>
              <strong>Day 2</strong>
              <span>Algebra equation setup and timed practice</span>
            </div>
            <div>
              <strong>Day 3</strong>
              <span>Grammar punctuation targets and mixed review</span>
            </div>
          </div>
        </div>
      </section>

      <section className="study-growth-section" aria-labelledby="study-growth-title">
        <div className="study-growth-section__copy">
          <p className="study-growth-section__eyebrow">Personal study plan</p>
          <h2 id="study-growth-title">A 30-day route built from the exact mistakes in the diagnostic test.</h2>
          <p className="study-growth-section__body">
            SATTEST.UZ does not give random practice. After the mock test, every wrong answer becomes
            a weakness target, every weakness becomes a daily task, and every task is connected to
            Reading, Writing, or Math drills that move the score upward.
          </p>
          <div className="study-growth-section__promise">
            <span>30-day minimum target</span>
            <strong>+100 SAT points</strong>
            <p>Built for steady improvement when the student completes the assigned daily work.</p>
          </div>
        </div>

        <div className="study-growth-section__panel" aria-label="SAT score growth plan">
          <div className="study-growth-section__panelHeader">
            <span>Projected growth</span>
            <strong>Diagnostic to 30 days</strong>
          </div>

          <div className="study-growth-chart" aria-hidden="true">
            <div className="study-growth-chart__grid" />
            <svg className="study-growth-chart__svg" viewBox="0 0 680 320" role="img">
              <defs>
                <linearGradient id="growthLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#9aa0a6" />
                  <stop offset="48%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#8ff1c6" />
                </linearGradient>
                <linearGradient id="growthFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8ff1c6" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#8ff1c6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="study-growth-chart__area"
                d="M36 248 C124 232 160 214 214 198 C282 176 314 158 376 136 C462 104 520 84 644 54 L644 286 L36 286 Z"
              />
              <path
                className="study-growth-chart__line"
                d="M36 248 C124 232 160 214 214 198 C282 176 314 158 376 136 C462 104 520 84 644 54"
              />
              {[
                [36, 248],
                [214, 198],
                [376, 136],
                [644, 54]
              ].map(([cx, cy]) => (
                <circle className="study-growth-chart__dot" cx={cx} cy={cy} key={`${cx}-${cy}`} r="7" />
              ))}
            </svg>
            <div className="study-growth-chart__labels">
              <span>Diagnostic</span>
              <span>Day 7</span>
              <span>Day 14</span>
              <span>Day 30</span>
            </div>
          </div>

          <div className="study-growth-section__scores">
            <div>
              <span>Start</span>
              <strong>1050</strong>
            </div>
            <div>
              <span>Week 1</span>
              <strong>1080</strong>
            </div>
            <div>
              <span>Week 2</span>
              <strong>1120</strong>
            </div>
            <div className="is-target">
              <span>Day 30</span>
              <strong>1150+</strong>
            </div>
          </div>
        </div>

        <div className="study-growth-section__steps">
          <div>
            <span>01</span>
            <strong>Diagnose</strong>
            <p>Find the exact question types, traps, timing issues, and weak topics holding the student back.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Assign</strong>
            <p>Convert mistakes into daily Reading, Writing, and Math work with a clear hour-by-hour plan.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Improve</strong>
            <p>Repeat targeted drills, review explanations, and confirm progress with section tests.</p>
          </div>
        </div>
      </section>

      <section className="parent-journey-section" aria-labelledby="parent-journey-title">
        <div className="parent-journey-section__intro">
          <p className="parent-journey-section__eyebrow">{copy.parent.eyebrow}</p>
          <h2 id="parent-journey-title">{copy.parent.title}</h2>
          <p>{copy.parent.body}</p>
          <Link className="parent-journey-section__cta" href="/pricing">
            <span>{copy.parent.cta}</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="parent-journey-section__dashboard" aria-label="Parent progress tracking preview">
          <div className="parent-journey-section__summary">
            <div>
              <span>{copy.parent.summaryReportLabel}</span>
              <strong>{copy.parent.summaryReportValue}</strong>
              <p>{copy.parent.summaryReportBody}</p>
            </div>
            <div>
              <span>{copy.parent.summaryFocusLabel}</span>
              <strong>{copy.parent.summaryFocusValue}</strong>
              <p>{copy.parent.summaryFocusBody}</p>
            </div>
          </div>

          <div className="parent-journey-section__cards">
            {copy.parent.cards.map((card, index) => (
              <article key={card.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="homepage-faq-section" aria-labelledby="homepage-faq-title">
        <div className="homepage-faq-section__intro">
          <p className="homepage-faq-section__eyebrow">{copy.faq.eyebrow}</p>
          <h2 id="homepage-faq-title">{copy.faq.title}</h2>
          <p>{copy.faq.body}</p>
          <div className="homepage-faq-section__languageNotes" aria-label={copy.faq.paymentLabel}>
            <div>
              <span>{copy.faq.paymentLabel}</span>
              <p>{copy.faq.paymentBody}</p>
            </div>
          </div>
          <Link className="homepage-faq-section__cta" href="/pricing">
            <span>{copy.faq.cta}</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="homepage-faq-section__list">
          {copy.faq.items.map((faq) => (
            <article className="homepage-faq-section__item" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      {activeResultVideo ? (
        <div
          className="results-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeResultVideo.name} SAT result proof`}
        >
          <button
            className="results-modal__backdrop"
            onClick={() => setActiveResultVideo(null)}
            type="button"
            aria-label="Close video"
          />
          <div className="results-modal__dialog">
            <button
              className="results-modal__close"
              onClick={() => setActiveResultVideo(null)}
              type="button"
              aria-label="Close video"
            >
              <X size={18} />
            </button>
            <div
              className={`results-modal__proofGrid ${
                activeResultVideo.certificate ? "" : "results-modal__proofGrid--single"
              }`}
            >
              <div>
                <video
                  className="results-modal__video"
                  src={activeResultVideo.video}
                  controls
                  autoPlay
                  playsInline
                />
              </div>
              {activeResultVideo.certificate ? (
                <div className="results-modal__certificatePanel">
                  <img
                    alt={`${activeResultVideo.name} SAT score report`}
                    className="results-modal__certificate"
                    src={activeResultVideo.certificate}
                  />
                </div>
              ) : null}
            </div>
            <div className="results-modal__caption" data-sattest-no-translate="true">
              {(() => {
                const resultCopy = getStudentResultCopy(activeResultVideo);

                return (
                  <>
                    <strong>{activeResultVideo.name}</strong>
                    <span>{activeResultVideo.score}</span>
                    <span>{resultCopy.improvement}</span>
                    <span>{resultCopy.method}</span>
                    <span>
                      {activeResultVideo.testDate
                        ? `${resultCopy.testLabel}: ${activeResultVideo.testDate}`
                        : resultCopy.evidence}
                    </span>
                    <small>{resultCopy.note}</small>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}

      {activeFounderProof ? (
        <div
          className="founder-proof-modal"
          role="dialog"
          aria-modal="true"
          aria-label={activeFounderProof === "bakhrom" ? "Bakhrom Botirov 1540 SAT score proof" : "Doniyor Botirov 1590 SAT score proof"}
        >
          <button
            className="founder-proof-modal__backdrop"
            onClick={() => setActiveFounderProof(null)}
            type="button"
            aria-label="Close founder SAT proof"
          />
          <div className="founder-proof-modal__dialog">
            <button
              className="founder-proof-modal__close"
              onClick={() => setActiveFounderProof(null)}
              type="button"
              aria-label="Close founder SAT proof"
            >
              <X size={18} />
            </button>
            <img
              src={activeFounderProof === "bakhrom" ? "/assets/results/bakhrom-botirov-1540-sat.jpg" : "/assets/results/doniyor-botirov-1590-sat.jpg"}
              alt={activeFounderProof === "bakhrom" ? "Bakhrom Botirov 1540 SAT score report" : "Doniyor Botirov 1590 SAT score report"}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
