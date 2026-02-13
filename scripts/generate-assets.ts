import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const TILE_SIZE = 16;
const OUTPUT_DIR = join(__dirname, '..', 'apps', 'web', 'public', 'assets');

mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Tile palette colors ──
const TILE_COLORS = {
  Floor: '#c4a882',
  Wall: '#3d3d5c',
  Desk: '#4a7ab5',
  Corridor: '#b8a070',
  BreakArea: '#8bba7f',
  Plant: '#4a8c3f',
  Door: '#8b6b3d',
  Reserved: '#333333',
};

// ── Avatar presets ──
const AVATAR_PRESETS = [
  { skin: '#f5d0a9', hair: '#4a3728', shirt: '#4a90d9', pants: '#3d3d5c', shoes: '#2a2a2a' },
  { skin: '#e8c49a', hair: '#8b4513', shirt: '#d94a4a', pants: '#2d4a6d', shoes: '#1a1a1a' },
  { skin: '#c68642', hair: '#1a1a1a', shirt: '#4ad97e', pants: '#4a4a4a', shoes: '#2a2a2a' },
  { skin: '#f5d0a9', hair: '#d4a843', shirt: '#9b59b6', pants: '#3d3d5c', shoes: '#1a1a1a' },
  { skin: '#d2a673', hair: '#2c1810', shirt: '#e67e22', pants: '#34495e', shoes: '#2a2a2a' },
  { skin: '#f5d0a9', hair: '#c0392b', shirt: '#1abc9c', pants: '#2c3e50', shoes: '#1a1a1a' },
];

