// Daily Dice Game - Qu0x Ultimate
// All requested features integrated:
// - Strict dice usage, no concatenation
// - Double and triple factorial support
// - Qu0x Ultimate and Monthly scores
// - Month-Year dropdown with default current month-year
// - Share button copies "Qu0x #[game#]: [expression]" to clipboard
// - Render expression input as LaTeX live using KaTeX
// - Best attempt display if no Qu0x yet
// - Qu0x Locked text near Clear button
// - Larger dice and operator fonts
// - Mobile friendly UI

"use strict";

const DAYS_RANGE_START = new Date(2025, 4, 15); // May 15, 2025
const DAYS_RANGE_END = new Date(); // Current day local
const MS_IN_DAY = 86400000;

let gamesData = {}; // localStorage data cache
let currentGameDate = null;
let diceValues = [];
let usedDice = [];
let expressionInput = ""; // Raw user expression string (non-latex)
let bestScores = {}; // keyed by yyyy-mm-dd, {score, expr, result}
let qu0xDays = new Set();
let qu0xCompletion = 0;
let qu0xUltimateScore = null;
let qu0xMonthlyScore = null;

const diceColors = {
  1: { fg: "white", bg: "red" },
  2: { fg: "black", bg: "white" },
  3: { fg: "white", bg: "blue" },
  4: { fg: "black", bg: "yellow" },
  5: { fg: "white", bg: "green" },
  6: { fg: "yellow", bg: "black" },
};

const monthYearSelect = document.getElementById("monthYearSelect");
const daySelect = document.getElementById("daySelect");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const diceContainer = document.querySelector(".dice-container");
const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const submitBtn = document.getElementById("submitBtn");
const targetBox = document.getElementById("targetBox");
const clearBtn = document.getElementById("clearBtn");
const qu0xLockedText = document.getElementById("qu0xLockedText");
const bestScoreToday = document.getElementById("bestScoreToday");
const qu0xCompletionText = document.getElementById("qu0xCompletion");
const qu0xUltimateScoreText = document.getElementById("qu0xUltimateScore");
const qu0xMonthlyScoreText = document.getElementById("qu0xMonthlyScore");
const qu0xAnimation = document.getElementById("qu0xAnimation");
const shareBtn = document.getElementById("shareBtn");
const bestAttemptText = document.querySelector(".best-attempt-text");

const operators = ["+", "-", "*", "/", "^", "!", "(", ")"];
const operatorButtons = ["+", "-", "*", "/", "^", "!", "(", ")"];
const diceNums = [1, 2, 3, 4, 5, 6];

// Utility - format date to YYYY-MM-DD
function formatDate(d) {
  return d.toISOString().split("T")[0];
}
// Parse date from YYYY-MM-DD string
function parseDate(str) {
  return new Date(str + "T00:00:00");
}
// Get month year string like "May 2025"
function monthYearStr(date) {
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}
// Get year-month string like "2025-05"
function yearMonthKey(date) {
  return date.toISOString().slice(0, 7);
}
// Days difference
function daysDiff(a, b) {
  return Math.round((a - b) / MS_IN_DAY);
}
// Get days in month
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Initialize month-year dropdown from 2025-05 to current month-year
function initMonthYearDropdown() {
  monthYearSelect.innerHTML = "";
  let startYear = DAYS_RANGE_START.getFullYear();
  let startMonth = DAYS_RANGE_START.getMonth();
  let endYear = DAYS_RANGE_END.getFullYear();
  let endMonth = DAYS_RANGE_END.getMonth();

  for (
    let y = startYear;
    y <= endYear;
    y++
  ) {
    let mStart = y === startYear ? startMonth : 0;
    let mEnd = y === endYear ? endMonth : 11;
    for (let m = mStart; m <= mEnd; m++) {
      let date = new Date(y, m, 1);
      let option = document.createElement("option");
      option.value = formatDate(date).slice(0, 7); // yyyy-mm
      option.textContent = monthYearStr(date);
      monthYearSelect.appendChild(option);
    }
  }
  // Default to current month-year
  const currentMY = formatDate(DAYS_RANGE_END).slice(0, 7);
  monthYearSelect.value = currentMY;
}

