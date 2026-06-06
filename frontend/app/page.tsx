"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, Volume2, VolumeX, X } from "lucide-react";
import { HomeThreeScene } from "@/components/HomeThreeScene";
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
const videoSources = ["1-2", "1-3", "2-3", "3-1", "3-2"] as const;
const transitionVideoByRoute: Record<string, (typeof videoSources)[number]> = {
  "0-1": "1-2",
  "0-2": "1-3",
  "1-0": "1-2",
  "1-2": "2-3",
  "2-0": "3-1",
  "2-1": "3-2"
};

const loadingSequence = [20, 50, 70, 100];
const skipHomeIntroKey = "sattest_skip_home_intro";
const skipHomeIntroEvent = "sattest:skip-home-intro";
const partnerLogos = [
  { logo: "/assets/partners/khan-academy6250.jpg", name: "Khan Academy" },
  { logo: "/assets/partners/college-board-vector-logo.png", name: "College Board" },
  { logo: "/assets/partners/SAT.png", name: "SAT Exam" },
  { logo: "/assets/partners/british%20council.png", name: "British Council" },
  { logo: "/assets/partners/mister%20doniyor.webp", name: "Mr. Doniyor School" },
  { logo: "/assets/partners/result-logo.jpg", name: "Result Learning Center" },
  { logo: "/assets/partners/Thompson.jpg", name: "Thompson Learning Center" },
  { logo: "/assets/partners/Screenshot%202026-05-31%20at%2022.26.00.png", name: "AzaMath" },
  { logo: "/assets/partners/Cambridge%20Learning%20Center.jpg", name: "Cambridge Learning Center" },
  { logo: "/assets/partners/Richmond%20School.png", name: "Richmond School" }
];

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

