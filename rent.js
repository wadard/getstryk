/* -------------------------------------------------- */
/* RENT.JS — PRODUCTION VERSION (WITH CONFIRM PAGE)   */
/* -------------------------------------------------- */

let selectedPackage = "pro";
let deliveryFee = 0;
let selectedDate = "";
let addressFromLookup = false;
let newsletterOptIn = false;

const prices = {
  starter: 35,
  pro: 45,
  elite: 55
};

const completionState = {
  step1: false,
  step2: false,
  step3: false,
  step4: false
};

const params = new URLSearchParams(window.location.search);
if (params.get("package") && prices[params.get("package")]) {
  selectedPackage = params.get("package");
}

/* -------------------------------------------------- */
/* DOM ELEMENTS */
/* -------------------------------------------------- */

const packageCards = document.querySelectorAll(".rent-package-card");

// Autocomplete + address
const addressSearchInput = document.getElementById("addressSearch");
const addressSuggestionsWrapper = document.getElementById("addressSuggestionsWrapper");
const addressSuggestionsList = document.getElementById("addressSuggestions");
const postcodeMessage = document.getElementById("postcodeMessage");
const manualAddressLink = document.getElementById("manualAddressLink");
const manualAddressWrapper = document.getElementById("manualAddressWrapper");
const addressLine1 = document.getElementById("addressLine1");
const addressLine2 = document.getElementById("addressLine2");
const town = document.getElementById("town");
const county = document.getElementById("county");
const fullPostcode = document.getElementById("fullPostcode");

// Delivery
const deliveryOptionsContainer = document.getElementById("deliveryOptions");
const deliveryTimeSelect = document.getElementById("deliveryTime");

// Customer details
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");

// Newsletter
const newsletterIcon = document.getElementById("newsletterIcon");

// Summary + confirm
const summaryBox = document.getElementById("summaryBox");
const confirmButton = document.getElementById("confirmButton");
const incompleteWarning = document.getElementById("incompleteWarning");

// Legal checkboxes (Material icons)
const legalChecks = document.querySelectorAll(".legal-check");

// Progress + nav
const progressBar = document.getElementById("rentProgressBar");
const sections = document.querySelectorAll(".rent-section");
const navStepsEls = document.querySelectorAll(".step");

/* -------------------------------------------------- */
/* HIDE ORDER NOW CTA ON RENT PAGE */
/* -------------------------------------------------- */

const navCTA = document.querySelector(".nav-cta");
if (window.location.pathname.includes("rent.html")) {
  navCTA.style.display = "none";
}

/* -------------------------------------------------- */
/* PACKAGE SELECTION */
/* -------------------------------------------------- */

function initPackages() {
  packageCards.forEach(card => {
    card.addEventListener("click", () => {
      selectedPackage = card.dataset.package;
      highlightSelectedPackage();
    });
  });
  highlightSelectedPackage();
}

function highlightSelectedPackage() {
  packageCards.forEach(card => {
    const toggle = card.querySelector(".package-toggle");
    card.classList.remove("selected");

    if (card.dataset.package === selectedPackage) {
      card.classList.add("selected");
      toggle.textContent = "toggle_on";
    } else {
      toggle.textContent = "toggle_off";
    }
  });

  completionState.step1 = !!selectedPackage;
  updateCompletion();
}

/* -------------------------------------------------- */
/* DELIVERY RADIUS */
/* -------------------------------------------------- */

function normalisePostcode(raw) {
  if (!raw) return "";
  let pc = raw.toUpperCase().replace(/\s+/g, "");
  if (pc.length < 5) return pc;
  const outward = pc.slice(0, pc.length - 3);
  const inward = pc.slice(-3);
  return outward + " " + inward;
}

function isInsideRadius(postcode) {
  const cleaned = normalisePostcode(postcode);
  const outward = cleaned.split(" ")[0] || "";
  const prefix2 = outward.slice(0, 2);
  const allowed = ["LS", "BD", "HG", "HX", "WF", "YO"];
  return allowed.includes(prefix2);
}

/* -------------------------------------------------- */
/* POSTCODES.IO AUTOCOMPLETE */
/* -------------------------------------------------- */

let autocompleteTimeout = null;

