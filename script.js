// script.js

// --- Constants and Global Variables ---
const START_DATE = new Date(2025, 4, 15); // May 15, 2025 (month is 0-indexed)
const TODAY = new Date();
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

let currentGameIndex = getGameIndexFromDate(TODAY);
let diceValues = [];
let usedDice = new Array(5).fill(false);
let expression = "";
let targetNumber = 0;
let scoresByGame = {}; // { gameIndex: { bestScore, bestExpression, qu0xAchieved } }
let monthlyCompletion = {}; // { "YYYY-MM": Set of completed game indexes }
let totalGamesPlayed = new Set();

const container = document.querySelector(".container");
const targetNumberSpan = document.getElementById("target-number");
const diceContainer = document.getElementById("dice-container");
const expressionDiv = document.getElementById("expression");
const resultDiv = document.getElementById("result");
const buttonsContainer = document.getElementById("buttons-container");
const submitButton = document.getElementById("submit-button");
const backspaceButton = document.getElementById("backspace-button");
const clearButton = document.getElementById("clear-button");
const shareButton = document.getElementById("share-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const monthYearSelect = document.getElementById("month-year-select");
const gameSelect = document.getElementById("game-select");
const qu0xLockedSpan = document.getElementById("qu0x-locked");
const qu0xCompletionDiv = document.getElementById("qu0x-completion");
const monthlyScoreDiv = document.getElementById("qu0x-monthly");
const ultimateScoreDiv = document.getElementById("qu0x-ultimate");

// Header best score display between Qu0x and top right buttons
const headerBestScore = document.createElement("div");
headerBestScore.id = "header-best-score";
headerBestScore.style.cssText = `
  font-weight: bold; 
  font-size: 1.2em; 
  text-align: center; 
  flex-grow: 1; 
  color: #333;
`;
document.querySelector("body > .container").insertBefore(headerBestScore, diceContainer);

// --- Utility Functions ---

function getGameIndexFromDate(date) {
  // Returns days since START_DATE, or -1 if before start
  if (date < START_DATE) return -1;
  const diff = Math.floor((date - START_DATE) / MILLIS_PER_DAY);
  return diff;
}

function getDateFromGameIndex(index) {
  const d = new Date(START_DATE.getTime() + index * MILLIS_PER_DAY);
  return d;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatMonthYear(date) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

function seedRandom(seed) {
  // Simple deterministic pseudo-random generator (mulberry32)
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateDiceValues(seed) {
  // Use seeded RNG to generate 5 dice between 1 and 6
  const rng = seedRandom(seed);
  let values = [];
  for (let i = 0; i < 5; i++) {
    values.push(1 + Math.floor(rng() * 6));
  }
  return values;
}

function createDiceElement(value, index) {
  const die = document.createElement("button");
  die.className = "dice";
  die.textContent = value;
  die.dataset.index = index;
  die.disabled = false;
  return die;
}

function isBalanced(expr) {
  // Check balanced parentheses
  let stack = [];
  for (let ch of expr) {
    if (ch === "(") stack.push(ch);
    else if (ch === ")") {
      if (stack.length === 0) return false;
      stack.pop();
    }
  }
  return stack.length === 0;
}

function countDiceUsage(expr, dice) {
  // Count usage of each dice value in expr; dice is array of 5 numbers
  // We'll match digits exactly equal to dice values once each
  // We disallow reuse of a die value more than once
  // To do this, parse the expr tokens to identify the used numbers
  
  // We'll tokenize the expr for numbers, parentheses, and operators
  // Then check if dice values used exactly once each (order doesn't matter)

  // Extract numbers from expr (supports multi-digit numbers)
  const tokens = [];
  let currentNum = "";
  for (let ch of expr) {
    if ("0123456789".includes(ch)) {
      currentNum += ch;
    } else {
      if (currentNum !== "") {
        tokens.push(currentNum);
        currentNum = "";
      }
      if ("()+-*/^!".includes(ch)) tokens.push(ch);
    }
  }
  if (currentNum !== "") tokens.push(currentNum);

  // Collect all numeric tokens not part of factorial etc.
  // For dice usage, just consider numbers used (dice are single digits)
  const usedValues = tokens
    .filter(tok => /^\d+$/.test(tok))
    .map(Number);

  // Check if usedValues contains exactly the dice numbers, no extras, no repeats
  // The expression might use a number > 6 (e.g. 12), so not allowed.
  // Also dice values are single digits from 1-6.
  // So usedValues must be subset of dice values, and use each dice value exactly once.

  if (usedValues.length !== dice.length) return false;

  const diceCopy = dice.slice();
  for (let val of usedValues) {
    const idx = diceCopy.indexOf(val);
    if (idx === -1) return false;
    diceCopy.splice(idx, 1);
  }
  return diceCopy.length === 0;
}

function validateExpression(expr, dice) {
  if (!expr) return false;
  // Balanced parentheses
  if (!isBalanced(expr)) return false;
  // Dice usage exact once each
  if (!countDiceUsage(expr, dice)) return false;
  // No fractional powers: no '.' in expr except inside numbers? Let's disallow '.' entirely
  if (expr.includes(".")) return false;
  // Additional validation can be done in evaluateExpression
  return true;
}

// Factorial functions including double and triple factorial
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function doubleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === -1) return 1;
  let f = 1;
  for (let i = n; i > 0; i -= 2) f *= i;
  return f;
}

function tripleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === -1 || n === -2) return 1;
  let f = 1;
  for (let i = n; i > 0; i -= 3) f *= i;
  return f;
}

