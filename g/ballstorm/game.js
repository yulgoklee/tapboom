/**
 * BALL STORM — game.js
 * TapBoom #001
 *
 * Architecture: imports /shared/ modules, implements game-specific logic.
 * PixiJS CDN (WebGL), self-contained physics, WebAudio synth SFX.
 */

import Storage from '../../shared/storage.js';
import Sound   from '../../shared/sound.js';
import FX      from '../../shared/fx.js';
import Input   from '../../shared/input.js';
import Physics from '../../shared/physics.js';
import Ads     from '../../shared/ads.js';
import GameShell from '../../shared/gameshell.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const GAME_ID = 'ballstorm';

// Field logical dimensions (always 9:16; scaled to viewport)
const FIELD_W = 540;
const FIELD_H = 960;

const PLAY_ZONE_H = FIELD_H * 0.63; // top 63% = bricks + ball zone
const PADDLE_Y    = FIELD_H - 60;
const PADDLE_H    = 18;

const BALL_BASE_R   = 8;
const BALL_BASE_SPD = 320; // px/s at 1 ball
const BALL_CAP      = 100; // dynamic, may be lowered
const TRAIL_MAX_BALLS = 5;

// Grid cells
const COLS = 27;
const ROWS = 22;
const CELL_W = FIELD_W / COLS;
const CELL_H = (PLAY_ZONE_H * 0.82) / ROWS;

// Skyline heights (fraction of ROWS, per column, giving a varied cityscape)
const SKYLINE = (() => {
  const heights = [];
  for (let c = 0; c < COLS; c++) {
    const t = c / (COLS - 1);
    // Compose multiple sine waves for organic skyline
    const h = 0.35
      + 0.25 * Math.sin(t * Math.PI * 3.1)
      + 0.15 * Math.sin(t * Math.PI * 7.3 + 1.2)
      + 0.08 * Math.sin(t * Math.PI * 13.7 + 0.5);
    heights.push(Math.max(0.15, Math.min(0.95, h)));
  }
  return heights;
})();

// Neon rainbow palette (bright, on dark bg)
const RAINBOW = [
  0xff2d55, // red
  0xff6b00, // orange
  0xffcc00, // yellow
  0x00e676, // green
  0x00b0ff, // cyan-blue
  0x7c4dff, // violet
  0xff40ff, // magenta
];

// Item definitions
const ITEMS = {
  ADD3:   { label: '+3',     tier: 'pos',    color: 0x00e676 },
  ADD5:   { label: '+5',     tier: 'pos',    color: 0x00e676 },
  MUL2:   { label: '×2',    tier: 'pos',    color: 0x00e676 },
  MUL3:   { label: '×3',    tier: 'power',  color: 0xffd700 },
  BIG:    { label: 'BIG',   tier: 'pos',    color: 0x00b0ff },
  SPEED:  { label: 'FAST',  tier: 'pos',    color: 0x00b0ff },
  PIERCE: { label: 'THRU',  tier: 'power',  color: 0xffd700 },
  WIDE:   { label: 'WIDE',  tier: 'pos',    color: 0x00b0ff },
  SUB:    { label: '−',     tier: 'neg',    color: 0xff4040 },
  SLOW:   { label: 'SLOW',  tier: 'neg',    color: 0xff6b00 },
  NARROW: { label: 'NARROW',tier: 'neg',    color: 0xff6b00 },
  SMALL:  { label: 'SMALL', tier: 'neg',    color: 0xff6b00 },
};

const DROP_POOL_EARLY = [
  'ADD3','ADD3','ADD3','ADD5','ADD5','MUL2','MUL2','BIG','SPEED','WIDE','MUL3','PIERCE',
];
const DROP_POOL_MID = [
  'ADD3','ADD3','ADD5','MUL2','BIG','SPEED','WIDE','MUL3','PIERCE',
  'SUB','SLOW','NARROW','SMALL',
];
const DROP_POOL_LATE = [
  'ADD3','ADD5','MUL2','BIG','MUL3','PIERCE',
  'SUB','SUB','SLOW','NARROW','NARROW','SMALL',
];

// ─── State ────────────────────────────────────────────────────────────────────

let app, stage, brickContainer, ballContainer, itemContainer, uiContainer;
let balls = [], fallingItems = [], trails = [];
let cells = []; // { col, row, alive, gfx }
let totalCells = 0, destroyedCells = 0;

