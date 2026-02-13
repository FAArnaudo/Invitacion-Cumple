// ==============================
// CONFIG + STATE
// ==============================

const GUIDE_STATE = {
  screen: "intro", // intro | game | final
  mood: "neutral",
  canSpeak: false,
};

let hintTimeout = null;
let activeInput = null;
let attendanceReacted = false;
let persistentHintText = null;
let curiosityShown = false;
let introSession = 0;
let typingTimeout = null;
let isTyping = false;
let guideCooldown = false;
let firstSolvedReacted = false;
let midProgressReacted = false;
let lastSolvedReacted = false;
let annoyedReacted = false;
let audioUnlocked = false;
let guideHideTimeout = null;

const commentedWords = new Set();
const hintProgress = new Map();
const initialHintsShown = new Set();

const DEV_MODE = true;
const STORAGE_KEY = "mensaje_descifrado";
const ATTENDANCE_KEY = "asistencia_confirmada";
const AUDIO_PLAYED_KEY = "audio_fiesta_reproducido";

window.addEventListener("load", () => {
  if (isAlreadySolved()) {
    showScreen(finalScreen);

    // ✅ restaurar asistencia confirmada
    if (localStorage.getItem(ATTENDANCE_KEY) === "true") {
      attendanceCheck.checked = true;
      attendanceCheck.disabled = true;
    }
  } else {
    startIntro();
  }
});

// ==============================
// GUIDE · INTRO GAME
// ==============================
let gameIntroSpoken = false;

const GAME_INTRO_TEXT =
  "Acercate wachin. Voy a ayudarte 🐾. Cada palabra está escondida en la imagen. " +
  "Elige una palabra para completar y te doy una pista.";

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

  // 👇 NUEVO
  nueve: {
    text: "Bien visto… ese número estaba escondido.",
    mood: "neutral",
    chance: 1,
  },
};

const WORD_INITIAL_HINTS = {
  frodo: "Para el primero, busca al personaje con el anillo… quien es?",
  michi: "ps ps ps… Fijate quien se asoma bajo la mesa. Soy un M… ?",
  nueve: "Un numerooo… anda colgado por las luces…",
  dos: "Otro numero. El que faltaba…",
  takis: "Junto a las velas… TA Ke pIcaaS!!",
  aliens:
    "Quienes estan al fondo? Verdes… cabezones… andan en platillos voladores",
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

/* =========================
   LETRAS CLAVE · FIESTA
========================= */
const KEY_LETTERS = ["F", "I", "E", "S", "T", "A"];

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
const fiestaLetters = document.querySelectorAll(".base-word div");
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
  // ✂️ cortar cualquier tipeo previo
  clearTimeout(typingTimeout);
  isTyping = false;

  if (persistentHintText && activeInput) return;

  const {
    screen = "game",
    mood = "neutral",
    chance = 1,
    typing = true,
  } = options;

  const ignoreCooldown = screen === "final";

  if (
    GUIDE_STATE.screen !== screen ||
    !GUIDE_STATE.canSpeak ||
    (guideCooldown && isTyping) ||
    Math.random() > chance
  )
    return;

  bubble.textContent = ""; // 🔥 CLAVE: siempre empezar limpio

  // ⏱️ DURACIÓN DINÁMICA
  const typingSpeed = 45; // ms por caracter
  const typingTime = typing ? text.length * typingSpeed : 0;

  const isFinal = screen === "final";

  const readTimePerChar = isFinal ? 40 : 100;
  const minVisible = isFinal ? 1000 : 3800;

  const visibleTime = Math.max(minVisible, text.length * readTimePerChar);

  const duration = typingTime + visibleTime;

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
  // ✂️ cancelar cierre anterior
  if (guideHideTimeout) {
    clearTimeout(guideHideTimeout);
    guideHideTimeout = null;
  }

  if (screen !== "final") {
    guideHideTimeout = setTimeout(() => {
      guide.classList.remove("happy", "curious", "annoyed");

      if (persistentHintText && activeInput && !activeInput.disabled) {
        bubble.textContent = persistentHintText;
        guide.classList.add("show");
      } else {
        guide.classList.remove("show");
      }
    }, duration);
  }

  return duration; // ✅ CLAVE
}

