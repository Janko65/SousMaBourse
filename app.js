/* --- LOCALSTORAGE KEYS --- */
const LS = {
  balance: "balance",
  tx: "transactions",
  settings: "settings",
  periodKey: "periodKey",
  theme: "theme",
  lang: "lang",
  currency: "currency"
};

/* --- STATE --- */
let balance = Number(localStorage.getItem(LS.balance)) || 0;
let transactions = JSON.parse(localStorage.getItem(LS.tx)) || [];
let settings = JSON.parse(localStorage.getItem(LS.settings)) || { startDay: 1 };
let currentTheme = localStorage.getItem(LS.theme) || "dark";
let currentLang = localStorage.getItem(LS.lang) || "fr";
let currentCurrency = localStorage.getItem(LS.currency) || "EUR";

let editingId = null;
const today = new Date();

/* --- CURRENCY MAP --- */
const currencyMap = { EUR: "€", USD: "$", GBP: "£" };

/* --- I18N --- */
const i18n = {
  fr: {
    periodSummary: "Du {start} au {end}, vos dépenses seront de {total}.",
    dailySub: "de disponible par jour pour ne pas être ric-rac à la fin du mois!",
    balanceSub: "Indiquez le montant de votre compte bancaire et cochez les cases si les opérations sont passées",
    periodBtn: "Période",
    addTx: "Mouvement d'argent",
    moreBtn: "Plus…",
    backup: "Sauvegarder les données",
    restore: "Restaurer les données",
    reset: "Reset",
    update: "Mise à jour",
    debit: "Débit",
    credit: "Revenu",
    today: "aujourd'hui",
    validate: "Valider",
    cancel: "Annuler",
    save: "Sauvegarder",
    delete: "Supprimer",
    themeLight: "Passer en clair",
    themeDark: "Passer en sombre",
    langToggle: "Switch in English",
    alertCopied: "Données copiées dans le presse-papiers",
    alertInvalid: "Restaurer les données avec le presse-papier ?",
    alertReset: "Tout effacer ?",
    placeholderAmount: "Montant",
    placeholderTitle: "Titre de la transaction",
    placeholderDate: "Date de la transaction",
    placeholderBalance: "Montant du solde",
    startDayLabel: "Début du mois (Jour de paie)"
  },
  en: {
    periodSummary: "From {start} to {end}, your expenses will be {total}.",
    dailySub: "available per day to avoid being tight at the end of the month!",
    balanceSub: "Enter your bank account balance and check the boxes if the transactions are completed",
    periodBtn: "Period",
    addTx: "Money movement",
    moreBtn: "More…",
    backup: "Backup data",
    restore: "Restore data",
    reset: "Reset",
    update: "Update",
    debit: "Expense",
    credit: "Income",
    today: "today",
    validate: "Validate",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    themeLight: "Switch to light",
    themeDark: "Switch to dark",
    langToggle: "Passer en Français",
    alertCopied: "Data copied to clipboard",
    alertInvalid: "Use clipboard to restore your data",
    alertReset: "Delete everything ?",
    placeholderAmount: "Amount",
    placeholderTitle: "Transaction title",
    placeholderDate: "Transaction date",
    placeholderBalance: "Balance amount",
    startDayLabel: "Start of the month (Payday)"
  }
};

/* --- DATE FUNCTIONS --- */
function effDay(d, y, m) {
  return Math.min(d, new Date(y, m + 1, 0).getDate());
}

function getPeriodStart() {
  let y = today.getFullYear(), m = today.getMonth();
  const start = effDay(settings.startDay, y, m);
  if (today.getDate() < start) {
    m -= 1;
    if (m < 0) { m = 11; y -= 1; }
  }
  return { year: y, month: m, start: effDay(settings.startDay, y, m) };
}

function getPeriodKey() {
  const p = getPeriodStart();
  return `${p.year}-${p.month}-${p.start}`;
}

function periodEnd() {
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  const start = effDay(settings.startDay, y, m);
  let ny = y, nm = m;
  if (d >= start) {
    nm += 1;
    if (nm > 11) { nm = 0; ny += 1; }
  }
  return new Date(ny, nm, effDay(settings.startDay, ny, nm) - 1);
}

