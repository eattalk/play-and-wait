import { useEffect, useRef, useCallback } from "react";

interface DinoGameProps {
  playing: boolean;
  maxTime: number;
  onScoreChange: (score: number) => void;
  onTimeChange: (ms: number) => void;
  onGameOver: (finalScore: number) => void;
}

// ---- Audio helpers ----
function createJumpSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
}

function createStarSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
}

function createHitSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
}

function createTransformSound(ctx: AudioContext) {
  // Metallic clunk + rising sweep = evolution 철컹!
  const bufSize = ctx.sampleRate * 0.05;
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.6, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  noise.connect(noiseGain); noiseGain.connect(ctx.destination);
  noise.start(ctx.currentTime);

  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.connect(g1); g1.connect(ctx.destination);
  osc1.type = "square";
  osc1.frequency.setValueAtTime(60, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
  g1.gain.setValueAtTime(0.5, ctx.currentTime);
  g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.4);

  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.connect(g2); g2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(300, ctx.currentTime + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.35);
  g2.gain.setValueAtTime(0.001, ctx.currentTime + 0.05);
  g2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
  g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc2.start(ctx.currentTime + 0.05); osc2.stop(ctx.currentTime + 0.5);
}

// ---- Game constants (per-second) ----
const CANVAS_W = 700;
const CANVAS_H = 220;
const GROUND_Y = 170;
const DINO_X = 80;
const DINO_W = 40;
const DINO_H = 48;

const GRAVITY = 2520;
const JUMP_VEL = -840;
const BASE_SPEED = 300;
const SPEED_RAMP = 4.0;        // faster speed increase

const CLOUD_SPAWN_INTERVAL = 3.0;
const STAR_SPAWN_INTERVAL = 70 / 60;

const DUST_VX_SCALE = 180;
const DUST_VY_SCALE = -120;
const DUST_GRAVITY = 360;
const DUST_DECAY = 3.0;
const STAR_SPIN = 3.0;

// Evolution thresholds (obstacles passed)
const EVOLUTION_THRESHOLDS = [0, 2, 4]; // 0=trex, 2=phoenix, 4=dragon

interface Obstacle { x: number; w: number; h: number; type: "cactus" | "bird"; y: number; }
interface StarObj { x: number; y: number; radius: number; points: number; angle: number; }
interface Cloud { x: number; y: number; w: number; }
interface DustParticle { x: number; y: number; life: number; vx: number; vy: number; }

