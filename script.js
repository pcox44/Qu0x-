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


const celebrationEmojis = [
  '🎉','🎊','💥','✨','🔥','🌟','🎯','🏆','💫','🧨',
  '👏','🙌','👍','🤝','💪','🙏','👐','✌️','🤘',
  '💖','💙','💛','🖤','🤍',
  '🌈','🌞','🌠','🌸','🌺','🍀','🌼','🌻','❄️','⛄',
  '🐱','🐶','🦄','🐥','🐧','🐲','🦋','🦕','🐢','🐬',
  '🍕','🍔','🍟','🍩','🍿','🍭','🍰','🎂','🧁','🍪',
  '🎮','🎲','🧩','🎼','🎹','🥁','🎸','🎤','🎧','📯',
  '🚀','🛸','✈️','🛶','🚁','🛰️','🏎️','🏍️','🛵','🚲',
  '📣','📯','🗣️','💬','🔊','📢','💡','🧠','📸','🎥',
  '🎁','🎈','📦','🪅','🪄','🪩','🎇','🎆','🧃','🪙'
];

function getRandomCelebrationEmojis() {
  const e1 = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
  const e2 = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
  return `${e1}${e2}`;
}

// Example PRNG and hash
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
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
  { dice: [4, 5, 5, 3, 2], target: 52 },
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
  if (day < 11) {
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

  const isD6 = (document.getElementById("dieTypeDropdown")?.value || "6") === "6";

  diceValues.forEach((val, idx) => {
    const die = document.createElement("div");
    die.className = "die";
    die.dataset.index = idx;

    if (isD6) {
      // Flicker animation for D6 only
      die.classList.add("rolling");
      let flickerCount = 0;
      const flickerMax = 10;
      const dieFaces = [1, 2, 3, 4, 5, 6];

      const flickerInterval = setInterval(() => {
        const randomVal = dieFaces[Math.floor(Math.random() * dieFaces.length)];
        die.innerText = randomVal;
        styleDie(die, randomVal);
        flickerCount++;
        if (flickerCount >= flickerMax) {
          clearInterval(flickerInterval);
          die.innerText = val;
          styleDie(die, val);
        }
      }, 50);
    } else {
      // No animation for non-D6 dice
      die.innerText = val;
      styleDie(die, val);
    }

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

function quadrupleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid quadruple factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 4) {
    product *= i;
  }
  return product;
}

function quintupleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid quintuple factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 5) {
    product *= i;
  }
  return product;
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

function evaluateExpressionSafe(expr) {
  // Remove spaces for easier parsing
  expr = expr.replace(/\s+/g, '');

  // Tokenize expression into numbers, operators, factorials, and parentheses
  // We handle factorials as postfix operators: !, !!, !!!, !!!!, !!!!!
  
  // Regex to match tokens: numbers (with decimals), operators, parentheses, factorial sequences
  const tokenPattern = /(\d|\^|\+|\-|\*|\/|\(|\)|!{1,5})/g;
  const tokens = expr.match(tokenPattern);

  if (!tokens) throw "Invalid expression";

  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume(t) {
    if (tokens[pos] === t) {
      pos++;
      return true;
    }
    return false;
  }

  function expect(t) {
    if (tokens[pos] === t) {
      pos++;
    } else {
      throw `Expected ${t} but found ${tokens[pos]}`;
    }
  }

  // Recursive descent parser with grammar:
  // expression = term { ('+' | '-') term }
  // term = factor { ('*' | '/') factor }
  // factor = power { '^' power }
  // power = primary { factorial }
  // factorial = '!' | '!!' | '!!!' | '!!!!' | '!!!!!'
  // primary = number | '(' expression ')'

  function parseExpression() {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[pos++];
      let right = parseTerm();
      if (op === '+') value += right;
      else value -= right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[pos++];
      let right = parseFactor();
      if (op === '*') value *= right;
      else {
        if (right === 0) throw "Division by zero";
        value /= right;
      }
    }
    return value;
  }

  function parseFactor() {
    let value = parsePower();
    while (peek() === '^') {
      pos++; // consume '^'
      let exponent = parsePower();
      value = Math.pow(value, exponent);
    }
    return value;
  }

  function parsePower() {
    let value = parsePrimary();

    // Handle factorial postfix operators
    while (peek() && /^!{1,5}$/.test(peek())) {
      const factToken = tokens[pos++];
      const n = value;
      if (!Number.isInteger(n) || n < 0) throw "Invalid factorial argument";

      switch (factToken.length) {
        case 1:
          value = factorial(n);
          break;
        case 2:
          value = doubleFactorial(n);
          break;
        case 3:
          value = tripleFactorial(n);
          break;
        case 4:
          value = quadrupleFactorial(n);
          break;
        case 5:
          value = quintupleFactorial(n);
          break;
        default:
          throw "Unsupported factorial type";
      }
    }

    return value;
  }

  function parsePrimary() {
    const current = peek();
    if (!current) throw "Unexpected end of expression";

    if (current === '(') {
      pos++;
      const val = parseExpression();
      expect(')');
      return val;
    }

    // Number
    if (/^\d+$/.test(current)) {
      pos++;
      return Number(current);
    }

    // Unary minus support could be added here if needed

    throw `Unexpected token: ${current}`;
  }

  const result = parseExpression();

  if (pos !== tokens.length) {
    throw "Unexpected input after expression end";
  }

  return result;
}