function applyFactorials(expr) {
  // Find sequences like n!, n!!, n!!! and replace with their computed value
  // We'll use regex to find these patterns

  // Regex to match (number or parenthetical expression) followed by !, !! or !!!
  // We'll handle factorials applied to parenthetical expressions by evaluating inside first
  // For simplicity, only allow factorials on integers or parenthesis (after eval)
  // We'll do iterative replacement until no matches remain

  // This will be a complex step; strategy:
  // 1. Replace all parenthetical factorials: e.g. (2+1)! 
  // 2. Then replace simple number factorials.

  // Since the evaluation function is separate, here we just parse from right to left.

  // For implementation simplicity, let's do replacement at evaluation step
  // Instead of complicated regex here, implement factorial operators during evaluation.

  return expr; // no change here; factorial handled in evaluation
}

function safeEval(expr) {
  // Evaluate expression string supporting + - * / ^ and factorials (!, !!, !!!)
  // Reject fractional powers (exponent must be integer)
  // Implement factorial operators
  // Use a simple parser approach

  try {
    // Replace '^' with '**' for JS exponentiation
    let jsExpr = expr.replace(/\^/g, "**");

    // Tokenize for factorials: Replace n!!!, n!!, n! with function calls
    // We'll do multiple passes until no factorial operators remain

    // Replace triples first: number!!! or (expr)!!!
    jsExpr = jsExpr.replace(/(\d+|\([^()]+\))!!!/g, (match, g1) => {
      const val = safeEval(g1);
      if (!Number.isInteger(val) || val < 0) throw "Invalid factorial operand";
      const res = tripleFactorial(val);
      if (isNaN(res)) throw "Invalid triple factorial";
      return res;
    });

    // Double factorials
    jsExpr = jsExpr.replace(/(\d+|\([^()]+\))!!/g, (match, g1) => {
      const val = safeEval(g1);
      if (!Number.isInteger(val) || val < 0) throw "Invalid factorial operand";
      const res = doubleFactorial(val);
      if (isNaN(res)) throw "Invalid double factorial";
      return res;
    });

    // Single factorials
    jsExpr = jsExpr.replace(/(\d+|\([^()]+\))!/g, (match, g1) => {
      const val = safeEval(g1);
      if (!Number.isInteger(val) || val < 0) throw "Invalid factorial operand";
      const res = factorial(val);
      if (isNaN(res)) throw "Invalid factorial";
      return res;
    });

    // Check for fractional powers: look for ** followed by a decimal
    const fracPower = jsExpr.match(/\*\*\s*(\d*\.\d+)/);
    if (fracPower) throw "Fractional powers not allowed";

    // Evaluate with Function constructor (safe-ish for this controlled input)
    // Only digits, operators, parentheses are allowed in jsExpr here
    if (/[^0-9+\-*/().\s]/.test(jsExpr)) throw "Invalid characters";

    const result = Function(`"use strict";return (${jsExpr})`)();

    if (typeof result !== "number" || !isFinite(result)) throw "Invalid result";

    return result;
  } catch {
    return NaN;
  }
}

function calculateScore(target, value) {
  if (isNaN(value)) return null;
  return Math.abs(target - value);
}

// --- Rendering Functions ---