const DinoGame = ({ playing, maxTime, onScoreChange, onTimeChange, onGameOver }: DinoGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    dinoY: GROUND_Y - DINO_H,
    dinoVY: 0,
    jumpsLeft: 2,
    obstacles: [] as Obstacle[],
    stars: [] as StarObj[],
    clouds: [] as Cloud[],
    score: 0,
    speed: BASE_SPEED,
    elapsed: 0,
    legFrame: 0,
    gameOver: false,
    dustParticles: [] as DustParticle[],
    obstacleTimer: 0,
    nextObstacleInterval: 1.2,
    starTimer: 0,
    cloudTimer: 0,
    lastTime: 0,
    wingTime: 0,
    // Evolution state
    obstaclesPassed: 0,
    evolutionLevel: 0,        // 0=trex 1=phoenix 2=dragon
    transformFlash: 0,        // countdown timer for flash effect
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver || !playingRef.current) return;
    if (s.jumpsLeft > 0) {
      s.dinoVY = JUMP_VEL;
      s.jumpsLeft--;
      createJumpSound(getAudioCtx());
      for (let i = 0; i < 5; i++) {
        s.dustParticles.push({
          x: DINO_X + DINO_W / 2, y: GROUND_Y, life: 1,
          vx: (Math.random() - 0.5) * DUST_VX_SCALE,
          vy: -Math.random() * Math.abs(DUST_VY_SCALE),
        });
      }
    }
  }, [getAudioCtx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playing) return;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }

    const s = stateRef.current;
    s.gameOver = false; s.score = 0; s.speed = BASE_SPEED; s.elapsed = 0;
    s.dinoY = GROUND_Y - DINO_H; s.dinoVY = 0; s.jumpsLeft = 2;
    s.obstacles = []; s.stars = []; s.dustParticles = [];
    s.clouds = [{ x: 200, y: 40, w: 80 }, { x: 500, y: 60, w: 60 }];
    s.obstacleTimer = 0; s.nextObstacleInterval = 1.2;
    s.starTimer = 0; s.cloudTimer = 0; s.legFrame = 0; s.wingTime = 0; s.lastTime = 0;
    s.obstaclesPassed = 0; s.evolutionLevel = 0; s.transformFlash = 0;

    const ctx = canvas.getContext("2d")!;

    // Color palettes per evolution level
    const EVO_COLORS = [
      { body: "#2aff8f", eye: "#0a0e1a", accent: "#1aff70", glow: "rgba(42,255,143,0.6)", name: "T-REX" },
      { body: "#ff9900", eye: "#1a0a00", accent: "#ffcc00", glow: "rgba(255,153,0,0.7)", name: "PHOENIX" },
      { body: "#cc44ff", eye: "#0a0010", accent: "#ff44ff", glow: "rgba(200,50,255,0.7)", name: "DRAGON" },
    ];

    // --- Draw functions per evolution ---
    function drawTRex(y: number, legF: number, C: typeof EVO_COLORS[0]) {
      ctx.save();
      ctx.shadowColor = C.glow; ctx.shadowBlur = 10;
      ctx.fillStyle = C.body;
      // body
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 12);
      // head
      ctx.fillRect(DINO_X + 8, y - 16, 24, 20);
      // eye
      ctx.fillStyle = C.eye;
      ctx.fillRect(DINO_X + 24, y - 12, 6, 6);
      // jaw
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X + 26, y - 6, 12, 4);
      // tiny arm
      ctx.fillRect(DINO_X - 10, y + 4, 14, 8);
      // legs
      const legOffset = Math.sin(legF * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 16, 12, 14 + legOffset);
      ctx.fillRect(DINO_X + 20, y + DINO_H - 16, 12, 14 - legOffset);
      ctx.restore();
    }

    function drawPhoenix(y: number, wingT: number, C: typeof EVO_COLORS[0]) {
      ctx.save();
      ctx.shadowColor = C.glow; ctx.shadowBlur = 16;
      // Wing flap
      const wingSpread = Math.sin(wingT * 10) * 14;
      // Left wing
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.moveTo(DINO_X + 4, y + 10);
      ctx.lineTo(DINO_X - 28, y + 6 + wingSpread);
      ctx.lineTo(DINO_X - 18, y + 20 + wingSpread);
      ctx.lineTo(DINO_X + 4, y + 22);
      ctx.closePath(); ctx.fill();
      // Right wing
      ctx.beginPath();
      ctx.moveTo(DINO_X + DINO_W - 4, y + 10);
      ctx.lineTo(DINO_X + DINO_W + 22, y + 4 + wingSpread);
      ctx.lineTo(DINO_X + DINO_W + 14, y + 18 + wingSpread);
      ctx.lineTo(DINO_X + DINO_W - 4, y + 22);
      ctx.closePath(); ctx.fill();
      // Body
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      // Head
      ctx.fillRect(DINO_X + 6, y - 18, 26, 22);
      // Crest / fire plume
      ctx.fillStyle = C.accent;
      for (let i = 0; i < 3; i++) {
        const px = DINO_X + 10 + i * 8;
        const ph = 10 + Math.sin(wingT * 8 + i) * 4;
        ctx.fillRect(px, y - 26 - ph, 5, ph);
      }
      // Eye
      ctx.fillStyle = C.eye;
      ctx.fillRect(DINO_X + 22, y - 12, 6, 6);
      // Beak
      ctx.fillStyle = "#ffdd44";
      ctx.fillRect(DINO_X + 30, y - 8, 10, 4);
      // Legs
      const legOffset = Math.sin(wingT * 10) * 6;
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X + 6, y + DINO_H - 14, 11, 12 + legOffset);
      ctx.fillRect(DINO_X + 22, y + DINO_H - 14, 11, 12 - legOffset);
      ctx.restore();
    }

    function drawDragon(y: number, wingT: number, C: typeof EVO_COLORS[0]) {
      ctx.save();
      ctx.shadowColor = C.glow; ctx.shadowBlur = 22;
      // Tail
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(DINO_X - 2, y + DINO_H - 8);
      ctx.lineTo(DINO_X - 38, y + DINO_H + 4 + Math.sin(wingT * 4) * 6);
      ctx.lineTo(DINO_X - 28, y + DINO_H - 4 + Math.sin(wingT * 4) * 4);
      ctx.lineTo(DINO_X + 2, y + DINO_H - 14);
      ctx.closePath(); ctx.fill();
      // Large wings
      const ws = Math.sin(wingT * 7) * 18;
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.75;
      // Left wing - membrane shape
      ctx.beginPath();
      ctx.moveTo(DINO_X + 6, y + 6);
      ctx.lineTo(DINO_X - 50, y - 10 + ws);
      ctx.lineTo(DINO_X - 40, y + 10 + ws);
      ctx.lineTo(DINO_X - 20, y + 30 + ws * 0.5);
      ctx.lineTo(DINO_X + 6, y + 28);
      ctx.closePath(); ctx.fill();
      // Right wing
      ctx.beginPath();
      ctx.moveTo(DINO_X + DINO_W - 6, y + 6);
      ctx.lineTo(DINO_X + DINO_W + 46, y - 12 + ws);
      ctx.lineTo(DINO_X + DINO_W + 36, y + 8 + ws);
      ctx.lineTo(DINO_X + DINO_W + 16, y + 28 + ws * 0.5);
      ctx.lineTo(DINO_X + DINO_W - 6, y + 28);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      // Body
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      // Head (bigger, menacing)
      ctx.fillRect(DINO_X + 4, y - 22, 32, 26);
      // Horns
      ctx.fillStyle = C.accent;
      ctx.fillRect(DINO_X + 8, y - 32, 5, 14);
      ctx.fillRect(DINO_X + 20, y - 34, 5, 16);
      ctx.fillRect(DINO_X + 28, y - 30, 5, 12);
      // Eye (glowing)
      ctx.fillStyle = "#ff0000";
      ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 8;
      ctx.fillRect(DINO_X + 24, y - 14, 8, 8);
      ctx.shadowBlur = 22;
      // Flame breath (animated)
      if (Math.sin(wingT * 9) > 0.3) {
        ctx.fillStyle = "#ff6600";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(DINO_X + 36, y - 6);
        ctx.lineTo(DINO_X + 60 + Math.sin(wingT * 12) * 8, y - 2);
        ctx.lineTo(DINO_X + 50, y + 4);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffcc00";
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(DINO_X + 36, y - 4);
        ctx.lineTo(DINO_X + 52 + Math.sin(wingT * 12) * 5, y);
        ctx.lineTo(DINO_X + 46, y + 4);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Legs
      ctx.fillStyle = C.body;
      ctx.shadowBlur = 10;
      const legOffset = Math.sin(wingT * 8) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 14, 13, 14 + legOffset);
      ctx.fillRect(DINO_X + 22, y + DINO_H - 14, 13, 14 - legOffset);
      ctx.restore();
    }

    function drawDino(y: number, legF: number, wingT: number, evoLevel: number) {
      const C = EVO_COLORS[Math.min(evoLevel, 2)];
      if (evoLevel === 0) drawTRex(y, legF, C);
      else if (evoLevel === 1) drawPhoenix(y, wingT, C);
      else drawDragon(y, wingT, C);
    }

    function drawTransformFlash(flash: number, evoLevel: number) {
      if (flash <= 0) return;
      const C = EVO_COLORS[Math.min(evoLevel, 2)];
      ctx.save();
      ctx.globalAlpha = flash * 0.5;
      ctx.fillStyle = C.body;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Ring burst
      ctx.globalAlpha = flash;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 4;
      ctx.shadowColor = C.glow;
      ctx.shadowBlur = 20;
      const radius = (1 - flash) * 120 + 20;
      ctx.beginPath();
      ctx.arc(DINO_X + DINO_W / 2, s.dinoY + DINO_H / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      // Evo name
      if (flash > 0.4) {
        ctx.globalAlpha = (flash - 0.4) / 0.6;
        ctx.fillStyle = C.accent;
        ctx.font = "bold 20px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.shadowBlur = 30;
        ctx.fillText(C.name + "!", CANVAS_W / 2, CANVAS_H / 2 - 10);
      }
      ctx.restore();
    }

    function drawStar(star: StarObj) {
      const { x, y, radius, angle } = star;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerA = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const innerA = outerA + (2 * Math.PI) / 10;
        if (i === 0) ctx.moveTo(Math.cos(outerA) * radius, Math.sin(outerA) * radius);
        else ctx.lineTo(Math.cos(outerA) * radius, Math.sin(outerA) * radius);
        ctx.lineTo(Math.cos(innerA) * (radius * 0.45), Math.sin(innerA) * (radius * 0.45));
      }
      ctx.closePath();
      ctx.fillStyle = "#ffcc00"; ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }

    function drawObstacle(ob: Obstacle) {
      ctx.save();
      ctx.fillStyle = "#ff4444"; ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 8;
      if (ob.type === "cactus") {
        ctx.fillRect(ob.x + ob.w / 2 - 6, ob.y, 12, ob.h);
        ctx.fillRect(ob.x + ob.w / 2 - 20, ob.y + ob.h * 0.3, 14, 8);
        ctx.fillRect(ob.x + ob.w / 2 + 6, ob.y + ob.h * 0.4, 14, 8);
        ctx.fillRect(ob.x + ob.w / 2 - 20, ob.y + ob.h * 0.1, 6, ob.h * 0.25);
        ctx.fillRect(ob.x + ob.w / 2 + 14, ob.y + ob.h * 0.2, 6, ob.h * 0.2);
      } else {
        ctx.fillRect(ob.x, ob.y, ob.w, 14);
        const wingY = Math.sin(s.wingTime * 18) > 0 ? ob.y - 8 : ob.y + 8;
        ctx.fillRect(ob.x + 4, wingY, ob.w - 8, 6);
        ctx.fillStyle = "#ff8800";
        ctx.fillRect(ob.x + ob.w - 8, ob.y + 4, 8, 4);
      }
      ctx.restore();
    }

    function drawCloud(cloud: Cloud) {
      ctx.save();
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.w / 2, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + cloud.w * 0.3, cloud.y - 8, cloud.w * 0.3, 10, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }

    function randomObstacleInterval() {
      // Irregular: between 0.7s and 2.2s, shrinks as speed grows
      const base = Math.max(0.65, 2.2 - (s.speed - BASE_SPEED) / 500);
      return base * (0.6 + Math.random() * 0.8);
    }

    function spawnObstacle() {
      const isBird = s.speed > 480 && Math.random() < 0.35;
      const h = isBird ? 20 : Math.random() * 30 + 30;
      const y = isBird ? GROUND_Y - DINO_H - 10 - Math.random() * 30 : GROUND_Y - h;
      // Occasionally spawn double cactus
      const isDouble = !isBird && s.speed > 540 && Math.random() < 0.3;
      s.obstacles.push({ x: CANVAS_W + 10, w: isBird ? 40 : 32, h, type: isBird ? "bird" : "cactus", y });
      if (isDouble) {
        s.obstacles.push({ x: CANVAS_W + 58, w: 32, h: Math.random() * 20 + 30, type: "cactus", y: GROUND_Y - (Math.random() * 20 + 30) });
      }
    }

    function spawnStar() {
      s.stars.push({
        x: CANVAS_W + 10, y: GROUND_Y - 50 - Math.random() * 80,
        radius: Math.random() < 0.2 ? 18 : 12,
        points: Math.random() < 0.2 ? 5 : 1, angle: 0,
      });
    }

    function checkCollision(ob: Obstacle): boolean {
      const dinoLeft = DINO_X + 6, dinoRight = DINO_X + DINO_W - 6;
      const dinoTop = s.dinoY + 4, dinoBottom = s.dinoY + DINO_H;
      return dinoRight > ob.x + 4 && dinoLeft < ob.x + ob.w - 4 && dinoBottom > ob.y + 4 && dinoTop < ob.y + ob.h;
    }

    function loop(ts: number) {
      if (s.gameOver) return;
      if (s.lastTime === 0) { s.lastTime = ts; rafRef.current = requestAnimationFrame(loop); return; }

      const dt = Math.min((ts - s.lastTime) / 1000, 0.033);
      s.lastTime = ts;
      s.elapsed += dt;
      onTimeChange(s.elapsed * 1000);

      if (s.elapsed >= maxTime) {
        s.gameOver = true; createHitSound(getAudioCtx()); onGameOver(s.score); return;
      }

      s.speed = BASE_SPEED + s.elapsed * SPEED_RAMP;
      s.wingTime += dt;

      // Transform flash decay
      if (s.transformFlash > 0) s.transformFlash = Math.max(0, s.transformFlash - dt * 2.5);

      // Physics
      s.dinoVY += GRAVITY * dt;
      s.dinoY += s.dinoVY * dt;
      if (s.dinoY >= GROUND_Y - DINO_H) {
        s.dinoY = GROUND_Y - DINO_H; s.dinoVY = 0; s.jumpsLeft = 2;
      }

      // Obstacle spawning with irregular intervals
      s.obstacleTimer += dt;
      if (s.obstacleTimer >= s.nextObstacleInterval) {
        spawnObstacle();
        s.nextObstacleInterval = randomObstacleInterval();
        s.obstacleTimer = 0;
      }

      s.starTimer += dt;
      if (s.starTimer >= STAR_SPAWN_INTERVAL) { spawnStar(); s.starTimer = 0; }

      s.cloudTimer += dt;
      if (s.cloudTimer >= CLOUD_SPAWN_INTERVAL) {
        s.clouds.push({ x: CANVAS_W + 10, y: 30 + Math.random() * 50, w: 60 + Math.random() * 60 });
        s.cloudTimer = 0;
      }

      // Move obstacles & check evolution on pass
      s.obstacles = s.obstacles.filter(ob => {
        ob.x -= s.speed * dt;
        if (checkCollision(ob)) {
          s.gameOver = true; createHitSound(getAudioCtx()); onGameOver(s.score); return false;
        }
        if (ob.x + ob.w < DINO_X && ob.x + ob.w > DINO_X - s.speed * dt * 2) {
          // Obstacle just passed the dino
          s.obstaclesPassed++;
          const newLevel = EVOLUTION_THRESHOLDS.filter(t => t > 0 && s.obstaclesPassed >= t).length;
          if (newLevel !== s.evolutionLevel && newLevel <= 2) {
            s.evolutionLevel = newLevel;
            s.transformFlash = 1.0;
            createTransformSound(getAudioCtx());
          }
        }
        return ob.x > -100;
      });

      // Stars
      s.stars = s.stars.filter(star => {
        star.x -= s.speed * dt; star.angle += STAR_SPIN * dt;
        const dinoMidX = DINO_X + DINO_W / 2, dinoMidY = s.dinoY + DINO_H / 2;
        if (Math.abs(star.x - dinoMidX) < star.radius + 16 && Math.abs(star.y - dinoMidY) < star.radius + 20) {
          s.score += star.points; onScoreChange(s.score); createStarSound(getAudioCtx()); return false;
        }
        return star.x > -50;
      });

      // Clouds
      s.clouds = s.clouds.filter(c => { c.x -= s.speed * 0.3 * dt; return c.x > -100; });

      // Leg animation
      if (s.dinoY >= GROUND_Y - DINO_H - 2) s.legFrame += s.speed * dt;

      // Dust
      s.dustParticles = s.dustParticles.filter(p => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += DUST_GRAVITY * dt; p.life -= DUST_DECAY * dt;
        return p.life > 0;
      });

      // ---- Draw ----
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, "#040810"); grad.addColorStop(1, "#0d1c2e");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Background stars
      for (let i = 0; i < 40; i++) {
        const bx = ((i * 173 + s.elapsed * 12) % CANVAS_W);
        const by = (i * 37) % (GROUND_Y - 20);
        ctx.fillStyle = `rgba(180,220,255,${0.2 + (i % 5) * 0.1})`;
        ctx.fillRect(bx, by, 1, 1);
      }

      s.clouds.forEach(drawCloud);

      // Ground
      ctx.fillStyle = "#1a3a2a"; ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
      ctx.fillStyle = EVO_COLORS[Math.min(s.evolutionLevel, 2)].body;
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 2);
      for (let i = 0; i < 8; i++) {
        const gx = ((i * 90 + s.elapsed * s.speed * 0.5) % CANVAS_W);
        ctx.fillStyle = "rgba(42,255,143,0.15)";
        ctx.fillRect(gx, GROUND_Y + 4, 40, 2);
      }

      s.obstacles.forEach(drawObstacle);
      s.stars.forEach(drawStar);

      s.dustParticles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life * 0.6;
        ctx.fillStyle = EVO_COLORS[Math.min(s.evolutionLevel, 2)].body;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      drawDino(s.dinoY, s.legFrame, s.wingTime, s.evolutionLevel);
      drawTransformFlash(s.transformFlash, s.evolutionLevel);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
  }, [playing, maxTime, onScoreChange, onTimeChange, onGameOver, getAudioCtx]);

  return (
    <div
      className="relative border-2 border-neon-green/40 rounded overflow-hidden cursor-pointer"
      style={{ boxShadow: "0 0 30px hsl(var(--neon-green) / 0.15)" }}
      onClick={jump}
      onTouchStart={e => { e.preventDefault(); jump(); }}
    >
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block max-w-full" />
    </div>
  );
};

export default DinoGame;
