/* =========================
   1) WORD BANK (8 columns × 13 rows)
========================= */
const WORDS = [
  // col 1 = C (low)
  ["I","when","spice","zig","a","real","nothin","talk","is","sporty","fine","deceivin’","gotta"],

  // col 2 = D
  ["infatuat","fine","aligned","spice","posh","weave","ginger","name","my","","","",""],

  // col 3 = E
  ["a","freaky","don’t","banana","whole","weave","reason","schemin’","","","","",""],

  // col 4 = F
  ["zig","ah","zig","ah","zig","ah","zig","ah","zig","ah","zig","ah","zig"],

  // col 5 = G
  ["ah","real","posh","so","world","ah","feel","girl","in","away","pavin’","masters","fuck"],

  // col 6 = A
  ["fuck","spice","old","up","no","fake","off","feelings","look","mama","together","world","tryna"],

  // col 7 = B
  ["reason","hit","I-5","come","Viva","know","boujee","tell","really","spice","woah","go","aligned"],

  // col 8 = C (high)
  ["wanna","list","(hey)","scary","Spice","fine","a","need","like","studyin’","put","fuck","fuck"],
];

// per-column pointer (0..12)
const pointers = new Array(8).fill(0);

/* =========================
   2) KEY MAPPING (computer -> {octave, noteIndex})
   noteIndex: 0=C(low),1=D,2=E,3=F,4=G,5=A,6=B,7=C(high)
   OVERLAPS included: '.' and 'a' -> octave2 C(low), ';' and 'p' -> octave3 C(high)
========================= */
const KEYMAP = {
  // octave 1
  "z": { octave: 1, noteIndex: 0 },
  "x": { octave: 1, noteIndex: 1 },
  "c": { octave: 1, noteIndex: 2 },
  "v": { octave: 1, noteIndex: 3 },
  "n": { octave: 1, noteIndex: 4 },
  "m": { octave: 1, noteIndex: 5 },
  ",": { octave: 1, noteIndex: 6 },
  "/": { octave: 1, noteIndex: 7 },

  // octave 2
  "a": { octave: 2, noteIndex: 0 },
  "s": { octave: 2, noteIndex: 1 },
  "d": { octave: 2, noteIndex: 2 },
  "f": { octave: 2, noteIndex: 3 },
  "j": { octave: 2, noteIndex: 4 },
  "k": { octave: 2, noteIndex: 5 },
  "l": { octave: 2, noteIndex: 6 },
  ".": { octave: 2, noteIndex: 0 }, // overlap with 'a' (octave2 C low)

  // octave 3
  "q": { octave: 3, noteIndex: 0 },
  "w": { octave: 3, noteIndex: 1 },
  "e": { octave: 3, noteIndex: 2 },
  "r": { octave: 3, noteIndex: 3 },
  "u": { octave: 3, noteIndex: 4 },
  "i": { octave: 3, noteIndex: 5 },
  "o": { octave: 3, noteIndex: 6 },
  "p": { octave: 3, noteIndex: 7 },
  ";": { octave: 3, noteIndex: 7 }, // overlap with 'p' (octave3 C high)

  // shifted punctuation helpers (optional, makes it robust if shift is held)
  "<": { octave: 1, noteIndex: 6 }, // shift+comma
  "?": { octave: 1, noteIndex: 7 }, // shift+slash
  ">": { octave: 2, noteIndex: 0 }, // shift+period
  ":": { octave: 3, noteIndex: 7 }, // shift+semicolon
};

const heldKeys = new Set();               // prevents repeat-spam
const pressCount = new Map();             // pianoKeyId -> number of held computer keys
const bankPositions = new Map();          // "col-row" -> { left, top }

/* =========================
   3) DOM references
========================= */
const stage = document.getElementById("stage");
const bank = document.getElementById("bank");
const activeLayer = document.getElementById("activeLayer");
const piano = document.getElementById("piano");

/* =========================
   4) Build UI: bank collage + piano
========================= */
buildPiano();
buildBankCollage();
window.addEventListener("resize", buildBankCollage);

/* =========================
   5) Keyboard events
========================= */
window.addEventListener("keydown", (e) => {
  const k = normalizeKey(e);
  const info = KEYMAP[k];
  if (!info) return;

  // prevent browser interference on punctuation keys
  if (isPunctuation(k)) e.preventDefault();

  // prevent repeat fire while held
  if (heldKeys.has(k)) return;
  heldKeys.add(k);

  pressPianoKey(info.octave, info.noteIndex);
  const { word, rowNum, colNum } = nextWordForColumn(info.noteIndex);
  spawnActiveWord(colNum, rowNum, word);
  playAudio(colNum, rowNum);
});

window.addEventListener("keyup", (e) => {
  const k = normalizeKey(e);
  const info = KEYMAP[k];
  if (!info) return;

  if (isPunctuation(k)) e.preventDefault();

  heldKeys.delete(k);
  releasePianoKey(info.octave, info.noteIndex);
});

/* =========================
   FUNCTIONS
========================= */

function normalizeKey(e) {
  // Keep letters lowercase, keep punctuation as-is
  const k = (e.key || "").toLowerCase();
  return k;
}

function isPunctuation(k) {
  return [",", ".", ";", "/", "<", ">", ":", "?"].includes(k);
}