function renderDice() {
  diceContainer.innerHTML = "";
  for (let i = 0; i < diceValues.length; i++) {
    const die = createDiceElement(diceValues[i], i);
    if (usedDice[i]) die.disabled = true;
    diceContainer.appendChild(die);
  }
}

function renderExpression() {
  expressionDiv.textContent = expression || "";
}

function renderResult() {
  if (!expression) {
    resultDiv.textContent = "?";
    return;
  }
  if (!validateExpression(expression, diceValues)) {
    resultDiv.textContent = "?";
    return;
  }
  const val = safeEval(expression);
  if (isNaN(val)) {
    resultDiv.textContent = "?";
  } else {
    resultDiv.textContent = `= ${val}`;
  }
}

function renderButtons() {
  // Operation buttons gray background
  const opButtons = buttonsContainer.querySelectorAll(".op-btn");
  opButtons.forEach(btn => {
    btn.style.backgroundColor = "#d3d3d3";
  });

  // Clear button width adjusted by CSS
  // Submit and Share button colors handled in CSS
}

function updateHeaderBestScore() {
  const gameData = scoresByGame[currentGameIndex];
  if (!gameData || gameData.bestScore == null) {
    headerBestScore.textContent = "";
  } else {
    headerBestScore.textContent = `Best Score: ${gameData.bestScore}${gameData.qu0xAchieved ? " ⭐" : ""}`;
  }
}

function updateQu0xLockedUI() {
  const gameData = scoresByGame[currentGameIndex];
  if (gameData && gameData.qu0xAchieved) {
    qu0xLockedSpan.style.display = "inline-block";
    submitButton.disabled = true;
    backspaceButton.disabled = true;
    clearButton.disabled = true;
    shareButton.style.display = "inline-block";
  } else {
    qu0xLockedSpan.style.display = "none";
    submitButton.disabled = false;
    backspaceButton.disabled = false;
    clearButton.disabled = false;
    shareButton.style.display = "none";
  }
}

// --- Input Handling ---

function appendToExpression(char) {
  if (scoresByGame[currentGameIndex]?.qu0xAchieved) return; // locked
  expression += char;
  renderExpression();
  renderResult();
}

function removeLastChar() {
  if (scoresByGame[currentGameIndex]?.qu0xAchieved) return; // locked
  if (!expression) return;
  // On backspace, if last char was a digit and matches dice, restore dice usage accordingly
  // For simplicity, recalc usedDice from scratch after removal
  expression = expression.slice(0, -1);
  renderExpression();
  renderResult();
}

function clearExpression() {
  if (scoresByGame[currentGameIndex]?.qu0xAchieved) return; // locked
  expression = "";
  renderExpression();
  renderResult();
}

// --- Game Logic ---

function generateTarget(gameIndex) {
  // Use seeded RNG for target number 1-100
  const rng = seedRandom(gameIndex + 123456); // offset seed
  return 1 + Math.floor(rng() * 100);
}

function startGame(index) {
  if (index < 0) index = 0;
  if (index > getGameIndexFromDate(TODAY)) index = getGameIndexFromDate(TODAY);
  currentGameIndex = index;
  const date = getDateFromGameIndex(currentGameIndex);

  // Generate dice and target
  diceValues = generateDiceValues(currentGameIndex);
  usedDice = new Array(5).fill(false);
  expression = "";
  targetNumber = generateTarget(currentGameIndex);

  targetNumberSpan.textContent = targetNumber;

  renderDice();
  renderExpression();
  renderResult();
  updateHeaderBestScore();
  updateQu0xLockedUI();
  updateDropdowns();
  clearButton.disabled = false;
  backspaceButton.disabled = false;
  submitButton.disabled = false;
  shareButton.style.display = "none";
}

