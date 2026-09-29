let currentSnakeKeyHandler = null;
let currentSnakeTimer = null;

function renderGames(root) {
  if (currentSnakeTimer) {
    clearInterval(currentSnakeTimer);
    currentSnakeTimer = null;
  }
  if (currentSnakeKeyHandler) {
    window.removeEventListener("keydown", currentSnakeKeyHandler);
    currentSnakeKeyHandler = null;
  }

  root.innerHTML = `
    <section class="panel" style="margin-bottom:1.4rem">
      <h2 style="font-family:Fraunces,serif;margin-top:0">Mientras esperas:</h2>
      <p class="lede">Disfruta de nuestros juegos mientras revisas el catálogo o preparan tu pedido.</p>
      <div class="game-tabs">
        <button class="btn" data-game="sudoku">Sudoku</button>
        <button class="btn-ghost" data-game="snake">Culebrita</button>
        <button class="btn-ghost" data-game="triki">Triki</button>
      </div>
      <div id="game-mount"></div>
    </section>
  `;
  const mount = root.querySelector("#game-mount");
  const tabs = root.querySelectorAll("[data-game]");
  const show = (name) => {
    tabs.forEach((b) => (b.className = b.dataset.game === name ? "btn" : "btn-ghost"));
    if (name === "sudoku") mountSudoku(mount);
    if (name === "snake") mountSnake(mount);
    if (name === "triki") mountTriki(mount);
  };
  tabs.forEach((b) => b.addEventListener("click", () => show(b.dataset.game)));
  show("sudoku");
}

function mountTriki(el) {
  if (currentSnakeTimer) {
    clearInterval(currentSnakeTimer);
    currentSnakeTimer = null;
  }
  if (currentSnakeKeyHandler) {
    window.removeEventListener("keydown", currentSnakeKeyHandler);
    currentSnakeKeyHandler = null;
  }

  el.innerHTML = `
    <div class="game-card">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:0.7rem;">
        <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.88rem;">
          Modo:
          <select id="triki-mode" style="padding:0.25rem 0.5rem;border-radius:8px;">
            <option value="cpu" selected>Contra la máquina (1 Jugador)</option>
            <option value="2p">2 Jugadores</option>
          </select>
        </label>
        <button class="btn-ghost" id="triki-reset" style="padding:0.35rem 0.8rem;font-size:0.85rem;">Reiniciar</button>
      </div>
      <p id="triki-status" style="font-weight:600;margin:0.4rem 0;">Tu turno (X)</p>
      <div id="triki-board"></div>
    </div>
  `;

  const board = el.querySelector("#triki-board");
  const status = el.querySelector("#triki-status");
  const modeSelect = el.querySelector("#triki-mode");
  let cells = Array(9).fill("");
  let turn = "X";
  let over = false;
  const wins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  function winner() {
    for (const [a, b, c] of wins) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
    }
    return cells.every(Boolean) ? "empate" : null;
  }

  function cpuMove() {
    if (over) return;
    // Simple smart CPU: check if CPU can win
    for (const [a, b, c] of wins) {
      const line = [a, b, c];
      const oCount = line.filter((i) => cells[i] === "O").length;
      const empty = line.find((i) => !cells[i]);
      if (oCount === 2 && empty !== undefined) {
        makeMove(empty, "O");
        return;
      }
    }
    // Block player win
    for (const [a, b, c] of wins) {
      const line = [a, b, c];
      const xCount = line.filter((i) => cells[i] === "X").length;
      const empty = line.find((i) => !cells[i]);
      if (xCount === 2 && empty !== undefined) {
        makeMove(empty, "O");
        return;
      }
    }
    // Take center
    if (!cells[4]) {
      makeMove(4, "O");
      return;
    }
    // Random available
    const available = cells.map((v, i) => (v === "" ? i : null)).filter((v) => v !== null);
    if (available.length > 0) {
      const choice = available[Math.floor(Math.random() * available.length)];
      makeMove(choice, "O");
    }
  }

  function makeMove(i, symbol) {
    cells[i] = symbol;
    const w = winner();
    if (w === "empate") {
      over = true;
      status.textContent = "¡Empate!";
    } else if (w) {
      over = true;
      status.textContent = modeSelect.value === "cpu" ? (w === "X" ? "¡Ganaste! 🎉" : "Ganó la máquina 🤖") : `¡Ganó ${w}! 🎉`;
    } else {
      turn = symbol === "X" ? "O" : "X";
      if (modeSelect.value === "cpu") {
        status.textContent = turn === "X" ? "Tu turno (X)" : "Pensando...";
      } else {
        status.textContent = `Turno de ${turn}`;
      }
    }
    draw();
  }

  function draw() {
    board.innerHTML = "";
    cells.forEach((v, i) => {
      const btn = document.createElement("button");
      btn.textContent = v;
      btn.style.color = v === "X" ? "#c45c26" : (v === "O" ? "#1f3a2e" : "inherit");
      btn.onclick = () => {
        if (over || cells[i]) return;
        makeMove(i, turn);
        if (!over && modeSelect.value === "cpu" && turn === "O") {
          setTimeout(cpuMove, 300);
        }
      };
      board.appendChild(btn);
    });
  }

  function resetGame() {
    cells = Array(9).fill("");
    turn = "X";
    over = false;
    status.textContent = modeSelect.value === "cpu" ? "Tu turno (X)" : "Turno de X";
    draw();
  }

  el.querySelector("#triki-reset").onclick = resetGame;
  modeSelect.onchange = resetGame;
  draw();
}

