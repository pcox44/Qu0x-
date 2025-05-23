// Get today's date string in YYYY-MM-DD format (local time)
function getTodayString() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Generate 5 dice values (1 to 6)
function generateDice() {
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice;
}

// Generate a target number between 1 and 100 for the day (simple seeded method)
function generateTarget(dateStr) {
  // simple seed hash from dateStr
  let seed = 0;
  for (const ch of dateStr) {
    seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  }
  // target 1-100
  return (seed % 100) + 1;
}

// Render dice as boxes inside dice-container
function renderDice(dice) {
  const diceContainer = document.querySelector('.dice-container');
  diceContainer.innerHTML = ''; // clear previous dice
  dice.forEach((value, index) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.textContent = value;
    die.setAttribute('aria-label', `Die ${index + 1}: ${value}`);
    diceContainer.appendChild(die);
  });
}

// Render target number
function renderTarget(target) {
  const targetNumber = document.getElementById('targetNumber');
  targetNumber.textContent = target;
}

// Render current date below the target number
function renderDate(dateStr) {
  let dateDisplay = document.getElementById('dateDisplay');
  if (!dateDisplay) {
    dateDisplay = document.createElement('div');
    dateDisplay.id = 'dateDisplay';
    dateDisplay.style.marginTop = '0.5em';
    dateDisplay.style.fontWeight = 'bold';
    document.querySelector('.target-container').appendChild(dateDisplay);
  }
  dateDisplay.textContent = `Date: ${dateStr}`;
}

function init() {
  const todayStr = getTodayString();
  const dice = generateDice();
  const target = generateTarget(todayStr);

  renderDice(dice);
  renderTarget(target);
  renderDate(todayStr);
}

window.addEventListener('DOMContentLoaded', init);
