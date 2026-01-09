const LS = {
  balance: "balance",
  tx: "transactions",
  settings: "settings"
};

let balance = Number(localStorage.getItem(LS.balance)) || 0;
let transactions = JSON.parse(localStorage.getItem(LS.tx)) || [];
let settings = JSON.parse(localStorage.getItem(LS.settings)) || { startDay: 1 };

let editingId = null;
const today = new Date();

/* DOM */
const todayEl = document.getElementById("today");
const periodInfo = document.getElementById("periodInfo");
const dailyAmount = document.getElementById("dailyAmount");
const balanceDisplay = document.getElementById("balanceDisplay");
const txList = document.getElementById("txList");

const balanceModal = document.getElementById("balanceModal");
const txModal = document.getElementById("txModal");
const periodModal = document.getElementById("periodModal");

const balanceInput = document.getElementById("balanceInput");
const txAmount = document.getElementById("txAmount");
const txTitle = document.getElementById("txTitle");
const txDay = document.getElementById("txDay");
const txType = document.getElementById("txType");
const startDay = document.getElementById("startDay");

/* FORMAT */
function formatEUR(v) {
  return v % 1 === 0 ? v + "€" : v.toFixed(2).replace(".", ",") + "€";
}

/* INIT */
todayEl.textContent = today.toLocaleDateString("fr-FR");

for (let i = 1; i <= 31; i++) {
  txDay.add(new Option(i, i));
  startDay.add(new Option(i, i));
}

/* DATE UTILS */
function lastDay(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function effDay(d, y, m) {
  return Math.min(d, lastDay(y, m));
}

/* PERIOD */
function periodEnd() {
 const y = today.getFullYear();
 const m = today.getMonth();
 // fin de période = veille du startDay suivant
 const nextMonth = new Date(y, m + 1, 1);
 const endDay = effDay(settings.startDay - 1 || lastDay(y, m), nextMonth.getFullYear(), nextMonth.getMonth());
 return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), endDay);
}

/* STORAGE */
function saveAll() {
  localStorage.setItem(LS.balance, balance);
  localStorage.setItem(LS.tx, JSON.stringify(transactions));
  localStorage.setItem(LS.settings, JSON.stringify(settings));
}

/* CALC */
function calculate() {
 let remaining = balance;
 const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
 const end = periodEnd();
 const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
 transactions.forEach(t => {
   const txDate = new Date(
     today.getFullYear(),
     today.getMonth(),
     effDay(t.day, today.getFullYear(), today.getMonth())
   );
   // uniquement transactions futures ou aujourd’hui
   if (txDate >= todayDate && !t.checked) {
     remaining += t.type === "debit" ? -t.amount : t.amount;
   }
 });
 const days = Math.max(
   1,
   Math.round((endDate - todayDate) / 86400000) + 1
 );
 dailyAmount.textContent = formatEUR(remaining / days);
 periodInfo.textContent =
   `du ${settings.startDay} au ${endDate.getDate()}`;
}

/* RENDER */
function render() {
  balanceDisplay.querySelector(".amount").textContent = formatEUR(balance);
  txList.innerHTML = "";

  transactions
    .sort((a, b) => a.day - b.day)
    .forEach(t => {
      const row = document.createElement("div");
      row.className = `tx ${t.type}`;

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

/* MODALES */
balanceDisplay.onclick = () => {
  balanceModal.showModal();
  setTimeout(() => balanceInput.focus(), 150);
};
balanceModal.onclick = e => e.target === balanceModal && balanceModal.close();
txModal.onclick = e => e.target === txModal && txModal.close();
periodModal.onclick = e => e.target === periodModal && periodModal.close();

/* TRANSACTIONS */
function openTx(t) {
  editingId = t.id;
  txAmount.value = t.amount;
  txTitle.value = t.title;
  txDay.value = t.day;
  txType.value = t.type;
  document.getElementById("deleteTx").classList.remove("hidden");
  txModal.showModal();
}

/* EVENTS */
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

  const tx = {
    id: editingId || crypto.randomUUID(),
    amount,
    title: txTitle.value || "Transaction",
    day,
    type: txType.value,
    checked: effDay(day, today.getFullYear(), today.getMonth()) <= today.getDate()
  };

  transactions = editingId
    ? transactions.map(t => t.id === editingId ? tx : t)
    : [...transactions, tx];

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
};

document.getElementById("reset").onclick = () => {
  if (confirm("Tout effacer ?")) {
    localStorage.clear();
    location.reload();
  }
};

render();