function mountSnake(el) {
  if (currentSnakeTimer) {
    clearInterval(currentSnakeTimer);
    currentSnakeTimer = null;
  }
  if (currentSnakeKeyHandler) {
    window.removeEventListener("keydown", currentSnakeKeyHandler);
    currentSnakeKeyHandler = null;
  }

  el.innerHTML = `
    <div class="game-card" style="text-align:center;">
      <p style="margin-top:0;font-size:0.92rem;color:var(--muted)">Usa las flechas, WASD o los botones táctiles en celular.</p>
      <div style="display:inline-block;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        <canvas id="snake-canvas" width="300" height="300" style="display:block;background:#1f3a2e;max-width:100%;height:auto;"></canvas>
      </div>
      <div class="row" style="justify-content:center;align-items:center;margin-top:0.8rem;gap:1rem;">
        <button class="btn" id="snake-start">Iniciar / Reiniciar</button>
        <span id="snake-score" style="font-weight:700;">Puntos: 0</span>
      </div>
      <!-- Controles táctiles para celulares y tablets -->
      <div class="snake-dpad" style="margin-top:1rem;display:flex;flex-direction:column;align-items:center;gap:6px;">
        <button class="btn-ghost dpad-btn" data-dir="up" style="width:52px;height:46px;font-size:1.2rem;padding:0;">▲</button>
        <div style="display:flex;gap:12px;">
          <button class="btn-ghost dpad-btn" data-dir="left" style="width:52px;height:46px;font-size:1.2rem;padding:0;">◀</button>
          <button class="btn-ghost dpad-btn" data-dir="down" style="width:52px;height:46px;font-size:1.2rem;padding:0;">▼</button>
          <button class="btn-ghost dpad-btn" data-dir="right" style="width:52px;height:46px;font-size:1.2rem;padding:0;">▶</button>
        </div>
      </div>
    </div>
  `;

  const canvas = el.querySelector("#snake-canvas");
  const ctx = canvas.getContext("2d");
  const size = 15;
  let snake, dir, food, score, running;

  function reset() {
    snake = [{ x: 10, y: 10 }];
    dir = { x: 1, y: 0 };
    food = { x: 15, y: 10 };
    score = 0;
    running = true;
    el.querySelector("#snake-score").textContent = "Puntos: 0";
  }

  function tick() {
    if (!running) return;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= 20 ||
      head.y >= 20 ||
      snake.some((s) => s.x === head.x && s.y === head.y)
    ) {
      running = false;
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 20px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("¡Fin del juego!", 150, 140);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px Outfit, sans-serif";
      ctx.fillText(`Puntos conseguidos: ${score}`, 150, 170);
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      el.querySelector("#snake-score").textContent = `Puntos: ${score}`;
      food = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
    } else {
      snake.pop();
    }

    ctx.fillStyle = "#1f3a2e";
    ctx.fillRect(0, 0, 300, 300);
    // Draw food
    ctx.fillStyle = "#f0c27a";
    ctx.beginPath();
    ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    // Draw snake
    snake.forEach((s, idx) => {
      ctx.fillStyle = idx === 0 ? "#74c69d" : "#e8f6ea";
      ctx.fillRect(s.x * size + 1, s.y * size + 1, size - 2, size - 2);
    });
  }

  function changeDir(nx, ny) {
    if (!running) return;
    if (dir.x + nx === 0 && dir.y + ny === 0) return;
    dir = { x: nx, y: ny };
  }

  currentSnakeKeyHandler = (e) => {
    const map = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
      W: [0, -1],
      S: [0, 1],
      A: [-1, 0],
      D: [1, 0],
    };
    const n = map[e.key];
    if (!n) return;
    changeDir(n[0], n[1]);
    e.preventDefault();
  };
  window.addEventListener("keydown", currentSnakeKeyHandler, { passive: false });

  // D-pad button controls
  el.querySelectorAll(".dpad-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.dir;
      if (d === "up") changeDir(0, -1);
      if (d === "down") changeDir(0, 1);
      if (d === "left") changeDir(-1, 0);
      if (d === "right") changeDir(1, 0);
    });
  });

  // Touch swipe support on canvas
  let touchStartX = 0;
  let touchStartY = 0;
  canvas.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20) changeDir(1, 0);
      else if (dx < -20) changeDir(-1, 0);
    } else {
      if (dy > 20) changeDir(0, 1);
      else if (dy < -20) changeDir(0, -1);
    }
  }, { passive: true });

  el.querySelector("#snake-start").onclick = () => {
    if (currentSnakeTimer) clearInterval(currentSnakeTimer);
    reset();
    currentSnakeTimer = setInterval(tick, 120);
  };

  reset();
  tick();
}

