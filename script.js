// Qu0x! Daily Dice Game script.js

// Constants
const START_DATE = new Date(2025, 4, 15); // May 15, 2025 (month is 0-indexed)
const TODAY = new Date();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const OPERATORS = ['+', '-', '*', '/', '^', '!', '(', ')'];
const MAX_TRIPLE_FACTORIALS = 3;

// Elements
const targetBox = document.getElementById('target-number');
const diceContainer = document.getElementById('dice-container');
const expressionBox = document.getElementById('expression');
const resultBox = document.getElementById('result');
const buttonsContainer = document.getElementById('buttons-container');
const backspaceBtn = document.getElementById('backspace');
const clearBtn = document.getElementById('clear');
const submitBtn = document.getElementById('submit');
const bestScoreTodayBox = document.getElementById('best-score-today');
const dailyStatusBox = document.getElementById('daily-status');
const shareBtn = document.getElementById('share-btn');
const monthYearSelect = document.getElementById('month-year-select');
const daySelect = document.getElementById('day-select');
const qu0xLockedText = document.getElementById('qu0x-locked-text');

let currentGameDate = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
let diceValues = [];
let usedDice = [];
let expression = '';
let dailyBest = null;
let dailyBestExpression = '';
let qu0xAchieved = false;

// Helpers

// Format date to yyyy-mm-dd string
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// Seeded random generator (Mulberry32)
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Generate dice for a given date (5 dice between 1 and 6)
function generateDice(date) {
  const seed = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
  const rand = mulberry32(seed);
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(rand() * 6) + 1);
  }
  return dice;
}

// Generate target number based on date and dice
function generateTargetNumber(date, dice) {
  // Example: sum of dice + day + month mod 100 + 1 to keep target 1-100
  let base = dice.reduce((a,b) => a+b, 0);
  let val = (base + date.getDate() + (date.getMonth()+1)) % 100 + 1;
  return val;
}

// Load saved game data from localStorage
function loadGameData(date) {
  const key = `qu0x-game-${formatDate(date)}`;
  const dataStr = localStorage.getItem(key);
  if (!dataStr) return null;
  try {
    return JSON.parse(dataStr);
  } catch {
    return null;
  }
}