function showPersistentHint(input) {
  if (!input || input.disabled) return;

  // ⛔ cancelar cualquier reacción en curso
  isTyping = false;
  clearTimeout(typingTimeout);
  guideCooldown = false;

  const key = normalize(input.dataset.answer).toLowerCase();
  const hint = WORD_INITIAL_HINTS[key];
  if (!hint) return;

  persistentHintText = hint;
  activeInput = input;

  guide.classList.remove("happy", "curious", "annoyed");
  guide.classList.remove("silent");
  guide.classList.add("show");

  bubble.textContent = hint;
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
  guide.classList.remove("show");

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

  guide.classList.remove("intro-top");
  guide.classList.remove("silent");

  if (nextScreen === gameScreen) {
    resetGuide();

    GUIDE_STATE.screen = "game";
    GUIDE_STATE.canSpeak = true;

    if (!gameIntroSpoken) {
      gameIntroSpoken = true;

      // 🐱 mensaje inicial PERSISTENTE (no temporal)
      persistentHintText = GAME_INTRO_TEXT;
      activeInput = null;

      guide.classList.remove("happy", "curious", "annoyed");
      guide.classList.remove("silent");
      guide.classList.add("show");

      typeText(GAME_INTRO_TEXT, 40);
    }
  } else {
    GUIDE_STATE.canSpeak = false;
  }

  if (nextScreen === finalScreen) {
    GUIDE_STATE.screen = "final";
    GUIDE_STATE.canSpeak = true;

    // 🔥 LIMPIEZA TOTAL DEL GUIDE
    if (guideHideTimeout) {
      clearTimeout(guideHideTimeout);
      guideHideTimeout = null;
    }

    guideCooldown = false;
    isTyping = false;
    persistentHintText = null;
    activeInput = null;

    guide.classList.remove("silent", "happy", "curious", "annoyed");
    guide.classList.add("show");

    bubble.textContent = "";
    isTyping = false;
    clearTimeout(typingTimeout);

    playFinalNarrative();
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
  const key = normalize(input.dataset.answer).toLowerCase();

  setTimeout(() => {
    if (
      input.disabled ||
      initialHintsShown.has(key) ||
      input.value ||
      GUIDE_STATE.screen !== "game" ||
      activeInput !== null ||
      persistentHintText === GAME_INTRO_TEXT
    ) {
      return;
    }

    giveInitialHint(input);
  }, delay);
}

function isAlreadySolved() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function playPartyAudioOnce() {
  if (localStorage.getItem(AUDIO_PLAYED_KEY) === "true") return;

  const partySound = document.getElementById("partySound");
  if (!partySound) return;

  partySound.currentTime = 0;
  partySound.volume = 0.35;

  partySound
    .play()
    .then(() => {
      localStorage.setItem(AUDIO_PLAYED_KEY, "true");
    })
    .catch((e) => {
      console.warn("🔇 Audio bloqueado:", e);
    });
}

function unlockAudio() {
  const partySound = document.getElementById("partySound");
  if (!partySound) return;
  if (audioUnlocked) return;

  partySound.volume = 0; // 🔇 silencio total
  partySound.currentTime = 0;

  partySound
    .play()
    .then(() => {
      audioUnlocked = true;
      console.log("🔊 Audio corriendo en silencio");
    })
    .catch((e) => {
      console.error("Audio bloqueado:", e);
    });
}

// ==============================
// INTRO
// ==============================
function startIntro() {
  if (isAlreadySolved()) return; // ⛔ NO intro si ya se resolvió
  introSession++;
  const session = introSession;

  guide.classList.add("intro-top");

  setTimeout(
    () =>
      session === introSession &&
      ((bubble.textContent = "ANTENCIÓN! La fiesta será en"),
      guide.classList.add("show")),
    300,
  );
  setTimeout(
    () => session === introSession && (bubble.textContent = "…"),
    3500,
  );
  setTimeout(
    () =>
      session === introSession &&
      (bubble.textContent = "UPS..! Algo del mensaje se perdió en el camino…"),
    5000,
  );
  setTimeout(
    () =>
      session === introSession &&
      (introCard.style.animation = "cardEnter 0.9s ease-out forwards"),
    9000,
  );
  setTimeout(
    () => session === introSession && guide.classList.add("silent"),
    9000,
  );

  setTimeout(() => {
    if (session !== introSession) return;

    startBtn.style.pointerEvents = "auto";
    startBtn.style.opacity = "1";
    startBtn.classList.add("ready");
  }, 16000);
}

// ==============================
// INTRO → GAME
// ==============================
startBtn?.addEventListener("click", () => {
  unlockAudio(); // 🔓 CLAVE ABSOLUTA

  introSession++;
  guide.classList.add("silent");
  showScreen(gameScreen);
  guide.classList.remove("intro-top");

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

inputs.forEach((input) => {
  input.addEventListener("focus", () => {
    activeInput = input;
    showPersistentHint(input);
  });
});

function checkInput(input) {
  const correct = normalize(input.dataset.answer);
  const value = normalize(input.value);

  if (!value) return;

  if (value === correct) {
    // 🛑 cortar cualquier pista activa
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }

    persistentHintText = null;
    activeInput = null;

    isTyping = false;
    clearTimeout(typingTimeout);
    guideCooldown = false;

    input.value = correct;
    input.disabled = true;
    input.classList.add("ok");

    if (activeInput === input) {
      activeInput = null;
      persistentHintText = null;
    }

    solvedCount++;

    const key = normalize(input.dataset.answer).toLowerCase();
    initialHintsShown.add(key);
    persistentHintText = null;
    activeInput = null;

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

    if (WORD_REACTIONS[key] && !commentedWords.has(key)) {
      commentedWords.add(key);
      const r = WORD_REACTIONS[key];
      guideSpeak(r.text, {
        mood: r.mood,
        chance: 1,
        typing: true,
      });
    } else {
      const genericReactions = [
        "Bien visto… eso estaba ahí desde el principio.",
        "Ajá… esa pieza encaja perfecto.",
        "No cualquiera ve eso a la primera.",
        "Exacto. Eso también era parte del mensaje.",
        "Seguimos bien… no aflojes ahora.",
      ];

      const text =
        genericReactions[Math.floor(Math.random() * genericReactions.length)];

      guideSpeak(text, {
        mood: "neutral",
        chance: 1,
        typing: true,
      });
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

function checkAllSolved(fromUserGesture = false) {
  if (solvedCount === 3 && !curiosityShown) {
    curiosityShown = true;
    guideSpeak("Esto empieza a tener sentido…", { mood: "curious" });
  }

  if ([...inputs].every((i) => i.disabled)) {
    if (!lastSolvedReacted) {
      lastSolvedReacted = true;
      guideSpeak("Eso era lo que faltaba…", { mood: "happy" });
    }

    guideSpeak("Ahí está… el mensaje vuelve", {
      mood: "happy",
    });

    const partySound = document.getElementById("partySound");
    if (partySound) {
      partySound.volume = 0.3; // 🔊 ARRANCA LA FIESTA
    }

    // ✅ marcar como resuelto UNA SOLA VEZ
    localStorage.setItem(STORAGE_KEY, "true");

    setTimeout(() => showScreen(finalScreen), 3000);
    setTimeout(() => startConfetti(6000), 3000);
  }
}

// ==============================
// FINAL · CONFIRMACIÓN ASISTENCIA
// ==============================

attendanceCheck.addEventListener("change", () => {
  if (attendanceCheck.checked) {
    // guardar asistencia
    localStorage.setItem(ATTENDANCE_KEY, "true");

    // abrir form
    window.open("https://forms.gle/Uo8rwpkiWzmjtiCi8", "_blank");

    // bloquear checkbox
    attendanceCheck.disabled = true;

    // 🐱 el gato SOLO habla si NO estaba resuelto antes
    if (!isAlreadySolved()) {
      guideSpeak("Perfecto 😸 ya quedó registrada.", {
        screen: "final",
        mood: "happy",
      });
    }
  }
});

// ==============================
// FINAL · CONFETTI DE CELEBRACIÓN
// ==============================

let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];
let confettiRunning = false;

function startConfetti(duration = 5000) {
  if (confettiRunning) return;
  confettiRunning = true;

  confettiCanvas = document.createElement("canvas");
  confettiCanvas.style.position = "fixed";
  confettiCanvas.style.top = "0";
  confettiCanvas.style.left = "0";
  confettiCanvas.style.width = "100%";
  confettiCanvas.style.height = "100%";
  confettiCanvas.style.pointerEvents = "none";
  confettiCanvas.style.zIndex = "9999";

  document.body.appendChild(confettiCanvas);

  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCtx = confettiCanvas.getContext("2d");

  confettiParticles = Array.from({ length: 140 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: Math.random() * -confettiCanvas.height,
    size: 6 + Math.random() * 6,
    speed: 2 + Math.random() * 4,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.2,
    color: `hsl(${Math.random() * 360}, 90%, 60%)`,
  }));

  function draw() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles.forEach((p) => {
      p.y += p.speed;
      p.angle += p.spin;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.angle);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      confettiCtx.restore();

      if (p.y > confettiCanvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * confettiCanvas.width;
      }
    });

    if (confettiRunning) requestAnimationFrame(draw);
  }

  draw();

  setTimeout(() => {
    confettiRunning = false;
    confettiCanvas.remove();
  }, duration);
}

// ==============================
// FINAL · CIERRE NARRATIVO DEL GATO
// ==============================

let finalNarrativeShown = false;

function playFinalNarrative() {
  if (finalNarrativeShown) return;
  if (GUIDE_STATE.screen !== "final") return;

  finalNarrativeShown = true;

  const steps = [
    {
      text: "Algunas pistas se pierden… pero las cosas importantes siempre encuentran la forma de llegar.",
      mood: "curious",
    },
    {
      text: "Ahora ya sabés dónde y cuándo. Yo voy a estar ahí… observando desde algún rincón 😼",
      mood: "neutral",
    },
    {
      text: "Si no sabés cómo llegar… tocá el botón amarillo",
      mood: "happy",
    },
  ];

  let t = 800; // delay inicial
  const gap = 600; // pausa entre diálogos

  steps.forEach((step) => {
    const startTime = t;

    setTimeout(() => {
      guideSpeak(step.text, {
        screen: "final",
        mood: step.mood,
      });
    }, startTime);

    // calcular duración ANTES de avanzar el tiempo
    const duration = estimateGuideDuration(step.text);
    t += duration + gap;
  });
}

function estimateGuideDuration(text, typing = true) {
  const typingSpeed = 45;
  const typingTime = typing ? text.length * typingSpeed : 0;

  const readTimePerChar = 100;
  const visibleTime = Math.max(3800, text.length * readTimePerChar);

  return typingTime + visibleTime;
}

// =========================
// AUDIO · FADE OUT
// =========================
function fadeOutAudio(audio, duration = 1500) {
  if (!audio) return;

  const steps = 20;
  const stepTime = duration / steps;
  const startVolume = audio.volume;

  let step = 0;

  const fade = setInterval(() => {
    step++;
    audio.volume = startVolume * (1 - step / steps);

    if (step >= steps) {
      clearInterval(fade);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = startVolume; // reset por si se reutiliza
    }
  }, stepTime);
}

// =========================
// MOBILE · AJUSTE TECLADO
// =========================
(function handleMobileKeyboard() {
  if (!window.visualViewport) return;

  const baseBottom = 24;

  function updateGuidePosition() {
    const viewport = window.visualViewport;
    const offset = window.innerHeight - viewport.height;

    // si el teclado está abierto, subimos al gato
    guide.style.bottom =
      offset > 0 ? `${baseBottom + offset}px` : `${baseBottom}px`;
  }

  visualViewport.addEventListener("resize", updateGuidePosition);
  visualViewport.addEventListener("scroll", updateGuidePosition);
})();

/* =========================
   GUIDE · RESET POSICIÓN AL CAMBIAR PANTALLA
========================= */
function updateGuidePosition(screenId) {
  if (!guide) return;

  // Solo en la intro va centrado arriba
  if (screenId === "intro") {
    guide.classList.add("intro-top");
  } else {
    guide.classList.remove("intro-top");
  }
}

// ==============================
// GUIDE · RESET DURO
// ==============================
function resetGuide() {
  // cortar tipeo
  isTyping = false;
  clearTimeout(typingTimeout);

  // limpiar burbuja
  bubble.textContent = "";

  // reset visual
  guide.classList.remove("show", "happy", "curious", "annoyed", "silent");

  // estado seguro
  GUIDE_STATE.canSpeak = true;
}

// ==============================
// DEV · RESET MOBILE (TRIPLE TAP)
// ==============================
if (DEV_MODE) {
  let tapCount = 0;
  let tapTimer = null;

  guide.addEventListener("click", () => {
    tapCount++;

    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      tapCount = 0;
    }, 800);

    if (tapCount === 3) {
      localStorage.removeItem("mensaje_descifrado");
      localStorage.removeItem("asistencia_confirmada");

      alert("🔁 Reset completo");

      location.reload();
    }
  });
}

document.addEventListener("touchstart", unlockAudio, { once: true });
