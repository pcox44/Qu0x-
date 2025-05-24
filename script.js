const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const buttonGrid = document.getElementById("buttonGrid");
const diceContainer = document.getElementById("diceContainer");
const targetBox = document.getElementById("targetBox");
const submitBtn = document.getElementById("submitBtn");
const shareBtn = document.getElementById("shareBtn");
const monthYearDropdown = document.getElementById("monthYearDropdown");
const dayDropdown = document.getElementById("dayDropdown");
const dailyBestScoreBox = document.getElementById("dailyBestScore");
const completionRatioBox = document.getElementById("completionRatio");
const monthlyScoreBox = document.getElementById("monthlyScore");
const ultimateScoreBox = document.getElementById("ultimateScore");
const gameNumberDate = document.getElementById("gameNumberDate");
const qu0xAnimation = document.getElementById("qu0xAnimation");

let currentDate = new Date();
let currentDay = getDayIndex(currentDate);
let maxDay = getDayIndex(new Date());
let usedDice = [];
let diceValues = [];
let target = null;
let lockedDays = JSON.parse(localStorage.getItem("lockedDays") || "{}");
let bestScores = JSON.parse(localStorage.getItem("bestScores") || "{}");

// Helpers to get day index since May 15, 2025
function getDayIndex(date) {
  const start = new Date("2025-05-15T00:00:00");
  const diff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(0, diff), getMaxDayIndex());
}

function getMaxDayIndex() {
  const today = new Date();
  const start = new Date("2025-05-15T00:00:00");
  return Math.floor((today - start) / (1000 * 60 * 60 * 24));
}

function getDateFromDayIndex(index) {
  const start = new Date("2025-05-15T00:00:00");
  const date = new Date(start.getTime() + index * 86400000);
  return date.toISOString().slice(0, 10);
}

function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function generatePuzzle(day) {
  const rand = seedRandom(day + 1);
  diceValues = Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
  target = Math.floor(rand() * 100) + 1;
}

function renderDice() {
  diceContainer.innerHTML = "";
  usedDice = [];
  diceValues.forEach((val, idx) => {
    const die = document.createElement("div");
    die.className = "die";
    die.dataset.index = idx;
    die.dataset.value = val;
    die.innerText = val;
    styleDie(die, val);
    die.addEventListener("click", () => {
      if (!usedDice.includes(idx) && !isLocked(currentDay)) {
        usedDice.push(idx);
        die.classList.add("faded");
        addToExpression(val.toString());
      }
    });
    diceContainer.appendChild(die);
  });
}

function styleDie(die, val) {
  // Dice colors per user specs:
  // 1: white on red
  // 2: black on white
  // 3: white on blue
  // 4: black on yellow
  // 5: white on green
  // 6: yellow on black
  die.style.border = "1px solid black";
  switch (val) {
    case 1:
      die.style.backgroundColor = "red";
      die.style.color = "white";
      break;
    case 2:
      die.style.backgroundColor = "white";
      die.style.color = "black";
      break;
    case 3:
      die.style.backgroundColor = "blue";
      die.style.color = "white";
      break;
    case 4:
      die.style.backgroundColor = "yellow";
      die.style.color = "black";
      break;
    case 5:
      die.style.backgroundColor = "green";
      die.style.color = "white";
      break;
    case 6:
      die.style.backgroundColor = "black";
      die.style.color = "yellow";
      break;
  }
}

function addToExpression(char) {
  if (isLocked(currentDay)) return;
  expressionBox.textContent += char;
  updateEvaluation();
}

function removeLastFromExpression() {
  if (isLocked(currentDay)) return;
  const expr = expressionBox.textContent;
  if (expr.length === 0) return;

  // Remove last character
  const lastChar = expr.slice(-1);
  expressionBox.textContent = expr.slice(0, -1);

  // If last char was a die number, restore die
  for (let i = usedDice.length - 1; i >= 0; i--) {
    const idx = usedDice[i];
    if (diceValues[idx].toString() === lastChar) {
      usedDice.splice(i, 1);
      fadeDie(idx, false);
      break;
    }
  }
  updateEvaluation();
}

