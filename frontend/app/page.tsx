"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Mail, Phone, Play, Send, Volume2, VolumeX, X } from "lucide-react";
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

const loadingSequence = [20, 50, 70, 100];
const skipHomeIntroKey = "sattest_skip_home_intro";
const skipHomeIntroEvent = "sattest:skip-home-intro";
const partnerLogos = [
  { logo: "/assets/partners/mister%20doniyor.webp", name: "Mr. Doniyor School" },
  { logo: "/assets/partners/result-logo.jpg", name: "Result Learning Center" },
  { logo: "/assets/partners/Thompson.jpg", name: "Thompson Learning Center" },
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
    answer: "Pro access opens automatically via Telegram bot — usually within 60 seconds."
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
    answer: "You pay by Paynet QR, Click, Payme, card, or transfer. Pro access opens automatically via Telegram bot — usually within 60 seconds."
  },
  {
    question: "How do parents track progress?",
    answer: "Parents can follow mock scores, weak topics, completed practice, and review updates. For personal progress communication, families can contact the founder in Telegram."
  }
];

const topScoreProofs = [
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
    heroProof: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      secondaryCta: string;
      stats: Array<{ label: string; value: string; body: string }>;
    };
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
    videoProof: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
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
    contact: {
      eyebrow: string;
      title: string;
      body: string;
      telegramLabel: string;
      telegramBody: string;
      channelLabel: string;
      channelBody: string;
      emailLabel: string;
      emailBody: string;
      phoneLabel: string;
      phoneBody: string;
      legal: string;
    };
  }
