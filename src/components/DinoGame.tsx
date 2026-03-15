import { useEffect, useRef, useCallback } from "react";

interface DinoGameProps {
  playing: boolean;
  maxTime: number;
  onScoreChange: (score: number) => void;
  onTimeChange: (ms: number) => void;
  onGameOver: (finalScore: number) => void;
}

// ─── Audio helpers ────────────────────────────────────────────────────────────
function createJumpSound(ctx: AudioContext) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(380, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(190, ctx.currentTime + 0.13);
  g.gain.setValueAtTime(0.14, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.13);
}

function createLandSound(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.5;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf; src.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.35, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  src.start(ctx.currentTime);
}

function createStarSound(ctx: AudioContext, pitch = 1) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(700 * pitch, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1400 * pitch, ctx.currentTime + 0.12);
  g.gain.setValueAtTime(0.18, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.18);
}

function createWhooshSound(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.09, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (i / d.length) * (1 - i / d.length) * 4;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf; src.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.18, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  src.start(ctx.currentTime);
}

function createSpeedUpSound(ctx: AudioContext) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.25);
  g.gain.setValueAtTime(0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
}

function createHitSound(ctx: AudioContext) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.35);
  g.gain.setValueAtTime(0.35, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
}

function createTransformSound(ctx: AudioContext, level: number) {
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const ns = ctx.createBufferSource(), ng = ctx.createGain();
  ns.buffer = buf; ns.connect(ng); ng.connect(ctx.destination);
  ng.gain.setValueAtTime(0.6, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  ns.start(t);
  const o1 = ctx.createOscillator(), g1 = ctx.createGain();
  o1.connect(g1); g1.connect(ctx.destination);
  o1.type = "square";
  o1.frequency.setValueAtTime(55 + level * 8, t);
  o1.frequency.exponentialRampToValueAtTime(28, t + 0.45);
  g1.gain.setValueAtTime(0.5, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o1.start(t); o1.stop(t + 0.45);
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.connect(g2); g2.connect(ctx.destination);
  o2.type = "sine";
  o2.frequency.setValueAtTime(200 + level * 30, t + 0.05);
  o2.frequency.exponentialRampToValueAtTime(1600 + level * 80, t + 0.5);
  g2.gain.setValueAtTime(0.001, t + 0.05); g2.gain.linearRampToValueAtTime(0.28, t + 0.22);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o2.start(t + 0.05); o2.stop(t + 0.55);
  if (level >= 5) {
    const o3 = ctx.createOscillator(), g3 = ctx.createGain();
    o3.connect(g3); g3.connect(ctx.destination);
    o3.type = "sine";
    o3.frequency.setValueAtTime(2000, t + 0.2);
    o3.frequency.exponentialRampToValueAtTime(4000, t + 0.6);
    g3.gain.setValueAtTime(0.08, t + 0.2); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    o3.start(t + 0.2); o3.stop(t + 0.65);
  }
}

// ─── Game constants — optimised for 1200×800 tablet landscape ─────────────────
const CANVAS_W = 1000, CANVAS_H = 300, GROUND_Y = 230;
const DINO_X = 100, DINO_W = 44, DINO_H = 52;
const GRAVITY = 2520;
const JUMP_VEL = -880;
const BASE_SPEED = 260;
const CLOUD_SPAWN_INTERVAL = 2.8;
const STAR_SPAWN_INTERVAL = 1.1;
const DUST_VX = 180, DUST_VY = -130, DUST_G = 360, DUST_DECAY = 2.8;
const STAR_SPIN = 3.2;

// 난이도: EVO_EVERY 장애물마다 변신 (더 자주 변신)
const EVO_EVERY = 2;
const EVO_MAX = 11;

// 12단계 변신 (기존 10 → 12단계, 더 화려)
const EVO = [
  { body: "#2aff8f", acc: "#1aff70", eye: "#0a0e1a", glow: "rgba(42,255,143,0.7)",   name: "T-REX" },
  { body: "#00ffee", acc: "#00ccdd", eye: "#001a18", glow: "rgba(0,255,238,0.7)",    name: "RAPTOR" },
  { body: "#ffff44", acc: "#ffcc00", eye: "#1a1a00", glow: "rgba(255,255,0,0.75)",   name: "CRESTUS" },
  { body: "#ff9900", acc: "#ffcc44", eye: "#1a0800", glow: "rgba(255,153,0,0.8)",    name: "ARMOREX" },
  { body: "#cc44ff", acc: "#ff44ff", eye: "#0a0010", glow: "rgba(200,50,255,0.8)",   name: "SPIKAREX" },
  { body: "#44ddff", acc: "#88ffff", eye: "#001020", glow: "rgba(68,221,255,0.8)",   name: "PTERYX" },
  { body: "#ff4422", acc: "#ff8844", eye: "#1a0000", glow: "rgba(255,60,20,0.85)",   name: "PYREX" },
  { body: "#aaddff", acc: "#ffffff", eye: "#000a18", glow: "rgba(180,230,255,0.85)", name: "GLACIUS" },
  { body: "#ffcc00", acc: "#fff066", eye: "#1a1000", glow: "rgba(255,200,0,0.9)",    name: "PHOENIX" },
  { body: "#ff44aa", acc: "#ff88dd", eye: "#1a001a", glow: "rgba(255,60,170,0.9)",   name: "VOIDWING" },
  { body: "#00ff88", acc: "#88ffcc", eye: "#001a0e", glow: "rgba(0,255,136,0.92)",   name: "NEBULA REX" },
  { body: "#ffffff", acc: "#ff88ff", eye: "#100010", glow: "rgba(255,255,255,0.98)", name: "DRAGON GOD" },
];

interface Obstacle { x: number; w: number; h: number; type: "cactus" | "bird"; y: number; passed: boolean; }
interface StarObj  { x: number; y: number; radius: number; points: number; angle: number; }
interface Cloud    { x: number; y: number; w: number; }
interface Dust     { x: number; y: number; life: number; vx: number; vy: number; }

const STAR_POINT_TABLE = [1, 1, 2, 2, 3, 5, 7, 10];

// ─── Component ────────────────────────────────────────────────────────────────
const DinoGame = ({ playing, maxTime, onScoreChange, onTimeChange, onGameOver }: DinoGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    dy: GROUND_Y - DINO_H, dvy: 0,
    wasOnGround: true,
    jumpsLeft: 1,
    obstacles: [] as Obstacle[],
    stars: [] as StarObj[],
    clouds: [] as Cloud[],
    dust: [] as Dust[],
    score: 0,
    scoreExact: 0,
    speed: BASE_SPEED, elapsed: 0,
    legF: 0, wingT: 0, gameOver: false,
    obsTimer: 0, nextObsInterval: 1.3,
    starTimer: 0, cloudTimer: 0,
    lastTime: 0,
    obstaclesPassed: 0,
    evoLevel: 0,
    transformFlash: 0,
    lastSpeedTier: 0,
    comboStreak: 0,
    lastComboTime: 0,
    lastSurvivalBonus: 0,
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const getAudio = useCallback(() => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtxRef.current;
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver || !playingRef.current) return;
    if (s.jumpsLeft > 0) {
      s.dvy = JUMP_VEL; s.jumpsLeft = 0;
      createJumpSound(getAudio());
      for (let i = 0; i < 6; i++)
        s.dust.push({ x: DINO_X + DINO_W / 2, y: GROUND_Y, life: 1,
          vx: (Math.random() - 0.5) * DUST_VX, vy: -Math.random() * Math.abs(DUST_VY) });
    }
  }, [getAudio]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "ArrowUp") && !e.repeat) { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playing) return;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }

    const s = stateRef.current;
    Object.assign(s, {
      dy: GROUND_Y - DINO_H, dvy: 0, wasOnGround: true, jumpsLeft: 1, jumpHeld: false,
      obstacles: [], stars: [], dust: [], score: 0, scoreExact: 0, speed: BASE_SPEED,
      elapsed: 0, legF: 0, wingT: 0, gameOver: false,
      clouds: [{ x: 280, y: 44, w: 90 }, { x: 680, y: 60, w: 75 }],
      obsTimer: 0, nextObsInterval: 1.3,
      starTimer: 0, cloudTimer: 0, lastTime: 0,
      obstaclesPassed: 0, evoLevel: 0, transformFlash: 0, lastSpeedTier: 0,
      comboStreak: 0, lastComboTime: 0, lastSurvivalBonus: 0,
    });

    const ctx = canvas.getContext("2d")!;

    function applyEvoGlow(level: number) {
      ctx.shadowColor = EVO[level].glow;
      ctx.shadowBlur = 14 + level * 3.5;
    }

    function drawLevel0(y: number, lf: number, C: typeof EVO[0]) {
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 12);
      ctx.fillRect(DINO_X + 8, y - 16, 24, 20);
      ctx.fillStyle = C.eye; ctx.fillRect(DINO_X + 26, y - 12, 6, 6);
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X + 30, y - 6, 12, 4);
      ctx.fillRect(DINO_X - 10, y + 5, 14, 8);
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 16, 12, 14 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 16, 12, 14 - lo);
    }

    function drawLevel1(y: number, lf: number, C: typeof EVO[0]) {
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y + 4, DINO_W, DINO_H - 14);
      ctx.fillRect(DINO_X + 6, y - 14, 26, 20);
      ctx.beginPath(); ctx.moveTo(DINO_X, y + DINO_H - 14);
      ctx.lineTo(DINO_X - 36, y + DINO_H - 2 + Math.sin(lf * 0.004) * 5);
      ctx.lineTo(DINO_X - 24, y + DINO_H - 10); ctx.lineTo(DINO_X, y + DINO_H - 20);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.eye; ctx.fillRect(DINO_X + 24, y - 10, 5, 5);
      ctx.fillStyle = C.acc; ctx.fillRect(DINO_X + 28, y - 5, 10, 3);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.006) * 7;
      ctx.fillRect(DINO_X + 5, y + DINO_H - 16, 11, 14 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 16, 11, 14 - lo);
      ctx.fillStyle = C.acc;
      ctx.fillRect(DINO_X + 5, y + DINO_H - 3 + lo, 4, 5);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 3 - lo, 4, 5);
    }

    function drawLevel2(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y + 2, DINO_W, DINO_H - 12);
      ctx.fillRect(DINO_X + 6, y - 16, 26, 22);
      ctx.fillStyle = C.acc;
      for (let i = 0; i < 5; i++) {
        const fh = 10 + Math.sin(wt * 5 + i * 0.8) * 3 + i * 2;
        ctx.fillRect(DINO_X + 2 + i * 8, y - fh, 5, fh + 2);
      }
      ctx.fillStyle = C.eye; ctx.fillRect(DINO_X + 26, y - 12, 6, 6);
      ctx.fillStyle = C.acc; ctx.fillRect(DINO_X + 30, y - 6, 12, 4);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 16, 12, 14 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 16, 12, 14 - lo);
    }

    function drawLevel3(y: number, lf: number, C: typeof EVO[0]) {
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 6, y - 18, 28, 22);
      ctx.fillStyle = C.acc;
      ctx.fillRect(DINO_X + 2, y + 2, DINO_W - 4, 6);
      ctx.fillRect(DINO_X + 2, y + 12, DINO_W - 4, 6);
      ctx.fillRect(DINO_X + 2, y + 22, DINO_W - 4, 6);
      ctx.fillStyle = C.eye; ctx.fillRect(DINO_X + 28, y - 13, 6, 6);
      ctx.fillStyle = C.acc; ctx.fillRect(DINO_X + 32, y - 7, 10, 4);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 13, 13 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 13, 13 - lo);
    }

    function drawLevel4(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 6, y - 18, 28, 22);
      ctx.fillStyle = C.acc;
      for (let i = 0; i < 4; i++) {
        const sx = DINO_X - 8, sy = y + 4 + i * 9;
        const sw = 10 + Math.sin(wt * 4 + i) * 2;
        ctx.beginPath(); ctx.moveTo(sx, sy + 4);
        ctx.lineTo(sx - sw, sy + 2); ctx.lineTo(sx, sy + 8); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = C.eye; ctx.fillRect(DINO_X + 28, y - 13, 7, 7);
      ctx.shadowColor = "#ff00ff"; ctx.shadowBlur = 12;
      ctx.fillStyle = C.acc; ctx.fillRect(DINO_X + 32, y - 7, 12, 4);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 13, 13 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 13, 13 - lo);
    }

    function drawLevel5(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      const ws = Math.sin(wt * 9) * 16;
      ctx.fillStyle = C.acc; ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(DINO_X + 4, y + 8); ctx.lineTo(DINO_X - 34, y - 2 + ws);
      ctx.lineTo(DINO_X - 22, y + 16 + ws * 0.5); ctx.lineTo(DINO_X + 4, y + 22); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(DINO_X + DINO_W - 4, y + 8); ctx.lineTo(DINO_X + DINO_W + 30, y - 4 + ws);
      ctx.lineTo(DINO_X + DINO_W + 18, y + 14 + ws * 0.5); ctx.lineTo(DINO_X + DINO_W - 4, y + 22); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 6, y - 18, 28, 22);
      ctx.fillStyle = C.eye; ctx.fillRect(DINO_X + 28, y - 13, 6, 6);
      ctx.fillStyle = C.acc; ctx.fillRect(DINO_X + 32, y - 7, 12, 4);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 13, 13 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 13, 13 - lo);
    }

    function drawLevel6(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 6; i++) {
        const fx = DINO_X - 10 - i * 6 + Math.sin(wt * 8 + i) * 4;
        const fy = y + 10 + i * 4 + Math.cos(wt * 7 + i) * 5;
        ctx.fillStyle = i % 2 === 0 ? "#ff4400" : "#ff8800";
        ctx.beginPath(); ctx.arc(fx, fy, 5 - i * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 6, y - 18, 28, 22);
      ctx.fillStyle = C.acc;
      ctx.fillRect(DINO_X + 14, y - 28, 6, 14);
      ctx.fillStyle = C.eye;
      ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 10;
      ctx.fillRect(DINO_X + 28, y - 13, 7, 7);
      ctx.fillStyle = "#ff8800"; ctx.fillRect(DINO_X + 32, y - 7, 14, 4);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 13, 13 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 13, 13 - lo);
    }

    function drawLevel7(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      ctx.fillStyle = C.acc; ctx.globalAlpha = 0.8;
      for (let i = 0; i < 5; i++) {
        const cx2 = DINO_X + 4 + i * 9, ch = 14 + Math.sin(i * 1.3) * 6;
        ctx.beginPath();
        ctx.moveTo(cx2, y - ch); ctx.lineTo(cx2 - 4, y); ctx.lineTo(cx2 + 4, y); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 6, y - 18, 28, 22);
      ctx.fillStyle = "rgba(200,240,255,0.25)";
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillStyle = C.eye;
      ctx.shadowColor = "#00aaff"; ctx.shadowBlur = 12;
      ctx.fillRect(DINO_X + 28, y - 13, 7, 7);
      ctx.fillStyle = C.acc; ctx.fillRect(DINO_X + 32, y - 7, 12, 4);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 13, 13 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 13, 13 - lo);
      if (Math.sin(wt * 6) > 0.4) {
        ctx.fillStyle = "rgba(180,230,255,0.5)";
        ctx.beginPath();
        ctx.moveTo(DINO_X + 36, y - 8); ctx.lineTo(DINO_X + 64 + Math.sin(wt * 10) * 8, y - 4);
        ctx.lineTo(DINO_X + 52, y + 2); ctx.closePath(); ctx.fill();
      }
    }

    function drawLevel8(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      const ws = Math.sin(wt * 8) * 20;
      ctx.fillStyle = C.body; ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(DINO_X + 4, y + 8); ctx.lineTo(DINO_X - 52, y - 8 + ws);
      ctx.lineTo(DINO_X - 38, y + 12 + ws); ctx.lineTo(DINO_X - 16, y + 30 + ws * 0.4); ctx.lineTo(DINO_X + 4, y + 28); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(DINO_X + DINO_W - 4, y + 8); ctx.lineTo(DINO_X + DINO_W + 48, y - 10 + ws);
      ctx.lineTo(DINO_X + DINO_W + 34, y + 10 + ws); ctx.lineTo(DINO_X + DINO_W + 12, y + 28 + ws * 0.4); ctx.lineTo(DINO_X + DINO_W - 4, y + 28); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 6, y - 20, 28, 24);
      ctx.fillStyle = C.acc;
      for (let i = 0; i < 4; i++) {
        const ph = 12 + Math.sin(wt * 7 + i * 0.9) * 5;
        ctx.fillRect(DINO_X + 8 + i * 8, y - 22 - ph, 5, ph);
      }
      ctx.fillStyle = C.eye;
      ctx.shadowColor = "#ffaa00"; ctx.shadowBlur = 14;
      ctx.fillRect(DINO_X + 26, y - 14, 7, 7);
      ctx.fillStyle = "#ffdd44"; ctx.fillRect(DINO_X + 32, y - 8, 12, 4);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 13, 14 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 13, 14 - lo);
    }

    function drawLevel9(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      const hue = (wt * 120) % 360;
      ctx.save();
      ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 30;
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(DINO_X, y + DINO_H - 10);
      ctx.lineTo(DINO_X - 46, y + DINO_H + 6 + Math.sin(wt * 3.5) * 8);
      ctx.lineTo(DINO_X - 30, y + DINO_H - 6 + Math.sin(wt * 3.5) * 5);
      ctx.lineTo(DINO_X + 2, y + DINO_H - 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `hsla(${hue},80%,65%,0.6)`;
      const ws = Math.sin(wt * 6) * 22;
      ctx.beginPath();
      ctx.moveTo(DINO_X + 6, y + 4); ctx.lineTo(DINO_X - 60, y - 16 + ws);
      ctx.lineTo(DINO_X - 48, y + 8 + ws); ctx.lineTo(DINO_X - 24, y + 32 + ws * 0.4); ctx.lineTo(DINO_X + 6, y + 30); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(DINO_X + DINO_W - 6, y + 4); ctx.lineTo(DINO_X + DINO_W + 56, y - 18 + ws);
      ctx.lineTo(DINO_X + DINO_W + 44, y + 6 + ws); ctx.lineTo(DINO_X + DINO_W + 20, y + 30 + ws * 0.4); ctx.lineTo(DINO_X + DINO_W - 6, y + 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 4, y - 24, 36, 28);
      ctx.fillStyle = `hsl(${hue},100%,65%)`;
      const crownPts = [DINO_X + 6, DINO_X + 14, DINO_X + 22, DINO_X + 30, DINO_X + 36];
      const crownH  = [16, 22, 18, 24, 14];
      crownPts.forEach((cx2, i) => { ctx.fillRect(cx2, y - 24 - crownH[i], 5, crownH[i]); });
      ctx.fillStyle = "#ff4466";
      ctx.fillRect(DINO_X + 8, y - 38, 6, 18); ctx.fillRect(DINO_X + 22, y - 42, 6, 20); ctx.fillRect(DINO_X + 34, y - 36, 6, 16);
      ctx.fillStyle = "#ff0000";
      ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 16;
      ctx.fillRect(DINO_X + 28, y - 18, 9, 9);
      if (Math.sin(wt * 8) > 0.2) {
        ctx.fillStyle = "#ff6600"; ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(DINO_X + 40, y - 10); ctx.lineTo(DINO_X + 74 + Math.sin(wt * 11) * 10, y - 6);
        ctx.lineTo(DINO_X + 58, y + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffee00"; ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(DINO_X + 40, y - 8); ctx.lineTo(DINO_X + 60 + Math.sin(wt * 11) * 6, y - 4);
        ctx.lineTo(DINO_X + 52, y + 2); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 8;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 14, 15 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 14, 15 - lo);
      ctx.restore();
    }

    // ── VOIDWING (lv 9): void portal wings + plasma tail ──────────────────────
    function drawLevel9Voidwing(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      ctx.save();
      // Void portal rings
      for (let r = 0; r < 3; r++) {
        const rad = 28 + r * 14 + Math.sin(wt * 5 + r) * 6;
        const alpha = 0.18 - r * 0.04;
        ctx.beginPath(); ctx.arc(DINO_X + DINO_W / 2, y + DINO_H / 2, rad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,60,200,${alpha})`; ctx.lineWidth = 3 - r * 0.5; ctx.stroke();
      }
      // Plasma tail
      for (let i = 0; i < 8; i++) {
        const tx = DINO_X - 10 - i * 8 + Math.sin(wt * 9 + i * 0.7) * 5;
        const ty = y + DINO_H / 2 + Math.cos(wt * 7 + i * 0.9) * 7;
        ctx.globalAlpha = 0.6 - i * 0.07;
        ctx.fillStyle = i % 2 === 0 ? "#ff44aa" : "#aa00ff";
        ctx.beginPath(); ctx.arc(tx, ty, 5 - i * 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Wings
      const ws = Math.sin(wt * 11) * 18;
      ctx.fillStyle = C.acc; ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(DINO_X + 4, y + 6); ctx.lineTo(DINO_X - 44, y - 10 + ws);
      ctx.lineTo(DINO_X - 28, y + 14 + ws); ctx.lineTo(DINO_X + 4, y + 26); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(DINO_X + DINO_W - 4, y + 6); ctx.lineTo(DINO_X + DINO_W + 40, y - 12 + ws);
      ctx.lineTo(DINO_X + DINO_W + 26, y + 12 + ws); ctx.lineTo(DINO_X + DINO_W - 4, y + 26); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 6, y - 20, 28, 24);
      ctx.fillStyle = C.eye;
      ctx.shadowColor = "#ff00cc"; ctx.shadowBlur = 18;
      ctx.fillRect(DINO_X + 28, y - 15, 8, 8);
      ctx.fillStyle = C.acc; ctx.fillRect(DINO_X + 32, y - 8, 12, 4);
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 7;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 13, 14 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 13, 14 - lo);
      ctx.restore();
    }

    // ── NEBULA REX (lv 10): galaxy nebula aura + crown + laser eye ────────────
    function drawLevel10NebulaRex(y: number, lf: number, wt: number, C: typeof EVO[0]) {
      ctx.save();
      // Nebula spiral particles
      for (let i = 0; i < 12; i++) {
        const angle = wt * 2.5 + (i / 12) * Math.PI * 2;
        const dist = 30 + Math.sin(wt * 3 + i) * 8;
        const px = DINO_X + DINO_W / 2 + Math.cos(angle) * dist;
        const py = y + DINO_H / 2 + Math.sin(angle) * dist * 0.5;
        const hue = (wt * 80 + i * 30) % 360;
        ctx.fillStyle = `hsla(${hue},100%,70%,0.6)`;
        ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      // Energy aura ring
      const auraHue = (wt * 60) % 360;
      ctx.strokeStyle = `hsla(${auraHue},100%,65%,0.5)`;
      ctx.lineWidth = 4; ctx.shadowColor = `hsla(${auraHue},100%,65%,0.8)`; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(DINO_X + DINO_W / 2, y + DINO_H / 2, 36 + Math.sin(wt * 4) * 4, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Large wings
      const ws = Math.sin(wt * 7) * 24;
      ctx.fillStyle = `hsla(${auraHue},80%,65%,0.7)`;
      ctx.beginPath();
      ctx.moveTo(DINO_X + 4, y + 6); ctx.lineTo(DINO_X - 56, y - 14 + ws);
      ctx.lineTo(DINO_X - 42, y + 10 + ws); ctx.lineTo(DINO_X - 20, y + 32 + ws * 0.4); ctx.lineTo(DINO_X + 4, y + 30); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(DINO_X + DINO_W - 4, y + 6); ctx.lineTo(DINO_X + DINO_W + 52, y - 16 + ws);
      ctx.lineTo(DINO_X + DINO_W + 38, y + 8 + ws); ctx.lineTo(DINO_X + DINO_W + 16, y + 30 + ws * 0.4); ctx.lineTo(DINO_X + DINO_W - 4, y + 30); ctx.closePath(); ctx.fill();
      // Body
      ctx.shadowColor = C.glow; ctx.shadowBlur = 22;
      ctx.fillStyle = C.body;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
      ctx.fillRect(DINO_X + 4, y - 22, 36, 26);
      // Glowing crown
      const crownHue = (wt * 100) % 360;
      ctx.fillStyle = `hsl(${crownHue},100%,65%)`;
      ctx.shadowColor = `hsl(${crownHue},100%,65%)`; ctx.shadowBlur = 16;
      [[8, 18],[16, 24],[22, 20],[30, 26],[36, 16]].forEach(([cx2, ch]) => {
        ctx.fillRect(DINO_X + cx2, y - 22 - ch, 5, ch);
      });
      // Laser eye
      ctx.fillStyle = "#ff0000"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 20;
      ctx.fillRect(DINO_X + 28, y - 16, 10, 10);
      if (Math.sin(wt * 10) > 0) {
        ctx.fillStyle = `hsl(${crownHue},100%,70%)`; ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(DINO_X + 40, y - 10); ctx.lineTo(DINO_X + 90 + Math.sin(wt * 13) * 10, y - 5);
        ctx.lineTo(DINO_X + 70, y + 2); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = C.body;
      const lo = Math.sin(lf * 0.005) * 8;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 15, 14, 15 + lo);
      ctx.fillRect(DINO_X + 24, y + DINO_H - 15, 14, 15 - lo);
      ctx.restore();
    }

    function drawDino(y: number, lf: number, wt: number, lv: number) {
      const C = EVO[lv];
      ctx.save(); applyEvoGlow(lv);
      switch (lv) {
        case 0:  drawLevel0(y, lf, C); break;
        case 1:  drawLevel1(y, lf, C); break;
        case 2:  drawLevel2(y, lf, wt, C); break;
        case 3:  drawLevel3(y, lf, C); break;
        case 4:  drawLevel4(y, lf, wt, C); break;
        case 5:  drawLevel5(y, lf, wt, C); break;
        case 6:  drawLevel6(y, lf, wt, C); break;
        case 7:  drawLevel7(y, lf, wt, C); break;
        case 8:  drawLevel8(y, lf, wt, C); break;
        case 9:  drawLevel9Voidwing(y, lf, wt, C); break;
        case 10: drawLevel10NebulaRex(y, lf, wt, C); break;
        default: drawLevel9(y, lf, wt, C); break; // lv 11 = DRAGON GOD (existing)
      }
      ctx.restore();
    }

    function drawTransformFlash(flash: number, lv: number) {
      if (flash <= 0) return;
      const C = EVO[lv];
      ctx.save();
      ctx.globalAlpha = flash * 0.45;
      ctx.fillStyle = C.body; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = flash;
      ctx.strokeStyle = C.acc; ctx.lineWidth = 4;
      ctx.shadowColor = C.glow; ctx.shadowBlur = 24;
      const r = (1 - flash) * 180 + 24;
      ctx.beginPath(); ctx.arc(DINO_X + DINO_W / 2, s.dy + DINO_H / 2, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(DINO_X + DINO_W / 2, s.dy + DINO_H / 2, r * 0.6, 0, Math.PI * 2); ctx.stroke();
      if (flash > 0.35) {
        ctx.globalAlpha = (flash - 0.35) / 0.65;
        ctx.fillStyle = C.acc;
        ctx.font = `bold ${14 + lv}px 'Press Start 2P', monospace`;
        ctx.textAlign = "center"; ctx.shadowBlur = 36;
        ctx.fillText(C.name + "!", CANVAS_W / 2, CANVAS_H / 2 - 8);
        if (lv === EVO_MAX) {
          ctx.font = "10px 'Press Start 2P', monospace";
          ctx.fillStyle = "#ffffff";
          ctx.fillText("FINAL FORM", CANVAS_W / 2, CANVAS_H / 2 + 14);
        }
      }
      ctx.restore();
    }

    function drawStar(star: StarObj) {
      ctx.save(); ctx.translate(star.x, star.y); ctx.rotate(star.angle);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const oa = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const ia = oa + (2 * Math.PI) / 10;
        if (i === 0) ctx.moveTo(Math.cos(oa) * star.radius, Math.sin(oa) * star.radius);
        else         ctx.lineTo(Math.cos(oa) * star.radius, Math.sin(oa) * star.radius);
        ctx.lineTo(Math.cos(ia) * star.radius * 0.45, Math.sin(ia) * star.radius * 0.45);
      }
      ctx.closePath();
      // Show point value inside big stars
      ctx.fillStyle = "#ffcc00"; ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 14; ctx.fill();
      if (star.points >= 5) {
        ctx.fillStyle = "#1a0800";
        ctx.font = `bold ${Math.floor(star.radius * 0.9)}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowBlur = 0;
        ctx.fillText(String(star.points), 0, 0);
      }
      ctx.restore();
    }

    function drawObstacle(ob: Obstacle) {
      ctx.save(); ctx.fillStyle = "#ff4444"; ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 10;
      if (ob.type === "cactus") {
        ctx.fillRect(ob.x + ob.w / 2 - 6, ob.y, 12, ob.h);
        ctx.fillRect(ob.x + ob.w / 2 - 20, ob.y + ob.h * 0.3, 14, 8);
        ctx.fillRect(ob.x + ob.w / 2 + 6,  ob.y + ob.h * 0.4, 14, 8);
        ctx.fillRect(ob.x + ob.w / 2 - 20, ob.y + ob.h * 0.1, 6,  ob.h * 0.25);
        ctx.fillRect(ob.x + ob.w / 2 + 14, ob.y + ob.h * 0.2, 6,  ob.h * 0.2);
      } else {
        ctx.fillRect(ob.x, ob.y, ob.w, 14);
        const wy = Math.sin(s.wingT * 18) > 0 ? ob.y - 8 : ob.y + 8;
        ctx.fillRect(ob.x + 4, wy, ob.w - 8, 6);
        ctx.fillStyle = "#ff8800"; ctx.fillRect(ob.x + ob.w - 8, ob.y + 4, 8, 4);
      }
      ctx.restore();
    }

    function drawCloud(c: Cloud) {
      ctx.save(); ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w / 2, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + c.w * 0.3, c.y - 8, c.w * 0.3, 10, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }

    function randomObsInterval() {
      // 점프 체공시간(≈0.70s) + 착지후 반응 여유(0.30s) = 최소 1.00s 보장
      const jumpAirTime = (Math.abs(JUMP_VEL) * 2) / GRAVITY; // ~0.698s
      const MIN_SAFE = jumpAirTime + 0.30;                      // ~1.00s
      // 속도가 빠를수록 간격 더 짧아져서 더 빡빡해짐
      const base = 1.55 - (s.speed - BASE_SPEED) / 220;
      const raw  = base * (0.65 + Math.random() * 0.45);
      return Math.max(MIN_SAFE, raw);
    }

    function spawnWave() {
      // 선인장 장애물만 생성 (bird 제거)
      const h = Math.random() * 35 + 28;
      const y = GROUND_Y - h;
      s.obstacles.push({ x: CANVAS_W + 10, w: 36, h, type: "cactus", y, passed: false });
      if (s.speed > 500 && Math.random() < 0.4) {
        const gap = 60 + Math.random() * 44;
        const h2 = Math.random() * 28 + 28;
        s.obstacles.push({ x: CANVAS_W + 10 + gap, w: 36, h: h2, type: "cactus", y: GROUND_Y - h2, passed: false });
      }
      if (s.speed > 700 && Math.random() < 0.25) {
        const h3 = Math.random() * 24 + 28;
        s.obstacles.push({ x: CANVAS_W + 120 + Math.random() * 30, w: 36, h: h3, type: "cactus", y: GROUND_Y - h3, passed: false });
      }
    }

    function checkCollision(ob: Obstacle) {
      return (DINO_X + DINO_W - 6) > ob.x + 4 && (DINO_X + 6) < ob.x + ob.w - 4 &&
             (s.dy + DINO_H) > ob.y + 4 && (s.dy + 4) < ob.y + ob.h;
    }

    function spawnStar() {
      const ptIdx = Math.floor(Math.random() * STAR_POINT_TABLE.length);
      const pts = STAR_POINT_TABLE[ptIdx];
      const isBig = pts >= 5;
      s.stars.push({
        x: CANVAS_W + 10, y: GROUND_Y - 52 - Math.random() * 100,
        radius: isBig ? 20 : pts >= 3 ? 16 : 13,
        points: pts, angle: 0,
      });
    }

    // ── Main loop ─────────────────────────────────────────────────────────────
    function loop(ts: number) {
      if (s.gameOver) return;
      if (s.lastTime === 0) { s.lastTime = ts; rafRef.current = requestAnimationFrame(loop); return; }

      const dt = Math.min((ts - s.lastTime) / 1000, 0.033);
      s.lastTime = ts;
      s.elapsed += dt;
      onTimeChange(s.elapsed * 1000);

      if (s.elapsed >= maxTime) {
        s.gameOver = true; createHitSound(getAudio()); onGameOver(s.score); return;
      }

      // 지수형 가속: 초반 완만, 중반부터 급격히 빨라짐
      // speed = BASE + 선형(t*18) + 지수(e^(t/30)-1)*120
      s.speed = BASE_SPEED
        + s.elapsed * 18
        + (Math.exp(s.elapsed / 30) - 1) * 120;

      const speedTier = Math.floor((s.speed - BASE_SPEED) / 80);
      if (speedTier > s.lastSpeedTier) { createSpeedUpSound(getAudio()); s.lastSpeedTier = speedTier; }

      // 공동점수 방지: 매 프레임 극소량의 난수 보너스 (플레이어마다 다른 누적값)
      s.scoreExact += dt * 0.004 * Math.random();

      // 매 초 생존 보너스 (속도 비례 + 시간 솔트)
      const survSecond = Math.floor(s.elapsed);
      if (survSecond > s.lastSurvivalBonus) {
        s.lastSurvivalBonus = survSecond;
        const microBonus = (s.speed / BASE_SPEED) * (0.07 + Math.random() * 0.11)
          + s.elapsed * 0.003 * Math.random(); // 시간이 길수록 격차 커짐
        s.scoreExact += microBonus;
        s.score = Math.round(s.scoreExact);
        onScoreChange(s.score);
      }

      s.wingT += dt;
      if (s.transformFlash > 0) s.transformFlash = Math.max(0, s.transformFlash - dt * 2.2);

      // Physics
      const wasOnGround = s.dy >= GROUND_Y - DINO_H - 2;
      s.dvy += GRAVITY * dt;
      s.dy  += s.dvy * dt;
      const nowOnGround = s.dy >= GROUND_Y - DINO_H;
      if (nowOnGround) {
        s.dy = GROUND_Y - DINO_H; s.dvy = 0; s.jumpsLeft = 1;
        if (!wasOnGround) createLandSound(getAudio());
      }

      // Spawn
      s.obsTimer += dt;
      if (s.obsTimer >= s.nextObsInterval) { spawnWave(); s.nextObsInterval = randomObsInterval(); s.obsTimer = 0; }
      s.starTimer += dt;
      if (s.starTimer >= STAR_SPAWN_INTERVAL) { spawnStar(); s.starTimer = 0; }
      s.cloudTimer += dt;
      if (s.cloudTimer >= CLOUD_SPAWN_INTERVAL) {
        s.clouds.push({ x: CANVAS_W + 10, y: 30 + Math.random() * 60, w: 64 + Math.random() * 70 });
        s.cloudTimer = 0;
      }

      // Move obstacles + evolution tracking
      s.obstacles = s.obstacles.filter(ob => {
        ob.x -= s.speed * dt;
        if (checkCollision(ob)) { s.gameOver = true; createHitSound(getAudio()); onGameOver(s.score); return false; }
        if (!ob.passed && ob.x + ob.w < DINO_X - 2) {
          ob.passed = true;
          s.obstaclesPassed++;
          createWhooshSound(getAudio());
          const newLevel = Math.min(Math.floor(s.obstaclesPassed / EVO_EVERY), EVO_MAX);
          if (newLevel > s.evoLevel) {
            s.evoLevel = newLevel;
            s.transformFlash = 1.0;
            createTransformSound(getAudio(), newLevel);
          }
          // 장애물 통과 보너스: 속도 + 경과시간 솔트 → 절대 동점 불가
          const passBonus = (s.speed / 900) * (0.4 + Math.random() * 0.5)
            + s.elapsed * 0.007 * (0.8 + Math.random() * 0.4);
          s.scoreExact += passBonus;
          s.score = Math.round(s.scoreExact);
          onScoreChange(s.score);
        }
        return ob.x > -100;
      });

      // Stars — combo multiplier
      s.stars = s.stars.filter(star => {
        star.x -= s.speed * dt; star.angle += STAR_SPIN * dt;
        if (Math.abs(star.x - (DINO_X + DINO_W / 2)) < star.radius + 18 &&
            Math.abs(star.y - (s.dy + DINO_H / 2))   < star.radius + 22) {
          const comboWindow = 2.5;
          if (s.elapsed - s.lastComboTime < comboWindow) {
            s.comboStreak = Math.min(s.comboStreak + 1, 8);
          } else {
            s.comboStreak = 1;
          }
          s.lastComboTime = s.elapsed;
          const comboMult = 1 + Math.min(s.comboStreak - 1, 7) * 0.15;
          const starExact = star.points * comboMult + Math.random() * 0.09;
          s.scoreExact += starExact;
          s.score = Math.round(s.scoreExact);
          onScoreChange(s.score);
          createStarSound(getAudio(), 0.8 + s.comboStreak * 0.08);
          return false;
        }
        return star.x > -50;
      });

      s.clouds = s.clouds.filter(c => { c.x -= s.speed * 0.28 * dt; return c.x > -130; });

      if (s.dy >= GROUND_Y - DINO_H - 2) s.legF += s.speed * dt;

      s.dust = s.dust.filter(p => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += DUST_G * dt; p.life -= DUST_DECAY * dt;
        return p.life > 0;
      });

      // ── Render ──────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, "#040810"); bg.addColorStop(1, "#0d1c2e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      for (let i = 0; i < 56; i++) {
        const bx = ((i * 173 + s.elapsed * 14) % CANVAS_W);
        const by = (i * 37) % (GROUND_Y - 20);
        ctx.fillStyle = `rgba(180,220,255,${0.18 + (i % 5) * 0.09})`;
        ctx.fillRect(bx, by, 1.5, 1.5);
      }

      s.clouds.forEach(drawCloud);

      ctx.fillStyle = "#132d1e"; ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
      ctx.fillStyle = EVO[s.evoLevel].body; ctx.fillRect(0, GROUND_Y, CANVAS_W, 2);
      for (let i = 0; i < 10; i++) {
        const gx = ((i * 100 + s.elapsed * s.speed * 0.5) % CANVAS_W);
        ctx.fillStyle = "rgba(42,255,143,0.13)"; ctx.fillRect(gx, GROUND_Y + 5, 44, 2);
      }

      // Evo progress bar (top-right)
      if (s.evoLevel < EVO_MAX) {
        const prog = (s.obstaclesPassed % EVO_EVERY) / EVO_EVERY;
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(CANVAS_W - 100, 10, 88, 10);
        ctx.fillStyle = EVO[s.evoLevel].acc;
        ctx.shadowColor = EVO[s.evoLevel].glow; ctx.shadowBlur = 6;
        ctx.fillRect(CANVAS_W - 100, 10, 88 * prog, 10);
        ctx.shadowBlur = 0;
        ctx.fillStyle = EVO[s.evoLevel].acc;
        ctx.font = "7px 'Press Start 2P', monospace";
        ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText(`LV${s.evoLevel + 1} ${EVO[s.evoLevel].name}`, CANVAS_W - 6, 10);
      }

      s.obstacles.forEach(drawObstacle);
      s.stars.forEach(drawStar);

      s.dust.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.life * 0.55;
        ctx.fillStyle = EVO[s.evoLevel].body;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // Combo indicator
      if (s.comboStreak >= 2 && s.elapsed - s.lastComboTime < 1.5) {
        const cm = 1 + Math.min(s.comboStreak - 1, 7) * 0.15;
        ctx.save();
        ctx.fillStyle = "#ffcc00"; ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 12;
        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`COMBO x${cm.toFixed(1)}`, DINO_X + DINO_W + 8, s.dy - 10);
        ctx.restore();
      }

      drawDino(s.dy, s.legF, s.wingT, s.evoLevel);
      drawTransformFlash(s.transformFlash, s.evoLevel);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
  }, [playing, maxTime, onScoreChange, onTimeChange, onGameOver, getAudio]);

  return (
    <div
      className="relative border-2 border-neon-green/40 rounded overflow-hidden cursor-pointer w-full select-none"
      style={{ boxShadow: "0 0 30px hsl(var(--neon-green) / 0.15)" }}
      onClick={jump}
      onTouchStart={e => { e.preventDefault(); jump(); }}
    >
      {/* Canvas scales to fill container width, preserving aspect ratio */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </div>
  );
};

export default DinoGame;