function fadeDie(idx, fade) {
  const die = diceContainer.querySelector(`.die[data-index="${idx}"]`);
  if (!die) return;
  if (fade) die.classList.add("faded");
  else die.classList.remove("faded");
}

function clearExpression() {
  if (isLocked(currentDay)) return;
  expressionBox.textContent = "";
  usedDice = [];
  Array.from(diceContainer.children).forEach((die) => die.classList.remove("faded"));
  updateEvaluation();
}

function isLocked(day) {
  return lockedDays[day] === true;
}

function updateEvaluation() {
  const expr = expressionBox.textContent;
  if (expr.length === 0) {
    evaluationBox.textContent = "?";
    return;
  }
  try {
    const val = evaluateExpression(expr);
    if (val === null || val === undefined || isNaN(val)) {
      evaluationBox.textContent = "?";
    } else {
      evaluationBox.textContent = val;
    }
  } catch {
    evaluationBox.textContent = "?";
  }
}

function evaluateExpression(expr) {
  // Allowed: + - * / ^ ! ( ) integers only for factorial
  // Validate all dice numbers are used exactly once
  // We only check dice numbers are present once in expr
  // Since dice used via clicking, usage check done via usedDice

  // Replace ^ with ** for eval
  let safeExpr = expr.replace(/\^/g, "**");

  // Replace factorial: n! -> factorial(n)
  safeExpr = safeExpr.replace(/(\d+|\([^()]+\))!/g, (match, p1) => {
    return `factorial(${p1})`;
  });

  // Provide factorial function
  function factorial(n) {
    let num = Number(n);
    if (!Number.isInteger(num) || num < 0) throw "Invalid factorial";
    let res = 1;
    for (let i = 2; i <= num; i++) res *= i;
    return res;
  }

  // Use Function constructor for safety:
  // Block access to globals by empty args
  const f = new Function("factorial", `return (${safeExpr});`);
  const result = f(factorial);

  // Must be finite number
  if (typeof result !== "number" || !isFinite(result)) throw "Invalid result";

  return result;
}

function submitExpression() {
  if (isLocked(currentDay)) return;

  // Check all dice used exactly once
  if (usedDice.length !== diceValues.length) {
    alert("Please use all 5 dice exactly once.");
    return;
  }

  const expr = expressionBox.textContent;
  if (expr.length === 0) {
    alert("Please enter an expression.");
    return;
  }

  let val;
  try {
    val = evaluateExpression(expr);
  } catch {
    alert("Invalid expression.");
    return;
  }

  const score = Math.abs(target - val);

  // Update best score
  const prevBest = bestScores[currentDay];
  if (prevBest === undefined || score < prevBest) {
    bestScores[currentDay] = score;
    localStorage.setItem("bestScores", JSON.stringify(bestScores));
  }

  // Lock day if Qu0x!
  if (score === 0) {
    lockedDays[currentDay] = true;
    localStorage.setItem("lockedDays", JSON.stringify(lockedDays));
    showQu0xAnimation();
  }

  updateUI();

  alert(`Result: ${val}\nScore: ${score}${score === 0 ? " (Qu0x!)" : ""}`);
}

function showQu0xAnimation() {
  qu0xAnimation.classList.remove("hidden");
  setTimeout(() => {
    qu0xAnimation.classList.add("hidden");
  }, 3000);
}