/* Piano UI */
function buildPiano() {
  piano.innerHTML = "";
  for (let octave = 1; octave <= 3; octave++) {
    const wrap = document.createElement("div");
    wrap.className = "octave";

    const keys = document.createElement("div");
    keys.className = "keys";

    // 8 white keys per octave
    for (let noteIndex = 0; noteIndex < 8; noteIndex++) {
      const key = document.createElement("div");
      key.className = "whiteKey";
      key.dataset.octave = String(octave);
      key.dataset.note = String(noteIndex);
      keys.appendChild(key);
    }

    // black keys (visual only): between 0-1,1-2,3-4,4-5,5-6
    const blackBetween = [0, 1, 3, 4, 5];
    blackBetween.forEach((i) => {
      const bk = document.createElement("div");
      bk.className = "blackKey";
      // boundary between i and i+1 is (i+1)/8 * 100%
      const boundary = ((i + 1) / 8) * 100;
      bk.style.left = `${boundary}%`;
      keys.appendChild(bk);
    });

    const label = document.createElement("div");
    label.className = "octLabel";
    label.textContent = `octave ${octave}`;

    wrap.appendChild(keys);
    wrap.appendChild(label);
    piano.appendChild(wrap);
  }
}

function pianoKeyId(octave, noteIndex) {
  return `${octave}-${noteIndex}`;
}

function getPianoKeyEl(octave, noteIndex) {
  return document.querySelector(
    `.whiteKey[data-octave="${octave}"][data-note="${noteIndex}"]`
  );
}

function pressPianoKey(octave, noteIndex) {
  const id = pianoKeyId(octave, noteIndex);
  const n = (pressCount.get(id) || 0) + 1;
  pressCount.set(id, n);
  const el = getPianoKeyEl(octave, noteIndex);
  if (el) el.classList.add("pressed");
}

function releasePianoKey(octave, noteIndex) {
  const id = pianoKeyId(octave, noteIndex);
  const n = (pressCount.get(id) || 0) - 1;
  pressCount.set(id, Math.max(0, n));
  if (n <= 0) {
    const el = getPianoKeyEl(octave, noteIndex);
    if (el) el.classList.remove("pressed");
  }
}

/* Bank collage */
function buildBankCollage() {
  bank.innerHTML = "";
  bankPositions.clear();

  const rect = stage.getBoundingClientRect();
  const laneW = rect.width / 8;

  const topStart = 22;
  const rowGap = 44;

  for (let col = 0; col < 8; col++) {
    for (let row = 0; row < 13; row++) {
      const word = WORDS[col][row];
      if (!word) continue;

      // base position for this "cell"
      const laneCenterX = (col + 0.5) * laneW;
      const baseTop = topStart + row * rowGap;

      // jitter ONCE each rebuild (page load); stable enough for editing
      const jx = randInt(-34, 34);
      const jy = randInt(-14, 14);

      const left = laneCenterX + jx;
      const top = baseTop + jy;

      const box = document.createElement("div");
      box.className = "wordBox bank";
      box.textContent = word;
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.zIndex = String(row + 1);

      bank.appendChild(box);

      // store for active spawn alignment
      const key = `${col + 1}-${row + 1}`; // colNum-rowNum (1-based)
      bankPositions.set(key, { left, top });
    }
  }
}

/* Word selection */
function nextWordForColumn(noteIndex) {
  // noteIndex 0..7 maps to colNum 1..8
  const colNum = noteIndex + 1;
  const col = noteIndex; // 0-based

  // Find next non-empty word, advancing pointer as we go
  for (let tries = 0; tries < 13; tries++) {
    const idx = pointers[col];         // 0..12
    const word = WORDS[col][idx];
    pointers[col] = (pointers[col] + 1) % 13;

    if (word && word !== "") {
      return { word, rowNum: idx + 1, colNum }; // rowNum is 1..13
    }
  }

  // fallback (shouldn’t happen)
  return { word: "", rowNum: 1, colNum };
}

/* Active word spawn + dissolve */
function spawnActiveWord(colNum, rowNum, word) {
  if (!word) return;

  const posKey = `${colNum}-${rowNum}`;
  const base = bankPositions.get(posKey);

  // If base not found (shouldn’t happen), place it roughly
  const rect = stage.getBoundingClientRect();
  const laneW = rect.width / 8;
  const fallbackLeft = (colNum - 0.5) * laneW;
  const fallbackTop = 30 + (rowNum - 1) * 44;

  const left = (base ? base.left : fallbackLeft) + randInt(-10, 10);
  const top  = (base ? base.top  : fallbackTop) + randInt(-8, 8);

  const box = document.createElement("div");
  box.className = "wordBox active";
  box.textContent = word;
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;

  activeLayer.appendChild(box);

  // dissolve after 3 seconds
  setTimeout(() => {
    box.classList.add("fadeOut");
    setTimeout(() => box.remove(), 520);
  }, 3000);
}

/* Audio */
function playAudio(colNum, rowNum) {
  const src = `./audio/col${colNum}_row${rowNum}.mp3`;
  const audio = new Audio(src);
  audio.currentTime = 0;
  audio.play().catch(() => {
    // fail silently if missing or blocked by browser
  });
}

/* Helpers */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