const SUDOKU_PUZZLE = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];
const SUDOKU_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

function mountSudoku(el) {
  if (currentSnakeTimer) {
    clearInterval(currentSnakeTimer);
    currentSnakeTimer = null;
  }
  if (currentSnakeKeyHandler) {
    window.removeEventListener("keydown", currentSnakeKeyHandler);
    currentSnakeKeyHandler = null;
  }

  el.innerHTML = `
    <div class="game-card">
      <p style="margin-top:0;font-size:0.92rem;color:var(--muted)">Completa los números del 1 al 9 sin repetir en fila, columna o bloque de 3x3.</p>
      <div style="overflow-x:auto;padding-bottom:4px;">
        <div id="sudoku-board"></div>
      </div>
      <div class="row" style="margin-top:0.9rem;align-items:center;gap:0.7rem;">
        <button class="btn" id="sudoku-check">Comprobar</button>
        <button class="btn-ghost" id="sudoku-reset">Reiniciar</button>
        <span id="sudoku-msg" style="font-weight:600;"></span>
      </div>
    </div>
  `;

  const board = el.querySelector("#sudoku-board");
  const msg = el.querySelector("#sudoku-msg");

  function buildBoard() {
    board.innerHTML = "";
    msg.textContent = "";
    SUDOKU_PUZZLE.flat().forEach((n, i) => {
      const input = document.createElement("input");
      input.maxLength = 1;
      input.dataset.i = i;
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("pattern", "[1-9]*");
      if (n) {
        input.value = n;
        input.readOnly = true;
        input.style.background = "#efe8da";
        input.style.fontWeight = "700";
      } else {
        input.addEventListener("input", () => {
          input.value = input.value.replace(/[^1-9]/g, "");
          msg.textContent = "";
        });
      }
      board.appendChild(input);
    });
  }

  el.querySelector("#sudoku-check").onclick = () => {
    const inputs = [...board.querySelectorAll("input")];
    let complete = true;
    let ok = true;
    inputs.forEach((input, i) => {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const val = Number(input.value);
      if (!val) complete = false;
      if (val !== SUDOKU_SOLUTION[r][c]) {
        ok = false;
        if (!input.readOnly) input.style.color = "#b03030";
      } else {
        if (!input.readOnly) input.style.color = "#1b5e20";
      }
    });

    if (!complete) {
      msg.textContent = "Faltan casillas por rellenar.";
      msg.style.color = "#c45c26";
    } else if (ok) {
      msg.textContent = "¡Felicidades, sudoku completado correctamente! 🎉";
      msg.style.color = "#1b5e20";
    } else {
      msg.textContent = "Hay casillas incorrectas (marcadas en rojo).";
      msg.style.color = "#b03030";
    }
  };

  el.querySelector("#sudoku-reset").onclick = buildBoard;
  buildBoard();
}