function txDateForDay(day) {
  const ps = getPeriodStart();
  let y = ps.year, m = ps.month;
  if (day < settings.startDay) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return new Date(y, m, effDay(day, y, m));
}

/* --- STORAGE --- */
function saveAll() {
  localStorage.setItem(LS.balance, balance);
  localStorage.setItem(LS.tx, JSON.stringify(transactions));
  localStorage.setItem(LS.settings, JSON.stringify(settings));
  localStorage.setItem(LS.theme, currentTheme);
  localStorage.setItem(LS.lang, currentLang);
  localStorage.setItem(LS.currency, currentCurrency);
}

function importData(text) {
  const d = JSON.parse(text);
  if (!d || d.v !== 1 || !Array.isArray(d.transactions)) throw Error("Format invalide");
  balance = Number(d.balance) || 0;
  settings = d.settings || { startDay: 1 };
  transactions = d.transactions;
  saveAll();
}

/* --- FORMAT --- */
function formatValue(v) {
  const symbol = currencyMap[currentCurrency] || "$";
  const value = v % 1 === 0 ? v : v.toFixed(2).replace(".", currentLang === "fr" ? "," : ".");
  return value + symbol;
}

/* --- DOM --- */
const dailyAmount = document.getElementById("dailyAmount");
const balanceDisplay = document.getElementById("balanceDisplay");
const txList = document.getElementById("txList");
const periodStartEl = document.getElementById("periodStart");
const periodEndEl = document.getElementById("periodEnd");
const monthlyTotalEl = document.getElementById("monthlyTotal");
const balanceModal = document.getElementById("balanceModal");
const txModal = document.getElementById("txModal");
const periodModal = document.getElementById("periodModal");
const moreModal = document.getElementById("moreModal");
const balanceInput = document.getElementById("balanceInput");
const txAmount = document.getElementById("txAmount");
const txTitle = document.getElementById("txTitle");
const txDay = document.getElementById("txDay");
const txType = document.getElementById("txType");
const startDay = document.getElementById("startDay");
const currencySelect = document.getElementById("currencySelect");

/* --- INIT SELECTS --- */
for (let i = 1; i <= 31; i++) {
  txDay.add(new Option(i, i));
  startDay.add(new Option(i, i));
}

/* --- UPDATE BUTTON --- */
document.getElementById("updateApp").onclick = async () => {
  try {
    // Copie complète y compris l'état des coches
    const data = JSON.stringify({
      v: 1,
      balance,
      settings,
      transactions: transactions.map(t => ({ ...t })) // garde checked
    });

    await navigator.clipboard.writeText(data);

    // Écrase juste les clés, ne touche pas aux coches
    localStorage.setItem(LS.balance, balance);
    localStorage.setItem(LS.settings, JSON.stringify(settings));
    localStorage.setItem(LS.tx, JSON.stringify(transactions));

    location.reload();
  } catch {
    alert("Update failed");
  }
};

/* --- REMAINDER OF ORIGINAL LOGIC (render, calculate, events, theme, scroll, init) --- */
/* EXACTEMENT IDENTIQUE À VOTRE VERSION PRÉCÉDENTE */
/* AUCUNE LIGNE SUPPRIMÉE */

/* --- PERIOD RESET --- */
const currentPeriodKey = getPeriodKey();
const storedPeriodKey = localStorage.getItem(LS.periodKey);
if (storedPeriodKey !== currentPeriodKey) {
  transactions = transactions.map(t => ({ ...t, checked: false }));
  localStorage.setItem(LS.periodKey, currentPeriodKey);
  saveAll();
}

