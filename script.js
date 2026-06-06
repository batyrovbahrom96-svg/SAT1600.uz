// ─── Constants ────────────────────────────────────────────────────
const TELEGRAM_USERNAME     = "FounderSATTESTUZ";
const TELEGRAM_DISPLAY_NAME = "@FounderSATTESTUZ";

const PAYNET_QR_PAYLOAD =
  "00020101021140440012qr-online.uz01186qz7uqn60TiFsWDuxO0202115204531153038605802UZ5910AO'PAYNET'6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz630453C8";

// ─── Plan data ────────────────────────────────────────────────────
const plans = [
  {
    id: "diagnostic-mock",
    kicker: "Free route",
    icon: "01",
    name: "Diagnostic Mock",
    priceAmount: "0 UZS",
    pricePeriod: "",
    description: "For students who want to see their real SAT level before choosing a paid route.",
    button: "Start free",
    featured: false,
    free: true,
    features: [
      "1 full diagnostic SAT mock test",
      "Overall score preview",
      "Reading/Writing and Math section scores",
      "Limited mistake preview",
      "Upgrade when the weak areas are clear",
    ],
    modules: ["Full diagnostic mock", "Score preview", "Limited mistake preview"],
  },
  {
    id: "sat-platform-pro",
    kicker: "Core platform",
    icon: "02",
    name: "SAT Platform Pro",
    priceAmount: "149 000 UZS",
    pricePeriod: "month",
    description: "The main plan for students who want targeted SAT practice and a visible score-growth route.",
    button: "Unlock Pro",
    featured: true,
    free: false,
    features: [
      "Unlimited SAT practice by Reading, Writing, and Math",
      "Full diagnostic analytics after every mock test",
      "Mistake and weakness targeting by topic",
      "Personal My 1400+ curriculum route",
      "Progress tracking for score growth",
    ],
    modules: ["Unlimited practice", "Diagnostic analytics", "My 1400+ route"],
  },
  {
    id: "elite-1400",
    kicker: "Elite system",
    icon: "03",
    name: "1400+ Elite",
    priceAmount: "990 000 UZS",
    pricePeriod: "month",
    description: "High-touch preparation for students who need personal structure, strategy, and weekly correction.",
    button: "Join Elite",
    featured: false,
    free: false,
    features: [
      "Everything in SAT Platform Pro",
      "Personal study roadmap for 1400+",
      "Weekly strategy and mistake review",
      "Priority weak-topic practice plan",
      "Guidance for serious score improvement",
    ],
    modules: ["Personal roadmap", "Weekly review", "Priority practice plan"],
  },
];

// ─── localStorage helpers ─────────────────────────────────────────
const ACCESS_KEY = "sat1600PurchasedPlans";

function getPurchasedPlans() {
  try { return JSON.parse(localStorage.getItem(ACCESS_KEY) || "[]"); }
  catch { return []; }
}

function savePurchasedPlan(planId) {
  const purchased = new Set(getPurchasedPlans());
  purchased.add(planId);
  try { localStorage.setItem(ACCESS_KEY, JSON.stringify([...purchased])); }
  catch {}
}

function isPlanUnlocked(plan) {
  return plan.free || getPurchasedPlans().includes(plan.id);
}