let paddle = { x: FIELD_W / 2, w: 110, gfx: null };
let score = 0, combo = 0, comboTimer = 0;
let comboText = null, scoreText = null, livesText = null;
let gameState = 'idle'; // idle | playing | gameover | clear
let elapsed = 0; // total play time seconds
let cellsDestroyedSinceLastDrop = 0;
const CELLS_PER_DROP = 6; // 1 item per N cells destroyed

// Temp effects
let ballR = BALL_BASE_R;
let ballSpdMul = 1;
let pierceTTL = 0;
let bigTTL = 0;
let speedTTL = 0;
let slowTTL = 0;
let wideTTL = 0;
let narrowTTL = 0;
let smallTTL = 0;

let ballCap = BALL_CAP;
let quality = 1;

// ─── Init ─────────────────────────────────────────────────────────────────────

function detectQuality() {
  // Rough heuristic: low-memory devices or low pixel-ratio
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 1 || cores <= 2) {
    quality = 0.4;
    ballCap = 50;
  } else if (mem <= 2 || cores <= 4) {
    quality = 0.7;
    ballCap = 70;
  } else {
    quality = 1;
    ballCap = 100;
  }
}

function createPixiApp() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / FIELD_W, vh / FIELD_H);
  const cw = Math.floor(FIELD_W * scale);
  const ch = Math.floor(FIELD_H * scale);

  app = new PIXI.Application({
    width: cw, height: ch,
    backgroundColor: 0x08041c,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    antialias: false,
  });

  app.view.style.width  = cw + 'px';
  app.view.style.height = ch + 'px';
  app.view.style.display = 'block';
  app.view.style.margin = 'auto';
  document.body.appendChild(app.view);

  stage = app.stage;
  stage.scale.set(scale);

  brickContainer = new PIXI.Container();
  ballContainer  = new PIXI.Container();
  itemContainer  = new PIXI.Container();
  uiContainer    = new PIXI.Container();

  stage.addChild(brickContainer);
  stage.addChild(ballContainer);
  stage.addChild(itemContainer);
  stage.addChild(uiContainer);

  FX.init(app, FIELD_W, FIELD_H, quality);
}

// ─── Bricks ───────────────────────────────────────────────────────────────────

function buildBricks() {
  brickContainer.removeChildren();
  cells = [];
  totalCells = 0;
  destroyedCells = 0;

  for (let c = 0; c < COLS; c++) {
    const colH = Math.round(SKYLINE[c] * ROWS);
    const startRow = ROWS - colH;
    for (let r = startRow; r < ROWS; r++) {
      const x = c * CELL_W;
      const y = r * CELL_H + 20; // 20px top margin
      const color = RAINBOW[(c + r) % RAINBOW.length];

      const g = new PIXI.Graphics();
      drawCell(g, color);
      g.x = x;
      g.y = y;
      brickContainer.addChild(g);

      cells.push({ col: c, row: r, alive: true, gfx: g, color, x, y });
      totalCells++;
    }
  }
}

function drawCell(g, color) {
  g.clear();
  const margin = 1.5;
  const w = CELL_W - margin * 2;
  const h = CELL_H - margin * 2;
  g.beginFill(color);
  g.drawRoundedRect(margin, margin, w, h, 2);
  g.endFill();
  // Subtle highlight
  g.beginFill(0xffffff, 0.18);
  g.drawRect(margin, margin, w, 3);
  g.endFill();
}

function destroyCell(cell) {
  if (!cell.alive) return;
  cell.alive = false;
  brickContainer.removeChild(cell.gfx);
  cell.gfx.destroy();
  destroyedCells++;
  score++;

  FX.flash(cell.x + CELL_W / 2, cell.y + CELL_H / 2, cell.color);
  if (Math.random() < 0.12 * quality) {
    FX.burst(cell.x + CELL_W / 2, cell.y + CELL_H / 2, cell.color, 5);
  }

  // Item drop
  cellsDestroyedSinceLastDrop++;
  if (cellsDestroyedSinceLastDrop >= CELLS_PER_DROP) {
    cellsDestroyedSinceLastDrop = 0;
    if (Math.random() < 0.65) spawnItem(cell.x + CELL_W / 2, cell.y + CELL_H / 2);
  }
}

