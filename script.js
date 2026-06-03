const TELEGRAM_USERNAME = "adam232";
const TELEGRAM_DISPLAY_NAME = "Founder of SATTEST.UZ";
const PAYNET_QR_PAYLOAD =
  "00020101021140440012qr-online.uz01186qz7uqn60TiFsWDuxO0202115204531153038605802UZ5910AO'PAYNET'6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz630453C8";

const plans = [
  {
    id: "diagnostic-mock",
    kicker: "Free plan",
    icon: "spark",
    name: "Diagnostic Mock",
    price: "0 UZS",
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
    kicker: "Most useful",
    icon: "spark",
    name: "SAT Platform Pro",
    price: "149 000 UZS / month",
    description:
      "The main plan for students who want targeted SAT practice and a visible score-growth route.",
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
    kicker: "Elite program",
    icon: "crown",
    name: "1400+ Elite",
    price: "990 000 UZS / month",
    description:
      "High-touch preparation for students who need personal structure, strategy, and weekly correction.",
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

const accessKey = "sat1600PurchasedPlans";
const pricingGrid = document.querySelector("#pricingGrid");
const dialog = document.querySelector("#paymentDialog");
const paymentTitle = document.querySelector("#paymentTitle");
const paymentSubtitle = document.querySelector("#paymentSubtitle");
const paymentQr = document.querySelector("#paymentQr");
const telegramButton = document.querySelector("#telegramButton");
const receiptInput = document.querySelector("#receiptInput");
const unlockButton = document.querySelector("#unlockButton");
const unlockNote = document.querySelector("#unlockNote");
const systemView = document.querySelector("#systemView");
const activeSystemTitle = document.querySelector("#activeSystemTitle");
const activeSystemDescription = document.querySelector("#activeSystemDescription");
const moduleGrid = document.querySelector("#moduleGrid");
const closeSystemButton = document.querySelector("#closeSystemButton");

let selectedPlan = null;

function getPurchasedPlans() {
  return JSON.parse(localStorage.getItem(accessKey) || "[]");
}

function savePurchasedPlan(planId) {
  const purchased = new Set(getPurchasedPlans());
  purchased.add(planId);
  localStorage.setItem(accessKey, JSON.stringify([...purchased]));
}

function qrUrlFor() {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    PAYNET_QR_PAYLOAD,
  )}`;
}

function telegramUrlFor(plan) {
  const text = `Assalomu alaykum, I paid for ${plan.name}. I will send the payment screenshot now.`;
  return `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(text)}`;
}

function iconFor(type) {
  return type === "crown" ? "♕" : "✦";
}

function renderPlans() {
  pricingGrid.innerHTML = plans
    .map((plan) => {
      return `
        <article class="pricing-card ${plan.featured ? "is-featured" : ""}">
          <div>
            <div class="plan-hero">
              <div class="plan-meta">
                <span class="plan-kicker">${plan.kicker}</span>
                <span class="plan-icon" aria-hidden="true">${iconFor(plan.icon)}</span>
              </div>
              <h2 class="plan-name">${plan.name}</h2>
              <p class="plan-price">${plan.price}</p>
              <p class="plan-description">${plan.description}</p>
            </div>
            <ul class="feature-list">
              ${plan.features
                .map(
                  (feature) => `
                    <li>
                      <span class="check" aria-hidden="true">✓</span>
                      <span>${feature}</span>
                    </li>
                  `,
                )
                .join("")}
            </ul>
          </div>
          <button class="plan-button" data-plan="${plan.id}">
            <span>${plan.free ? "Enter plan" : plan.button}</span>
            <span aria-hidden="true">→</span>
          </button>
        </article>
      `;
    })
    .join("");
}

function openPayment(plan) {
  selectedPlan = plan;
  receiptInput.value = "";
  unlockButton.disabled = true;
  unlockNote.textContent = "Upload the payment screenshot to continue.";
  paymentTitle.textContent = `Pay for ${plan.name}`;
  paymentSubtitle.textContent = `${plan.price} - scan the QR, pay with Paynet, then send the receipt to ${TELEGRAM_DISPLAY_NAME}.`;
  paymentQr.src = qrUrlFor();
  telegramButton.href = telegramUrlFor(plan);
  dialog.showModal();
}

function enterPlan(plan) {
  activeSystemTitle.textContent = plan.name;
  activeSystemDescription.textContent = plan.description;
  moduleGrid.innerHTML = plan.modules
    .map(
      (moduleName) => `
        <div class="module-item">
          <strong>${moduleName}</strong>
          <span>${plan.free ? "Free access is active." : "Purchased access is active."}</span>
        </div>
      `,
    )
    .join("");
  systemView.hidden = false;
  systemView.scrollIntoView({ behavior: "smooth", block: "start" });
}

pricingGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-plan]");
  if (!button) return;

  const plan = plans.find((item) => item.id === button.dataset.plan);
  if (!plan) return;

  if (plan.free) {
    enterPlan(plan);
    return;
  }

  openPayment(plan);
});

receiptInput.addEventListener("change", () => {
  const hasReceipt = receiptInput.files && receiptInput.files.length > 0;
  unlockButton.disabled = !hasReceipt;
  unlockNote.textContent = hasReceipt
    ? `Screenshot selected. Open Telegram and send it to ${TELEGRAM_DISPLAY_NAME} before unlocking access.`
    : "Upload the payment screenshot to continue.";
});

unlockButton.addEventListener("click", () => {
  if (!selectedPlan || unlockButton.disabled) return;

  savePurchasedPlan(selectedPlan.id);
  dialog.close();
  renderPlans();
  enterPlan(selectedPlan);
});

closeSystemButton.addEventListener("click", () => {
  systemView.hidden = true;
  document.querySelector("#pricing").scrollIntoView({ behavior: "smooth", block: "start" });
});

renderPlans();
