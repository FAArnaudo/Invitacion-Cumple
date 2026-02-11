// ==============================
// CONFIG
// ==============================
const DEV_MODE = true;
const STORAGE_KEY = "mensaje_descifrado";

// ==============================
// RESET DEV
// ==============================
if (DEV_MODE) {
  localStorage.removeItem(STORAGE_KEY);
}

// ==============================
// ELEMENTOS
// ==============================
const introScreen = document.getElementById("intro");
const gameScreen = document.getElementById("game");
const finalScreen = document.getElementById("final");

const startBtn = document.getElementById("startBtn");
const inputs = document.querySelectorAll(".inputs input");
const errorMsg = document.getElementById("errorMsg");

const guide = document.getElementById("guide");
const bubble = guide.querySelector(".bubble");
const introCard = introScreen.querySelector(".card");

const baseLetters = document.querySelectorAll(".puzzle-grid .letter");

// ==============================
// HELPERS
// ==============================
function showScreen(nextScreen) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  nextScreen.classList.add("active");
}

function normalize(text) {
  return text
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ==============================
// INTRO · SECUENCIA GUIADA
// ==============================
window.addEventListener("load", () => {
  // Posición arriba
  guide.classList.add("intro-top");

  // Aparece el gato
  setTimeout(() => {
    bubble.textContent = "La fiesta será en.....";
    guide.classList.add("show");
  }, 400);

  setTimeout(() => {
    bubble.textContent = "OH... Algo del mensaje se perdió en el camino…";
    guide.classList.add("show");
  }, 2200);

  // Aparece la card
  setTimeout(() => {
    introCard.style.animation = "cardEnter 0.9s ease-out forwards";
  }, 4000);

  // El gato baja, se calla y queda a un costado
  setTimeout(() => {
    guide.classList.remove("intro-top");
    guide.classList.add("silent");
    guide.classList.add("show");
  }, 9800);
});

// ==============================
// INTRO → GAME
// ==============================
if (startBtn) {
  console.log("startBtn found:", startBtn);
  startBtn.addEventListener("click", () => {
    console.log("startBtn clicked!");
    if (gameScreen) {
      showScreen(gameScreen);
    } else {
      console.error("gameScreen not found!");
    }
  });
} else {
  console.error("startBtn not found!");
}


// ==============================
// PUZZLE LOGIC
// ==============================
inputs.forEach((input) => {
  input.addEventListener("input", () => {
    checkInput(input);
  });
});

function checkInput(input) {
  const correct = normalize(input.dataset.answer);
  const value = normalize(input.value);

  if (!value) return;

  if (value === correct) {
    input.value = correct;
    input.disabled = true;
    input.classList.add("ok");
    errorMsg.textContent = "";

    // 🔹 activar letra base correspondiente
    const index = [...inputs].indexOf(input);
    baseLetters[index]?.classList.add("active");

    checkAllSolved();
  } else if (value.length >= correct.length) {
    errorMsg.textContent = "Esa palabra no encaja… mirá mejor la imagen 👀";
  } else {
    errorMsg.textContent = "";
  }
}

function checkAllSolved() {
  const allSolved = [...inputs].every((input) => input.disabled);

  if (allSolved) {
    localStorage.setItem(STORAGE_KEY, "true");

    setTimeout(() => {
      showScreen(finalScreen);
    }, 1200);
  }
}

// ==============================
// AUTO-RESTORE
// ==============================
if (!DEV_MODE && localStorage.getItem(STORAGE_KEY) === "true") {
  showScreen(finalScreen);
}