// ─── Balls ────────────────────────────────────────────────────────────────────

function spawnBall(x, y, vx, vy) {
  if (balls.length >= ballCap) return;
  const speed = BALL_BASE_SPD * speedMultiplier();
  const len = Math.sqrt(vx * vx + vy * vy);
  const nx = (vx / len) * speed;
  const ny = (vy / len) * speed;

  const g = new PIXI.Graphics();
  ballContainer.addChild(g);
  redrawBall(g);

  const ball = { x, y, vx: nx, vy: ny, r: ballR, gfx: g, trail: [] };
  balls.push(ball);
}

function redrawBall(g) {
  g.clear();
  const r = ballR;
  g.beginFill(0xffffff);
  g.drawCircle(0, 0, r);
  g.endFill();
  // Neon glow ring
  g.lineStyle(2, 0xb388ff, 0.7);
  g.drawCircle(0, 0, r + 1);
}

function speedMultiplier() {
  const n = balls.length;
  // Curve: almost flat 1-9, ramp 10-29, steep 30+
  const base = 1 + Math.pow(n / 30, 1.6) * 0.9;
  let mul = base;
  if (speedTTL > 0) mul *= 1.45;
  if (slowTTL > 0) mul *= 0.6;
  return Math.min(mul, 2.8);
}

function addBalls(count) {
  const existing = [...balls];
  let added = 0;
  for (const ref of existing) {
    if (balls.length >= ballCap) break;
    for (let i = 0; i < count && balls.length < ballCap; i++) {
      const angle = Math.random() * Math.PI * 2;
      spawnBall(ref.x, ref.y, Math.cos(angle), Math.sin(angle));
      added++;
    }
  }
  if (added > 0) {
    FX.shake(4 * Math.min(added, 10));
    FX.popup(FIELD_W / 2, FIELD_H / 2 - 40, `+${added} balls!`, 0x00e676);
    Sound.play('item');
  }
}

function multiplyBalls(factor) {
  const count = Math.min(Math.floor(balls.length * factor) - balls.length, ballCap - balls.length);
  if (count <= 0) return;
  addBalls(count / balls.length | 0 || 1);
}

// ─── Items ────────────────────────────────────────────────────────────────────

function dropPool() {
  if (elapsed < 15) return DROP_POOL_EARLY;
  if (elapsed < 45) return DROP_POOL_MID;
  return DROP_POOL_LATE;
}

function spawnItem(x, y) {
  const pool = dropPool();
  const key = pool[Math.floor(Math.random() * pool.length)];
  const def = ITEMS[key];

  const g = new PIXI.Container();
  // Background pill
  const bg = new PIXI.Graphics();
  const isPower = def.tier === 'power';
  bg.beginFill(def.color, isPower ? 0.9 : 0.75);
  bg.drawRoundedRect(-22, -12, 44, 24, 8);
  bg.endFill();
  if (isPower) {
    // Sparkle border
    bg.lineStyle(2, 0xffffff, 0.9);
    bg.drawRoundedRect(-22, -12, 44, 24, 8);
  }
  g.addChild(bg);

  const style = new PIXI.TextStyle({
    fontFamily: 'Arial Black, Arial Bold, Arial',
    fontSize: def.label.length > 3 ? 9 : 12,
    fontWeight: '900',
    fill: def.tier === 'neg' ? 0xffffff : 0x000000,
  });
  const label = new PIXI.Text(def.label, style);
  label.anchor.set(0.5);
  g.addChild(label);

  g.x = x;
  g.y = y;
  itemContainer.addChild(g);

  // Sparkle animation for power items
  let sparkleT = 0;
  fallingItems.push({ key, def, g, x, y, vy: 130, sparkleT, isPower });
}

function applyItem(key) {
  Sound.play(ITEMS[key].tier === 'neg' ? 'itemBad' : 'item');
  switch (key) {
    case 'ADD3': addBalls(3); break;
    case 'ADD5': addBalls(5); break;
    case 'MUL2': multiplyBalls(2); break;
    case 'MUL3': multiplyBalls(3); break;
    case 'BIG':  bigTTL = 7; break;
    case 'SPEED': speedTTL = 6; break;
    case 'PIERCE': pierceTTL = 6; break;
    case 'WIDE': wideTTL = 6; break;
    case 'SUB': {
      const remove = Math.max(1, Math.floor(balls.length * 0.2));
      for (let i = 0; i < remove && balls.length > 1; i++) {
        const b = balls.pop();
        ballContainer.removeChild(b.gfx);
        b.gfx.destroy();
      }
      FX.popup(FIELD_W / 2, PADDLE_Y - 40, `-${remove}`, 0xff4040);
      break;
    }
    case 'SLOW': slowTTL = 6; break;
    case 'NARROW': narrowTTL = 6; break;
    case 'SMALL': smallTTL = 6; break;
  }
  refreshBallR();
  updatePaddleW();
}

