// ==============================
// CONFIG + STATE
// ==============================
const GUIDE_STATE = {
  screen: "intro", // intro | game | final
  mood: "neutral",
  canSpeak: false,
};

let curiosityShown = false;
let introSession = 0;
let typingTimeout = null;
let isTyping = false;
let guideCooldown = false;
let firstSolvedReacted = false;
let midProgressReacted = false;
let lastSolvedReacted = false;
let annoyedReacted = false;

const commentedWords = new Set();
const hintProgress = new Map();
const initialHintsShown = new Set();

const DEV_MODE = true;
const STORAGE_KEY = "mensaje_descifrado";

// ==============================
// REACCIONES Y PISTAS
// ==============================
const WORD_REACTIONS = {
  frodo: {
    text: "Mi preciosoo... Ese nombre… no es de este mundo",
    mood: "curious",
    chance: 0.8,
  },
  aliens: {
    text: "Eso no estaba en el mensaje original… ¿o sí?",
    mood: "curious",
    chance: 0.6,
  },
  takis: {
    text: "Ok… eso definitivamente no lo esperaba",
    mood: "happy",
    chance: 0.9,
  },
};

const WORD_INITIAL_HINTS = {
  frodo: "Mirá bien al personaje más pequeño… no está solo.",
  michi: "Fijate quién está cerca de la chica que canta.",
  nueve: "Observá los números que parecen decoración.",
  dos: "No todos los números llaman la atención de la misma forma.",
  takis: "Algo raro está en los pies…",
  aliens: "Al fondo de la escena hay algo que no pertenece.",
};

const WORD_HINTS = {
  frodo: [
    "Ese nombre me suena a anillo…",
    "Viene de una historia muy larga, con viajes.",
    "Pequeño, valiente… y no humano.",
  ],
  michi: [
    "Ese es fácil… algunos dicen que es sinónimo mío.",
    "Es una forma cariñosa para un gatito.",
    "Tiene bigotes.",
  ],
  nueve: [
    "No es grande, pero tampoco tan chico.",
    "Viene después del ocho.",
    "Se escribe con cinco letras.",
  ],
  dos: ["Menos que tres.", "Es un número básico.", "Somos tú y yo."],
  takis: ["Eso se come.", "Hace ruido al abrirse.", "Picante… mucho."],
  aliens: [
    "No son de acá.",
    "Vienen de muy lejos en O.V.N.I.S.",
    "Miran la Tierra desde arriba.",
  ],
};

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
// GUIDE · TEXTO TIPEADO
// ==============================
function typeText(text, speed = 40) {
  clearTimeout(typingTimeout);
  isTyping = true;
  bubble.textContent = "";

  let index = 0;

  function typeNext() {
    if (!isTyping) return;
    bubble.textContent += text[index++];
    if (index < text.length) {
      typingTimeout = setTimeout(typeNext, speed);
    } else {
      isTyping = false;
    }
  }
  typeNext();
}

// ==============================
// GUIDE · HABLAR / SILENCIO
// ==============================
function guideSpeak(text, options = {}) {
  const {
    screen = "game",
    mood = "neutral",
    chance = 1,
    typing = true,
  } = options;

  if (
    GUIDE_STATE.screen !== screen ||
    !GUIDE_STATE.canSpeak ||
    guideCooldown ||
    Math.random() > chance
  )
    return;

  // ✂️ cortar cualquier tipeo previo
  isTyping = false;
  clearTimeout(typingTimeout);

  // ⏱️ DURACIÓN DINÁMICA
  const baseTime = 1800; // tiempo mínimo visible
  const perChar = 55; // ms por caracter
  const typingTime = typing ? text.length * 40 : 0;

  const duration = baseTime + text.length * perChar + typingTime;

  guideCooldown = true;

  // 🎭 mood
  guide.classList.remove("happy", "curious", "annoyed");
  if (mood !== "neutral") guide.classList.add(mood);

  guide.classList.remove("silent");
  guide.classList.add("show");

  // 💬 texto
  if (typing) {
    typeText(text, 40);
  } else {
    bubble.textContent = text;
  }

  // 🫥 ocultar
  setTimeout(() => {
    guide.classList.remove("show", "happy", "curious", "annoyed");
  }, duration);

  // 🔓 liberar cooldown
  setTimeout(() => {
    guideCooldown = false;
  }, duration + 600);
}

function guideSilent({ duration = 1800, mood = "neutral", chance = 1 } = {}) {
  if (
    GUIDE_STATE.screen !== "game" ||
    !GUIDE_STATE.canSpeak ||
    guideCooldown ||
    Math.random() > chance
  )
    return;

  guideCooldown = true;
  bubble.textContent = "";

  guide.classList.remove("happy", "curious", "annoyed");
  if (mood !== "neutral") guide.classList.add(mood);

  guide.classList.remove("silent");
  guide.classList.add("show");

  setTimeout(
    () => guide.classList.remove("show", "happy", "curious", "annoyed"),
    duration,
  );
  setTimeout(() => (guideCooldown = false), duration + 600);
}