> = {
  en: {
    slides,
    partnerLabel: "Trusted Learning Centers",
    heroProof: {
      eyebrow: "Verified SAT score proof",
      title: "8 students. 1500+. Verified score reports.",
      body: "Start with proof, then take the diagnostic that turns weak skills into a clear SAT growth plan.",
      cta: "Start free diagnostic",
      secondaryCta: "See score reports",
      stats: [
        { label: "Students", value: "8", body: "verified high-score reports" },
        { label: "Score level", value: "1500+", body: "student results shown with reports" },
        { label: "Top proof", value: "1580", body: "highest verified student SAT" }
      ]
    },
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
    videoProof: {
      eyebrow: "Student growth videos",
      title: "Use these videos as proof of the SATTEST.UZ process, not as the first headline.",
      body:
        "The 1500+ score reports stay first. These videos belong right after them: they show real students, parent trust, and how diagnostics turn into steady score growth.",
      cta: "Open video proof",
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
      title: "1580 student proof. Multiple 1500+ student score reports.",
      body:
        "This is the strongest selling signal for SATTEST.UZ: real students are producing verified 1500+ SAT score reports.",
      highestLabel: "Highest proof",
      founderLabel: "Student standard",
      scoreLabel: "Total score",
      rwLabel: "Reading/Writing",
      mathLabel: "Math",
      proofLabel: "Official score report",
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
          title: "Your child's score, tracked week by week, with a clear reason for every change.",
          body: "Parents see whether the score is moving up, what caused the change, and what must be fixed next."
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
      body: "The payment process is simple: pay, send the receipt to the bot, and start after instant activation. These are the questions students and parents usually ask first.",
      paymentLabel: "Payment instruction",
      paymentBody:
        "Pay by QR, Click, Payme, card, or transfer. Send the receipt to the Telegram bot with the email used during registration. Pro access opens automatically via Telegram bot — usually within 60 seconds.",
      cta: "Choose plan",
      items: homepageFaqs
    },
    contact: {
      eyebrow: "Contacts",
      title: "Need help choosing the right SAT route?",
      body: "Message us before payment, after registration, or when you need help understanding the next study step.",
      telegramLabel: "Telegram",
      telegramBody: "Fastest contact for payment, access, and parent questions.",
      channelLabel: "News channel",
      channelBody: "Updates, SAT materials, video lessons, and platform news.",
      emailLabel: "Email",
      emailBody: "Use email for longer questions, documents, or formal requests.",
      phoneLabel: "Phone",
      phoneBody: "Personal help for urgent questions and any problem you need to solve.",
      legal: "SATTEST.UZ is an independent SAT preparation platform and is not endorsed by College Board."
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
    heroProof: {
      eyebrow: "Подтвержденные результаты SAT",
      title: "8 учеников. 1500+. Проверенные отчеты о баллах.",
      body: "Сначала доказательства, затем диагностика, которая превращает слабые навыки в понятный план роста SAT.",
      cta: "Начать бесплатную диагностику",
      secondaryCta: "Смотреть отчеты",
      stats: [
        { label: "Ученики", value: "8", body: "проверенных отчетов с высокими баллами" },
        { label: "Уровень", value: "1500+", body: "результаты учеников с отчетами" },
        { label: "Лучший результат", value: "1580", body: "самый высокий подтвержденный SAT ученика" }
      ]
    },
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
    videoProof: {
      eyebrow: "Видео роста учеников",
      title: "Используйте эти видео как доказательство процесса SATTEST.UZ, а не как первый главный экран.",
      body:
        "Отчеты 1500+ остаются первыми. Эти видео идут сразу после них: они показывают реальных учеников, доверие родителей и то, как диагностика превращается в стабильный рост балла.",
      cta: "Открыть видео-доказательство",
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
      title: "1580 у ученика. Несколько ученических отчетов 1500+.",
      body:
        "Это главный сигнал доверия SATTEST.UZ: реальные ученики уже показывают подтвержденные результаты SAT 1500+.",
      highestLabel: "Высший результат",
      founderLabel: "Стандарт учеников",
      scoreLabel: "Общий балл",
      rwLabel: "Чтение и письмо",
      mathLabel: "Математика",
      proofLabel: "Официальный отчет",
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
          title: "Балл вашего ребенка отслеживается каждую неделю, с понятной причиной каждого изменения.",
          body: "Родители видят, растет ли результат, что повлияло на изменение и что нужно исправить дальше."
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
      body: "Процесс оплаты простой: оплатите, отправьте чек в бот и начните после мгновенной активации.",
      paymentLabel: "Инструкция по оплате",
      paymentBody:
        "Оплатите по QR, через Click, Payme, карту или перевод. Отправьте чек в Telegram-бот вместе с email регистрации. Доступ Pro открывается автоматически через Telegram-бота — обычно в течение 60 секунд.",
      cta: "Выбрать план",
      items: [
        {
          question: "Когда я получу доступ?",
          answer: "Доступ Pro открывается автоматически через Telegram-бота — обычно в течение 60 секунд."
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
          answer: "Вы оплачиваете через Paynet QR, Click, Payme, карту или перевод. Доступ Pro открывается автоматически через Telegram-бота — обычно в течение 60 секунд."
        },
        {
          question: "Как родители отслеживают прогресс?",
          answer: "Родители видят баллы пробных тестов, слабые темы, выполненную практику и план следующего исправления."
        }
      ]
    },
    contact: {
      eyebrow: "Контакты",
      title: "Нужна помощь с выбором SAT-маршрута?",
      body: "Напишите нам до оплаты, после регистрации или если нужна помощь с пониманием следующего шага подготовки.",
      telegramLabel: "Telegram",
      telegramBody: "Самый быстрый канал для оплаты, доступа и вопросов родителей.",
      channelLabel: "Канал новостей",
      channelBody: "Обновления, SAT-материалы, видеоуроки и новости платформы.",
      emailLabel: "Email",
      emailBody: "Используйте email для длинных вопросов, документов или официальных запросов.",
      phoneLabel: "Телефон",
      phoneBody: "Личная помощь по срочным вопросам и любой проблеме, которую нужно решить.",
      legal: "SATTEST.UZ — независимая платформа подготовки к SAT и не одобрена College Board."
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
    heroProof: {
      eyebrow: "Tasdiqlangan SAT natijalari",
      title: "8 o'quvchi. 1500+. Tasdiqlangan score reportlar.",
      body: "Avval isbot, keyin zaif ko'nikmalarni aniq SAT o'sish rejasiga aylantiradigan diagnostika.",
      cta: "Bepul diagnostikani boshlash",
      secondaryCta: "Hisobotlarni ko'rish",
      stats: [
        { label: "O'quvchilar", value: "8", body: "yuqori balli tasdiqlangan hisobotlar" },
        { label: "Ball darajasi", value: "1500+", body: "hisobotlar bilan ko'rsatilgan o'quvchi natijalari" },
        { label: "Eng yuqori isbot", value: "1580", body: "tasdiqlangan eng yuqori o'quvchi SAT bali" }
      ]
    },
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
    videoProof: {
      eyebrow: "O'quvchilar o'sish videolari",
      title: "Bu videolarni birinchi ekran emas, SATTEST.UZ jarayoni isboti sifatida ko'rsating.",
      body:
        "1500+ score reportlar birinchi bo'lib qoladi. Bu videolar esa undan keyin turadi: ular real o'quvchilarni, ota-ona ishonchini va diagnostika qanday qilib barqaror ball o'sishiga aylanishini ko'rsatadi.",
      cta: "Video isbotni ochish",
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
      title: "O'quvchida 1580. Bir nechta 1500+ o'quvchi hisobotlari.",
      body:
        "Bu SATTEST.UZ uchun eng kuchli ishonch dalili: real o'quvchilar tasdiqlangan 1500+ SAT natijalarini ko'rsatmoqda.",
      highestLabel: "Eng yuqori isbot",
      founderLabel: "O'quvchilar standarti",
      scoreLabel: "Umumiy ball",
      rwLabel: "O'qish va yozish",
      mathLabel: "Matematika",
      proofLabel: "Rasmiy ball hisoboti",
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
          title: "Farzandingiz bali har hafta kuzatiladi va har bir o'zgarish sababi aniq ko'rsatiladi.",
          body: "Ota-onalar ball o'syaptimi, o'zgarishga nima sabab bo'lganini va keyin nimani tuzatish kerakligini ko'radi."
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
      body: "To'lov jarayoni oddiy: to'lang, chekni botga yuboring va darhol faollashgandan keyin boshlang.",
      paymentLabel: "To'lov yo'riqnomasi",
      paymentBody:
        "QR, Click, Payme, karta yoki o'tkazma orqali to'lang. Chekni ro'yxatdan o'tgan email bilan Telegram botga yuboring. Pro kirish Telegram bot orqali avtomatik ochiladi — odatda 60 soniya ichida.",
      cta: "Rejani tanlash",
      items: [
        {
          question: "Kirish qachon ochiladi?",
          answer: "Pro kirish Telegram bot orqali avtomatik ochiladi — odatda 60 soniya ichida."
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
          answer: "Paynet QR, Click, Payme, karta yoki o'tkazma orqali to'laysiz. Pro kirish Telegram bot orqali avtomatik ochiladi — odatda 60 soniya ichida."
        },
        {
          question: "Ota-onalar progressni qanday kuzatadi?",
          answer: "Ota-onalar sinov testi ballari, zaif mavzular, bajarilgan mashqlar va keyingi tuzatish rejasini ko'radi."
        }
      ]
    },
    contact: {
      eyebrow: "Aloqa",
      title: "To'g'ri SAT yo'nalishini tanlashda yordam kerakmi?",
      body: "To'lovdan oldin, ro'yxatdan o'tgandan keyin yoki keyingi tayyorgarlik qadamini tushunish uchun bizga yozing.",
      telegramLabel: "Telegram",
      telegramBody: "To'lov, kirish va ota-onalar savollari uchun eng tez aloqa.",
      channelLabel: "Yangiliklar kanali",
      channelBody: "Yangiliklar, SAT materiallari, video darslar va platforma xabarlari.",
      emailLabel: "Email",
      emailBody: "Uzun savollar, hujjatlar yoki rasmiy murojaatlar uchun emaildan foydalaning.",
      phoneLabel: "Telefon",
      phoneBody: "Shoshilinch savollar va har qanday muammoni hal qilish uchun shaxsiy yordam.",
      legal: "SATTEST.UZ mustaqil SAT tayyorgarlik platformasi va College Board tomonidan tasdiqlanmagan."
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

function shouldUsePerformanceMode() {
  if (typeof window === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;

  return (
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(connection?.saveData) ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g"
  );
}

function shouldUseFastHomeIntro() {
  if (typeof window === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;

  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(connection?.saveData) ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g"
  );
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
    studentProofLabel: string;
  };
}) {
  return (
    <article
      className="top-score-proof-section__card"
      style={{ "--accent": proof.accent } as CSSProperties & Record<"--accent", string>}
    >
      <div className="top-score-proof-section__certificate">
        <img src={proof.image} alt={`${proof.name} ${proof.score} SAT score report`} />
      </div>
      <div className="top-score-proof-section__cardCopy">
        <span>{copy.studentProofLabel}</span>
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
  const getStudentResultCopy = useCallback(
    (result: StudentResult) => studentResultCopy[language][result.name] ?? studentResultCopy.en[result.name],
    [language]
  );
  const [loadingFrame, setLoadingFrame] = useState({
    previous: loadingSequence[0],
    current: loadingSequence[0],
    step: 0
  });
  const [loadingStage, setLoadingStage] = useState<"numbers" | "brand">("numbers");
  const [isLoaderExiting, setIsLoaderExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !shouldSkipHomeIntro());
  const [activeResultVideo, setActiveResultVideo] = useState<StudentResult | null>(null);
  const [activeFounderProof, setActiveFounderProof] = useState<"bakhrom" | "doniyor" | null>(null);
  const [isPlatformVideoMuted, setIsPlatformVideoMuted] = useState(true);
  const [shouldLoadPlatformVideo, setShouldLoadPlatformVideo] = useState(false);
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);
  const platformVideoRef = useRef<HTMLVideoElement | null>(null);
  const platformVideoWrapRef = useRef<HTMLDivElement | null>(null);
  const resultsCardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsPerformanceMode(shouldUsePerformanceMode());
  }, []);

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
    }, 520);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }

    if (shouldUseFastHomeIntro()) {
      const timers = [
        window.setTimeout(() => {
          setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[3], step: frame.step + 1 }));
        }, 180),
        window.setTimeout(() => setLoadingStage("brand"), 320),
        window.setTimeout(() => finishLoading(), 820)
      ];

      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    const compactIntro = shouldUseFastHomeIntro();
    const timers = [
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[1], step: frame.step + 1 }));
      }, compactIntro ? 900 : 1500),
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[2], step: frame.step + 1 }));
      }, compactIntro ? 1800 : 3000),
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[3], step: frame.step + 1 }));
      }, compactIntro ? 2700 : 4500),
      window.setTimeout(() => setLoadingStage("brand"), compactIntro ? 3600 : 6000),
      window.setTimeout(() => finishLoading(), compactIntro ? 7200 : 10800)
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [finishLoading, isLoading]);

  useEffect(() => {
    const previousOverflowX = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";

    return () => {
      document.body.style.overflowX = previousOverflowX;
    };
  }, []);

  const togglePlatformVideoSound = useCallback(() => {
    setShouldLoadPlatformVideo(true);
    const nextMuted = !isPlatformVideoMuted;
    const video = platformVideoRef.current;
    if (video) {
      video.muted = nextMuted;
      video.volume = nextMuted ? 0 : 1;
      video.play().catch(() => undefined);
    }
    setIsPlatformVideoMuted(nextMuted);
  }, [isPlatformVideoMuted]);

  useEffect(() => {
    const target = platformVideoWrapRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadPlatformVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "450px 0px" }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = platformVideoRef.current;
    if (!video || !shouldLoadPlatformVideo || (isPerformanceMode && isPlatformVideoMuted)) return;
    video.play().catch(() => undefined);
  }, [isPerformanceMode, isPlatformVideoMuted, shouldLoadPlatformVideo]);

  const scrollResults = useCallback((direction: -1 | 1) => {
    const container = resultsCardsRef.current;
    if (!container) return;
    const firstCard = container.querySelector<HTMLElement>(".student-video-proof-card");
    const distance = firstCard ? firstCard.offsetWidth + 18 : 280;
    const maxLeft = container.scrollWidth - container.clientWidth;
    const target = container.scrollLeft + direction * distance;
    const nextLeft = Math.min(maxLeft, Math.max(0, target));
    container.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, []);

  return (
    <main
      className={`nex-home ${isLoading && !isLoaderExiting ? "is-loading" : "is-ready"}`}
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
          ) : (
            <div className="sat-count-loader__brand" role="img" aria-label="SATTEST.UZ" />
          )}
        </div>
      ) : null}
      <LuxuryNavbar />

      <section className="partner-marquee" aria-label="SAT learning and exam partners">
        <p className="partner-marquee__label">{copy.partnerLabel}</p>
        <div className="partner-marquee__track" aria-hidden="true">
          {[...partnerLogos, ...partnerLogos, ...partnerLogos, ...partnerLogos].map((partner, index) => (
            <span className="partner-marquee__item" key={`${partner.name}-${index}`}>
              <img className="partner-marquee__logo" src={partner.logo} alt={partner.name} loading="lazy" decoding="async" />
            </span>
          ))}
        </div>
      </section>

      <div className="nex-hero-stage">
        <div className="hero-proof-intro" data-sattest-no-translate="true">
          <div className="hero-proof-intro__copy">
            <p className="nex-kicker">{copy.heroProof.eyebrow}</p>
            <h1>{copy.heroProof.title}</h1>
            <p>{copy.heroProof.body}</p>
            <div className="hero-proof-intro__actions">
              <Link className="nex-cta" href="/mock-test">
                <span>{copy.heroProof.cta}</span>
                <ArrowRight size={18} />
              </Link>
              <a className="hero-proof-intro__secondary" href="#top-score-proof-title">
                {copy.heroProof.secondaryCta}
              </a>
            </div>
            <div className="hero-proof-intro__stats" aria-label="Verified SAT score proof">
              {copy.heroProof.stats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <p>{stat.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-proof-intro__reports" aria-label="Verified student SAT score reports">
            {topScoreProofs.slice(0, 3).map((proof) => (
              <article
                className="hero-proof-card"
                key={proof.name}
                style={{ "--accent": proof.accent } as CSSProperties & Record<"--accent", string>}
              >
                <div className="hero-proof-card__image">
                  <img src={proof.image} alt={`${proof.name} ${proof.score} SAT score report`} />
                </div>
                <div className="hero-proof-card__copy">
                  <span>{copy.topScores.studentProofLabel}</span>
                  <h2>{proof.name}</h2>
                  <strong>{proof.score}</strong>
                  <p>
                    <em>{copy.topScores.rwLabel}</em>
                    <b>{proof.readingWriting}</b>
                  </p>
                  <p>
                    <em>{copy.topScores.mathLabel}</em>
                    <b>{proof.math}</b>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="nex-home-login">
          <span />
          <Link href="/login">Student Login</Link>
        </div>

      </div>

      <section className="top-score-proof-section" aria-labelledby="top-score-proof-title" data-sattest-no-translate="true">
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
            <strong>1580</strong>
            <p>Rakhmonov Shokhrukh</p>
          </div>
          <div>
            <span>{copy.topScores.founderLabel}</span>
            <strong>1550+</strong>
            <p>Saidov + Nurmatov</p>
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

      <section className="student-video-proof-section" aria-labelledby="student-video-proof-title" data-sattest-no-translate="true">
        <div className="student-video-proof-section__copy">
          <p>{copy.videoProof.eyebrow}</p>
          <h2 id="student-video-proof-title">{copy.videoProof.title}</h2>
        </div>

        <div
          className="student-video-proof-section__rail"
          onWheel={(event) => {
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            event.currentTarget.scrollLeft += delta;
          }}
          ref={resultsCardsRef}
        >
          {studentResults.map((result) => {
            const resultCopy = getStudentResultCopy(result);

            return (
              <button
                className="student-video-proof-card"
                key={result.name}
                onClick={() => setActiveResultVideo(result)}
                type="button"
              >
                <video
                  className="student-video-proof-card__video"
                  src={isPerformanceMode ? undefined : result.video}
                  poster={result.certificate ?? "/assets/brand/sattest-intro-logo.png"}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
                <span className="student-video-proof-card__shade" aria-hidden="true" />
                <span className="student-video-proof-card__play" aria-hidden="true">
                  <Play size={16} fill="currentColor" />
                </span>
                <span className="student-video-proof-card__meta" data-sattest-no-translate="true">
                  <strong>{result.name}</strong>
                  <span>{result.score}</span>
                  <span>{resultCopy.improvement}</span>
                  <em>{copy.videoProof.cta}</em>
                </span>
              </button>
            );
          })}
        </div>

        <div className="student-video-proof-section__controls" aria-label="Student result videos">
          <button aria-label={copy.videoProof.prev} onClick={() => scrollResults(-1)} type="button">
            <ChevronLeft size={18} />
          </button>
          <button aria-label={copy.videoProof.next} onClick={() => scrollResults(1)} type="button">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="student-video-proof-section__parent" aria-label="Verified parent feedback">
          <p>{copy.results.parentLabel}</p>
          <div className="parent-feedback__bubble">
            <span>{copy.results.parentSource}</span>
            <strong>{copy.results.parentGreeting}</strong>
            <em>{copy.results.parentBody}</em>
          </div>
        </div>
      </section>

      <section className="homepage-route-section" aria-label="SATTEST.UZ study route" data-sattest-no-translate="true">
        {copy.slides.map((slide) => (
          <article className="homepage-route-section__card" key={slide.id}>
            <span>{slide.stat}</span>
            <p>{slide.eyebrow}</p>
            <h2>{slide.title.join(" ")}</h2>
            <em>{slide.body}</em>
            <Link href={slide.href}>
              {slide.cta}
              <ArrowRight size={15} />
            </Link>
          </article>
        ))}
      </section>

      <section className="founder-trust-section" aria-labelledby="founder-trust-title">
        <div className="founder-trust-section__media">
          <img
            className="founder-trust-section__photo"
            src="/assets/brand/botirov-brothers-richmond-school.jpg"
            alt="Bakhrom Botirov and Doniyor Botirov, founders of SATTEST.UZ"
          />
          <div className="founder-trust-section__score">
            <span>Founders of SATTEST.UZ</span>
            <strong>1540 / 1590</strong>
            <p>Bakhrom Botirov 1540 SAT · Doniyor Botirov 1590 SAT</p>
          </div>
        </div>

        <div className="founder-trust-section__copy">
          <p className="founder-trust-section__eyebrow">Founder proof</p>
          <h2 id="founder-trust-title">SATTEST.UZ is founded by Bakhrom Botirov and Doniyor Botirov.</h2>
          <p>
            The platform is led by founders who have personally reached elite SAT results.
            Bakhrom Botirov is the founder and CEO of Richmond School, a CELTA and PGCEi holder,
            and a 1540 SAT scorer. Doniyor Botirov is the founder of Mr. Doniyor Learning Center
            and brings a 1590 SAT result to the academic standard behind SATTEST.UZ.
          </p>

          <div className="founder-trust-section__highlights">
            <div>
              <span>Bakhrom Botirov</span>
              <strong>Founder of SATTEST.UZ · 1540 SAT</strong>
            </div>
            <div>
              <span>Doniyor Botirov</span>
              <strong>Founder of SATTEST.UZ · 1590 SAT</strong>
            </div>
            <div>
              <span>Richmond School</span>
              <strong>Founder and CEO: Bakhrom Botirov</strong>
            </div>
            <div>
              <span>Mr. Doniyor Learning Center</span>
              <strong>Founder: Doniyor Botirov</strong>
            </div>
          </div>

          <div className="founder-trust-section__proof">
            <button
              className="founder-trust-section__certificate"
              onClick={() => setActiveFounderProof("bakhrom")}
              type="button"
            >
              <img src="/assets/results/bakhrom-botirov-1540-sat.jpg" alt="Bakhrom Botirov 1540 SAT score report" />
              <span>Bakhrom Botirov · 1540 SAT certificate</span>
            </button>
            <button
              className="founder-trust-section__certificate"
              onClick={() => setActiveFounderProof("doniyor")}
              type="button"
            >
              <img src="/assets/results/doniyor-botirov-1590-sat.jpg" alt="Doniyor Botirov 1590 SAT score report" />
              <span>Doniyor Botirov · 1590 SAT certificate</span>
            </button>
            <div>
              <strong>Why this matters</strong>
              <p>
                SATTEST.UZ is not just a template website. It is built by SAT teachers and founders
                whose own score reports show the standard they expect from the platform.
              </p>
              <Link href="https://t.me/FounderSATTESTUZ" target="_blank" rel="noreferrer">
                Telegram: @FounderSATTESTUZ <ArrowRight size={16} />
              </Link>
            </div>
          </div>
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

        <div className="platform-ad-section__videoWrap" ref={platformVideoWrapRef}>
          <video
            className="platform-ad-section__video"
            ref={platformVideoRef}
            src={shouldLoadPlatformVideo ? "/assets/video/sattest-platform-ad.mp4" : undefined}
            autoPlay={shouldLoadPlatformVideo && !isPerformanceMode}
            muted={isPlatformVideoMuted}
            loop
            playsInline
            preload={shouldLoadPlatformVideo ? "metadata" : "none"}
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

      <footer className="site-contact-footer" aria-labelledby="site-contact-footer-title">
        <div className="site-contact-footer__brand">
          <img src="/assets/brand/sattest-wordmark.png" alt="SATTEST.UZ" />
          <p>{copy.contact.eyebrow}</p>
        </div>

        <div className="site-contact-footer__copy">
          <h2 id="site-contact-footer-title">{copy.contact.title}</h2>
          <p>{copy.contact.body}</p>
        </div>

        <div className="site-contact-footer__actions" aria-label="SATTEST.UZ contacts">
          <Link
            className="site-contact-footer__card"
            href="https://t.me/FounderSATTESTUZ"
            target="_blank"
            rel="noreferrer"
          >
            <span className="site-contact-footer__icon">
              <Send size={22} />
            </span>
            <span>
              <strong>{copy.contact.telegramLabel}</strong>
              <small>@FounderSATTESTUZ</small>
              <em>{copy.contact.telegramBody}</em>
            </span>
          </Link>

          <Link
            className="site-contact-footer__card"
            href="https://t.me/sattestuz"
            target="_blank"
            rel="noreferrer"
          >
            <span className="site-contact-footer__icon">
              <Send size={22} />
            </span>
            <span>
              <strong>{copy.contact.channelLabel}</strong>
              <small>@sattestuz</small>
              <em>{copy.contact.channelBody}</em>
            </span>
          </Link>

          <Link className="site-contact-footer__card" href="mailto:sattest1@inbox.ru">
            <span className="site-contact-footer__icon">
              <Mail size={22} />
            </span>
            <span>
              <strong>{copy.contact.emailLabel}</strong>
              <small>sattest1@inbox.ru</small>
              <em>{copy.contact.emailBody}</em>
            </span>
          </Link>

          <Link className="site-contact-footer__card" href="tel:+998902754412">
            <span className="site-contact-footer__icon">
              <Phone size={22} />
            </span>
            <span>
              <strong>{copy.contact.phoneLabel}</strong>
              <small>+998 90 275 44 12</small>
              <em>{copy.contact.phoneBody}</em>
            </span>
          </Link>
        </div>

        <div className="site-contact-footer__bottom">
          <span>© 2026 SATTEST.UZ</span>
          <span>{copy.contact.legal}</span>
        </div>
      </footer>

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
          aria-label={
            activeFounderProof === "bakhrom"
              ? "Bakhrom Botirov 1540 SAT score proof"
              : "Doniyor Botirov 1590 SAT score proof"
          }
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
              src={
                activeFounderProof === "bakhrom"
                  ? "/assets/results/bakhrom-botirov-1540-sat.jpg"
                  : "/assets/results/doniyor-botirov-1590-sat.jpg"
              }
              alt={
                activeFounderProof === "bakhrom"
                  ? "Bakhrom Botirov 1540 SAT score report"
                  : "Doniyor Botirov 1590 SAT score report"
              }
            />
          </div>
        </div>
      ) : null}

    </main>
  );
}