function updateUI() {
  // Render dice with fade for used dice
  diceValues.forEach((val, idx) => {
    const die = diceContainer.querySelector(`.die[data-index="${idx}"]`);
    if (!die) return;
    if (usedDice.includes(idx)) die.classList.add("faded");
    else die.classList.remove("faded");
  });

  // Update daily best score display
  if (bestScores[currentDay] !== undefined) {
    dailyBestScoreBox.textContent = `Daily Best Score: ${bestScores[currentDay]}`;
  } else {
    dailyBestScoreBox.textContent = "Daily Best Score: N/A";
  }

  // Update completion ratio and monthly/ultimate scores
  const completedDays = Object.keys(lockedDays).filter(k => lockedDays[k]).length;
  const totalDaysPlayed = Object.keys(bestScores).length;
  completionRatioBox.textContent = `Qu0x! Completion: ${completedDays}/${totalDaysPlayed}`;

  // Monthly score: sum bestScores for current month if all days locked that month, else N/A
  const currentDateObj = getDateFromDayIndex(currentDay);
  const [curYear, curMonth] = currentDateObj.split("-").slice(0, 2);
  const monthDays = Object.keys(bestScores).filter(day => {
    const d = getDateFromDayIndex(Number(day));
    return d.startsWith(`${curYear}-${curMonth}`);
  });
  const monthLocked = monthDays.every(d => lockedDays[d]);
  if (monthLocked && monthDays.length > 0) {
    const sum = monthDays.reduce((a, d) => a + (bestScores[d] || 0), 0);
    monthlyScoreBox.textContent = `Qu0x! Monthly Score: ${sum}`;
  } else {
    monthlyScoreBox.textContent = "Qu0x! Monthly Score: N/A";
  }

  // Ultimate score: sum all bestScores if all days locked, else N/A
  const allDays = [...Array(getMaxDayIndex() + 1).keys()];
  const allLocked = allDays.every(d => lockedDays[d]);
  if (allLocked && totalDaysPlayed > 0) {
    const sum = allDays.reduce((a, d) => a + (bestScores[d] || 0), 0);
    ultimateScoreBox.textContent = `Qu0x! Ultimate Score: ${sum}`;
  } else {
    ultimateScoreBox.textContent = "Qu0x! Ultimate Score: N/A";
  }

  // Update target box text
  targetBox.textContent = `Target: ${target}`;

  // Update game number and date
  const dateStr = getDateFromDayIndex(currentDay);
  gameNumberDate.textContent = `Game #${currentDay + 1} — ${dateStr}`;

  // Enable/disable buttons based on lock
  const locked = isLocked(currentDay);
  backspaceBtn.disabled = locked;
  clearBtn.disabled = locked;
  submitBtn.disabled = locked;

  // Show/hide share button after Qu0x
  if (locked) shareBtn.classList.remove("hidden");
  else shareBtn.classList.add("hidden");

  // Reset qu0x animation hidden (in case)
  if (!locked) qu0xAnimation.classList.add("hidden");
}

// Buttons and input setup

const opsFirstRow = ["+", "-", "*", "/", "^", "!"];
const opsSecondRow = ["(", ")", "Back", "Clear"];

function createButton(text) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.type = "button";
  return btn;
}

function setupButtons() {
  buttonGrid.innerHTML = "";

  // First row: + - * / ^ !
  opsFirstRow.forEach(op => {
    const btn = createButton(op);
    btn.addEventListener("click", () => {
      if (isLocked(currentDay)) return;
      addToExpression(op);
    });
    buttonGrid.appendChild(btn);
  });

  // Second row: ( ) Back Clear
  opsSecondRow.forEach(op => {
    const btn = createButton(op);
    if (op === "Back") {
      btn.id = "backspaceBtn";
      btn.addEventListener("click", () => {
        removeLastFromExpression();
      });
    } else if (op === "Clear") {
      btn.id = "clearBtn";
      btn.addEventListener("click", () => {
        clearExpression();
      });
    } else {
      btn.addEventListener("click", () => {
        if (isLocked(currentDay)) return;
        addToExpression(op);
      });
    }
    buttonGrid.appendChild(btn);
  });
}

// Reference buttons for enable/disable
let backspaceBtn = null;
let clearBtn = null;

function cacheButtons() {
  backspaceBtn = document.getElementById("backspaceBtn");
  clearBtn = document.getElementById("clearBtn");
}

