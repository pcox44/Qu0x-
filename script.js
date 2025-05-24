// Qu0x! Game Script - Full Version

// === GLOBAL VARIABLES ===
const MAX_DICE = 5;
const diceContainer = document.getElementById("dice-container");
const targetElement = document.getElementById("target-number");
const expressionBox = document.getElementById("expression");
const resultBox = document.getElementById("result");
const submitBtn = document.getElementById("submit-button");
const shareBtn = document.getElementById("share-button");
const backspaceBtn = document.getElementById("backspace-button");
const clearBtn = document.getElementById("clear-button");
const monthYearSelect = document.getElementById("month-year-select");
const gameSelect = document.getElementById("game-select");
const qu0xLocked = document.getElementById("qu0x-locked");
const bestScoreDisplay = document.getElementById("best-score");

let usedDice = [];
let currentDate = new Date();
let gameData = {}; // { "YYYY-MM-DD": { dice: [...], target: num, score: num|null, expression: string|null } }
let currentGameKey = "";
let allGameKeys = [];

// === UTILITIES ===
function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getGameNumber(date) {
  const start = new Date("2025-05-15");
  const diff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

function seedFromDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDice(seed) {
  const dice = [];
  for (let i = 0; i < MAX_DICE; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const val = 1 + Math.floor((seed / 233280) * 6);
    dice.push(val);
  }
  return dice;
}

function getTarget(seed) {
  return (seed % 100) + 1;
}

function getDieHTML(value) {
  const colorMap = {
    1: { bg: "red", fg: "white" },
    2: { bg: "white", fg: "black" },
    3: { bg: "blue", fg: "white" },
    4: { bg: "yellow", fg: "black" },
    5: { bg: "green", fg: "white" },
    6: { bg: "black", fg: "yellow" },
  };
  const { bg, fg } = colorMap[value];
  return `<button class="die" style="background:${bg};color:${fg};border:2px solid black" data-value="${value}">${value}</button>`;
}

function renderDice(dice) {
  diceContainer.innerHTML = "";
  dice.forEach((val, index) => {
    const dieHTML = document.createElement("div");
    dieHTML.innerHTML = getDieHTML(val);
    const btn = dieHTML.firstChild;
    btn.addEventListener("click", () => {
      if (!usedDice.includes(index)) {
        expressionBox.textContent += val;
        usedDice.push(index);
        btn.disabled = true;
        evaluateExpression();
      }
    });
    diceContainer.appendChild(btn);
  });
}

function evaluateExpression() {
  const expr = expressionBox.textContent;
  try {
    const cleanExpr = expr.replace(/(\d+)!+/g, (match, num) => {
      const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
      let result = parseInt(num);
      const bangs = match.length - num.length;
      for (let i = 0; i < bangs; i++) result = factorial(result);
      return result;
    });
    const val = Function(`"use strict"; return (${cleanExpr})`)();
    if (isNaN(val) || !isFinite(val)) {
      resultBox.textContent = "?";
    } else {
      resultBox.textContent = Math.round(val);
    }
  } catch {
    resultBox.textContent = "?";
  }
}

function resetGame() {
  expressionBox.textContent = "";
  resultBox.textContent = "?";
  usedDice = [];
}

function populateMonthYearDropdown() {
  const start = new Date("2025-05-15");
  const today = new Date();
  const months = new Set();
  while (start <= today) {
    months.add(`${start.getFullYear()}-${pad(start.getMonth() + 1)}`);
    start.setDate(start.getDate() + 1);
  }
  monthYearSelect.innerHTML = "";
  [...months].forEach((ym) => {
    const opt = document.createElement("option");
    opt.value = ym;
    const [year, month] = ym.split("-");
    opt.textContent = `${month}/${year}`;
    monthYearSelect.appendChild(opt);
  });
  monthYearSelect.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
}

function populateGameDropdown(monthYear) {
  const [year, month] = monthYear.split("-").map(Number);
  const start = new Date("2025-05-15");
  const today = new Date();
  gameSelect.innerHTML = "";
  const dayList = [];
  const temp = new Date(start);
  while (temp <= today) {
    if (temp.getFullYear() === year && temp.getMonth() + 1 === month) {
      const key = formatDate(temp);
      const gameNum = getGameNumber(temp);
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `Game ${gameNum} - ${key}`;
      gameSelect.appendChild(opt);
      dayList.push(key);
    }
    temp.setDate(temp.getDate() + 1);
  }
  if (dayList.length > 0) {
    gameSelect.value = dayList[dayList.length - 1];
  }
}

// === INIT ===
function loadGame(dateStr) {
  const seed = seedFromDate(dateStr);
  const dice = getDice(seed);
  const target = getTarget(seed);

  targetElement.textContent = target;
  renderDice(dice);
  resetGame();
}

document.addEventListener("DOMContentLoaded", () => {
  const today = formatDate(new Date());
  currentGameKey = today;
  populateMonthYearDropdown();
  populateGameDropdown(`${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}`);
  loadGame(today);

  // Event listeners
  document.querySelectorAll(".button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-value");
      if (val) {
        expressionBox.textContent += val;
        evaluateExpression();
      }
    });
  });

  backspaceBtn.addEventListener("click", () => {
    const current = expressionBox.textContent;
    if (current.length > 0) {
      expressionBox.textContent = current.slice(0, -1);
      evaluateExpression();
    }
  });

  clearBtn.addEventListener("click", () => {
    resetGame();
    document.querySelectorAll(".die").forEach((btn) => (btn.disabled = false));
  });

  submitBtn.addEventListener("click", () => {
    const expr = expressionBox.textContent;
    const result = resultBox.textContent;
    const target = parseInt(targetElement.textContent);
    if (result === "?" || expr === "") {
      alert("Invalid Submission");
      return;
    }
    const score = Math.abs(parseInt(result) - target);
    alert(score === 0 ? "🎉 Qu0x! 🎉" : `Score: ${score}`);
    qu0xLocked.hidden = !(score === 0);
    shareBtn.style.display = score === 0 ? "inline-block" : "none";
  });

  shareBtn.addEventListener("click", async () => {
    const expr = expressionBox.textContent;
    const gameNum = getGameNumber(new Date(currentGameKey));
    const text = `Qu0x Game Number: ${gameNum} - ${expr}`;
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch {
      alert("Could not copy.");
    }
  });

  monthYearSelect.addEventListener("change", () => {
    populateGameDropdown(monthYearSelect.value);
  });

  gameSelect.addEventListener("change", (e) => {
    currentGameKey = e.target.value;
    loadGame(currentGameKey);
  });
});
