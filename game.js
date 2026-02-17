const TILE_SIZE = 24;
const WORLD_WIDTH = 220;
const WORLD_HEIGHT = 72;
const VIEW_TILES_X = 38;
const VIEW_TILES_Y = 24;
const SCREEN_W = VIEW_TILES_X * TILE_SIZE;
const SCREEN_H = VIEW_TILES_Y * TILE_SIZE;
const GROUND_BASE = 28;

const AIR = 0;
const GRASS = 1;
const DIRT = 2;
const STONE = 3;

const COLORS = {
  [AIR]: "#7ec8ff",
  [GRASS]: "#4fa64f",
  [DIRT]: "#8b5a2b",
  [STONE]: "#747474"
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;
canvas.oncontextmenu = (e) => e.preventDefault();

const keys = new Set();
const world = Array.from({ length: WORLD_HEIGHT }, () => Array(WORLD_WIDTH).fill(AIR));
const player = {
  x: 8 * TILE_SIZE,
  y: (GROUND_BASE - 4) * TILE_SIZE,
  vx: 0,
  vy: 0,
  width: TILE_SIZE - 8,
  height: TILE_SIZE * 2 - 4,
  onGround: false
};
const inventory = { [DIRT]: 24, [STONE]: 0, [GRASS]: 0 };
let timeOfDay = 0;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateWorld() {
  let surface = GROUND_BASE;
  for (let x = 0; x < WORLD_WIDTH; x += 1) {
    surface += [-1, 0, 0, 1][randInt(0, 3)];
    surface = Math.max(20, Math.min(40, surface));
    for (let y = surface; y < WORLD_HEIGHT; y += 1) {
      if (y === surface) world[y][x] = GRASS;
      else if (y < surface + 4) world[y][x] = DIRT;
      else world[y][x] = STONE;
    }
  }

  for (let i = 0; i < 900; i += 1) {
    const cx = randInt(5, WORLD_WIDTH - 6);
    const cy = randInt(26, WORLD_HEIGHT - 4);
    const radius = randInt(1, 3);
    for (let y = Math.max(0, cy - radius); y < Math.min(WORLD_HEIGHT, cy + radius + 1); y += 1) {
      for (let x = Math.max(0, cx - radius); x < Math.min(WORLD_WIDTH, cx + radius + 1); x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) world[y][x] = AIR;
      }
    }
  }
}

function tileIsSolid(tx, ty) {
  if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) return true;
  return world[ty][tx] !== AIR;
}

function collides(x, y) {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + player.width - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + player.height - 1) / TILE_SIZE);

  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (tileIsSolid(tx, ty)) return true;
    }
  }
  return false;
}

function resolveVerticalCollision() {
  if (player.vy > 0) {
    player.onGround = true;
    while (!collides(player.x, player.y + 1)) player.y += 1;
  } else if (player.vy < 0) {
    while (!collides(player.x, player.y - 1)) player.y -= 1;
  }
  player.vy = 0;
}

function updatePlayer() {
  player.vx = 0;
  if (keys.has("a")) player.vx -= 4;
  if (keys.has("d")) player.vx += 4;

  if ((keys.has(" ") || keys.has("w")) && player.onGround) {
    player.vy = -10;
    player.onGround = false;
  }

  player.vy += 0.55;
  if (player.vy > 13) player.vy = 13;

  const newX = player.x + player.vx;
  if (!collides(newX, player.y)) {
    player.x = newX;
  } else if (player.vx > 0) {
    while (!collides(player.x + 1, player.y)) player.x += 1;
  } else if (player.vx < 0) {
    while (!collides(player.x - 1, player.y)) player.x -= 1;
  }

  const newY = player.y + player.vy;
  if (!collides(player.x, newY)) {
    player.y = newY;
    player.onGround = false;
  } else {
    resolveVerticalCollision();
  }
}

function camera() {
  let x = Math.floor(player.x + player.width / 2 - SCREEN_W / 2);
  let y = Math.floor(player.y + player.height / 2 - SCREEN_H / 2);
  x = Math.max(0, Math.min(x, WORLD_WIDTH * TILE_SIZE - SCREEN_W));
  y = Math.max(0, Math.min(y, WORLD_HEIGHT * TILE_SIZE - SCREEN_H));
  return { x, y };
}

function screenToTile(sx, sy) {
  const cam = camera();
  return {
    tx: Math.floor((sx + cam.x) / TILE_SIZE),
    ty: Math.floor((sy + cam.y) / TILE_SIZE)
  };
}

function mineBlock(mouseX, mouseY) {
  const { tx, ty } = screenToTile(mouseX, mouseY);
  if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) return;
  const block = world[ty][tx];
  if (block === AIR) return;
  world[ty][tx] = AIR;
  inventory[block] = (inventory[block] || 0) + 1;
}

function placeBlock(mouseX, mouseY) {
  const { tx, ty } = screenToTile(mouseX, mouseY);
  if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) return;
  if (world[ty][tx] !== AIR) return;
  if ((inventory[DIRT] || 0) <= 0) return;

  const px = Math.floor(player.x / TILE_SIZE);
  const py = Math.floor(player.y / TILE_SIZE);
  if (Math.abs(tx - px) <= 1 && Math.abs(ty - py) <= 2) return;

  world[ty][tx] = DIRT;
  inventory[DIRT] -= 1;
}

function render() {
  const cam = camera();
  const startTx = Math.floor(cam.x / TILE_SIZE);
  const startTy = Math.floor(cam.y / TILE_SIZE);
  const endTx = Math.min(WORLD_WIDTH, startTx + VIEW_TILES_X + 2);
  const endTy = Math.min(WORLD_HEIGHT, startTy + VIEW_TILES_Y + 2);

  ctx.fillStyle = COLORS[AIR];
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  for (let ty = startTy; ty < endTy; ty += 1) {
    for (let tx = startTx; tx < endTx; tx += 1) {
      const block = world[ty][tx];
      if (block === AIR) continue;
      const sx = tx * TILE_SIZE - cam.x;
      const sy = ty * TILE_SIZE - cam.y;
      ctx.fillStyle = COLORS[block];
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = "#000000";
      ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
    }
  }

  const px = player.x - cam.x;
  const py = player.y - cam.y;
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(px, py, player.width, player.height);

  const darkness = Math.floor((1 - (0.5 + 0.5 * Math.sin(timeOfDay / 140))) * 115);
  if (darkness > 0) {
    ctx.fillStyle = `rgba(${darkness}, ${darkness}, ${darkness}, 0.45)`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  ctx.fillStyle = "#111827";
  ctx.fillRect(8, 8, SCREEN_W - 16, 30);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 13px Arial";
  ctx.fillText(
    `Dirt: ${inventory[DIRT] || 0}  Stone: ${inventory[STONE] || 0}  A/D move  W/Space jump  LMB mine RMB place`,
    16,
    28
  );
}

function tick() {
  timeOfDay += 1;
  updatePlayer();
  render();
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (e.button === 0) mineBlock(mx, my);
  if (e.button === 2) placeBlock(mx, my);
});

generateWorld();
tick();
