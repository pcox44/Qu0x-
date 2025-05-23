// Daily Dice Game with requested features (no concatenation, double and triple factorial, LaTeX rendering, monthly and ultimate scores, sharing)

"use strict";

// Utility for factorial, double factorial (!!), triple factorial (!!!)
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function doubleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === -1) return 1;
  let result = 1;
  for (let i = n; i > 0; i -= 2) result *= i;
  return result;
}

function tripleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === -1 || n === -2) return 1;
  let result = 1;
  for (let i = n; i > 0; i -= 3) result *= i;
  return result;
}

// Dice colors and values map (for reference)
const diceColors = {
  1: {bg: "red", fg: "white"},
  2: {bg: "white", fg: "black"},
  3: {bg: "blue", fg: "white"},
  4: {bg: "yellow", fg: "black"},
  5: {bg: "green", fg: "white"},
  6: {bg: "black", fg: "yellow"}
};

// Global state
let diceValues = [];
let diceUsed = []; // true if die used
let currentExpression = "";
let currentDate = new Date();
let targetNumber = 0;
let dailyBestScore = null;
let qu0xAchieved = false;
let maxGames = 17; // from 2025-05-15 to now ~17 days for example, update dynamically if needed
let gameNumber = 1;
let qu0xCount = 0;

// Elements
const diceContainer = document.querySelector(".dice-container");
const targetNumberSpan = document.getElementById("targetNumber");
const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const submitArea = document.getElementById("submitArea");
const shareBtn = document.getElementById("shareBtn");
const clearBtn = document.getElementById("clearBtn");
const clearBtnGrid = document.getElementById("clearBtnGrid");
const backspaceBtn = document.getElementById("backspaceBtn");
const submitBtn = document.getElementById("submitBtn");
const bestAttempt = document.getElementById("bestAttempt");
const qu0xLockedIndicator = document.getElementById("qu0xLocked");

// Buttons container
const buttonGrid = document.getElementById("buttonGrid");