// Dropdown setup for month/year and day selection

function setupDropdowns() {
  monthYearDropdown.innerHTML = "";
  dayDropdown.innerHTML = "";

  // Month-Year dropdown from May 2025 to current month
  const start = new Date("2025-05-01");
  const end = new Date();
  let cur = new Date(start);
  while (cur <= end) {
    const val = `${cur.getFullYear()}-${(cur.getMonth() + 1).toString().padStart(2, "0")}`;
    const option = document.createElement("option");
    option.value = val;
    option.textContent = `${cur.toLocaleString("default", { month: "long" })} ${cur.getFullYear()}`;
    monthYearDropdown.appendChild(option);
    cur.setMonth(cur.getMonth() + 1);
  }

  // Set to current month-year by default
  const today = new Date();
  const todayVal = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;
  monthYearDropdown.value = todayVal;

  populateDayDropdown(todayVal);

  monthYearDropdown.addEventListener("change", () => {
    populateDayDropdown(monthYearDropdown.value);
  });

  dayDropdown.addEventListener("change", () => {
    const val = dayDropdown.value;
    if (!val) return;
    const [y, m, d] = val.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    const idx = getDayIndex(date);
    if (idx >= 0 && idx <= getMaxDayIndex()) {
      currentDay = idx;
      loadGame(currentDay);
    }
  });
}

function populateDayDropdown(monthYear) {
  dayDropdown.innerHTML = "";
  const [year, month] = monthYear.split("-");
  const monthNum = Number(month) - 1;
  const date = new Date(Number(year), monthNum, 1);
  while (date.getMonth() === monthNum) {
    const idx = getDayIndex(date);
    if (idx >= 0 && idx <= getMaxDayIndex()) {
      const option = document.createElement("option");
      const dateStr = date.toISOString().slice(0, 10);
      option.value = dateStr;
      option.textContent = dateStr;
      if (idx === currentDay) option.selected = true;
      dayDropdown.appendChild(option);
    }
    date.setDate(date.getDate() + 1);
  }
}

function loadGame(day) {
  if (day < 0 || day > getMaxDayIndex()) return;
  currentDay = day;
  generatePuzzle(day);
  clearExpression();
  renderDice();
  updateUI();
  updateDropdownSelection();
}

function updateDropdownSelection() {
  const dateStr = getDateFromDayIndex(currentDay);
  const [year, month] = dateStr.split("-").slice(0, 2);
  monthYearDropdown.value = `${year}-${month}`;
  populateDayDropdown(monthYearDropdown.value);
  dayDropdown.value = dateStr;
}

// Previous / Next buttons

document.getElementById("prevDay").addEventListener("click", () => {
  if (currentDay > 0) {
    currentDay--;
    loadGame(currentDay);
  }
});

document.getElementById("nextDay").addEventListener("click", () => {
  if (currentDay < getMaxDayIndex()) {
    currentDay++;
    loadGame(currentDay);
  }
});

submitBtn.addEventListener("click", submitExpression);

// Share button logic: only visible after Qu0x
shareBtn.addEventListener("click", () => {
  const url = new URL(window.location);
  url.searchParams.set("game", currentDay);
  url.searchParams.set("expr", expressionBox.textContent);
  navigator.clipboard.writeText(url.toString()).then(() => {
    alert("Share link copied to clipboard!");
  });
});

// On load, check URL for shared game/expr
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const gameParam = params.get("game");
  const exprParam = params.get("expr");
  if (gameParam !== null) {
    const idx = Number(gameParam);
    if (!isNaN(idx) && idx >= 0 && idx <= getMaxDayIndex()) {
      currentDay = idx;
      loadGame(currentDay);
      if (exprParam) {
        expressionBox.textContent = exprParam;
        updateEvaluation();
      }
    }
  }
}

// Initialize

setupButtons();
cacheButtons();
setupDropdowns();

loadFromURL();
loadGame(currentDay);
updateUI();

  </script>
</body>
</html>