/* --- CALCULS --- */
function calculate() {
  const ps = getPeriodStart();
  const pe = periodEnd();

  periodStartEl.textContent = `${ps.start}/${ps.month + 1}`;
  periodEndEl.textContent = `${pe.getDate()}/${pe.getMonth() + 1}`;

  let monthlyTotal = 0;
  let remaining = balance;

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  transactions.forEach(t => {
    const d = txDateForDay(t.day);
    if (d >= new Date(ps.year, ps.month, ps.start) && d <= pe) {
      const value = t.type === "debit" ? -t.amount : t.amount;
      if (t.type === "debit") monthlyTotal += t.amount;
      if (!t.checked && d <= pe) remaining += value;
    }
  });

  const t = i18n[currentLang];
  const periodSummary = t.periodSummary
    .replace("{start}", `${ps.start}/${ps.month + 1}`)
    .replace("{end}", `${pe.getDate()}/${pe.getMonth() + 1}`)
    .replace("{total}", formatValue(monthlyTotal));
  document.querySelector(".period-summary").textContent = periodSummary;

  monthlyTotalEl.textContent = formatValue(monthlyTotal);
  const days = Math.max(1, Math.floor((pe - todayDate) / 86400000) + 1);
  dailyAmount.textContent = formatValue(remaining / days);
}

/* --- RENDER --- */
function render() {
  balanceDisplay.querySelector(".amount").textContent = formatValue(balance);
  balanceDisplay.querySelector(".sub").textContent = i18n[currentLang].balanceSub;
  txList.innerHTML = "";

  let todayMarked = false;
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  transactions
    .slice()
    .sort((a, b) => txDateForDay(a.day) - txDateForDay(b.day))
    .forEach(t => {
      const row = document.createElement("div");
      row.className = `tx ${t.type}`;

      const txDate = txDateForDay(t.day);
      if (!todayMarked && txDate > todayDate) {
        row.dataset.today = "true";
        row.dataset.label = i18n[currentLang].today;
        todayMarked = true;
      }

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = t.checked;
      chk.style.accentColor = chk.checked ? (t.type === "debit" ? "var(--red)" : "var(--green)") : "";
      chk.onclick = e => {
        e.stopPropagation();
        t.checked = chk.checked;
        saveAll();
        calculate();
        chk.style.accentColor = chk.checked ? (t.type === "debit" ? "var(--red)" : "var(--green)") : "";
      };

      const dayPrefix = currentLang === "fr" ? "J" : "D";
      const dayText = dayPrefix + effDay(t.day, today.getFullYear(), today.getMonth());

      row.append(
        chk,
        Object.assign(document.createElement("span"), { className: "amount", textContent: formatValue(t.amount) }),
        Object.assign(document.createElement("span"), { textContent: t.title }),
        Object.assign(document.createElement("span"), { textContent: dayText })
      );

      row.onclick = () => openTx(t);
      txList.appendChild(row);
    });

  calculate();
}

/* --- OPEN TRANSACTION --- */
function openTx(t) {
  editingId = t.id;
  txAmount.value = t.amount;
  txTitle.value = t.title;
  txDay.value = t.day;
  txType.value = t.type;
  document.getElementById("deleteTx").classList.remove("hidden");
  txModal.showModal();
}

/* --- LANGUAGE --- */
function applyLanguage() {
  const t = i18n[currentLang];

  document.documentElement.lang = currentLang;

  document.getElementById("periodBtn").textContent = t.periodBtn;
  document.getElementById("addTx").textContent = t.addTx;
  document.getElementById("moreBtn").textContent = t.moreBtn;
  document.getElementById("backupData").textContent = t.backup;
  document.getElementById("restoreData").textContent = t.restore;
  document.getElementById("hardReset").textContent = t.reset;
  document.getElementById("saveBalance").textContent = t.validate;
  document.getElementById("cancelTx").textContent = t.cancel;
  document.getElementById("saveTx").textContent = t.save;
  document.getElementById("deleteTx").textContent = t.delete;

  document.querySelector("#txType option[value='debit']").textContent = t.debit;
  document.querySelector("#txType option[value='credit']").textContent = t.credit;

  document.getElementById("toggleLang").textContent = t.langToggle;
  currencySelect.value = currentCurrency;
  document.querySelector(".today-remaining .sub").textContent = t.dailySub;
  document.querySelector("#periodModal .period-label").textContent = t.startDayLabel;

  txAmount.placeholder = t.placeholderAmount;
  txTitle.placeholder = t.placeholderTitle;
  txDay.querySelector("option[disabled]").textContent = t.placeholderDate;
  balanceInput.placeholder = t.placeholderBalance;
}

/* --- TOGGLES --- */
document.getElementById("toggleLang").onclick = () => {
  currentLang = currentLang === "fr" ? "en" : "fr";
  saveAll();
  applyLanguage();
  applyTheme();
  render();
};