// Save game data to localStorage
function saveGameData(date, data) {
  const key = `qu0x-game-${formatDate(date)}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// Clear current expression and reset used dice
function clearExpression() {
  expression = '';
  usedDice = [];
  updateExpressionBox();
  updateDiceUsedVisual();
  updateResultBox('');
  updateDailyStatus();
  enableControls(true);
}

// Update expression display box
function updateExpressionBox() {
  expressionBox.textContent = expression || '';
}

// Update dice visuals based on usage
function updateDiceUsedVisual() {
  const diceElems = diceContainer.querySelectorAll('.die');
  diceElems.forEach((dieElem, i) => {
    if (usedDice.includes(i)) {
      dieElem.classList.add('used');
    } else {
      dieElem.classList.remove('used');
    }
  });
}

// Evaluate the current expression safely
function evaluateExpression(expr) {
  // Replace factorials (supports !, !!, !!!)
  // Factorial only valid for non-negative integers
  // We'll parse and replace factorials before eval
  
  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw 'Invalid factorial input';
    let res = 1;
    for (let i=2; i<=n; i++) res *= i;
    return res;
  }
  
  function tripleFactorial(n) {
    // For n!!! = n! three times is ambiguous, interpret as factorial applied thrice
    // i.e. n! then factorial of that result twice more
    let res = factorial(n);
    res = factorial(res);
    res = factorial(res);
    return res;
  }
  
  // Regex to match triple factorial e.g. 5!!!
  expr = expr.replace(/(\d+|\([^()]+\))!{3}/g, (match, val) => {
    let num = evaluateExpression(val);
    if (num === null) throw 'Invalid triple factorial base';
    return tripleFactorial(num);
  });
  
  // Double factorial not implemented (to keep scope manageable)
  // Then single factorial
  expr = expr.replace(/(\d+|\([^()]+\))!/g, (match, val) => {
    let num = evaluateExpression(val);
    if (num === null) throw 'Invalid factorial base';
    return factorial(num);
  });
  
  // Replace ^ with **
  expr = expr.replace(/\^/g, '**');
  
  // Evaluate
  try {
    // eslint-disable-next-line no-eval
    let val = eval(expr);
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return val;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

// Update result display box with evaluation
function updateResultBox(val) {
  if (val === '') {
    resultBox.textContent = '';
  } else if (val === null) {
    resultBox.textContent = '?';
  } else {
    resultBox.textContent = val;
  }
}

// Update daily status text and buttons disabled state
function updateDailyStatus() {
  if (qu0xAchieved) {
    dailyStatusBox.textContent = 'Qu0x!-Locked';
    dailyStatusBox.style.color = 'red';
    qu0xLockedText.style.display = 'inline';
    enableControls(false);
  } else {
    dailyStatusBox.textContent = '';
    dailyStatusBox.style.color = 'black';
    qu0xLockedText.style.display = 'none';
    enableControls(true);
  }
  // Update best score display
  if (dailyBest !== null) {
    bestScoreTodayBox.textContent = `Best Score Today: ${dailyBest} (${dailyBestExpression})`;
  } else {
    bestScoreTodayBox.textContent = 'Best Score Today: N/A';
  }
}

// Enable or disable input controls (buttons, backspace, clear, submit)
function enableControls(enabled) {
  backspaceBtn.disabled = !enabled;
  clearBtn.disabled = !enabled;
  submitBtn.disabled = !enabled;
  // Operator buttons
  const operatorBtns = buttonsContainer.querySelectorAll('.button');
  operatorBtns.forEach(btn => {
    btn.disabled = !enabled;
  });
}

// Handle dice click to add dice value to expression
function onDiceClick(index) {
  if (qu0xAchieved) return;
  if (usedDice.includes(index)) return;
  usedDice.push(index);
  expression += diceValues[index];
  updateExpressionBox();
  updateDiceUsedVisual();
  updateCurrentEvaluation();
}

// Handle operator button click
function onOperatorClick(op) {
  if (qu0xAchieved) return;
  expression += op;
  updateExpressionBox();
  updateCurrentEvaluation();
}

// Handle backspace button
function onBackspace() {
  if (qu0xAchieved) return;
  if (!expression) return;
  // Remove last char and restore dice if dice was removed
  let lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  // Check if lastChar was a dice number and if it matches an unused dice index
  // This can be tricky: we track usedDice by index; here we remove last dice if needed
  // We'll scan from the end of usedDice array to see if last char matches the dice value used
  // We'll only remove the last used dice if its value matches the removed char
  if (usedDice.length > 0) {
    let lastUsedDiceIndex = usedDice[usedDice.length -1];
    if (String(diceValues[lastUsedDiceIndex]) === lastChar) {
      usedDice.pop();
    }
  }
  updateExpressionBox();
  updateDiceUsedVisual();
  updateCurrentEvaluation();
}

// Handle clear button
function onClear() {
  if (qu0xAchieved) return;
  clearExpression();
}

// Update the current evaluation of expression and show it
function updateCurrentEvaluation() {
  try {
    let val = evaluateExpression(expression);
    updateResultBox(val);
  } catch {
    updateResultBox(null);
  }
}

// Submit the current expression for scoring
function onSubmit() {
  if (qu0xAchieved) return;
  if (usedDice.length !== diceValues.length) {
    alert('Please use all dice values exactly once.');
    return;
  }
  let val = evaluateExpression(expression);
  if (val === null) {
    alert('Invalid Submission');
    return;
  }
  val = Math.round(val * 1000) / 1000; // Round to 3 decimals

  let target = Number(targetBox.textContent);
  let score = Math.abs(val - target);

  // Update best score if better
  if (dailyBest === null || score < dailyBest) {
    dailyBest = score;
    dailyBestExpression = expression;
    saveGameData(currentGameDate, { bestScore: dailyBest, expression: dailyBestExpression, qu0x: false });
  }

  // Check Qu0x!
  if (score === 0) {
    qu0xAchieved = true;
    saveGameData(currentGameDate, { bestScore: 0, expression: expression, qu0x: true });
    alert('Qu0x! Perfect score achieved!');
  }

  updateDailyStatus();
  updateBestScoreUI();
}

// Update best score UI element
function updateBestScoreUI() {
  if (dailyBest !== null) {
    bestScoreTodayBox.textContent = `Best Score Today: ${dailyBest} (${dailyBestExpression})`;
  } else {
    bestScoreTodayBox.textContent = 'Best Score Today: N/A';
  }
}

// Populate month-year dropdown with available months from May 2025 to current
function populateMonthYearDropdown() {
  monthYearSelect.innerHTML = '';
  let startYear = 2025;
  let startMonth = 4; // May is month 4 in 0-based index
  let currentYear = TODAY.getFullYear();
  let currentMonth = TODAY.getMonth();

  for (let year = startYear; year <= currentYear; year++) {
    let monthStart = (year === startYear) ? startMonth : 0;
    let monthEnd = (year === currentYear) ? currentMonth : 11;
    for (let m = monthStart; m <= monthEnd; m++) {
      let option = document.createElement('option');
      option.value = `${year}-${m}`;
      option.textContent = `${year}-${(m + 1).toString().padStart(2, '0')}`;
      if (year === currentGameDate.getFullYear() && m === currentGameDate.getMonth()) {
        option.selected = true;
      }
      monthYearSelect.appendChild(option);
    }
  }
}

// Populate day dropdown based on selected month-year
function populateDayDropdown() {
  daySelect.innerHTML = '';
  let [year, month] = monthYearSelect.value.split('-').map(Number);
  let daysInMonth = new Date(year, month + 1, 0).getDate();
  // Clamp max day based on current date if this is current month/year
  let maxDay = daysInMonth;
  if (year === TODAY.getFullYear() && month === TODAY.getMonth()) {
    maxDay = TODAY.getDate();
  }
  if (year === START_DATE.getFullYear() && month === START_DATE.getMonth()) {
    // Ensure no days before start date
    // Days start at START_DATE.getDate()
  }

  for (let d = 1; d <= maxDay; d++) {
    if (year === START_DATE.getFullYear() && month === START_DATE.getMonth() && d < START_DATE.getDate()) {
      continue; // skip days before start date
    }
    let option = document.createElement('option');
    option.value = d;
    option.textContent = d;
    if (d === currentGameDate.getDate()) {
      option.selected = true;
    }
    daySelect.appendChild(option);
  }
}

// Load game for a selected date
function loadGame(date) {
  currentGameDate = date;
  diceValues = generateDice(date);
  usedDice = [];
  expression = '';
  qu0xAchieved = false;
  // Load saved data if any
  let savedData = loadGameData(date);
  if (savedData) {
    dailyBest = savedData.bestScore;
    dailyBestExpression = savedData.expression;
    qu0xAchieved = savedData.qu0x || false;
  } else {
    dailyBest = null;
    dailyBestExpression = '';
  }
  // Set target
  let target = generateTargetNumber(date, diceValues);
  targetBox.textContent = target;

  // Build dice UI
  buildDiceUI();

  // Reset expression & UI
  updateExpressionBox();
  updateDiceUsedVisual();
  updateResultBox('');
  updateDailyStatus();
  updateBestScoreUI();

  populateMonthYearDropdown();
  populateDayDropdown();
  qu0xLockedText.style.display = qu0xAchieved ? 'inline' : 'none';
}

// Build dice elements in the DOM
function buildDiceUI() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, idx) => {
    const die = document.createElement('div');
    die.classList.add('die', `d${val}`);
    die.textContent = val;
    die.addEventListener('click', () => onDiceClick(idx));
    diceContainer.appendChild(die);
  });
}

// Initialize operator buttons
function initOperatorButtons() {
  // Operators to show on buttons, in two rows
  const operatorsRow1 = ['+', '-', '*', '/', '^', '('];
  const operatorsRow2 = [')', '!', 'Clear', 'Backspace', 'Submit', 'Share'];

  buttonsContainer.innerHTML = '';

  // Create buttons row 1
  operatorsRow1.forEach(op => {
    let btn = document.createElement('button');
    btn.classList.add('button');
    btn.textContent = op;
    btn.addEventListener('click', () => onOperatorClick(op));
    buttonsContainer.appendChild(btn);
  });

  // Create buttons row 2
  operatorsRow2.forEach(op => {
    let btn = document.createElement('button');
    btn.classList.add('button');
    btn.textContent = op;
    if (op === 'Clear') btn.id = 'clear';
    if (op === 'Backspace') btn.id = 'backspace';
    if (op === 'Submit') btn.id = 'submit';
    if (op === 'Share') btn.id = 'share-btn';
    buttonsContainer.appendChild(btn);
  });

  // Attach specific handlers
  clearBtn.addEventListener('click', onClear);
  backspaceBtn.addEventListener('click', onBackspace);
  submitBtn.addEventListener('click', onSubmit);
  shareBtn.addEventListener('click', onShare);
}

// Share button handler
function onShare() {
  // Share current expression and date
  if (!expression) {
    alert('No expression to share!');
    return;
  }
  let dateStr = formatDate(currentGameDate);
  let shareText = `Qu0x! Puzzle ${dateStr}\nExpression: ${expression}\nTarget: ${targetBox.textContent}`;
  navigator.clipboard.writeText(shareText).then(() => {
    alert('Copied to clipboard!');
  }, () => {
    alert('Failed to copy to clipboard.');
  });
}

// Dropdown change handlers
monthYearSelect.addEventListener('change', () => {
  populateDayDropdown();
  // After repopulate, load new date
  let [year, month] = monthYearSelect.value.split('-').map(Number);
  let day = Number(daySelect.value);
  let newDate = new Date(year, month, day);
  loadGame(newDate);
});

daySelect.addEventListener('change', () => {
  let [year, month] = monthYearSelect.value.split('-').map(Number);
  let day = Number(daySelect.value);
  let newDate = new Date(year, month, day);
  loadGame(newDate);
});

// Initialization
window.onload = () => {
  initOperatorButtons();
  loadGame(currentGameDate);
};