function refreshBallR() {
  ballR = BALL_BASE_R;
  if (bigTTL > 0) ballR = BALL_BASE_R * 2.0;
  if (smallTTL > 0) ballR = BALL_BASE_R * 0.6;
  balls.forEach(b => { b.r = ballR; redrawBall(b.gfx); });
}

function updatePaddleW() {
  paddle.w = 110;
  if (wideTTL > 0) paddle.w = 170;
  if (narrowTTL > 0) paddle.w = 65;
  drawPaddle();
}

// ─── Paddle ───────────────────────────────────────────────────────────────────

function drawPaddle() {
  paddle.gfx.clear();
  const hw = paddle.w / 2;
  // Glowing paddle
  paddle.gfx.beginFill(0x7c3aed);
  paddle.gfx.drawRoundedRect(-hw, -PADDLE_H / 2, paddle.w, PADDLE_H, PADDLE_H / 2);
  paddle.gfx.endFill();
  paddle.gfx.beginFill(0xffffff, 0.3);
  paddle.gfx.drawRoundedRect(-hw + 4, -PADDLE_H / 2 + 2, paddle.w - 8, 4, 2);
  paddle.gfx.endFill();
}

function buildPaddle() {
  paddle.gfx = new PIXI.Graphics();
  paddle.gfx.y = PADDLE_Y;
  uiContainer.addChild(paddle.gfx);
  drawPaddle();
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function buildUI() {
  const scoreStyle = new PIXI.TextStyle({
    fontFamily: 'Arial Black, Arial Bold, Arial',
    fontSize: 28, fontWeight: '900', fill: 0xffffff,
  });
  scoreText = new PIXI.Text('0', scoreStyle);
  scoreText.anchor.set(0.5, 0);
  scoreText.x = FIELD_W / 2;
  scoreText.y = PLAY_ZONE_H + 8;
  uiContainer.addChild(scoreText);

  const comboStyle = new PIXI.TextStyle({
    fontFamily: 'Arial Black, Arial Bold, Arial',
    fontSize: 52, fontWeight: '900', fill: 0xffd700,
    stroke: 0x000000, strokeThickness: 4,
    dropShadow: true, dropShadowColor: 0xffd700, dropShadowBlur: 12, dropShadowDistance: 0,
  });
  comboText = new PIXI.Text('', comboStyle);
  comboText.anchor.set(0.5);
  comboText.x = FIELD_W / 2;
  comboText.y = PLAY_ZONE_H - 60;
  comboText.alpha = 0;
  uiContainer.addChild(comboText);

  livesText = new PIXI.Text('', new PIXI.TextStyle({ fontSize: 16, fill: 0xaaaaaa }));
  livesText.x = 10;
  livesText.y = PLAY_ZONE_H + 10;
  uiContainer.addChild(livesText);
}

function updateUI() {
  scoreText.text = score.toLocaleString();
  livesText.text = `🔴 ${balls.length}`;
}

// ─── Collision: ball ↔ cells ──────────────────────────────────────────────────

function ballCellCollision(ball) {
  let broken = 0;
  const pierce = pierceTTL > 0;
  let reflected = false;

  for (const cell of cells) {
    if (!cell.alive) continue;
    if (
      ball.x + ball.r > cell.x &&
      ball.x - ball.r < cell.x + CELL_W &&
      ball.y + ball.r > cell.y &&
      ball.y - ball.r < cell.y + CELL_H
    ) {
      destroyCell(cell);
      broken++;

      if (!pierce && !reflected) {
        const overlapL = (ball.x + ball.r) - cell.x;
        const overlapR = (cell.x + CELL_W) - (ball.x - ball.r);
        const overlapT = (ball.y + ball.r) - cell.y;
        const overlapB = (cell.y + CELL_H) - (ball.y - ball.r);
        const minO = Math.min(overlapL, overlapR, overlapT, overlapB);
        if (minO === overlapT || minO === overlapB) ball.vy = -ball.vy;
        else ball.vx = -ball.vx;
        reflected = true;
        // allow up to 2 more destructions after reflect (combos feel good)
      }
      if (!pierce && broken >= 3) break;
    }
  }

  if (broken > 0) {
    addCombo(broken);
    Sound.play(broken >= 3 ? 'breakMany' : 'break');
  }
}

// ─── Combo ────────────────────────────────────────────────────────────────────

function addCombo(n) {
  combo += n;
  comboTimer = 0.55;

  const mul = comboMultiplier();
  score += Math.floor(n * (mul - 1)); // bonus on top of base 1pt

  comboText.text = mul >= 2 ? `COMBO ×${mul}` : '';
  comboText.alpha = mul >= 2 ? 1 : 0;
  comboText.scale.set(1 + Math.min((mul - 2) * 0.04, 0.4));

  if (mul >= 5) FX.shake(Math.min(mul, 12));
  if (mul >= 2) Sound.play('combo', mul);
}

function comboMultiplier() {
  if (combo < 5) return 1;
  if (combo < 15) return 2;
  if (combo < 30) return 5;
  if (combo < 60) return 10;
  return 20;
}

// ─── Game loop ────────────────────────────────────────────────────────────────

function startGame() {
  score = 0; combo = 0; comboTimer = 0; elapsed = 0;
  cellsDestroyedSinceLastDrop = 0;
  pierceTTL = bigTTL = speedTTL = slowTTL = wideTTL = narrowTTL = smallTTL = 0;
  ballR = BALL_BASE_R;

  // Clear balls
  balls.forEach(b => { ballContainer.removeChild(b.gfx); b.gfx.destroy(); });
  balls = [];
  fallingItems.forEach(it => { itemContainer.removeChild(it.g); it.g.destroy(); });
  fallingItems = [];

  buildBricks();
  paddle.x = FIELD_W / 2;
  paddle.w = 110;
  drawPaddle();

  // Launch first ball upward — slight angle so it hits bricks and comes back
  spawnBall(FIELD_W / 2, PADDLE_Y - 40, 0.25, -1);

  gameState = 'playing';
}

function gameLoop(dt) {
  if (gameState !== 'playing') return;

  elapsed += dt;

  // Update timed effects — only refresh visuals when a TTL crosses zero
  const prev = { pierceTTL, bigTTL, speedTTL, slowTTL, wideTTL, narrowTTL, smallTTL };
  pierceTTL  = Math.max(0, pierceTTL  - dt);
  bigTTL     = Math.max(0, bigTTL     - dt);
  speedTTL   = Math.max(0, speedTTL   - dt);
  slowTTL    = Math.max(0, slowTTL    - dt);
  wideTTL    = Math.max(0, wideTTL    - dt);
  narrowTTL  = Math.max(0, narrowTTL  - dt);
  smallTTL   = Math.max(0, smallTTL   - dt);

  const anyExpired = (
    (prev.bigTTL > 0 && bigTTL === 0) ||
    (prev.smallTTL > 0 && smallTTL === 0) ||
    (prev.wideTTL > 0 && wideTTL === 0) ||
    (prev.narrowTTL > 0 && narrowTTL === 0)
  );
  if (anyExpired) { refreshBallR(); updatePaddleW(); }

  // Combo decay
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 0;
      comboText.alpha -= dt * 3;
      if (comboText.alpha < 0) comboText.alpha = 0;
    }
  }

  // Input
  Input.update(dt);
  paddle.x = Input.getX();
  paddle.gfx.x = paddle.x;

  // Move & collide balls
  const speed = speedMultiplier();
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];

    // Normalize speed each frame (handles multiplier changes)
    const curSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const targetSpeed = BALL_BASE_SPD * speed;
    if (Math.abs(curSpeed - targetSpeed) > 10) {
      ball.vx = (ball.vx / curSpeed) * targetSpeed;
      ball.vy = (ball.vy / curSpeed) * targetSpeed;
    }

    Physics.step(ball, dt);

    // Trail
    if (balls.length <= TRAIL_MAX_BALLS) {
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 6) ball.trail.shift();
    } else {
      ball.trail = [];
    }

    const hitWall = Physics.reflectWalls(ball, FIELD_W);
    if (hitWall) Sound.play('wall');

    // Paddle collision
    const hitPad = Physics.reflectPaddle(ball, paddle.x, PADDLE_Y, paddle.w, PADDLE_H);
    if (hitPad) Sound.play('paddle');

    // Cell collisions
    ballCellCollision(ball);

    // Ball lost
    if (ball.y - ball.r > FIELD_H) {
      ballContainer.removeChild(ball.gfx);
      ball.gfx.destroy();
      balls.splice(i, 1);
    }

    if (ball.gfx.parent) {
      ball.gfx.x = ball.x;
      ball.gfx.y = ball.y;
    }
  }

  // Falling items
  for (let i = fallingItems.length - 1; i >= 0; i--) {
    const it = fallingItems[i];
    it.y += it.vy * dt;
    it.g.y = it.y;

    // Power items sparkle
    if (it.isPower && quality >= 0.7) {
      it.sparkleT = (it.sparkleT || 0) + dt;
      it.g.alpha = 0.8 + 0.2 * Math.sin(it.sparkleT * 12);
    }

    // Paddle pickup
    const hw = paddle.w / 2;
    if (
      it.y + 12 > PADDLE_Y - PADDLE_H / 2 &&
      it.y - 12 < PADDLE_Y + PADDLE_H / 2 &&
      it.x > paddle.x - hw - 22 &&
      it.x < paddle.x + hw + 22
    ) {
      applyItem(it.key);
      FX.popup(it.x, PADDLE_Y - 30, it.def.label, it.def.color);
      itemContainer.removeChild(it.g);
      it.g.destroy();
      fallingItems.splice(i, 1);
      continue;
    }

    // Off screen
    if (it.y > FIELD_H + 30) {
      itemContainer.removeChild(it.g);
      it.g.destroy();
      fallingItems.splice(i, 1);
    }
  }

  FX.update(dt);
  updateUI();

  // Check game over
  if (balls.length === 0) {
    triggerGameOver();
    return;
  }

  // Check clear
  if (destroyedCells >= totalCells) {
    triggerClear();
    return;
  }
}

