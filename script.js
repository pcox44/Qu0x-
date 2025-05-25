const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const buttonGrid = document.getElementById("buttonGrid");
const diceContainer = document.getElementById("diceContainer");
const targetBox = document.getElementById("targetBox");
const submitBtn = document.getElementById("submitBtn");
const dropdown = document.getElementById("gameDropdown");
const dailyBestScoreBox = document.getElementById("dailyBestScore");
const completionRatioBox = document.getElementById("completionRatio");
const masterScoreBox = document.getElementById("masterScore");
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

const colorBoxes = {
  "1": "🟥", // red box for 1
  "2": "⬜", // white box for 2
  "3": "🟦", // blue box for 3
  "4": "🟨", // yellow box for 4
  "5": "🟩", // green box for 5
  "6": "⬛", // black box for 6
};

function expressionToShareable(expr) {
  return expr.replace(/\d/g, d => colorBoxes[d] || d);
}

function getDayIndex(date) {
  const start = new Date("2025-05-15T00:00:00");
  const diff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getDateFromDayIndex(index) {
  const start = new Date("2025-05-15T00:00:00");
  const date = new Date(start.getTime() + index * 86400000);
  return date.toISOString().slice(0, 10);
}

// Step 1: Define the static puzzles for the first 10 days
const staticPuzzles = [
  { dice: [3, 2, 5, 1, 1], target: 82 },
  { dice: [6, 3, 2, 4, 3], target: 46 },
  { dice: [2, 6, 2, 5, 4], target: 93 },
  { dice: [1, 6, 6, 3, 3], target: 44 },
  { dice: [1, 5, 4, 3, 2], target: 76 },
  { dice: [4, 2, 6, 3, 5], target: 4 },
  { dice: [1, 6, 4, 4, 3], target: 4 },
  { dice: [6,3, 1, 6, 1], target: 19 },
  { dice: [3, 1, 1, 3, 5], target: 73 },
  { dice: [3, 1, 3, 2, 6], target: 31 },
];

// Optional: use mulberry32 PRNG for dynamic puzzles from day 10 onward
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Step 2: Modify generatePuzzle to use static for first 10 days, dynamic for others
function generatePuzzle(day) {
  if (day < 10) {
    diceValues = staticPuzzles[day].dice.slice();  // clone array
    target = staticPuzzles[day].target;
  } else {
    // For days 11 onward, generate procedurally using mulberry32 seeded with day+1
    const rand = mulberry32(day + 1);
    diceValues = Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
    target = Math.floor(rand() * 100) + 1;
  }
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
  const styles = {
    1: { bg: "red", fg: "white" },
    2: { bg: "white", fg: "black" },
    3: { bg: "blue", fg: "white" },
    4: { bg: "yellow", fg: "black" },
    5: { bg: "green", fg: "white" },
    6: { bg: "black", fg: "yellow" }
  };
  const style = styles[val];
  die.style.backgroundColor = style.bg;
  die.style.color = style.fg;
}

function addToExpression(char) {
  const expr = expressionBox.innerText;
  const lastChar = expr.slice(-1);

  // Define what counts as a number character (digits)
  const isDigit = c => /\d/.test(c);

  // If char is a digit (from dice):
  if (isDigit(char)) {
    // If last char is also a digit, add a space before adding new digit to prevent concatenation
    if (isDigit(lastChar)) {
      expressionBox.innerText += ' ' + char;
    } else {
      expressionBox.innerText += char;
    }
  } else {
    // For operators and parentheses, append directly
    expressionBox.innerText += char;
  }

  evaluateExpression();
}

function doubleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid double factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 2) {
    product *= i;
  }
  return product;
}

function tripleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid triple factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 3) {
    product *= i;
  }
  return product;
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function evaluateExpression() {
  const expr = expressionBox.innerText.trim();
  if (expr.length === 0) {
    evaluationBox.innerText = "?";
    return;
  }
  try {
    let replaced = expr;

    // Triple factorial e.g. 5!!! or (2+1)!!!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!!!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      if (!Number.isInteger(n) || n < 0) throw "Invalid triple factorial";
      return tripleFactorial(n);
    });

    // Double factorial e.g. 4!! or (3!!)!!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      if (!Number.isInteger(n) || n < 0) throw "Invalid double factorial";
      return doubleFactorial(n);
    });

    // Single factorial e.g. 3! or (4)!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      if (!Number.isInteger(n) || n < 0) throw "Invalid factorial";
      return factorial(n);
    });

    // Replace ^ with **
    replaced = replaced.replace(/\^/g, "**");

    let result = eval(replaced);

    evaluationBox.innerText = result;
  } catch {
    evaluationBox.innerText = "?";
  }
}