type HomeSlide = (typeof slides)[number];

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
    partnerLabel: "Our Trusted Partners",
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
        body: "Ежедневная работа по Reading, Writing и Math, построенная на ошибках диагностики.",
        cta: "Смотреть цены"
      }
    ],
    partnerLabel: "Наши надежные партнеры",
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
    parent: {
      eyebrow: "Для родителей",
      title: "Вы видите реальный прогресс, а не просто факт занятий.",
      body: "Родителям легче доверять подготовке, когда они каждую неделю видят путь к баллу, слабые темы, выполненные задания и следующий план исправления.",
      cta: "Открыть контроль",
      summaryReportLabel: "Еженедельный отчет",
      summaryReportValue: "Каждое воскресенье",
      summaryReportBody: "Еженедельный отчет для родителей",
      summaryFocusLabel: "Текущий фокус",
      summaryFocusValue: "Сложная математика + transitions",
      summaryFocusBody: "Текущий фокус: сложная математика и transitions в Reading/Writing",
      cards: [
        {
          title: "Что родители получают каждую неделю",
          body: "Балл за mock test, количество выполненных заданий, список слабых тем и план на следующие 7 дней."
        },
        {
          title: "Как отслеживается прогресс",
          body: "Баллы Reading/Writing и Math сравниваются с точностью, временем и повторяющимися ошибками."
        },
        {
          title: "Как показываются слабые места",
          body: "Родители видят конкретные слабые навыки: transitions, evidence questions, algebra или advanced math."
        },
        {
          title: "Когда ожидать рост балла",
          body: "Первые изменения возможны через 7-14 дней; серьезный рост требует повторных циклов mock test."
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
          answer: "Возврат рассматривается индивидуально до активного использования аккаунта. После mock tests, отчетов или практики платеж обычно не возвращается."
        },
        {
          question: "Сколько mock tests доступно?",
          answer: "Бесплатный план включает диагностический просмотр. SATTEST Pro создан для повторной практики, аналитики и личного маршрута My 1400+."
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
          answer: "Родители видят баллы mock tests, слабые темы, выполненную практику и план следующего исправления."
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
        body: "Diagnostika xatolaridan tuzilgan kundalik Reading, Writing va Math ishlari.",
        cta: "Narxlarni ko'rish"
      }
    ],
    partnerLabel: "Ishonchli hamkorlarimiz",
    results: {
      eyebrow: "Natija isboti",
      title: "O'quvchi videolari va score reportlar bilan tasdiqlangan SAT o'sishi.",
      body: "O'quvchi videosi va mavjud bo'lsa rasmiy SAT score reportni ko'rish uchun natijani bosing.",
      parentLabel: "Ota-ona fikri",
      parentSource: "Muslimaning onasi - Telegram",
      parentGreeting: "Assalomu alaykum.",
      parentBody:
        "Rahmat, bu natijalarda sizning hissangiz ham katta. Allohim sizni qo'llab-quvvatlasin. O'quvchilaringiz yuqori ballari bilan ota-onasini xursand qilsin. Amin.",
      close: "O'quvchi natijalarini yopish",
      prev: "Oldingi o'quvchi videosi",
      next: "Keyingi o'quvchi videosi"
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
      summaryFocusValue: "Murakkab matematika + transitions",
      summaryFocusBody: "Hozirgi fokus: murakkab matematika va Reading/Writing transitions",
      cards: [
        {
          title: "Ota-onalar har hafta nima oladi",
          body: "Mock test bali, bajarilgan mashqlar soni, zaif mavzular ro'yxati va keyingi 7 kunlik reja."
        },
        {
          title: "Progress qanday kuzatiladi",
          body: "Reading/Writing va Math ballari aniqlik, vaqt va takroriy xatolar bilan solishtiriladi."
        },
        {
          title: "Zaif joylar qanday ko'rsatiladi",
          body: "Ota-onalar transitions, evidence questions, algebra yoki advanced math kabi aniq zaif ko'nikmalarni ko'radi."
        },
        {
          title: "Ball o'sishini qachon kutish mumkin",
          body: "Dastlabki o'zgarishlar 7-14 kunda ko'rinishi mumkin; katta o'sish uchun takroriy mock test sikllari kerak."
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
          answer: "Akkaunt faol ishlatilishidan oldin qaytarish alohida ko'rib chiqiladi. Mock test, hisobot yoki practice ishlatilgandan keyin to'lov odatda qaytarilmaydi."
        },
        {
          question: "Nechta mock test bor?",
          answer: "Bepul reja diagnostik ko'rishni beradi. SATTEST Pro takroriy practice, analytics va My 1400+ yo'nalishi uchun qurilgan."
        },
        {
          question: "Bu rasmiy SAT saytimi?",
          answer: "Yo'q. SATTEST.UZ mustaqil SAT tayyorgarlik platformasi. SAT — College Board savdo belgisi."
        },
        {
          question: "O'qituvchi kerakmi?",
          answer: "Mustaqil tayyorlanadigan o'quvchilar uchun Pro strukturali practice beradi. Shaxsiy tuzatish uchun Telegram orqali bog'lanish mumkin."
        },
        {
          question: "To'lovdan keyin nima bo'ladi?",
          answer: "Paynet QR yoki boshqa usul orqali to'laysiz, keyin chekni ro'yxatdan o'tgan email bilan Telegram botga yuborasiz."
        },
        {
          question: "Ota-onalar progressni qanday kuzatadi?",
          answer: "Ota-onalar mock test ballari, zaif mavzular, bajarilgan mashqlar va keyingi tuzatish rejasini ko'radi."
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

export default function Home() {
  const { language } = useLanguage();
  const copy = homeCopy[language];
  const slides = copy.slides;
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [currentVideo, setCurrentVideo] = useState<(typeof videoSources)[number]>("1-2");
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
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

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

  useEffect(() => {
    const activeVideo = videoRefs.current[currentVideo];

    if (activeVideo) {
      activeVideo.muted = true;
      activeVideo.currentTime = 0;
      activeVideo.play().catch(() => undefined);
    }

    const retryId = window.setTimeout(() => {
      const video = videoRefs.current[currentVideo];
      video?.play().catch(() => undefined);
    }, 120);

    return () => window.clearTimeout(retryId);
  }, [active, currentVideo]);

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
    setCurrentVideo(transitionVideoByRoute[`${current}-${normalized}`] ?? "1-2");
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
        <HomeThreeScene />
        <div className="nex-backgrounds" aria-hidden="true">
          {videoSources.map((source) => (
            <video
              className={`nex-background-video ${currentVideo === source ? "is-current" : ""}`}
              key={source}
              ref={(node) => {
                videoRefs.current[source] = node;
              }}
              src={`/assets/video/${source}.mp4`}
              autoPlay={source === currentVideo}
              muted
              loop
              playsInline
              preload="auto"
              onLoadedData={(event) => {
                if (source === currentVideo) {
                  event.currentTarget.play().catch(() => undefined);
                }
              }}
            />
          ))}
        </div>

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
              {studentResults.map((result) => (
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
                  <span className="results-card__meta">
                    <strong>{result.name}</strong>
                    <span>{result.score}</span>
                    <span>{result.improvement}</span>
                    <em>{result.evidence}</em>
                  </span>
                </button>
              ))}
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
        <video
          className="platform-ad-section__backgroundVideo"
          src="/assets/video/platform-rolling-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
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
            <div className="results-modal__caption">
              <strong>{activeResultVideo.name}</strong>
              <span>{activeResultVideo.score}</span>
              <span>{activeResultVideo.improvement}</span>
              <span>{activeResultVideo.method}</span>
              <span>
                {activeResultVideo.testDate ? `SAT test: ${activeResultVideo.testDate}` : activeResultVideo.evidence}
              </span>
              <small>Result proof is shared for credibility. Parent comments will be added after written permission.</small>
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
