const LS = {
  balance: "balance",
  tx: "transactions",
  settings: "settings",
  periodKey: "periodKey"
};

let balance = Number(localStorage.getItem(LS.balance)) || 0;
let transactions = JSON.parse(localStorage.getItem(LS.tx)) || [];
let settings = JSON.parse(localStorage.getItem(LS.settings)) || { startDay: 1 };

let editingId = null;
const today = new Date();

/* --- PERIOD KEY CHECK --- */
function getPeriodStart() {
  let y = today.getFullYear();
  let m = today.getMonth();
  const currentStart = effDay(settings.startDay, y, m);
  if (today.getDate() < currentStart) {
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return { year: y, month: m, start: effDay(settings.startDay, y, m) };
}

function getPeriodKey() {
  const p = getPeriodStart();
  return `${p.year}-${p.month}-${p.start}`;
}

const currentPeriodKey = getPeriodKey();
const storedPeriodKey = localStorage.getItem(LS.periodKey);

if (storedPeriodKey !== currentPeriodKey) {
  transactions = transactions.map(t => ({
    ...t,
    checked: false
  }));
}

/* --- DOM --- */
const todayEl = document.getElementById("today");
const periodInfo = document.getElementById("periodInfo");
const dailyAmount = document.getElementById("dailyAmount");
const balanceDisplay = document.getElementById("balanceDisplay");
const txList = document.getElementById("txList");

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

/* --- FORMAT --- */
function formatEUR(v) {
  return v % 1 === 0 ? v + "€" : v.toFixed(2).replace(".", ",") + "€";
}

/* --- INIT --- */
todayEl.textContent = today.toLocaleDateString("fr-FR");

for (let i = 1; i <= 31; i++) {
  txDay.add(new Option(i, i));
  startDay.add(new Option(i, i));
}

/* --- DATE UTILS --- */
function lastDay(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function effDay(d, y, m) {
  return Math.min(d, lastDay(y, m));
}

/* --- PERIOD HELPERS --- */
function txDateForDay(day) {
  const ps = getPeriodStart();
  let txYear = ps.year;
  let txMonth = ps.month;

  if (day < settings.startDay) {
    txMonth += 1;
    if (txMonth > 11) {
      txMonth = 0;
      txYear += 1;
    }
  }

  return new Date(txYear, txMonth, effDay(day, txYear, txMonth));
}

function txDateInPeriod(t) {
  return txDateForDay(t.day);
}

/* --- PERIOD --- */
function periodEnd() {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const currentStart = effDay(settings.startDay, y, m);
  let nextY = y, nextM = m;
  if (d >= currentStart) {
    nextM += 1;
    if (nextM > 11) { nextM = 0; nextY += 1; }
  }
  const nextStart = effDay(settings.startDay, nextY, nextM);
  return new Date(nextY, nextM, nextStart - 1);
}

/* --- STORAGE --- */
function saveAll() {
  localStorage.setItem(LS.balance, balance);
  localStorage.setItem(LS.tx, JSON.stringify(transactions));
  localStorage.setItem(LS.settings, JSON.stringify(settings));
  localStorage.setItem(LS.periodKey, getPeriodKey());
}

/* --- CALC --- */
function calculate() {
  let remaining = balance;

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = periodEnd();
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  transactions.forEach(t => {
    const txDate = txDateInPeriod(t);
    if (!t.checked && txDate <= endDate) {
      remaining += t.type === "debit" ? -t.amount : t.amount;
    }
  });

  const msPerDay = 86400000;
  const rawDays = Math.floor((endDate - todayDate) / msPerDay);
  const days = Math.max(1, rawDays);

  dailyAmount.textContent = formatEUR(remaining / days);
  periodInfo.textContent = `du ${settings.startDay} au ${endDate.getDate()}`;
}

/* --- BACKUP / RESTORE --- */
function exportData() {
  const payload = { v: 1, balance, settings, transactions };
  navigator.clipboard.writeText(JSON.stringify(payload));
}

function importData(text) {
  const data = JSON.parse(text);
  if (!data || data.v !== 1 || !Array.isArray(data.transactions)) {
    throw new Error("Format invalide");
  }

  balance = Number(data.balance) || 0;
  settings = data.settings || { startDay: 1 };
  transactions = data.transactions;

  localStorage.removeItem(LS.periodKey); // permet recalcul automatique
  saveAll();
}

/* --- RENDER --- */
function render() {
  balanceDisplay.querySelector(".amount").textContent = formatEUR(balance);
  txList.innerHTML = "";

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let todayMarked = false;

  transactions
    .slice()
    .sort((a, b) => txDateInPeriod(a) - txDateInPeriod(b))
    .forEach(t => {
      const row = document.createElement("div");
      row.className = `tx ${t.type}`;

      const txDate = txDateInPeriod(t);
      if (!todayMarked && txDate >= todayDate) {
        row.dataset.today = "true";
        todayMarked = true;
      }

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = t.checked;
      chk.onclick = e => {
        e.stopPropagation();
        t.checked = chk.checked;
        saveAll();
        calculate();
      };

      row.append(
        chk,
        Object.assign(document.createElement("span"), {
          className: "amount",
          textContent: formatEUR(t.amount)
        }),
        Object.assign(document.createElement("span"), {
          textContent: t.title
        }),
        Object.assign(document.createElement("span"), {
          textContent: "J" + effDay(t.day, today.getFullYear(), today.getMonth())
        })
      );

      row.onclick = () => openTx(t);
      txList.appendChild(row);
    });

  calculate();
}

/* --- MODALES --- */
balanceDisplay.onclick = () => {
  balanceModal.showModal();
  setTimeout(() => balanceInput.focus(), 150);
};
balanceModal.onclick = e => e.target === balanceModal && balanceModal.close();
txModal.onclick = e => e.target === txModal && txModal.close();
periodModal.onclick = e => e.target === periodModal && periodModal.close();

document.getElementById("moreBtn").onclick = () => moreModal.showModal();
moreModal.onclick = e => e.target === moreModal && moreModal.close();

/* --- TRANSACTIONS --- */
function openTx(t) {
  editingId = t.id;
  txAmount.value = t.amount;
  txTitle.value = t.title;
  txDay.value = t.day;
  txType.value = t.type;
  document.getElementById("deleteTx").classList.remove("hidden");
  txModal.showModal();
}

/* --- EVENTS --- */
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
  const amount = Number(txAmount.value);
  const day = Number(txDay.value);
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
  const txDate = txDateForDay(day);
  txObj.checked = txDate <= todayDate;

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

document.getElementById("periodBtn").onclick = () => {
  startDay.value = settings.startDay;
  periodModal.showModal();
};

document.getElementById("savePeriod").onclick = () => {
  settings.startDay = Number(startDay.value);
  saveAll();
  periodModal.close();
  calculate();
  render();
};

/* --- PLUS… MODAL --- */
document.getElementById("backupData").onclick = () => {
  exportData();
  alert("Données copiées dans le presse-papiers");
};

document.getElementById("restoreData").onclick = () => {
  const text = prompt("Collez ici vos données sauvegardées");
  if (!text) return;
  try {
    importData(text);
    location.reload();
  } catch {
    alert("Données invalides");
  }
};

document.getElementById("hardReset").onclick = () => {
  if (confirm("Tout effacer ?")) {
    localStorage.clear();
    location.reload();
  }
};

/* --- RENDER INIT --- */
render();