// ==============================
// HELPERS
// ==============================
function showScreen(nextScreen) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  nextScreen.classList.add("active");

  if (nextScreen === gameScreen) {
    GUIDE_STATE.screen = "game";
    GUIDE_STATE.canSpeak = true;
    inputs.forEach((i) => scheduleHint(i));
  } else {
    GUIDE_STATE.canSpeak = false;
  }
}

function normalize(text) {
  return text
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function giveInitialHint(input) {
  const key = normalize(input.dataset.answer).toLowerCase();

  if (initialHintsShown.has(key) || !WORD_INITIAL_HINTS[key] || input.disabled)
    return;

  initialHintsShown.add(key);

  guideSpeak(WORD_INITIAL_HINTS[key], {
    mood: "curious",
    chance: 1,
  });
}

function giveHintForInput(input) {
  const key = normalize(input.dataset.answer).toLowerCase();
  const hints = WORD_HINTS[key];
  if (!hints) return;

  const used = hintProgress.get(key) || 0;
  if (used >= hints.length) return;

  hintProgress.set(key, used + 1);
  guideSpeak(hints[used], { mood: "curious" });
}

function scheduleHint(input, delay = 6000) {
  setTimeout(() => {
    if (!input.disabled && !input.value && GUIDE_STATE.screen === "game") {
      giveInitialHint(input);
    }
  }, delay);
}

// ==============================
// INTRO
// ==============================
function startIntro() {
  introSession++;
  const session = introSession;

  guide.classList.add("intro-top");

  setTimeout(
    () =>
      session === introSession &&
      ((bubble.textContent = "La fiesta será en....."),
      guide.classList.add("show")),
    400,
  );
  setTimeout(
    () =>
      session === introSession &&
      (bubble.textContent = "OH! Algo del mensaje se perdió en el camino…"),
    2200,
  );
  setTimeout(
    () =>
      session === introSession &&
      (introCard.style.animation = "cardEnter 0.9s ease-out forwards"),
    4000,
  );
  setTimeout(
    () => session === introSession && guide.classList.add("silent"),
    9800,
  );

  setTimeout(() => {
    if (session !== introSession) return;

    startBtn.style.pointerEvents = "auto";
    startBtn.style.opacity = "1";
    startBtn.classList.add("ready");
  }, 9000);
}

window.addEventListener("load", startIntro);

// ==============================
// INTRO → GAME
// ==============================
startBtn?.addEventListener("click", () => {
  introSession++;
  guide.classList.add("silent");
  showScreen(gameScreen);

  // 🐾 programar pistas iniciales por input
  inputs.forEach((input) => scheduleHint(input));
});

// ==============================
// PUZZLE
// ==============================
let solvedCount = 0;
let errorCount = 0;

inputs.forEach((input) =>
  input.addEventListener("input", () => checkInput(input)),
);

function checkInput(input) {
  const correct = normalize(input.dataset.answer);
  const value = normalize(input.value);
  if (!value) return;

  if (value === correct) {
    input.value = correct;
    input.disabled = true;
    solvedCount++;

    if (solvedCount === 1 && !firstSolvedReacted) {
      firstSolvedReacted = true;
      guideSpeak("Bien… empezamos", { mood: "happy" });
    }

    const halfway = Math.ceil(inputs.length / 2);
    if (solvedCount === halfway && !midProgressReacted) {
      midProgressReacted = true;
      Math.random() < 0.5
        ? guideSilent({ mood: "curious" })
        : guideSpeak("Algo empieza a encajar…", { mood: "curious" });
    }

    const key = normalize(input.dataset.answer).toLowerCase();
    if (WORD_REACTIONS[key] && !commentedWords.has(key)) {
      commentedWords.add(key);
      const r = WORD_REACTIONS[key];
      guideSpeak(r.text, { mood: r.mood, chance: r.chance });
    }

    checkAllSolved();
  } else if (value.length >= correct.length) {
    input.errorCount = (input.errorCount || 0) + 1;
    if (input.errorCount === 2) giveHintForInput(input);

    errorCount++;
    if (errorCount >= 3 && !annoyedReacted) {
      annoyedReacted = true;
      guideSpeak("Ey… sin apurarse", { mood: "annoyed", chance: 0.7 });
    }
  }
}

function checkAllSolved() {
  if (solvedCount === 3 && !curiosityShown) {
    curiosityShown = true;
    guideSpeak("Esto empieza a tener sentido…", { mood: "curious" });
  }

  if ([...inputs].every((i) => i.disabled)) {
    if (!lastSolvedReacted) {
      lastSolvedReacted = true;
      guideSpeak("Eso era lo que faltaba…", { mood: "happy" });
    }

    localStorage.setItem(STORAGE_KEY, "true");
    guideSpeak("Ahí está… el mensaje vuelve", {
      mood: "happy",
    });
    setTimeout(() => showScreen(finalScreen), 1200);
  }
}