function triggerGameOver() {
  gameState = 'gameover';
  Sound.play('gameover');
  FX.shake(14);
  const best = Storage.getBest(GAME_ID);
  const isNew = Storage.setBest(GAME_ID, score);
  const newBest = isNew ? score : best;
  Ads.interstitial('gameover');
  setTimeout(() => {
    GameShell.showGameOver(score, newBest, isNew);
  }, 600);
}

function triggerClear() {
  gameState = 'clear';
  Sound.play('clear');
  FX.shake(18);
  // Burst party
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      FX.burst(Math.random() * FIELD_W, Math.random() * FIELD_H, RAINBOW[i % RAINBOW.length], 16);
    }, i * 80);
  }
  const best = Storage.getBest(GAME_ID);
  const isNew = Storage.setBest(GAME_ID, score);
  const newBest = isNew ? score : best;
  setTimeout(() => {
    GameShell.showClear(score, newBest, isNew);
  }, 1200);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function boot() {
  detectQuality();
  createPixiApp();
  buildPaddle();
  buildUI();
  FX.setQuality(quality);

  Input.init(app.view, FIELD_W, () => paddle.w);

  Ads.init();
  Ads.onResume(() => { /* resume handled by gameshell */ });

  GameShell.init({
    onStart: () => {
      Ads.interstitial('start');
      startGame();
    },
    onRestart: () => {
      Ads.interstitial('gameover');
      startGame();
    },
    onSoundToggle: () => Sound.toggle(),
  });

  app.ticker.add(() => {
    const dt = Math.min(app.ticker.elapsedMS / 1000, 0.05);
    gameLoop(dt);
  });

  window.addEventListener('resize', () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const scale = Math.min(vw / FIELD_W, vh / FIELD_H);
    const cw = Math.floor(FIELD_W * scale), ch = Math.floor(FIELD_H * scale);
    app.renderer.resize(cw / (window.devicePixelRatio || 1), ch / (window.devicePixelRatio || 1));
    app.view.style.width = cw + 'px';
    app.view.style.height = ch + 'px';
    stage.scale.set(scale);
    Input.init(app.view, FIELD_W, () => paddle.w);
  });
}

boot();
