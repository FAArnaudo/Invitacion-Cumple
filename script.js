// ==============================
// CONFIGURACIÓN GENERAL
// ==============================

const DEV_MODE = true;

if (DEV_MODE) {
  localStorage.removeItem("invitacion_resuelta");
}

// Código correcto (luego lo ligamos a la imagen)
const SECRET_CODE = "LUZ"; // ejemplo: puede cambiarse

// ==============================
// ELEMENTOS DEL DOM
// ==============================
const introScreen = document.getElementById("intro");
const puzzleScreen = document.getElementById("puzzle");
const revealScreen = document.getElementById("reveal");

const startBtn = document.getElementById("startBtn");
const checkCodeBtn = document.getElementById("checkCode");
const codeInput = document.getElementById("codeInput");
const errorMsg = document.getElementById("errorMsg");

// ==============================
// FUNCIONES AUXILIARES
// ==============================

function showScreen(screenToShow) {
  // Oculta todas
  introScreen.classList.remove("active");
  puzzleScreen.classList.remove("active");
  revealScreen.classList.remove("active");

  // Muestra la deseada
  screenToShow.classList.add("active");
}

function normalize(text) {
  return text
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ==============================
// EVENTOS
// ==============================

// Ir de Intro -> Puzzle
startBtn.addEventListener("click", () => {
  showScreen(puzzleScreen);
  codeInput.focus();
});

// Verificar código
checkCodeBtn.addEventListener("click", checkCode);
codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    checkCode();
  }
});

function checkCode() {
  const userCode = normalize(codeInput.value);

  if (!userCode) {
    errorMsg.textContent = "¿Seguro que no viste ninguna pista?";
    return;
  }

  if (userCode === SECRET_CODE) {
    success();
  } else {
    fail();
  }
}

// ==============================
// RESULTADOS
// ==============================

function success() {
  errorMsg.textContent = "";

  // Animación simple
  puzzleScreen.style.opacity = "0";

  setTimeout(() => {
    puzzleScreen.style.opacity = "1";
    showScreen(revealScreen);
  }, 400);

  // Guardar progreso
  localStorage.setItem("invitacion_resuelta", "true");
}

function fail() {
  errorMsg.textContent = "Mmm… esa no es la respuesta. Mirá mejor la imagen 👀";
  codeInput.value = "";

  // Pequeño shake
  codeInput.animate(
    [
      { transform: "translateX(0px)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(0px)" }
    ],
    { duration: 300 }
  );
}

// ==============================
// AUTO-DESBLOQUEO (opcional)
// ==============================

if (localStorage.getItem("invitacion_resuelta") === "true") {
  showScreen(revealScreen);
}