function clearSuggestions() {
  addressSuggestionsList.innerHTML = "";
  addressSuggestionsWrapper.classList.add("hidden");
}

function showSuggestions() {
  if (addressSuggestionsList.children.length > 0) {
    addressSuggestionsWrapper.classList.remove("hidden");
  } else {
    addressSuggestionsWrapper.classList.add("hidden");
  }
}

async function fetchPostcodeSuggestions(query) {
  try {
    const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(query)}/autocomplete`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.result || [];
  } catch {
    return [];
  }
}

async function fetchPostcodeDetails(pc) {
  try {
    const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.result || null;
  } catch {
    return null;
  }
}

function handleAddressSearchInput() {
  const query = addressSearchInput.value.trim().toUpperCase();

  postcodeMessage.textContent = "";
  completionState.step2 = false;
  addressFromLookup = false;
  updateCompletion();
  clearSuggestions();

  if (!query || query.length < 2) return;

  if (autocompleteTimeout) clearTimeout(autocompleteTimeout);

  autocompleteTimeout = setTimeout(async () => {
    const suggestions = await fetchPostcodeSuggestions(query);
    clearSuggestions();

    if (!suggestions.length) {
      postcodeMessage.textContent = "No matching postcodes found.";
      return;
    }

    suggestions.forEach(pc => {
      const li = document.createElement("li");
      li.textContent = pc;
      li.className = "autocomplete-item";
      li.addEventListener("click", () => handlePostcodeSelect(pc));
      addressSuggestionsList.appendChild(li);
    });

    showSuggestions();
  }, 250);
}

async function handlePostcodeSelect(pc) {
  clearSuggestions();
  addressSearchInput.value = pc;

  const details = await fetchPostcodeDetails(pc);
  if (!details) {
    postcodeMessage.textContent = "Could not fetch postcode details.";
    manualAddressWrapper.classList.remove("hidden");
    return;
  }

  town.value = details.admin_district || details.parish || "";
  county.value = details.admin_county || "";
  fullPostcode.value = details.postcode || pc;

  if (isInsideRadius(pc)) {
    postcodeMessage.textContent = "You’ve qualified for free delivery.";
    deliveryFee = 0;
  } else {
    postcodeMessage.textContent = "Standard delivery applied.";
    deliveryFee = 45;
  }

  manualAddressWrapper.classList.remove("hidden");
  addressFromLookup = true;

  completionState.step2 = false;
  updateCompletion();
}

/* -------------------------------------------------- */
/* MANUAL ADDRESS VALIDATION */
/* -------------------------------------------------- */

function markFieldError(field, condition) {
  if (!condition) field.classList.add("field-error");
  else field.classList.remove("field-error");
}

function handleManualAddressInput() {
  const line1 = addressLine1.value.trim();
  const street = addressLine2.value.trim();
  const townVal = town.value.trim();
  const pc = fullPostcode.value.trim();

  markFieldError(addressLine1, !!line1);
  markFieldError(addressLine2, !!street);
  markFieldError(town, !!townVal);
  markFieldError(fullPostcode, !!pc);

  if (line1 && street && townVal && pc) {
    if (isInsideRadius(pc)) {
      postcodeMessage.textContent = "You’ve qualified for free delivery.";
      deliveryFee = 0;
    } else {
      postcodeMessage.textContent = "Standard delivery applied.";
      deliveryFee = 45;
    }
    completionState.step2 = true;
  } else {
    completionState.step2 = false;
  }

  updateCompletion();
}

/* -------------------------------------------------- */
/* DELIVERY DATE LOGIC — 5 WORKING DAY BUFFER */
/* -------------------------------------------------- */

function workingDaysBetween(start, end) {
  let count = 0;
  let current = new Date(start);

  while (current < end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

function getValidWeekendDates() {
  const today = new Date();

  let nextSaturday = new Date(today);
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);

  if (workingDaysBetween(today, nextSaturday) < 5) {
    nextSaturday.setDate(nextSaturday.getDate() + 7);
  }

  const nextSunday = new Date(nextSaturday);
  nextSunday.setDate(nextSaturday.getDate() + 1);

  const followingSaturday = new Date(nextSaturday);
  followingSaturday.setDate(nextSaturday.getDate() + 7);

  const followingSunday = new Date(nextSunday);
  followingSunday.setDate(nextSunday.getDate() + 7);

  return [nextSaturday, nextSunday, followingSaturday, followingSunday];
}

function generateDeliveryDates() {
  deliveryOptionsContainer.innerHTML = "";

  const dates = getValidWeekendDates();

  dates.forEach(d => {
    const btn = document.createElement("button");
    btn.className = "delivery-btn";
    btn.textContent = d.toDateString();
    btn.addEventListener("click", () => {
      document.querySelectorAll(".delivery-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedDate = d.toDateString();
      completionState.step3 = true;
      updateCompletion();
    });
    deliveryOptionsContainer.appendChild(btn);
  });
}

/* -------------------------------------------------- */
/* NEWSLETTER OPT-IN */
/* -------------------------------------------------- */

newsletterIcon.addEventListener("click", () => {
  newsletterOptIn = !newsletterOptIn;

  if (newsletterOptIn) {
    newsletterIcon.textContent = "check_box";
    newsletterIcon.classList.add("active");
  } else {
    newsletterIcon.textContent = "check_box_outline_blank";
    newsletterIcon.classList.remove("active");
  }
});

/* -------------------------------------------------- */
/* SUMMARY */
/* -------------------------------------------------- */

function updateSummary(showAlert = false) {
  const total = prices[selectedPackage] + deliveryFee;
  const timeWindow = deliveryTimeSelect.value || "Anytime";
  const name = fullNameInput.value || "(Not provided yet)";
  const email = emailInput.value || "(Not provided yet)";
  const phone = phoneInput.value || "(Not provided yet)";

  const addr1 = addressLine1.value || "(Not provided yet)";
  const addr2 = addressLine2.value || "";
  const townVal = town.value || "";
  const countyVal = county.value || "";
  const pc = fullPostcode.value || "";

  const addressDisplay = [addr1, addr2, townVal, countyVal, pc]
    .filter(Boolean)
    .join(", ");

  summaryBox.innerHTML = `
    <p><strong>Package:</strong> ${selectedPackage.toUpperCase()}</p>
    <p><strong>Monthly Price:</strong> £${prices[selectedPackage]}</p>
    <p><strong>Delivery Fee:</strong> £${deliveryFee}</p>
    <p><strong>Total First Payment:</strong> £${total}</p>
    <hr>
    <p><strong>Delivery Date:</strong> ${selectedDate || "(Not selected yet)"}</p>
    <p><strong>Time Window:</strong> ${timeWindow}</p>
    <hr>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Address:</strong> ${addressDisplay || "(Not provided yet)"}</p>
    <p><strong>Newsletter Opt-In:</strong> ${newsletterOptIn ? "Yes" : "No"}</p>
  `;

  if (showAlert) {
    alert("This is a preview confirmation. In production, this would proceed to payment/booking.");
  }
}

/* -------------------------------------------------- */
/* LEGAL CHECKBOXES — MATERIAL ICONS */
/* -------------------------------------------------- */

legalChecks.forEach(check => {
  check.addEventListener("click", () => {
    check.classList.toggle("active");

    const icon = check.querySelector(".legal-icon");
    icon.textContent = check.classList.contains("active")
      ? "check_box"
      : "check_box_outline_blank";

    updateConfirmButtonState();
  });
});

/* -------------------------------------------------- */
/* SINGLE SOURCE OF TRUTH FOR BUTTON STATE */
/* -------------------------------------------------- */

function updateConfirmButtonState() {
  const stepsComplete =
    completionState.step1 &&
    completionState.step2 &&
    completionState.step3 &&
    completionState.step4;

  const termsEl = document.querySelector('[data-check="terms"]');
  const safetyEl = document.querySelector('[data-check="safety"]');

  const termsAccepted = termsEl ? termsEl.classList.contains("active") : false;
  const safetyAccepted = safetyEl ? safetyEl.classList.contains("active") : false;

  // CASE 1 — Steps incomplete
  if (!stepsComplete) {
    confirmButton.disabled = true;
    confirmButton.classList.add("disabled");
    incompleteWarning.classList.remove("hidden");
    return;
  }

  // CASE 2 — Steps complete but legal not accepted
  if (stepsComplete && (!termsAccepted || !safetyAccepted)) {
    confirmButton.disabled = true;
    confirmButton.classList.add("disabled");
    incompleteWarning.classList.add("hidden");
    return;
  }

  // CASE 3 — Everything complete
  confirmButton.disabled = false;
  confirmButton.classList.remove("disabled");
  incompleteWarning.classList.add("hidden");
}

/* -------------------------------------------------- */
/* COMPLETION + PROGRESS */
/* -------------------------------------------------- */

function updateCompletion() {
  const name = fullNameInput.value.trim();
  const email = emailInput.value.trim();

  completionState.step4 = !!(name && email);

  const steps = [1, 2, 3, 4, 5];
  const navSteps = {
    1: "step1nav",
    2: "step2nav",
    3: "step3nav",
    4: "step4nav",
    5: "step5nav"
  };

  steps.forEach(step => {
    const card = document.getElementById(`card-step${step}`);
    const numberEl = document.querySelector(`.step-number[data-step="${step}"]`);
    const navEl = document.getElementById(navSteps[step]);

    const isCompleted =
      step === 1 ? completionState.step1 :
        step === 2 ? completionState.step2 :
          step === 3 ? completionState.step3 :
            step === 4 ? completionState.step4 :
              (completionState.step1 && completionState.step2 && completionState.step3 && completionState.step4);

    if (isCompleted) {
      card.classList.add("completed");
      numberEl.classList.add("completed");
      navEl.classList.add("completed");
    } else {
      card.classList.remove("completed");
      numberEl.classList.remove("completed");
      navEl.classList.remove("completed");
    }
  });

  let completedCount = 0;
  if (completionState.step1) completedCount++;
  if (completionState.step2) completedCount++;
  if (completionState.step3) completedCount++;
  if (completionState.step4) completedCount++;
  const allComplete = completedCount === 4;
  if (allComplete) completedCount = 5;

  const totalSteps = 5;
  const percent = (completedCount / totalSteps) * 100;
  progressBar.style.width = percent + "%";

  updateSummary(false);
  updateConfirmButtonState();
}

/* -------------------------------------------------- */
/* CLICK WARNING TO SCROLL TO FIRST INCOMPLETE STEP */
/* -------------------------------------------------- */

incompleteWarning.addEventListener("click", () => {
  if (!completionState.step1) document.getElementById("step1").scrollIntoView({ behavior: "smooth" });
  else if (!completionState.step2) document.getElementById("step2").scrollIntoView({ behavior: "smooth" });
  else if (!completionState.step3) document.getElementById("step3").scrollIntoView({ behavior: "smooth" });
  else if (!completionState.step4) document.getElementById("step4").scrollIntoView({ behavior: "smooth" });
});

/* -------------------------------------------------- */
/* SCROLL HIGHLIGHT */
/* -------------------------------------------------- */

function initScrollHighlight() {
  window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 220;
      if (window.pageYOffset >= sectionTop) {
        current = section.getAttribute("id");
      }
    });

    navStepsEls.forEach(step => {
      step.classList.remove("current");
      if (step.id === current + "nav") {
        step.classList.add("current");
      }
    });
  });
}

/* -------------------------------------------------- */
/* RESTORE FROM LOCALSTORAGE (FULL RESTORE) */
/* -------------------------------------------------- */

function restoreFromLocalStorage() {
  const stored = localStorage.getItem("rentalData");
  if (!stored) {
    updateCompletion();
    return;
  }

  try {
    const saved = JSON.parse(stored);

    // Core selections
    if (saved.selectedPackage && prices[saved.selectedPackage]) {
      selectedPackage = saved.selectedPackage;
    }
    if (typeof saved.deliveryFee === "number") {
      deliveryFee = saved.deliveryFee;
    }
    selectedDate = saved.selectedDate || "";

    // Delivery time
    if (saved.deliveryTime) {
      deliveryTimeSelect.value = saved.deliveryTime;
    }

    // Customer details
    fullNameInput.value = saved.fullName || "";
    emailInput.value = saved.email || "";
    phoneInput.value = saved.phone || "";

    // Address
    if (saved.address) {
      addressLine1.value = saved.address.line1 || "";
      addressLine2.value = saved.address.line2 || "";
      town.value = saved.address.town || "";
      county.value = saved.address.county || "";
      fullPostcode.value = saved.address.postcode || "";

      if (addressLine1.value || addressLine2.value || town.value || county.value || fullPostcode.value) {
        manualAddressWrapper.classList.remove("hidden");
      }
    }

    // Newsletter
    newsletterOptIn = !!saved.newsletterOptIn;
    if (newsletterOptIn) {
      newsletterIcon.textContent = "check_box";
      newsletterIcon.classList.add("active");
    } else {
      newsletterIcon.textContent = "check_box_outline_blank";
      newsletterIcon.classList.remove("active");
    }

    // Highlight package
    highlightSelectedPackage();

    // Reselect delivery date button
    if (selectedDate) {
      const buttons = document.querySelectorAll(".delivery-btn");
      buttons.forEach(btn => {
        if (btn.textContent === selectedDate) {
          btn.classList.add("selected");
        }
      });
    }

    // Restore legal checkboxes
    const termsEl = document.querySelector('[data-check="terms"]');
    const safetyEl = document.querySelector('[data-check="safety"]');

    if (termsEl && typeof saved.termsAccepted === "boolean") {
      termsEl.classList.toggle("active", saved.termsAccepted);
      const icon = termsEl.querySelector(".legal-icon");
      if (icon) {
        icon.textContent = saved.termsAccepted ? "check_box" : "check_box_outline_blank";
      }
    }

    if (safetyEl && typeof saved.safetyAccepted === "boolean") {
      safetyEl.classList.toggle("active", saved.safetyAccepted);
      const icon = safetyEl.querySelector(".legal-icon");
      if (icon) {
        icon.textContent = saved.safetyAccepted ? "check_box" : "check_box_outline_blank";
      }
    }

    // Recompute completion state
    completionState.step1 = !!selectedPackage;

    const hasAddress =
      addressLine1.value.trim() &&
      addressLine2.value.trim() &&
      town.value.trim() &&
      fullPostcode.value.trim();

    completionState.step2 = !!hasAddress;
    completionState.step3 = !!selectedDate;

    const name = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    completionState.step4 = !!(name && email);

    updateCompletion();
  } catch {
    updateCompletion();
  }
}

/* -------------------------------------------------- */
/* CONFIRM BUTTON → REDIRECT TO CONFIRM PAGE */
/* -------------------------------------------------- */

confirmButton.addEventListener("click", () => {
  const termsEl = document.querySelector('[data-check="terms"]');
  const safetyEl = document.querySelector('[data-check="safety"]');

  const termsAccepted = termsEl ? termsEl.classList.contains("active") : false;
  const safetyAccepted = safetyEl ? safetyEl.classList.contains("active") : false;

  const data = {
    selectedPackage,
    deliveryFee,
    selectedDate,
    deliveryTime: deliveryTimeSelect.value || "Anytime",
    fullName: fullNameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    address: {
      line1: addressLine1.value.trim(),
      line2: addressLine2.value.trim(),
      town: town.value.trim(),
      county: county.value.trim(),
      postcode: fullPostcode.value.trim()
    },
    newsletterOptIn,
    termsAccepted,
    safetyAccepted
  };

  localStorage.setItem("rentalData", JSON.stringify(data));

  window.location.href = "confirm-rental.html";
});

/* -------------------------------------------------- */
/* EVENTS */
/* -------------------------------------------------- */

function initEvents() {
  addressSearchInput.addEventListener("input", handleAddressSearchInput);

  document.addEventListener("click", e => {
    if (!addressSuggestionsWrapper.contains(e.target) && e.target !== addressSearchInput) {
      clearSuggestions();
    }
  });

  manualAddressLink.addEventListener("click", () => {
    manualAddressWrapper.classList.remove("hidden");
  });

  [addressLine1, addressLine2, town, county, fullPostcode].forEach(input => {
    input.addEventListener("input", handleManualAddressInput);
  });

  deliveryTimeSelect.addEventListener("change", updateCompletion);

  [fullNameInput, emailInput].forEach(input => {
    input.addEventListener("input", updateCompletion);
  });
}

/* -------------------------------------------------- */
/* INIT */
/* -------------------------------------------------- */

function init() {
  initPackages();
  generateDeliveryDates();
  initEvents();
  initScrollHighlight();
  restoreFromLocalStorage();
}

init();