function buildButtons() {
  const ops = ["+", "-", "*", "/", "^", "!", "(", ")", "Back", "Clear"];
  buttonGrid.innerHTML = "";


  ops.forEach(op => {
    const btn = document.createElement("button");
    btn.innerText = op;
    btn.onclick = () => {
      if (isLocked(currentDay)) return;
      if (op === "Back") {
        let expr = expressionBox.innerText;
        if (expr.length === 0) return;
        const removed = expr[expr.length - 1];
        expressionBox.innerText = expr.slice(0, -1);
        const idx = usedDice.findLast(i => diceValues[i].toString() === removed);
        if (idx !== undefined) {
          usedDice = usedDice.filter(i => i !== idx);
          document.querySelector(`.die[data-index="${idx}"]`).classList.remove("faded");
        }
      } else if (op === "Clear") {
        expressionBox.innerText = "";
        usedDice = [];
        renderDice();
      } else {
        addToExpression(op);
      }
      evaluateExpression();
    };
    buttonGrid.appendChild(btn);
  });
}

function isLocked(day) {
  return lockedDays[day]?.score === 0;
}

function submit() {
  if (isLocked(currentDay)) return;

  const result = evaluationBox.innerText;
  if (result === "?") {
    alert("Invalid Submission");
    return;
  }
  if (!Number.isInteger(Number(result))) {
  alert("Submission must be an integer result.");
  return;
  }
  if (usedDice.length !== 5) {
    alert("You must use all 5 dice.");
    return;
  }

  const score = Math.abs(Number(result) - target);
  if (!(currentDay in bestScores) || score < bestScores[currentDay]) {
    bestScores[currentDay] = score;
    localStorage.setItem("bestScores", JSON.stringify(bestScores));
  }

 if (score === 0) {
  lockedDays[currentDay] = { score, expression: expressionBox.innerText };
  localStorage.setItem("lockedDays", JSON.stringify(lockedDays));
  animateQu0x();

  // ✅ Show the Share button
  document.getElementById("shareBtn").classList.remove("hidden");
}

  renderGame(currentDay);
}

function animateQu0x() {
  qu0xAnimation.classList.remove("hidden");
  setTimeout(() => {
    qu0xAnimation.classList.add("hidden");
  }, 3000);
}

function renderGame(day) {
  currentDay = day;

  generatePuzzle(day);
  renderDice();

if (lockedDays[day] && lockedDays[day].expression) {
  expressionBox.innerText = lockedDays[day].expression;
  evaluateExpression();  // Evaluate and display result
} else {
  expressionBox.innerText = "";
  evaluationBox.innerText = "?";
}



  targetBox.innerText = `Target: ${target}`;
  gameNumberDate.innerText = `Game #${day + 1} (${getDateFromDayIndex(day)})`;

  if (bestScores[day] !== undefined) {
    dailyBestScoreBox.innerText = `Best Score: ${bestScores[day]}`;
  } else {
    dailyBestScoreBox.innerText = "Best Score: N/A";
  }

  let completedDays = Object.values(bestScores).filter(s => s === 0).length;
  completionRatioBox.innerText = `Qu0x! Completion: ${completedDays}/${maxDay + 1}`;

  // Master score is sum of best scores or "N/A"
  const totalScore = Object.values(bestScores).reduce((a, b) => a + b, 0);
  masterScoreBox.innerText = (Object.keys(bestScores).length > 0) ? `Master Score: ${totalScore}` : "Master Score: N/A";

  // Disable inputs if locked
  const locked = isLocked(day);
  if (locked) {
    expressionBox.style.pointerEvents = "none";
    submitBtn.disabled = true;
    buttonGrid.querySelectorAll("button").forEach(btn => btn.disabled = true);
    document.getElementById("shareBtn").classList.remove("hidden");
  } else {
    expressionBox.style.pointerEvents = "auto";
    submitBtn.disabled = false;
    buttonGrid.querySelectorAll("button").forEach(btn => btn.disabled = false);
    document.getElementById("shareBtn").classList.add("hidden");
  }
}

function populateDropdown() {
  dropdown.innerHTML = "";
  for (let i = 0; i <= maxDay; i++) {
    const option = document.createElement("option");
    option.value = i;
    // Add an emoji before "Game #"
    option.text = `⭐ Game #${i + 1}`;
    dropdown.appendChild(option);
  }
  dropdown.value = currentDay;
  dropdown.onchange = e => {
    renderGame(parseInt(e.target.value));
  };
}

document.getElementById("submitBtn").onclick = submit;

document.getElementById("shareBtn").onclick = () => {
  if (!lockedDays[currentDay]) return;
  const expr = lockedDays[currentDay].expression;
  const shareText = expressionToShareable(expr);
  navigator.clipboard.writeText(shareText).then(() => {
    alert("Expression copied to clipboard!");
  });
};

buildButtons();
populateDropdown();
renderGame(currentDay);
