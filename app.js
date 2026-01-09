const LS = {
  balance: "balance",
  tx: "transactions",
  settings: "settings"
};

let balance = Number(localStorage.getItem(LS.balance)) || 0;
let transactions = JSON.parse(localStorage.getItem(LS.tx)) || [];
let settings = JSON.parse(localStorage.getItem(LS.settings)) || {
  startDay: 1,
  endDay: 31
};

let editingId = null;
const today = new Date();

/* DOM */
const todayEl = document.getElementById("today");
const dailyAmount = document.getElementById("dailyAmount");
const balanceDisplay = document.getElementById("balanceDisplay");
const txList = document.getElementById("txList");

const balanceModal = document.getElementById("balanceModal");
const txModal = document.getElementById("txModal");
const periodModal = document.getElementById("periodModal");

const balanceInput = document.getElementById("balanceInput");
const txTitle = document.getElementById("txTitle");
const txAmount = document.getElementById("txAmount");
const txDay = document.getElementById("txDay");
const txType = document.getElementById("txType");

const startDay = document.getElementById("startDay");
const endDay = document.getElementById("endDay");

const saveBalance = document.getElementById("saveBalance");
const saveTx = document.getElementById("saveTx");
const deleteTx = document.getElementById("deleteTx");
const cancelTx = document.getElementById("cancelTx");

const addTx = document.getElementById("addTx");
const refresh = document.getElementById("refresh");
const reset = document.getElementById("reset");
const periodBtn = document.getElementById("periodBtn");

/* INIT */
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
[txDay, startDay, endDay].forEach(fillDays);

/* DATES */
function lastDayOfMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function effectiveDay(day, y, m) {
  return Math.min(day, lastDayOfMonth(y, m));
}

function getPeriodBounds() {
  const y = today.getFullYear();
  let m = today.getMonth();

  let start = new Date(y, m, effectiveDay(settings.startDay, y, m));
  let end = new Date(y, m, effectiveDay(settings.endDay, y, m));

  if (end < start) {
    end.setMonth(end.getMonth() + 1);
    end.setDate(effectiveDay(settings.endDay, end.getFullYear(), end.getMonth()));
  }
  return { start, end };
}

function daysRemaining(end) {
  return Math.max(1, Math.ceil((end - today) / 86400000) + 1);
}

/* STORAGE */
function saveAll() {
  localStorage.setItem(LS.balance, balance);
  localStorage.setItem(LS.tx, JSON.stringify(transactions));
  localStorage.setItem(LS.settings, JSON.stringify(settings));
}

/* CALCUL */
function calculate() {
  const { end } = getPeriodBounds();
  let remaining = balance;

  transactions.forEach(t => {
    if (!t.checked) {
      remaining += t.type === "debit" ? -t.amount : t.amount;
    }
  });

  dailyAmount.textContent =
    (remaining / daysRemaining(end)).toFixed(2) + "€";
}

/* RENDER */
function render() {
  balanceDisplay.textContent = balance + "€";
  txList.innerHTML = "";

  const y = today.getFullYear();
  const m = today.getMonth();

  transactions
    .sort((a, b) => a.day - b.day)
    .forEach(t => {
      const row = document.createElement("div");
      row.className = `tx ${t.type}`;

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = t.checked;
      check.onclick = e => {
        e.stopPropagation();
        t.checked = check.checked;
        saveAll();
        calculate();
      };

      const amount = document.createElement("span");
      amount.className = "amount";
      amount.textContent = t.amount + "€";

      const title = document.createElement("span");
      title.textContent = t.title;

      const day = document.createElement("span");
      day.textContent = "J" + effectiveDay(t.day, y, m);

      row.append(check, amount, title, day);
      row.onclick = () => openTx(t);

      txList.appendChild(row);
    });

  calculate();
}

/* TRANSACTIONS */
function openTx(t) {
  editingId = t.id;
  txTitle.value = t.title;
  txAmount.value = t.amount;
  txDay.value = t.day;
  txType.value = t.type;
  deleteTx.classList.remove("hidden");
  txModal.showModal();
}

/* EVENTS */
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
  txTitle.value = "";
  txAmount.value = "";
  txDay.value = today.getDate();
  txType.value = "debit";
  deleteTx.classList.add("hidden");
  txModal.showModal();
};

cancelTx.onclick = () => {
  txModal.close();
};

saveTx.onclick = () => {
  const title = txTitle.value || "Transaction";
  const amount = Number(txAmount.value);
  const day = Number(txDay.value);
  const type = txType.value;
  if (!amount) return;

  if (editingId) {
    Object.assign(
      transactions.find(t => t.id === editingId),
      { title, amount, day, type }
    );
  } else {
    transactions.push({
      id: crypto.randomUUID(),
      title,
      amount,
      day,
      type,
      checked:
        effectiveDay(day, today.getFullYear(), today.getMonth()) <= today.getDate()
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

render();