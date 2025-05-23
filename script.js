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
  expressionBox.innerText += char;
  evaluateExpression();
}

function evaluateExpression() {
  const expr = expressionBox.innerText;
  try {
    let replaced = expr.replace(/(\d+)!/g, (_, num) => factorial(Number(num)))
                       .replace(/\^/g, "**");
    let result = eval(replaced);
    if (!Number.isInteger(result)) throw "Non-integer";
    evaluationBox.innerText = result;
  } catch {
    evaluationBox.innerText = "?";
  }
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function buildButtons() {
  const ops = ["+", "-", "*", "/", "^", "!", "(", ")", "Back", "Clear"];
  buttonGrid.innerHTML = "";

  [...new Set(diceValues)].forEach(v => {
    const btn = document.createElement("button");
    btn.innerText = v;
    btn.onclick = () => {
      const idx = diceValues.findIndex((d, i) => !usedDice.includes(i) && d === v);
      if (idx !== -1 && !isLocked(currentDay)) {
        usedDice.push(idx);
        document.querySelector(`.die[data-index="${idx}"]`).classList.add("faded");
        addToExpression(v.toString());
      }
    };
    buttonGrid.appendChild(btn);
  });

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
  generatePuzzle(day);
  renderDice();
  buildButtons();

  document.getElementById("submitBtn").disabled = isLocked(day);
  document.querySelectorAll("#buttonGrid button").forEach(btn => {
    if (["Back", "Clear"].includes(btn.innerText)) {
      btn.disabled = isLocked(day);
    }
  });

  const dateStr = getDateFromDayIndex(day);
  gameNumberDate.innerText = `Game #${day + 1} – ${dateStr}`;
  targetBox.innerText = `Target: ${target}`;

  expressionBox.innerText = "";
  evaluationBox.innerText = "?";
  usedDice = [];

  dailyBestScoreBox.innerText = bestScores[day] ?? "N/A";

  const solvedCount = Object.keys(bestScores).length;
  const total = maxDay + 1;
  completionRatioBox.innerText = `${solvedCount}/${total}`;

  masterScoreBox.innerText = solvedCount === total
    ? Object.values(bestScores).reduce((a, b) => a + b, 0)
    : "N/A";

  if (isLocked(day)) {
    expressionBox.innerText = lockedDays[day].expression;
    evaluateExpression();
    document.getElementById("gameNumberDate").innerText += " – Qu0x! Locked";
  }
}

function populateDropdown() {
  dropdown.innerHTML = "";
  for (let i = 0; i <= maxDay; i++) {
    const option = document.createElement("option");
    const date = getDateFromDayIndex(i);
    const emoji = lockedDays[i]?.score === 0 ? "⭐" :
                  bestScores[i] !== undefined ? "✅" : "";
    option.value = i;
    option.innerText = `Game ${i + 1} ${emoji} (${date})`;
    if (i === currentDay) option.selected = true;
    dropdown.appendChild(option);
  }
}

submitBtn.onclick = submit;
dropdown.onchange = () => {
  currentDay = Number(dropdown.value);
  renderGame(currentDay);
  populateDropdown();
};

document.getElementById("prevDay").onclick = () => {
  if (currentDay > 0) {
    currentDay--;
    renderGame(currentDay);
    populateDropdown();
  }
};

document.getElementById("nextDay").onclick = () => {
  if (currentDay < maxDay) {
    currentDay++;
    renderGame(currentDay);
    populateDropdown();
  }
};

window.onload = () => {
  populateDropdown();
  renderGame(currentDay);
};
