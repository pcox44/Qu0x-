// Add dropdown menu logic
document.getElementById("menuInstructions")?.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("instructionModal")?.classList.remove("hidden");
});
document.querySelector(".close-modal")?.addEventListener("click", () => {
  document.getElementById("instructionModal")?.classList.add("hidden");
});
window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("instructionModal")) {
    document.getElementById("instructionModal").classList.add("hidden");
  }
});
function populateArchiveList() {
  const archiveList = document.getElementById("archiveList");
  if (!archiveList) return;
  archiveList.innerHTML = "";
  for (let i = 0; i <= maxDay; i++) {
    const btn = document.createElement("button");
    btn.innerText = (lockedDays[i]?.score === 0 ? "⭐ " : "") + `Game #${i + 1}`;
    btn.onclick = () => renderGame(i);
    archiveList.appendChild(btn);
  }
}
function populateThemeOptions() {
  const themes = [
    { value: "default", label: "🎲 Default" },
    { value: "dark", label: "🌙 Dark" },
    { value: "gameboy", label: "🕹️ GameBoy" },
    { value: "terminal", label: "💾 Terminal" },
    { value: "comic", label: "💥 Comic" },
    { value: "fantasy", label: "🐉 Fantasy" }
  ];
  const themeOptions = document.getElementById("themeOptions");
  if (!themeOptions) return;
  themeOptions.innerHTML = "";
  themes.forEach(({ value, label }) => {
    const btn = document.createElement("button");
    btn.innerText = label;
    btn.onclick = () => applyTheme(value);
    themeOptions.appendChild(btn);
  });
}
function applyTheme(theme) {
  document.body.className = "";
  if (theme !== "default") {
    document.body.classList.add(`theme-${theme}`);
  }
  localStorage.setItem("qu0xTheme", theme);
}
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("qu0xTheme") || "default";
  applyTheme(savedTheme);
  populateArchiveList();
  populateThemeOptions();
});