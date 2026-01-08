/* =========================
   CONSTANTES LOCALSTORAGE
========================= */
const LS = {
  balance: "balance",
  tx: "transactions",
  settings: "settings"
};

/* =========================
   ÉTAT APPLICATION
========================= */
let balance = Number(localStorage.getItem(LS.balance)) || 0;
let transactions = JSON.parse(localStorage.getItem(LS.tx)) || [];
let settings = JSON.parse(localStorage.getItem(LS.settings)) || {
  startDay: 1,
  endDay: 31
};

let editingId = null;
const today = new Date();

/* =========================
   RÉFÉRENCES DOM
========================= */
const todayEl = document.getElementById("today");
const dailyAmount = document.getElementById("dailyAmount");
const balanceDisplay = document.getElementById("balanceDisplay");
const txList = document.getElementById("txList");

const balanceModal = document.getElementById("balanceModal");
const txModal = document.getElementById("txModal");
const periodModal = document.getElementById("periodModal");

const balanceInput = document.getElementById("balanceInput");
const txAmount = document.getElementById("txAmount");
const txDay = document.getElementById("txDay");
const txType = document.getElementById("txType");

const startDay = document.getElementById("startDay");
const endDay = document.getElementById("endDay");

const saveBalance = document.getElementById("saveBalance");
const saveTx = document.getElementById("saveTx");
const deleteTx = document.getElementById("deleteTx");

const addTx = document.getElementById("addTx");
const refresh = document.getElementById("refresh");
const reset = document.getElementById("reset");
const periodBtn = document.getElementById("periodBtn");

/* =========================
   INIT UI
========================= */
todayEl.textContent = today.toLocaleDateString("fr-FR");

function fillDays(select) {
  select.innerHTML = "";
  for (let i = 1; i <= 31; i++) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = i;
    select.appendChild(o);
  }
}
fillDays(txDay);
fillDays(startDay);
fillDays(endDay);

/* =========================
   UTILITAIRES DATES
========================= */

/* Dernier jour réel d’un mois donné */
function lastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/* Jour effectif d’une transaction (31 → 30/28/29 si besoin) */
function getEffectiveTransactionDay(txDay, year, month) {
  return Math.min(txDay, lastDayOfMonth(year, month));
}

/* =========================
   PÉRIODE BUDGÉTAIRE
========================= */
function getPeriodBounds() {
  const y = today.getFullYear();
  let m = today.getMonth();

  let start = new Date(y, m, Math.min(settings.startDay, lastDayOfMonth(y, m)));
  let end = new Date(y, m, Math.min(settings.endDay, lastDayOfMonth(y, m)));

  /* période chevauchante (ex: 10 → 9) */
  if (end < start) {
    if (today >= start) {
      end.setMonth(end.getMonth() + 1);
      end.setDate(
        Math.min(
          settings.endDay,
          lastDayOfMonth(end.getFullYear(), end.getMonth())
        )
      );
    } else {
      start.setMonth(start.getMonth() - 1);
      start.setDate(
        Math.min(
          settings.startDay,
          lastDayOfMonth(start.getFullYear(), start.getMonth())
        )
      );
    }
  }

  return { start, end };
}

/* Jours restants réels */
function daysRemaining(end) {
  return Math.max(
    1,
    Math.ceil((end - today) / 86400000) + 1
  );
}

/* =========================
   PERSISTENCE
========================= */
function saveAll() {
  localStorage.setItem(LS.balance, balance);
  localStorage.setItem(LS.tx, JSON.stringify(transactions));
  localStorage.setItem(LS.settings, JSON.stringify(settings));
}

/* =========================
   CALCUL JOURNALIER
========================= */
function calculate() {
  const { end } = getPeriodBounds();
  let remaining = balance;

  transactions.forEach(t => {
    if (!t.checked) {
      remaining += t.type === "debit" ? -t.amount : t.amount;
    }
  });

  dailyAmount.textContent =
    (remaining / daysRemaining(end)).toFixed(2);
}

/* =========================
   RENDER
========================= */
function render() {
  balanceDisplay.textContent = `Solde : ${balance} €`;
  txList.innerHTML = "";

  const y = today.getFullYear();
  const m = today.getMonth();

  transactions
    .sort((a, b) => a.day - b.day)
    .forEach(t => {
      const effectiveDay = getEffectiveTransactionDay(t.day, y, m);

      const row = document.createElement("div");
      row.className = `tx ${t.type}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = t.checked;
      checkbox.onclick = e => {
        e.stopPropagation();
        t.checked = checkbox.checked;
        saveAll();
        calculate();
      };

      const amount = document.createElement("strong");
      amount.textContent = `${t.amount}€`;

      const label = document.createElement("span");
      label.textContent = t.type;

      const day = document.createElement("span");
      day.textContent = `J${effectiveDay}`;

      row.append(checkbox, amount, label, day);
      row.onclick = () => openTx(t);

      txList.appendChild(row);
    });

  calculate();
}

/* =========================
   TRANSACTIONS
========================= */
function openTx(t) {
  editingId = t.id;
  txAmount.value = t.amount;
  txDay.value = t.day;
  txType.value = t.type;
  deleteTx.classList.remove("hidden");
  txModal.showModal();
}

/* =========================
   EVENTS
========================= */
balanceDisplay.onclick = () => {
  balanceInput.value = balance;
  balanceModal.showModal();
};

saveBalance.onclick = () => {
  balance = Number(balanceInput.value) || 0;
  saveAll();
  balanceModal.close();
  render();
};

addTx.onclick = () => {
  editingId = null;
  txAmount.value = "";
  txDay.value = today.getDate();
  txType.value = "debit";
  deleteTx.classList.add("hidden");
  txModal.showModal();
};

saveTx.onclick = () => {
  const amount = Number(txAmount.value);
  const day = Number(txDay.value);
  const type = txType.value;

  if (!amount || !day) return;

  const effectiveDay = getEffectiveTransactionDay(
    day,
    today.getFullYear(),
    today.getMonth()
  );

  if (editingId) {
    Object.assign(
      transactions.find(t => t.id === editingId),
      { amount, day, type }
    );
  } else {
    transactions.push({
      id: crypto.randomUUID(),
      amount,
      day,
      type,
      checked: effectiveDay <= today.getDate()
    });
  }

  saveAll();
  txModal.close();
  render();
};

deleteTx.onclick = () => {
  transactions = transactions.filter(t => t.id !== editingId);
  saveAll();
  txModal.close();
  render();
};

periodBtn.onclick = () => {
  startDay.value = settings.startDay;
  endDay.value = settings.endDay;
  periodModal.showModal();
};

savePeriod.onclick = () => {
  settings.startDay = Number(startDay.value);
  settings.endDay = Number(endDay.value);
  saveAll();
  periodModal.close();
  calculate();
};

refresh.onclick = calculate;

reset.onclick = () => {
  if (confirm("Tout effacer ?")) {
    localStorage.clear();
    location.reload();
  }
};

/* =========================
   START
========================= */
render();