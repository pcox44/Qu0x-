const diceContainer = document.getElementById("diceContainer");
const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const equalsSign = document.getElementById("equalsSign");
const submitButton = document.getElementById("submitButton");
const qu0xAnimation = document.getElementById("qu0xAnimation");
const daySelect = document.getElementById("daySelect");
const completionScore = document.getElementById("completionScore");
const blitzModeCheckbox = document.getElementById("blitzMode");

let expression = "";
let usedDice = [];

function generateDice(seed) {
  const rng = mulberry32(seed);
  const dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  return dice;
}

function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDateString(dateString) {
  return dateString.split("-").join("").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function setupDice(dice) {
  diceContainer.innerHTML = "";
  usedDice = [];
  dice.forEach((value, index) => {
    const die = document.createElement("div");
    die.className = `die die-${value}`;
    die.textContent = value;
    die.dataset.value = value;
    die.dataset.index = index;
    die.addEventListener("click", () => {
      if (!usedDice.includes(index)) {
        expression += value;
        usedDice.push(index);
        die.classList.add("faded");
        updateExpressionDisplay();
      }
    });
    diceContainer.appendChild(die);
  });
}

function updateExpressionDisplay() {
  expressionBox.textContent = expression;
  const result = evaluateExpression(expression);
  evaluationBox.textContent = isNaN(result) ? "?" : result;
}

function evaluateExpression(expr) {
  try {
    const withFactorials = expr.replace(/(\([^\)]+\)|\d+)!/g, (_, match) => {
      const val = eval(match);
      return safeFactorial(val);
    });
    const result = eval(withFactorials);
    return isFinite(result) ? result : '?';
  } catch {
    return '?';
  }
}

function safeFactorial(n) {
  if (!Number.isInteger(n) || n < 0) return NaN;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function clearExpression() {
  expression = "";
  updateExpressionDisplay();
  Array.from(document.getElementsByClassName("die")).forEach(die => die.classList.remove("faded"));
  usedDice = [];
}

function deleteLast() {
  if (!expression.length) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  const parsed = parseInt(lastChar);
  if (!isNaN(parsed)) {
    const lastUsed = usedDice.pop();
    if (lastUsed !== undefined) {
      const die = diceContainer.querySelector(`.die[data-index="${lastUsed}"]`);
      if (die) die.classList.remove("faded");
    }
  }
  updateExpressionDisplay();
}

function lockDay(dateStr) {
  localStorage.setItem(`locked-${dateStr}`, "true");
}

function isLocked(dateStr) {
  return localStorage.getItem(`locked-${dateStr}`) === "true";
}

function updateQu0xCompletionScore() {
  const options = Array.from(daySelect.options);
  const starCount = options.filter(opt => opt.text.includes("⭐")).length;
  completionScore.textContent = `Qu0x! Completion Score: ${starCount}`;
}

function submitExpression(currentDate, target) {
  const result = evaluateExpression(expression);
  if (result === '?') {
    alert("Invalid submission.");
    return;
  }

  const score = Math.abs(result - target);
  document.getElementById("scoreDisplay").textContent = `Score: ${score}`;

  if (score === 0) {
    const anim = document.getElementById("qu0xAnimation");
    anim.textContent = "Qu0x! Locked";
    anim.classList.remove("hidden");
    setTimeout(() => anim.classList.add("hidden"), 3000);

    const option = daySelect.querySelector(`option[value="${currentDate}"]`);
    if (option && !option.text.includes("⭐")) {
      option.textContent = `⭐ ${option.textContent}`;
    }

    lockDay(currentDate);
    updateQu0xCompletionScore();
  }

  localStorage.setItem(`score-${currentDate}`, score);
}

function setupButtons() {
  const buttonGrid = document.getElementById("buttonGrid");
  const ops = ["+", "-", "*", "/", "^", "(", ")", "!", "Back", "Clear"];

  buttonGrid.innerHTML = "";
  ops.forEach(op => {
    const btn = document.createElement("button");
    btn.textContent = op;
    btn.addEventListener("click", () => {
      if (op === "Back") {
        deleteLast();
      } else if (op === "Clear") {
        clearExpression();
      } else {
        expression += op;
        updateExpressionDisplay();
      }
    });
    buttonGrid.appendChild(btn);
  });
}

function initGame(dateStr) {
  const seed = seedFromDateString(dateStr);
  const dice = generateDice(seed);
  const target = Math.floor(seed % 100) + 1;

  document.getElementById("targetBox").textContent = `Target: ${target}`;
  document.getElementById("scoreDisplay").textContent = "";

  setupDice(dice);
  clearExpression();
  setupButtons();

  if (isLocked(dateStr)) {
    const option = daySelect.querySelector(`option[value="${dateStr}"]`);
    if (option && !option.text.includes("⭐")) {
      option.textContent = `⭐ ${option.textContent}`;
    }
  }

  submitButton.onclick = () => submitExpression(dateStr, target);
}

function populateDays() {
  const start = new Date("2025-05-15");
  const now = new Date();
  const days = [];

  while (start <= now) {
    const iso = start.toISOString().slice(0, 10);
    days.push(iso);
    start.setDate(start.getDate() + 1);
  }

  daySelect.innerHTML = "";
  days.forEach(d => {
    const option = document.createElement("option");
    option.value = d;
    option.textContent = d;
    if (isLocked(d)) option.textContent = `⭐ ${option.textContent}`;
    daySelect.appendChild(option);
  });

  const today = new Date().toISOString().slice(0, 10);
  daySelect.value = today;
  initGame(today);
  updateQu0xCompletionScore();
}

daySelect.addEventListener("change", () => {
  const date = daySelect.value;
  initGame(date);
});

document.addEventListener("DOMContentLoaded", () => {
  populateDays();
});