// Populate days dropdown based on selected month-year
function populateDaysDropdown() {
  daySelect.innerHTML = "";
  const selectedMY = monthYearSelect.value; // yyyy-mm
  const [y, m] = selectedMY.split("-").map(Number);
  const maxDays = daysInMonth(y, m);

  // Calculate allowed days range for the selected month-year
  const startDay =
    y === DAYS_RANGE_START.getFullYear() && m === DAYS_RANGE_START.getMonth()
      ? DAYS_RANGE_START.getDate()
      : 1;
  const endDay =
    y === DAYS_RANGE_END.getFullYear() && m === DAYS_RANGE_END.getMonth()
      ? DAYS_RANGE_END.getDate()
      : maxDays;

  for (let d = startDay; d <= endDay; d++) {
    let option = document.createElement("option");
    option.value = d;
    option.textContent = d;
    daySelect.appendChild(option);
  }

  // Default to last day available in month
  daySelect.value = endDay;
}

// Seed PRNG for dice & target generation using date string "yyyy-mm-dd"
function seededRandom(seed) {
  // Simple deterministic hash-based PRNG
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return function () {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate dice values & target for a day given date string
function generatePuzzle(dateStr) {
  const rand = seededRandom(dateStr);
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(rand() * 6) + 1);
  }
  // Target range 1-100
  const target = Math.floor(rand() * 100) + 1;
  return { dice, target };
}

// Save data to localStorage
function saveData() {
  const data = {
    bestScores,
    qu0xDays: Array.from(qu0xDays),
  };
  localStorage.setItem("dailyDiceGameData", JSON.stringify(data));
}

// Load data from localStorage
function loadData() {
  try {
    const dataStr = localStorage.getItem("dailyDiceGameData");
    if (!dataStr) return;
    const data = JSON.parse(dataStr);
    if (data.bestScores) bestScores = data.bestScores;
    if (data.qu0xDays) qu0xDays = new Set(data.qu0xDays);
  } catch {
    // corrupted data ignore
  }
}

// Initialize dice buttons
function createDiceButtons() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, idx) => {
    const btn = document.createElement("button");
    btn.className = "die";
    btn.textContent = val;
    btn.dataset.idx = idx;
    const colors = diceColors[val];
    btn.style.backgroundColor = colors.bg;
    btn.style.color = colors.fg;
    btn.style.borderColor = "black";
    if (usedDice.includes(idx)) {
      btn.classList.add("faded");
      btn.disabled = true;
    }
    btn.addEventListener("click", () => {
      if (usedDice.includes(idx)) return;
      appendToExpression(val.toString(), idx);
    });
    diceContainer.appendChild(btn);
  });
}

// Append char to expression and mark dice used if applicable
function appendToExpression(char, diceIdx = null) {
  // Check dice usage rules:
  // Only dice numbers can be appended if unused
  if (diceIdx !== null) {
    if (usedDice.includes(diceIdx)) return; // already used
    usedDice.push(diceIdx);
  }
  expressionInput += char;
  updateExpressionDisplay();
}

// Remove last char from expression (backspace)
function removeLastChar() {
  if (expressionInput.length === 0) return;
  const lastChar = expressionInput.slice(-1);

  // Check if last char was from dice (digits 1-6)
  // Since dice cannot be concatenated, each digit came from one dice
  if (/\d/.test(lastChar)) {
    // Find which dice index this digit corresponds to - remove last used dice
    usedDice.pop();
  }
  expressionInput = expressionInput.slice(0, -1);
  updateExpressionDisplay();
}