currencySelect.onchange = () => {
  currentCurrency = currencySelect.value;
  saveAll();
  applyLanguage();
  render();
};

/* --- MODALS EVENTS --- */
balanceDisplay.onclick = () => { balanceModal.showModal(); setTimeout(() => balanceInput.focus(), 150); };
balanceModal.onclick = e => e.target === balanceModal && balanceModal.close();
txModal.onclick = e => e.target === txModal && txModal.close();
periodModal.onclick = e => e.target === periodModal && periodModal.close();
moreModal.onclick = e => e.target === moreModal && moreModal.close();

document.getElementById("saveBalance").onclick = () => {
  balance = Number(balanceInput.value) || 0;
  saveAll();
  balanceModal.close();
  render();
};

document.getElementById("addTx").onclick = () => {
  editingId = null;
  txAmount.value = txTitle.value = txDay.value = "";
  txType.value = "debit";
  document.getElementById("deleteTx").classList.add("hidden");
  txModal.showModal();
};

document.getElementById("saveTx").onclick = () => {
  const amount = Number(txAmount.value), day = Number(txDay.value);
  if (!amount || !day) return;

  const txObj = {
    id: editingId || crypto.randomUUID(),
    amount,
    title: txTitle.value || "Transaction",
    day,
    type: txType.value,
    checked: false
  };

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  txObj.checked = txDateForDay(day) <= todayDate;

  transactions = editingId
    ? transactions.map(t => t.id === editingId ? txObj : t)
    : [...transactions, txObj];

  saveAll();
  txModal.close();
  render();
};

document.getElementById("deleteTx").onclick = () => {
  transactions = transactions.filter(t => t.id !== editingId);
  saveAll();
  txModal.close();
  render();
};

document.getElementById("cancelTx").onclick = () => txModal.close();
document.getElementById("periodBtn").onclick = () => { startDay.value = settings.startDay; periodModal.showModal(); };
document.getElementById("savePeriod").onclick = () => { settings.startDay = Number(startDay.value); saveAll(); periodModal.close(); render(); };
document.getElementById("moreBtn").onclick = () => moreModal.showModal();

/* --- BACKUP / RESTORE / RESET --- */
function exportData() { navigator.clipboard.writeText(JSON.stringify({ v: 1, balance, settings, transactions })); }
function importData(text) {
  const d = JSON.parse(text);
  if (!d || d.v !== 1 || !Array.isArray(d.transactions)) throw Error("Format invalide");
  balance = Number(d.balance) || 0;
  settings = d.settings || { startDay: 1 };
  transactions = d.transactions;
  saveAll();
}

document.getElementById("backupData").onclick = () => { exportData(); alert(i18n[currentLang].alertCopied); };
document.getElementById("restoreData").onclick = () => {
  const text = prompt(i18n[currentLang].alertInvalid);
  if (!text) return;
  try { importData(text); location.reload(); } catch { alert(i18n[currentLang].alertInvalid); }
};
document.getElementById("hardReset").onclick = () => { if(confirm(i18n[currentLang].alertReset)) { localStorage.clear(); location.reload(); } };

/* --- THEME --- */
function applyTheme() {
  document.documentElement.setAttribute("data-theme", currentTheme);
  const btn = document.getElementById("toggleTheme");
  btn.textContent = currentTheme === "dark" ? i18n[currentLang].themeLight : i18n[currentLang].themeDark;
}

document.getElementById("toggleTheme").onclick = () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme();
  saveAll();
};

/* --- SCROLL TO FIRST UNCHECKED --- */
function scrollToFirstUnchecked() {
  const firstUnchecked = txList.querySelector('.tx input[type="checkbox"]:not(:checked)');
  if (!firstUnchecked) return;
  firstUnchecked.closest('.tx').scrollIntoView({ behavior: "smooth", block: "center" });
}

/* --- INIT --- */
document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splashScreen");
  splash.style.display = "flex";
  setTimeout(() => {
    splash.style.display = "none";
    applyTheme();
    applyLanguage();
    render();
    setTimeout(scrollToFirstUnchecked, 150);
  }, 1000);
});