// ═══════════════════════════════════════════════════════════════════
// 1. Generate office-tileset.png (128×16, 8 tiles of 16×16)
// ═══════════════════════════════════════════════════════════════════
function generateTileset() {
  const width = TILE_SIZE * 8;
  const height = TILE_SIZE;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Helper to draw at tile offset
  const tileX = (index: number) => index * TILE_SIZE;

  // Tile 0: Floor - subtle grid lines
  ctx.fillStyle = TILE_COLORS.Floor;
  ctx.fillRect(tileX(0), 0, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#bfa278';
  ctx.lineWidth = 1;
  ctx.strokeRect(tileX(0) + 0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

  // Tile 1: Wall - with border highlight
  ctx.fillStyle = TILE_COLORS.Wall;
  ctx.fillRect(tileX(1), 0, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#4d4d6c';
  ctx.lineWidth = 1;
  // Top and left highlight
  ctx.beginPath();
  ctx.moveTo(tileX(1) + 0.5, TILE_SIZE - 0.5);
  ctx.lineTo(tileX(1) + 0.5, 0.5);
  ctx.lineTo(tileX(1) + TILE_SIZE - 0.5, 0.5);
  ctx.stroke();
  // Bottom-right darker edge
  ctx.strokeStyle = '#2d2d4c';
  ctx.beginPath();
  ctx.moveTo(tileX(1) + TILE_SIZE - 0.5, 0.5);
  ctx.lineTo(tileX(1) + TILE_SIZE - 0.5, TILE_SIZE - 0.5);
  ctx.lineTo(tileX(1) + 0.5, TILE_SIZE - 0.5);
  ctx.stroke();

  // Tile 2: Desk - monitor details
  ctx.fillStyle = TILE_COLORS.Desk;
  ctx.fillRect(tileX(2), 0, TILE_SIZE, TILE_SIZE);
  // Desk surface
  ctx.fillStyle = '#5a8ac5';
  ctx.fillRect(tileX(2) + 1, 1, 14, 14);
  // Monitor frame (black)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(tileX(2) + 3, 2, 10, 7);
  // Monitor screen (cyan)
  ctx.fillStyle = '#00cccc';
  ctx.fillRect(tileX(2) + 4, 3, 8, 5);
  // Monitor stand
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(tileX(2) + 7, 9, 2, 2);
  ctx.fillRect(tileX(2) + 5, 11, 6, 1);
  // Keyboard
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(tileX(2) + 4, 13, 8, 2);

  // Tile 3: Corridor
  ctx.fillStyle = TILE_COLORS.Corridor;
  ctx.fillRect(tileX(3), 0, TILE_SIZE, TILE_SIZE);

  // Tile 4: Break Area
  ctx.fillStyle = TILE_COLORS.BreakArea;
  ctx.fillRect(tileX(4), 0, TILE_SIZE, TILE_SIZE);

  // Tile 5: Plant - pot + leaves + stem
  ctx.fillStyle = TILE_COLORS.Plant;
  ctx.fillRect(tileX(5), 0, TILE_SIZE, TILE_SIZE);
  // Pot
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(tileX(5) + 4, 11, 8, 4);
  ctx.fillRect(tileX(5) + 3, 10, 10, 2);
  // Stem
  ctx.fillStyle = '#3d7a2e';
  ctx.fillRect(tileX(5) + 7, 5, 2, 6);
  // Leaves
  ctx.fillStyle = '#5aad3f';
  ctx.fillRect(tileX(5) + 4, 2, 3, 4);
  ctx.fillRect(tileX(5) + 9, 2, 3, 4);
  ctx.fillRect(tileX(5) + 5, 1, 6, 3);
  ctx.fillRect(tileX(5) + 6, 0, 4, 2);

  // Tile 6: Door - panel + handle
  ctx.fillStyle = TILE_COLORS.Door;
  ctx.fillRect(tileX(6), 0, TILE_SIZE, TILE_SIZE);
  // Door panel
  ctx.fillStyle = '#a57d4a';
  ctx.fillRect(tileX(6) + 2, 1, 12, 14);
  // Panel detail lines
  ctx.fillStyle = TILE_COLORS.Door;
  ctx.fillRect(tileX(6) + 3, 2, 10, 1);
  ctx.fillRect(tileX(6) + 3, 7, 10, 1);
  // Handle
  ctx.fillStyle = '#d4a843';
  ctx.fillRect(tileX(6) + 11, 7, 2, 3);

  // Tile 7: Reserved
  ctx.fillStyle = TILE_COLORS.Reserved;
  ctx.fillRect(tileX(7), 0, TILE_SIZE, TILE_SIZE);

  const buf = canvas.toBuffer('image/png');
  writeFileSync(join(OUTPUT_DIR, 'office-tileset.png'), buf);
  console.log('Created office-tileset.png (128x16)');
}

// ═══════════════════════════════════════════════════════════════════
// 2. Generate avatar-spritesheet.png (160×96, 10 cols × 6 rows)
// ═══════════════════════════════════════════════════════════════════
function generateAvatarSpritesheet() {
  const COLS = 10;
  const ROWS = 6;
  const width = COLS * TILE_SIZE;   // 160
  const height = ROWS * TILE_SIZE;  // 96
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clear to transparent
  ctx.clearRect(0, 0, width, height);

  /**
   * Column layout:
   * 0: idle
   * 1: walk-down-0, 2: walk-down-1
   * 3: walk-up-0,   4: walk-up-1
   * 5: walk-left-0, 6: walk-left-1
   * 7: walk-right-0, 8: walk-right-1
   * 9: typing
   */

  for (let row = 0; row < ROWS; row++) {
    const preset = AVATAR_PRESETS[row];
    const baseY = row * TILE_SIZE;

    for (let col = 0; col < COLS; col++) {
      const baseX = col * TILE_SIZE;

      // Determine bobbing offset: alternate walk frames bob up by 1px
      const isBobFrame = col === 2 || col === 4 || col === 6 || col === 8;
      const bobY = isBobFrame ? -1 : 0;

      // Determine if typing
      const isTyping = col === 9;

      // Determine facing direction for eye placement
      // down: cols 0,1,2,9; up: cols 3,4; left: cols 5,6; right: cols 7,8
      let facing: 'down' | 'up' | 'left' | 'right' = 'down';
      if (col === 3 || col === 4) facing = 'up';
      else if (col === 5 || col === 6) facing = 'left';
      else if (col === 7 || col === 8) facing = 'right';

      drawAvatar(ctx, baseX, baseY, preset, facing, bobY, isTyping);
    }
  }

  const buf = canvas.toBuffer('image/png');
  writeFileSync(join(OUTPUT_DIR, 'avatar-spritesheet.png'), buf);
  console.log(`Created avatar-spritesheet.png (${width}x${height})`);
}

interface AvatarPreset {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  preset: AvatarPreset,
  facing: 'down' | 'up' | 'left' | 'right',
  bobY: number,
  isTyping: boolean,
) {
  // Avatar is drawn centered in 16x16 tile
  // Layout from top:
  //   y+1+bob: hair (4px tall, 8px wide, centered)
  //   y+5+bob: face/skin (4px tall, 8px wide)
  //     eyes at y+6+bob (2px)
  //   y+7+bob: shirt/torso (4px tall, 8px wide)
  //     arms at sides
  //   y+11+bob: pants (2px tall, 8px wide)
  //   y+13+bob: shoes (2px tall, 8px wide)

  const ox = x + 4; // center the 8px-wide body in 16px tile
  const oy = y + 1 + bobY;

  // Hair (4px)
  ctx.fillStyle = preset.hair;
  ctx.fillRect(ox, oy, 8, 4);

  // Face / skin (4px)
  ctx.fillStyle = preset.skin;
  ctx.fillRect(ox, oy + 4, 8, 4);

  // Eyes (2px tall) - depends on facing
  if (facing === 'down') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(ox + 1, oy + 5, 2, 2);
    ctx.fillRect(ox + 5, oy + 5, 2, 2);
  } else if (facing === 'up') {
    // No eyes visible from behind
  } else if (facing === 'left') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(ox, oy + 5, 2, 2);
  } else if (facing === 'right') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(ox + 6, oy + 5, 2, 2);
  }

  // Torso / shirt (4px)
  ctx.fillStyle = preset.shirt;
  ctx.fillRect(ox, oy + 8, 8, 4);

  // Arms (skin-colored, at sides of torso)
  ctx.fillStyle = preset.skin;
  if (isTyping) {
    // Typing: arms extended forward (offset +-1 from torso edge)
    ctx.fillRect(ox - 1, oy + 8, 1, 4);
    ctx.fillRect(ox + 8, oy + 8, 1, 4);
    // Extended hands
    ctx.fillRect(ox - 2, oy + 10, 1, 2);
    ctx.fillRect(ox + 9, oy + 10, 1, 2);
  } else {
    // Normal arms at sides
    ctx.fillRect(ox - 1, oy + 8, 1, 4);
    ctx.fillRect(ox + 8, oy + 8, 1, 4);
  }

  // Pants (2px)
  ctx.fillStyle = preset.pants;
  ctx.fillRect(ox, oy + 12, 8, 2);

  // Shoes (2px)  — cap at tile bounds
  const shoeY = oy + 14;
  if (shoeY < y + TILE_SIZE) {
    const shoeH = Math.min(2, y + TILE_SIZE - shoeY);
    ctx.fillStyle = preset.shoes;
    ctx.fillRect(ox, shoeY, 8, shoeH);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. Generate typing-bubble.png (16×12)
// ═══════════════════════════════════════════════════════════════════
function generateTypingBubble() {
  const w = 16;
  const h = 12;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Clear
  ctx.clearRect(0, 0, w, h);

  // White bubble background with rounded corners (pixel art style)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, 1, 14, 8);
  ctx.fillRect(0, 2, 16, 6);
  // Small tail pointing down
  ctx.fillRect(6, 9, 4, 2);
  ctx.fillRect(7, 11, 2, 1);

  // Dark border
  ctx.fillStyle = '#333333';
  // Top edge
  ctx.fillRect(2, 0, 12, 1);
  // Bottom edge of bubble
  ctx.fillRect(2, 9, 4, 1);
  ctx.fillRect(10, 9, 4, 1);
  // Left edge
  ctx.fillRect(0, 2, 1, 6);
  // Right edge
  ctx.fillRect(15, 2, 1, 6);
  // Corners
  ctx.fillRect(1, 1, 1, 1);
  ctx.fillRect(14, 1, 1, 1);
  ctx.fillRect(1, 8, 1, 1);
  ctx.fillRect(14, 8, 1, 1);
  // Tail border
  ctx.fillRect(5, 9, 1, 2);
  ctx.fillRect(10, 9, 1, 2);
  ctx.fillRect(6, 11, 1, 1);
  ctx.fillRect(9, 11, 1, 1);

  // "</>" text in blue
  ctx.fillStyle = '#4a90d9';
  // '<' at x=2
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(2, 4, 1, 1);
  ctx.fillRect(3, 5, 1, 1);
  // '/' at x=5
  ctx.fillRect(7, 3, 1, 1);
  ctx.fillRect(6, 4, 1, 1);
  ctx.fillRect(5, 5, 1, 1);
  // '>' at x=8
  ctx.fillRect(9, 3, 1, 1);
  ctx.fillRect(10, 4, 1, 1);
  ctx.fillRect(9, 5, 1, 1);

  const buf = canvas.toBuffer('image/png');
  writeFileSync(join(OUTPUT_DIR, 'typing-bubble.png'), buf);
  console.log('Created typing-bubble.png (16x12)');
}

// ═══════════════════════════════════════════════════════════════════
// Run all generators
// ═══════════════════════════════════════════════════════════════════
console.log('Generating static assets...');
generateTileset();
generateAvatarSpritesheet();
generateTypingBubble();
console.log('Done! All assets generated in', OUTPUT_DIR);
