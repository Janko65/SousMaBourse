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

/* PERIOD HELPERS */
// Retourne { year, month, start } correspondant au début de la période courante
function getPeriodStart() {
  let y = today.getFullYear();
  let m = today.getMonth();
  const currentStart = effDay(settings.startDay, y, m);
  if (today.getDate() < currentStart) {
    // la période courante a commencé le mois précédent
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return { year: y, month: m, start: effDay(settings.startDay, y, m) };
}

// Calcule la Date réelle d'une transaction (numéro de jour) dans la période courante
function txDateForDay(day) {
  const ps = getPeriodStart();
  let txYear = ps.year;
  let txMonth = ps.month;

  // si le jour est avant startDay, il appartient au mois suivant dans la période
  if (day < settings.startDay) {
    txMonth = ps.month + 1;
    if (txMonth > 11) {
      txMonth = 0;
      txYear += 1;
    }
  }

  const clampedDay = effDay(day, txYear, txMonth);
  return new Date(txYear, txMonth, clampedDay);
}

function txDateInPeriod(t) {
  return txDateForDay(t.day);
}

/* PERIOD */

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


/* STORAGE */
function saveAll() {
  localStorage.setItem(LS.balance, balance);
  localStorage.setItem(LS.tx, JSON.stringify(transactions));
  localStorage.setItem(LS.settings, JSON.stringify(settings));
}

/* CALC */

function calculate() {
  // Solde restant en tenant compte des transactions futures (non cochées) à partir d'aujourd'hui
  let remaining = balance;

  // Normaliser les dates à minuit pour un calcul propre du nombre de jours
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const end = periodEnd();
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  // Ajouter/Soustraire les transactions à venir (non cochées) jusqu'à la fin de période
  transactions.forEach(t => {
    const txDate = txDateInPeriod(t);
    // Prendre en compte toutes les transactions non cochées situées dans la période courante (jusqu'à la fin)
    if (!t.checked && txDate <= endDate) {
      remaining += t.type === "debit" ? -t.amount : t.amount;
    }
  });

  // Comptage des jours "exclusif": du lendemain d'aujourd'hui jusqu'à endDate
  const msPerDay = 24 * 60 * 60 * 1000;
  const rawDays = Math.floor((endDate - todayDate) / msPerDay);
  const days = Math.max(1, rawDays);

  // Affichages
  dailyAmount.textContent = formatEUR(remaining / days);
  periodInfo.textContent = `du ${settings.startDay} au ${endDate.getDate()}`;
}


/* RENDER */
function render() {
  balanceDisplay.querySelector(".amount").textContent = formatEUR(balance);
  txList.innerHTML = "";

  transactions
    .slice() // clone pour ne pas muter l'original
    .sort((a, b) => txDateInPeriod(a) - txDateInPeriod(b))
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

  const txObj = {
    id: editingId || crypto.randomUUID(),
    amount,
    title: txTitle.value || "Transaction",
    day,
    type: txType.value,
    // checked : si la date effective est <= aujourd'hui
    checked: false
  };

  // déterminer checked en utilisant la date dans la période
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

document.getElementById("reset").onclick = () => {
  if (confirm("Tout effacer ?")) {
    localStorage.clear();
    location.reload();
  }
};

render();