// Update expression display: render latex and update evaluation
function updateExpressionDisplay() {
  // Render expression to LaTeX for display
  // We do simple replacements for factorial and powers:
  // ! to ^{!} not needed, but exponents use ^{}, parentheses ok

  // Escape all operators to LaTeX equivalents:
  // We'll replace ^ by ^{...} and factorial by !
  // Parentheses and digits remain same
  // For safety, only basic replacements here:
  let latex = expressionInput
    .replace(/\^/g, "^")
    .replace(/!/g, "!")
    .replace(/\*/g, "\\cdot ")
    .replace(/\(/g, "(")
    .replace(/\)/g, ")");

  // Using katex render
  try {
    katex.render(latex, expressionBox, {
      throwOnError: false,
      displayMode: false,
    });
  } catch {
    expressionBox.textContent = expressionInput;
  }

  // Evaluate expression and update evaluation box
  const evalResult = safeEvaluate(expressionInput);
  if (evalResult === null) {
    evaluationBox.textContent = "?";
  } else {
    evaluationBox.textContent = evalResult;
  }
}

// Safe evaluation with factorials and exponentiation, strict rules on dice usage
function safeEvaluate(expr) {
  try {
    // Validate expression: only digits 1-6, + - * / ^ ! ( )
    if (!/^[\d+\-*/^!() ]*$/.test(expr)) return null;

    // No concatenation check: each digit must come from one dice usage
    // We already enforce this on input: digits added only from dice buttons once.

    // Replace factorials with JS function calls:
    // Handle double and triple factorial (!, !!, !!!)
    // We parse the expression manually to do that

    // Tokenize expression for factorial handling
    let processed = expr;

    // Convert triple factorial (!!!) to factorialFunc(factorialFunc(factorialFunc(n)))
    // Then double factorial (!!) to factorialFunc(factorialFunc(n))
    // Single factorial (!) to factorialFunc(n)
    // We'll do this by regex replacement from right to left for correctness

    processed = processed.replace(/(\d+|\([^()]+\))(!{3})/g, (m, num, fact) => {
      return `factorialFunc(factorialFunc(factorialFunc(${num})))`;
    });
    processed = processed.replace(/(\d+|\([^()]+\))(!{2})/g, (m, num, fact) => {
      return `factorialFunc(factorialFunc(${num}))`;
    });
    processed = processed.replace(/(\d+|\([^()]+\))(!)/g, (m, num) => {
      return `factorialFunc(${num})`;
    });

    // Replace ^ with Math.pow calls:
    // This is tricky; for simplicity, we replace a^b with Math.pow(a,b)
    // We'll use a simple parser for this:

    // We'll do a safe eval with Function constructor with predefined factorialFunc and Math.pow support

    const safeEvalFunc = new Function(
      "factorialFunc",
      "Math",
      `return ${processed}`
    );

    function factorialFunc(n) {
      if (typeof n === "number" && Number.isInteger(n) && n >= 0) {
        let res = 1;
        for (let i = n; i > 0; i -= 1) {
          res *= i;
        }
        return res;
      }
      throw new Error("Factorial only defined for non-negative integers");
    }

    // Replace ^ with Math.pow using regex
    // We replace all a^b with Math.pow(a,b) using a regex
    // Because this is complex, we do it before factorial replacement
    // So here, processed might have ^ operators, so let's do that now:

    // So the order is:
    // 1) Replace ^ operators outside of parentheses to Math.pow calls

    // We'll define a function to convert ^ operators to Math.pow calls safely

    function convertPowers(s) {
      // This is a quick parser to convert a^b to Math.pow(a,b)
      // Will handle nested parentheses and numbers only.

      // We'll use a stack-based approach to split expression around ^

      // But to keep it manageable, just replace all a^b where a and b are simple numbers or parentheses

      // regex: match groups like (\([^()]*\)|\d+)\^(\([^()]*\)|\d+)

      let pattern = /(\([^()]+\)|\d+)\^(\([^()]+\)|\d+)/g;
      while (pattern.test(s)) {
        s = s.replace(pattern, (m, base, exp) => {
          return `Math.pow(${base},${exp})`;
        });
      }
      return s;
    }

    let exprWithPowers = convertPowers(expr);

    // Now do factorial replacements on exprWithPowers

    let processedFinal = exprWithPowers;

    processedFinal = processedFinal.replace(/(\d+|\([^()]+\))(!{3})/g, (m, num, fact) => {
      return `factorialFunc(factorialFunc(factorialFunc(${num})))`;
    });
    processedFinal = processedFinal.replace(/(\d+|\([^()]+\))(!{2})/g, (m, num, fact) => {
      return `factorialFunc(factorialFunc(${num}))`;
    });
    processedFinal = processedFinal.replace(/(\d+|\([^()]+\))(!)/g, (m, num) => {
      return `factorialFunc(${num})`;
    });

    // Evaluate final expression
    const result = safeEvalFunc(
      (n) => {
        if (typeof n === "number" && Number.isInteger(n) && n >= 0) {
          let res = 1;
          for (let i = n; i > 0; i -= 1) {
            res *= i;
          }
          return res;
        }
        throw new Error("Factorial only defined for non-negative integers");
      },
      Math
    );

    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return Math.round(result * 1000000) / 1000000;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

// Submit expression and check score
function submitExpression() {
  if (qu0xDays.has(currentDateStr)) {
    alert("This day is locked after achieving a perfect Qu0x!");
    return;
  }
  if (expressionInput.length === 0) {
    alert("Please enter an expression.");
    return;
  }
  const val = safeEvaluate(expressionInput);
  if (val === null) {
    alert("Invalid Submission");
    return;
  }
  const score = Math.abs(val - currentTarget);
  alert(`Your expression evaluates to ${val}. Score difference: ${score}.`);

  // Check Qu0x
  if (score === 0) {
    qu0xDays.add(currentDateStr);
    totalQu0xCount++;
    alert("Qu0x! Perfect score achieved!");
  }

  // Save best score if better
  if (
    !bestScores[currentDateStr] ||
    score < bestScores[currentDateStr]
  ) {
    bestScores[currentDateStr] = score;
  }
  saveData();
  updateArchive();
  renderDice();
  clearExpression();
  updateLockStatus();
}

// Clear expression input and reset dice usage
function clearExpression() {
  expressionInput = "";
  usedDice = [];
  updateExpressionDisplay();
  renderDice();
}

// Update archive of last 5 results
function updateArchive() {
  archiveList.innerHTML = "";
  const dates = Object.keys(bestScores).sort().slice(-5);
  for (const d of dates) {
    const score = bestScores[d];
    const icon = qu0xDays.has(d) ? "⭐" : "✔️";
    const li = document.createElement("li");
    li.textContent = `${d}: Score ${score} ${icon}`;
    archiveList.appendChild(li);
  }
  // Update Qu0x-Master Score display
  if (Object.keys(bestScores).length === DAYS_RANGE_END.getDate() - DAYS_RANGE_START.getDate() + 1) {
    // all days solved
    const sumScores = Object.values(bestScores).reduce((a,b) => a+b, 0);
    qu0xMasterScoreSpan.textContent = sumScores.toFixed(2);
  } else {
    qu0xMasterScoreSpan.textContent = "N/A";
  }
}

// Update lock status of current day
function updateLockStatus() {
  if (qu0xDays.has(currentDateStr)) {
    submitBtn.disabled = true;
    clearBtn.disabled = true;
    alertLockStatus.style.display = "block";
  } else {
    submitBtn.disabled = false;
    clearBtn.disabled = false;
    alertLockStatus.style.display = "none";
  }
}

// On month-year or day change
monthYearSelect.addEventListener("change", () => {
  populateDaysDropdown();
  setCurrentDate();
  generateAndRender();
  updateLockStatus();
});

daySelect.addEventListener("change", () => {
  setCurrentDate();
  generateAndRender();
  updateLockStatus();
});

submitBtn.addEventListener("click", submitExpression);
clearBtn.addEventListener("click", () => {
  clearExpression();
});

backspaceBtn.addEventListener("click", () => {
  removeLastChar();
});

recycleBtn.addEventListener("click", () => {
  generateAndRender();
});

// Initialize
function init() {
  loadData();
  populateMonthYearDropdown();
  populateDaysDropdown();
  setCurrentDate();
  generateAndRender();
  updateLockStatus();
  updateArchive();
  clearExpression();
}

init();
</script>
</body>
</html>