// ─── QR / Telegram helpers ────────────────────────────────────────
function qrUrlFor() {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(PAYNET_QR_PAYLOAD)}`;
}

function telegramUrlFor(plan) {
  const text = `Assalomu alaykum, I paid for ${plan.name}. I will send the payment screenshot now.`;
  return `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(text)}`;
}

// ─── DOM references ───────────────────────────────────────────────
const pricingGrid             = document.querySelector("#pricingGrid");
const dialog                  = document.querySelector("#paymentDialog");
const paymentTitle            = document.querySelector("#paymentTitle");
const paymentSubtitle         = document.querySelector("#paymentSubtitle");
const paymentQr               = document.querySelector("#paymentQr");
const telegramButton          = document.querySelector("#telegramButton");
const receiptInput            = document.querySelector("#receiptInput");
const unlockButton            = document.querySelector("#unlockButton");
const unlockNote              = document.querySelector("#unlockNote");
const systemView              = document.querySelector("#systemView");
const activeSystemTitle       = document.querySelector("#activeSystemTitle");
const activeSystemDescription = document.querySelector("#activeSystemDescription");
const moduleGrid              = document.querySelector("#moduleGrid");
const closeSystemButton       = document.querySelector("#closeSystemButton");

let selectedPlan = null;

// ─── Render pricing cards ─────────────────────────────────────────
function renderPlans() {
  const purchased = getPurchasedPlans();

  pricingGrid.innerHTML = plans.map((plan) => {
    const unlocked    = plan.free || purchased.includes(plan.id);
    const buttonLabel = unlocked ? "Enter plan" : plan.button;
    const periodHtml  = plan.pricePeriod
      ? `<span class="plan-price-period">/ ${plan.pricePeriod}</span>`
      : "";

    return `
      <article class="pricing-card ${plan.featured ? "is-featured" : ""}" role="listitem">
        <div class="plan-top">
          <div class="plan-meta">
            <span class="plan-kicker">${plan.kicker}</span>
            <span class="plan-icon">${plan.icon}</span>
          </div>
          <h3 class="plan-name">${plan.name}</h3>
          <p class="plan-price">${plan.priceAmount}${periodHtml}</p>
          <p class="plan-description">${plan.description}</p>
        </div>
        <ul class="feature-list">
          ${plan.features.map((f) => `
            <li>
              <span class="check" aria-hidden="true">✓</span>
              <span>${f}</span>
            </li>`).join("")}
        </ul>
        <button class="plan-button" data-plan="${plan.id}" aria-label="${buttonLabel}: ${plan.name}">
          <span>${buttonLabel}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </article>
    `;
  }).join("");
}

// ─── Payment modal ────────────────────────────────────────────────
function openPayment(plan) {
  selectedPlan              = plan;
  receiptInput.value        = "";
  unlockButton.disabled     = true;
  unlockNote.textContent    = "Upload the payment screenshot to continue.";

  paymentTitle.textContent    = `Pay for ${plan.name}`;
  paymentSubtitle.textContent =
    `${plan.priceAmount}${plan.pricePeriod ? " / " + plan.pricePeriod : ""} ` +
    `— scan the QR, pay with Paynet, then send the receipt to ${TELEGRAM_DISPLAY_NAME}.`;

  paymentQr.src = "";
  paymentQr.alt = "Loading Paynet QR code…";
  paymentQr.src = qrUrlFor();
  paymentQr.onerror = () => { paymentQr.alt = "QR unavailable — contact " + TELEGRAM_DISPLAY_NAME; };
  paymentQr.onload  = () => { paymentQr.alt = "Paynet payment QR code"; };

  telegramButton.href = telegramUrlFor(plan);
  document.body.classList.add("is-dialog-open");
  dialog.showModal();
}

// ─── Unlock / enter a plan ────────────────────────────────────────
function enterPlan(plan) {
  activeSystemTitle.textContent       = plan.name;
  activeSystemDescription.textContent = plan.description;

  moduleGrid.innerHTML = plan.modules.map((name) => `
    <div class="module-item">
      <strong>${name}</strong>
      <span>${plan.free ? "Free access is active." : "Purchased access is active."}</span>
    </div>`).join("");

  systemView.hidden = false;
  systemView.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Plan button delegation ───────────────────────────────────────
pricingGrid.addEventListener("click", (e) => {
  const button = e.target.closest("[data-plan]");
  if (!button) return;
  const plan = plans.find((p) => p.id === button.dataset.plan);
  if (!plan) return;
  if (isPlanUnlocked(plan)) { enterPlan(plan); return; }
  openPayment(plan);
});

// ─── Receipt upload ───────────────────────────────────────────────
receiptInput.addEventListener("change", () => {
  const has = receiptInput.files && receiptInput.files.length > 0;
  unlockButton.disabled  = !has;
  unlockNote.textContent = has
    ? `Screenshot selected. Open Telegram and send it to ${TELEGRAM_DISPLAY_NAME} before unlocking.`
    : "Upload the payment screenshot to continue.";
});

// ─── Unlock button ────────────────────────────────────────────────
unlockButton.addEventListener("click", () => {
  if (!selectedPlan || unlockButton.disabled) return;
  savePurchasedPlan(selectedPlan.id);
  dialog.close();
  renderPlans();
  enterPlan(selectedPlan);
});

// ─── Dialog close ─────────────────────────────────────────────────
dialog.addEventListener("close", () => {
  document.body.classList.remove("is-dialog-open");
  selectedPlan = null;
});

// ─── Back-to-pricing ─────────────────────────────────────────────
closeSystemButton.addEventListener("click", () => {
  systemView.hidden = true;
  document.querySelector("#pricing").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ─── Scroll-to buttons ────────────────────────────────────────────
document.querySelectorAll("[data-scroll-target]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.querySelector(btn.dataset.scrollTarget);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ─── Floating diagonal dashes ─────────────────────────────────────
function initDashes() {
  const layer = document.getElementById("dashesLayer");
  if (!layer) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const count = window.innerWidth < 768 ? 22 : 46;
  const angles = [-45, -30, -60, 45, 30, 60, -50, 50];

  for (let i = 0; i < count; i++) {
    const dash = document.createElement("div");
    dash.className = "dash";

    const top    = Math.random() * 100;
    const left   = Math.random() * 100;
    const angle  = angles[Math.floor(Math.random() * angles.length)];
    const scale  = 0.6 + Math.random() * 1.2;
    const opacity = 0.25 + Math.random() * 0.45;

    dash.style.cssText = `
      top: ${top}%;
      left: ${left}%;
      transform: rotate(${angle}deg) scaleX(${scale});
      opacity: ${opacity};
    `;

    // Subtle fade animation offset so they don't all pulse together
    const delay    = Math.random() * 6;
    const duration = 4 + Math.random() * 4;
    dash.style.animation = `dashPulse ${duration}s ${delay}s ease-in-out infinite`;

    layer.appendChild(dash);
  }

  // Inject keyframes once
  if (!document.getElementById("dashKeyframes")) {
    const style = document.createElement("style");
    style.id = "dashKeyframes";
    style.textContent = `
      @keyframes dashPulse {
        0%, 100% { opacity: var(--dash-op, 0.4); }
        50%       { opacity: calc(var(--dash-op, 0.4) * 0.35); }
      }
    `;
    document.head.appendChild(style);
  }

  // Store opacity as CSS var on each dash for the animation
  layer.querySelectorAll(".dash").forEach((d) => {
    d.style.setProperty("--dash-op", d.style.opacity);
  });
}

// ─── Boot ─────────────────────────────────────────────────────────
renderPlans();
initDashes();