function seedRandom(seed) {
  // Simple PRNG based on seed (date string) to ensure reproducible dice and targets per day
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function() {
    h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function generateDiceAndTarget(dateStr) {
  const rand = seedRandom(dateStr);
  let dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(1 + Math.floor(rand() * 6));
  }
  let target = 10 + Math.floor(rand() * 91);
  return { dice, target };
}

function renderDice() {
  diceContainer.innerHTML = "";
  for (let i = 0; i < diceValues.length; i++) {
    const dieValue = diceValues[i];
    const die = document.createElement("div");
    die.classList.add("die");
    die.setAttribute("role", "listitem");
    die.dataset.value = dieValue;
    die.textContent = dieValue;
    if (diceUsed[i]) die.classList.add("faded");
    diceContainer.appendChild(die);

    die.addEventListener("click", () => {
      if (diceUsed[i]) return;
      addToExpression(dieValue.toString());
      diceUsed[i] = true;
      renderDice();
    });
  }
}

function addToExpression(char) {
  // For operators, add with no spaces; for digits add directly
  if (char === "backspace" || char === "clear" || char === "submit") return;
  currentExpression += char;
  updateExpressionRender();
  updateEvaluation();
}

function updateExpressionRender() {
  try {
    // Use KaTeX to render expression
    let latexStr = currentExpression
      .replace(/\*/g, "\\times ")
      .replace(/\//g, "\\div ")
      .replace(/\^/g, "^")
      .replace(/!/g, "!")
      .replace(/\(/g, "\\left(")
      .replace(/\)/g, "\\right)");
    // Render with KaTeX
    katex.render(latexStr, expressionBox, { throwOnError: false });
  } catch {
    expressionBox.textContent = currentExpression; // fallback plain text
  }
}

function updateEvaluation() {
  if (!currentExpression) {
    evaluationBox.textContent = "?";
    return;
  }
  try {
    let val = evaluateExpression(currentExpression);
    if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
      evaluationBox.textContent = val.toString();
    } else {
      evaluationBox.textContent = "?";
    }
  } catch {
    evaluationBox.textContent = "?";
  }
}

function evaluateExpression(expr) {
  // Safe evaluation supporting !, ^, +, -, *, /, parentheses
  // Replace factorials with function calls
  // We will use a recursive approach

  // Replace !! and !!! factorials with functions as well
  // Support only integer non-negative factorial arguments

  // First handle triple factorial !!!, then double factorial !!, then single factorial !

  // Replace n!!! with tripleFactorial(n)
  expr = expr.replace(/(\d+|\([^\(\)]+\))!!!/g, (match, n) => {
    return `tripleFactorial(${n})`;
  });

  // Replace n!! with doubleFactorial(n)
  expr = expr.replace(/(\d+|\([^\(\)]+\))!!/g, (match, n) => {
    return `doubleFactorial(${n})`;
  });

  // Replace n! with factorial(n)
  expr = expr.replace(/(\d+|\([^\(\)]+\))!/g, (match, n) => {
    return `factorial(${n})`;
  });

  // Replace ^ with ** for JS exponentiation
  expr = expr.replace(/\^/g, "**");

  // Replace × with *
  expr = expr.replace(/×/g, "*");

  // Replace ÷ with /
  expr = expr.replace(/÷/g, "/");

  // Evaluate using Function
  const f = new Function(
    "factorial",
    "doubleFactorial",
    "tripleFactorial",
    `return ${expr};`
  );
  return f(factorial, doubleFactorial, tripleFactorial);
}

function resetGameState() {
  currentExpression = "";
  diceUsed = new Array(diceValues.length).fill(false);
  qu0xAchieved = false;
  submitArea.textContent = "";
  evaluationBox.textContent = "?";
  bestAttempt.textContent = "";
  qu0xLockedIndicator.classList.add("hidden");
  shareBtn.classList.add("hidden");
  updateExpressionRender();
  renderDice();
  dailyBestScore = null;
  updateDailyBestDisplay();
}

function updateDailyBestDisplay() {
  const dailyBestScoreDisplay = document.getElementById("dailyBestScoreDisplay");
  if (dailyBestScore === null) {
    dailyBestScoreDisplay.textContent = "Best Score Today: N/A";
  } else {
    dailyBestScoreDisplay.textContent = `Best Score Today: ${dailyBestScore}`;
  }
}

function submitExpression() {
  if (!currentExpression) {
    submitArea.textContent = "Expression is empty.";
    return;
  }
  let value = evaluateExpression(currentExpression);
  if (isNaN(value) || !isFinite(value)) {
    submitArea.textContent = "Invalid Submission.";
    return;
  }

  let score = Math.abs(value - targetNumber);
  submitArea.textContent = `Score: ${score}`;

  if (dailyBestScore === null || score < dailyBestScore) {
    dailyBestScore = score;
    updateDailyBestDisplay();
    bestAttempt.textContent = `New best attempt: ${currentExpression} = ${value}`;
  }

  if (score === 0) {
    qu0xAchieved = true;
    submitArea.textContent = "Qu0x! Perfect score achieved!";
    qu0xLockedIndicator.classList.remove("hidden");
    shareBtn.classList.remove("hidden");
    lockDay();
    showQu0xAnimation();
  }
}

function lockDay() {
  // Disable submitting for today
  submitBtn.disabled = true;
  backspaceBtn.disabled = true;
  clearBtnGrid.disabled = true;
  // Disable dice clicks
  diceUsed = diceUsed.map(() => true);
  renderDice();
  updateExpressionRender();
}

function showQu0xAnimation() {
  const anim = document.getElementById("qu0xAnimation");
  anim.classList.remove("hidden");
  setTimeout(() => anim.classList.add("hidden"), 3000);
}

function copyShareText() {
  const textToCopy = `Qu0x #${gameNumber}: ${currentExpression}`;
  navigator.clipboard.writeText(textToCopy).then(() => {
    alert("Qu0x share text copied to clipboard!");
  });
}

// Button listeners
buttonGrid.addEventListener("click", (e) => {
  if (!e.target.matches("button")) return;
  const val = e.target.dataset.val;

  if (val === "clear") {
    clearInput();
    return;
  }
  if (val === "backspace") {
    backspaceInput();
    return;
  }
  if (val === "submit") {
    submitExpression();
    return;
  }

  addToExpression(val);
});

function clearInput() {
  currentExpression = "";
  diceUsed = new Array(diceValues.length).fill(false);
  updateExpressionRender();
  updateEvaluation();
  renderDice();
  submitArea.textContent = "";
  bestAttempt.textContent = "";
  qu0xLockedIndicator.classList.add("hidden");
  shareBtn.classList.add("hidden");
  submitBtn.disabled = false;
  backspaceBtn.disabled = false;
  clearBtnGrid.disabled = false;
}

function backspaceInput() {
  if (currentExpression.length === 0) return;
  const removedChar = currentExpression.slice(-1);
  currentExpression = currentExpression.slice(0, -1);

  // Check if removedChar is a die value (digit 1-6)
  if (/[1-6]/.test(removedChar)) {
    // Restore first unused die matching removedChar
    for (let i = 0; i < diceValues.length; i++) {
      if (diceValues[i].toString() === removedChar && diceUsed[i]) {
        diceUsed[i] = false;
        break;
      }
    }
  }

  updateExpressionRender();
  updateEvaluation();
  renderDice();
  submitArea.textContent = "";
}

function initializeGame() {
  // Seed game based on current date string yyyy-mm-dd
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Store game number for today counting from 2025-05-15
  const baseDate = new Date(2025, 4, 15);
  gameNumber = Math.floor((today - baseDate) / (1000 * 60 * 60 * 24)) + 1;

  const { dice, target } = generateDiceAndTarget(dateStr);
  diceValues = dice;
  diceUsed = new Array(diceValues.length).fill(false);
  targetNumber = target;

  targetNumberSpan.textContent = targetNumber;
  resetGameState();
}

// Initialization on page load
window.addEventListener("load", () => {
  initializeGame();
});
</script>
</body>
</html>