function evaluateExpression() {
  const expr = expressionBox.innerText.trim();
  if (expr.length === 0) {
    evaluationBox.innerText = "?";
    return;
  }
  try {
    const result = evaluateExpressionSafe(expr);
    evaluationBox.innerText = result;
  } catch (e) {
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
  const emoji1 = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
  const emoji2 = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
  qu0xAnimation.innerText = `${emoji1} Qu0x! ${emoji2}`;
  qu0xAnimation.classList.remove("hidden");

  // Launch confetti burst
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 }
  });

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
    evaluateExpression();
  } else {
    expressionBox.innerText = "";
    evaluationBox.innerText = "?";
  }

  targetBox.innerText = `Target: ${target}`;
  gameNumberDate.innerText = `Game #${day + 1} (${getDateFromDayIndex(day)})`;

  if (bestScores[day] !== undefined) {
    dailyBestScoreBox.innerText = `${bestScores[day]}`;
  } else {
    dailyBestScoreBox.innerText = "N/A";
  }

  const completedDays = Object.values(bestScores).filter(score => score === 0).length;
  completionRatioBox.innerText = `${completedDays}/${maxDay + 1}`;

  const totalScore = Object.values(bestScores).reduce((a, b) => a + b, 0);
  const totalGames = maxDay + 1;

  if (Object.keys(bestScores).length === totalGames) {
    masterScoreBox.innerText = `${totalScore}`;
  } else {
    masterScoreBox.innerText = "N/A";
  }


  const locked = isLocked(day);

  expressionBox.style.pointerEvents = locked ? "none" : "auto";
  submitBtn.disabled = locked;

  // Disable or enable all operator buttons
  buttonGrid.querySelectorAll("button").forEach(btn => {
    btn.disabled = locked;
    if (locked) {
      btn.classList.add("disabled");
    } else {
      btn.classList.remove("disabled");
    }
  });

  // Hide or show Share button
  const shareBtn = document.getElementById("shareBtn");
  if (locked && lockedDays[day]?.expression) {
    shareBtn.classList.remove("hidden");
  } else {
    shareBtn.classList.add("hidden");
  }
}

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

function populateDropdown() {
  dropdown.innerHTML = "";
  for (let i = 0; i <= maxDay; i++) {
    const option = document.createElement("option");
    option.value = i;
    
    // Option text, you can customize with emojis or formatting
    option.text = `Game #${i + 1}`;
    
    // Mark locked games with a star emoji in option text
    if (lockedDays[i] && lockedDays[i].score === 0) {
      option.text = "⭐ " + option.text;
    }

    dropdown.appendChild(option);
  }
  // Set the dropdown value to the currentDay so UI matches the current game
  dropdown.value = currentDay;
}

// Add event listener to handle selection change
dropdown.addEventListener("change", (e) => {
  const selectedDay = Number(e.target.value);
  if (selectedDay >= 0 && selectedDay <= maxDay) {
    renderGame(selectedDay);
  }
});

submitBtn.addEventListener("click", submit);

// Initialize buttons, dropdown, and render current game on page load
buildButtons();
populateDropdown();
renderGame(currentDay);

document.getElementById("shareBtn").addEventListener("click", () => {
  const gameNumber = currentDay + 1;  // game number = day index + 1
  const expression = expressionBox.innerText;
  const shareableExpr = expressionToShareable(expression);

  const shareText = `Qu0x! ${gameNumber}: ${shareableExpr}`;

  navigator.clipboard.writeText(shareText).then(() => {
    alert("Copied your Qu0x! expression to clipboard!");
  });
});