function submitExpression() {
  if (scoresByGame[currentGameIndex]?.qu0xAchieved) return; // locked

  if (!validateExpression(expression, diceValues)) {
    alert("Invalid Submission: Please ensure balanced parentheses and use each dice value exactly once.");
    return;
  }

  const val = safeEval(expression);
  if (isNaN(val)) {
    alert("Invalid Submission: Could not evaluate expression.");
    return;
  }

  const score = calculateScore(targetNumber, val);
  if (score === null) {
    alert("Invalid Submission.");
    return;
  }

  let gameData = scoresByGame[currentGameIndex];
  if (!gameData) {
    gameData = { bestScore: score, bestExpression: expression, qu0xAchieved: false };
  } else {
    if (score < gameData.bestScore) {
      gameData.bestScore = score;
      gameData.bestExpression = expression;
    }
  }

  if (score === 0) {
    gameData.qu0xAchieved = true;
  }

  scoresByGame[currentGameIndex] = gameData;

  // Mark completion sets
  totalGamesPlayed.add(currentGameIndex);
  const monthKey = formatMonthYear(getDateFromGameIndex(currentGameIndex));
  if (!monthlyCompletion[monthKey]) monthlyCompletion[monthKey] = new Set();
  monthlyCompletion[monthKey].add(currentGameIndex);

  updateHeaderBestScore();
  updateQu0xLockedUI();
  updateShareButtonVisibility();
  updateScoreboards();
  updateDropdowns();
}

function updateShareButtonVisibility() {
  const gameData = scoresByGame[currentGameIndex];
  if (gameData && gameData.qu0xAchieved) {
    shareButton.style.display = "inline-block";
  } else {
    shareButton.style.display = "none";
  }
}

function copyShareText() {
  const gameData = scoresByGame[currentGameIndex];
  if (!gameData || !gameData.qu0xAchieved) return;
  const text = `Qu0x Game Number:  ${gameData.bestExpression}`;
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard: " + text);
  });
}

// --- Dropdown & Navigation ---

function populateMonthYearSelect() {
  monthYearSelect.innerHTML = "";
  const startMonth = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), 1);
  const todayMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  let d = startMonth;
  while (d <= todayMonth) {
    const val = formatMonthYear(d);
    const option = document.createElement("option");
    option.value = val;
    option.textContent = val;
    monthYearSelect.appendChild(option);
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
}

function populateGameSelectForMonth(monthYear) {
  gameSelect.innerHTML = "";
  const [year, month] = monthYear.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month - 1, day);
    if (date < START_DATE) continue;
    if (date > TODAY) continue;

    const index = getGameIndexFromDate(date);
    const option = document.createElement("option");
    option.value = index;
    const displayDate = formatDate(date);

    // Emoji for Qu0x or checkmark
    const gameData = scoresByGame[index];
    let emoji = "";
    if (gameData?.qu0xAchieved) emoji = "⭐ ";
    else if (gameData?.bestScore != null) emoji = "✓ ";
    option.textContent = emoji + displayDate;
    gameSelect.appendChild(option);
  }
}

function updateDropdowns() {
  // Set month-year select based on current game
  const currentDate = getDateFromGameIndex(currentGameIndex);
  const monthYear = formatMonthYear(currentDate);
  monthYearSelect.value = monthYear;
  populateGameSelectForMonth(monthYear);
  gameSelect.value = currentGameIndex;
}

// --- Event Listeners ---

monthYearSelect.addEventListener("change", () => {
  populateGameSelectForMonth(monthYearSelect.value);
  if (gameSelect.options.length > 0) {
    gameSelect.selectedIndex = 0;
    currentGameIndex = Number(gameSelect.value);
    startGame(currentGameIndex);
  }
});

gameSelect.addEventListener("change", () => {
  currentGameIndex = Number(gameSelect.value);
  startGame(currentGameIndex);
});

submitButton.addEventListener("click", () => {
  submitExpression();
});

clearButton.addEventListener("click", () => {
  clearExpression();
});

backspaceButton.addEventListener("click", () => {
  removeLastChar();
});

shareButton.addEventListener("click", () => {
  copyShareText();
});

// Dice clicks
diceContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("dice-btn")) {
    const index = Number(e.target.dataset.index);
    if (usedDice[index]) return;
    if (scoresByGame[currentGameIndex]?.qu0xAchieved) return;
    const val = diceValues[index];
    appendToExpression(val.toString());
    usedDice[index] = true;
    renderDice();
  }
});

// Input buttons clicks
buttonsContainer.addEventListener("click", (e) => {
  if (!e.target.classList.contains("input-btn")) return;
  const val = e.target.textContent;
  if (val === "Clear") clearExpression();
  else if (val === "Backspace") removeLastChar();
  else appendToExpression(val);
});

// Initialization

function init() {
  populateMonthYearSelect();
  startGame(getGameIndexFromDate(TODAY));
  updateScoreboards();
  updateDropdowns();
  renderButtons();
}

init();

})();</script>
</body>
</html>
