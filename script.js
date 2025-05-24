"use strict";

const startDate = new Date(2025, 4, 15); // May 15, 2025 (month zero-indexed)
const today = new Date();
const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

const diceColors = {
  1: { bg: 'red', fg: 'white' },
  2: { bg: 'white', fg: 'black' },
  3: { bg: 'blue', fg: 'white' },
  4: { bg: 'yellow', fg: 'black' },
  5: { bg: 'green', fg: 'white' },
  6: { bg: 'black', fg: 'yellow' },
};

let puzzles = [];
let currentDate = new Date(endDate);
let currentPuzzle = null;
let usedDiceIndices = [];
let expression = '';
let qu0xAchieved = false;

const diceContainer = document.getElementById('dice-container');
const expressionDiv = document.getElementById('expression');
const resultDiv = document.getElementById('result');
const targetBox = document.getElementById('target-box');
const submitBtn = document.getElementById('submit-btn');
const shareBtn = document.getElementById('share-btn');
const backspaceBtn = document.getElementById('backspace-btn');
const clearBtn = document.getElementById('clear-btn');
const monthYearDropdown = document.getElementById('month-year-dropdown');
const dayDropdown = document.getElementById('day-dropdown');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

const completionScoreDiv = document.getElementById('completion-score');
const bestScoreDiv = document.getElementById('best-score');
const monthlyScoreDiv = document.getElementById('monthly-score');
const ultimateScoreDiv = document.getElementById('ultimate-score');

const operators = ['+', '-', '*', '/', '^', '!'];
const secondRowButtons = ['(', ')', 'Back', 'Clear'];

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function getSeedFromDate(d) {
  return Number(d.toISOString().slice(0, 10).replace(/-/g, ''));
}

function generatePuzzles() {
  // For each day from startDate to endDate, create a puzzle with 5 dice and target
  let puzzlesArr = [];
  let d = new Date(startDate);
  while (d <= endDate) {
    let seed = getSeedFromDate(d);
    // Seeded random generator for dice and target
    let dice = seededRandomDice(seed);
    let target = seededRandomTarget(seed);
    puzzlesArr.push({ date: new Date(d), dice, target, solved: false, bestScore: null, qu0x: false });
    d.setDate(d.getDate() + 1);
  }
  return puzzlesArr;
}

function seededRandomDice(seed) {
  // Simple seeded RNG - returns array of 5 dice (1-6)
  let rng = mulberry32(seed);
  let dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(1 + Math.floor(rng() * 6));
  }
  return dice;
}

function seededRandomTarget(seed) {
  // Generate target 1-100 using seeded RNG
  let rng = mulberry32(seed + 123456);
  return 1 + Math.floor(rng() * 100);
}

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadPuzzle(date) {
  // Find puzzle by date
  let p = puzzles.find(p => formatDate(p.date) === formatDate(date));
  if (!p) return null;
  currentPuzzle = p;
  usedDiceIndices = [];
  expression = '';
  qu0xAchieved = p.qu0x || false;
  updateUI();
}

function updateUI() {
  // Show dice
  diceContainer.innerHTML = '';
  currentPuzzle.dice.forEach((val, idx) => {
    let die = document.createElement('div');
    die.className = 'die die-' + val;
    die.textContent = val;
    if (usedDiceIndices.includes(idx)) {
      die.style.opacity = 0.3;
      die.style.cursor = 'default';
    } else {
      die.style.opacity = 1;
      die.style.cursor = 'pointer';
      die.onclick = () => {
        if (qu0xAchieved) return;
        appendToExpression(val.toString(), idx);
      };
    }
    diceContainer.appendChild(die);
  });

  // Show expression
  expressionDiv.textContent = expression || '';

  // Evaluate expression and show result
  if (expression === '') {
    resultDiv.textContent = '?';
  } else {
    try {
      let val = evaluateExpression(expression);
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        resultDiv.textContent = val;
      } else {
        resultDiv.textContent = '?';
      }
    } catch {
      resultDiv.textContent = '?';
    }
  }

  // Show target
  targetBox.textContent = currentPuzzle.target;

  // Show scores
  updateScores();

  // Lock backspace and clear if qu0xAchieved
  backspaceBtn.disabled = qu0xAchieved;
  clearBtn.disabled = qu0xAchieved;

  // Show/hide share button
  shareBtn.style.display = qu0xAchieved ? 'inline-block' : 'none';

  // Disable submit if qu0xAchieved
  submitBtn.disabled = qu0xAchieved;

  // Disable dice clicks if qu0xAchieved
  if (qu0xAchieved) {
    diceContainer.querySelectorAll('.die').forEach(die => die.style.cursor = 'default');
  }

  // Disable op buttons if qu0xAchieved
  document.querySelectorAll('.op-btn').forEach(btn => {
    if (btn.id !== 'backspace-btn' && btn.id !== 'clear-btn') {
      btn.disabled = qu0xAchieved;
    }
  });
}

function appendToExpression(val, diceIdx = null) {
  // Prevent concat (i.e., digits directly following each other without operator)
  // But since dice are single digits, just check last char to avoid digits next to digits
  if (expression.length > 0) {
    let lastChar = expression.slice(-1);
    if (isDigit(lastChar) && isDigit(val)) {
      return; // prevent concat
    }
  }

  // If val is a dice number, mark that dice as used
  if (diceIdx !== null) {
    if (usedDiceIndices.includes(diceIdx)) return;
    usedDiceIndices.push(diceIdx);
  }

  expression += val;
  expressionDiv.textContent = expression;

  updateUI();
}

function isDigit(c) {
  return /\d/.test(c);
}

function evaluateExpression(expr) {
  // Replace × ÷ with * and / for eval
  let safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');

  // Replace factorials (!) with custom eval
  // We'll parse and evaluate factorials carefully

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  // Replace all factorials from right to left (including support for parentheses)
  while (safeExpr.includes('!')) {
    safeExpr = safeExpr.replace(/(\d+|\([^\(\)]+\))!/g, (match, p1) => {
      let val;
      if (p1.startsWith('(')) {
        val = evaluateExpression(p1.slice(1, -1));
      } else {
        val = Number(p1);
      }
      return factorial(val).toString();
    });
  }

  // Evaluate with Function constructor for safety (no variables)
 
