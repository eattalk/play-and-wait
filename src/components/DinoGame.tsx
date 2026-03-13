import { useEffect, useRef, useCallback } from "react";

interface DinoGameProps {
  playing: boolean;
  maxTime: number; // seconds
  onScoreChange: (score: number) => void;
  onTimeChange: (ms: number) => void;
  onGameOver: (finalScore: number) => void;
}

// ---- Audio helpers ----
function createJumpSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

function createStarSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

function createHitSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

// ---- Game constants (all per-second) ----
const CANVAS_W = 700;
const CANVAS_H = 220;
const GROUND_Y = 170;
const DINO_X = 80;
const DINO_W = 36;
const DINO_H = 44;

// Physics (per-second²)
const GRAVITY = 2520;       // was 0.7/frame → 0.7 * 60² ≈ 2520 px/s²
// Velocity (per-second)
const JUMP_VEL = -840;      // was -14/frame → -14 * 60 = -840 px/s
// Speed (px/s)
const BASE_SPEED = 300;     // was 5/frame → 5 * 60 = 300 px/s
// Speed ramp (px/s per second of gameplay)
const SPEED_RAMP = 2.4;     // was 0.04/frame/s → 0.04 * 60 = 2.4 px/s/s

// Spawn intervals (seconds)
const STAR_SPAWN_INTERVAL = 70 / 60;   // was every 70 frames
const CLOUD_SPAWN_INTERVAL = 3.0;       // was every 180 frames

// Dust particle speeds (per-second)
const DUST_VX_SCALE = 180;   // was ±3/frame → ±3 * 60
const DUST_VY_SCALE = -120;  // was -2/frame → -2 * 60
const DUST_GRAVITY = 360;    // was +0.1/frame → 0.1 * 60² ≈ 360 px/s²
const DUST_DECAY = 3.0;      // was 0.05/frame → 0.05 * 60

// Star rotation (rad/s)
const STAR_SPIN = 3.0;       // was 0.05 rad/frame → 0.05 * 60

interface Obstacle {
  x: number;
  w: number;
  h: number;
  type: "cactus" | "bird";
  y: number;
}

interface StarObj {
  x: number;
  y: number;
  radius: number;
  points: number;
  angle: number;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
}

interface DustParticle {
  x: number;
  y: number;
  life: number;
  vx: number; // px/s
  vy: number; // px/s
}

const DinoGame = ({ playing, maxTime, onScoreChange, onTimeChange, onGameOver }: DinoGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    dinoY: GROUND_Y - DINO_H,
    dinoVY: 0,          // px/s
    jumpsLeft: 2,
    obstacles: [] as Obstacle[],
    stars: [] as StarObj[],
    clouds: [] as Cloud[],
    score: 0,
    speed: BASE_SPEED,  // px/s
    elapsed: 0,         // total seconds since game start
    legFrame: 0,        // accumulator for leg animation (unitless)
    gameOver: false,
    dustParticles: [] as DustParticle[],
    // Spawn timers (seconds)
    obstacleTimer: 0,
    starTimer: 0,
    cloudTimer: 0,
    // RAF loop guard
    lastTime: 0,
    // Wing flap accumulator for birds
    wingTime: 0,
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
          x: DINO_X + DINO_W / 2,
          y: GROUND_Y,
          life: 1,
          vx: (Math.random() - 0.5) * DUST_VX_SCALE,
          vy: -Math.random() * Math.abs(DUST_VY_SCALE),
        });
      }
    }
  }, [getAudioCtx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playing) return;

    // Cancel any existing RAF loop before starting a new one
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    const s = stateRef.current;
    s.gameOver = false;
    s.score = 0;
    s.speed = BASE_SPEED;
    s.elapsed = 0;
    s.dinoY = GROUND_Y - DINO_H;
    s.dinoVY = 0;
    s.jumpsLeft = 2;
    s.obstacles = [];
    s.stars = [];
    s.clouds = [
      { x: 200, y: 40, w: 80 },
      { x: 500, y: 60, w: 60 },
    ];
    s.dustParticles = [];
    s.obstacleTimer = 0;
    s.starTimer = 0;
    s.cloudTimer = 0;
    s.legFrame = 0;
    s.wingTime = 0;
    s.lastTime = 0; // will be set on first frame

    const ctx = canvas.getContext("2d")!;

    const C = {
      bg: "#0a0e1a",
      ground: "#1a3a2a",
      groundLine: "#2aff8f",
      dino: "#2aff8f",
      dinoEye: "#0a0e1a",
      obstacle: "#ff4444",
      star: "#ffcc00",
      cloud: "#1a2a3a",
      score: "#2aff8f",
      timer: "#88aacc",
      dust: "#2aff8f",
    };

    function drawDino(y: number, legF: number) {
      ctx.save();
      ctx.fillStyle = C.dino;
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 12);
      ctx.fillRect(DINO_X + 8, y - 16, 22, 18);
      ctx.fillStyle = C.dinoEye;
      ctx.fillRect(DINO_X + 22, y - 12, 5, 5);
      ctx.fillStyle = C.dino;
      ctx.fillRect(DINO_X + 24, y - 6, 10, 4);
      ctx.fillRect(DINO_X - 10, y + 4, 14, 8);
      const legOffset = Math.sin(legF * 0.005) * 6;
      ctx.fillRect(DINO_X + 4, y + DINO_H - 16, 10, 14 + legOffset);
      ctx.fillRect(DINO_X + 18, y + DINO_H - 16, 10, 14 - legOffset);
      ctx.restore();
    }

    function drawStar(star: StarObj) {
      const { x, y, radius, angle } = star;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerA = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const innerA = outerA + (2 * Math.PI) / 10;
        if (i === 0) ctx.moveTo(Math.cos(outerA) * radius, Math.sin(outerA) * radius);
        else ctx.lineTo(Math.cos(outerA) * radius, Math.sin(outerA) * radius);
        ctx.lineTo(Math.cos(innerA) * (radius * 0.45), Math.sin(innerA) * (radius * 0.45));
      }
      ctx.closePath();
      ctx.fillStyle = C.star;
      ctx.shadowColor = C.star;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }

    function drawObstacle(ob: Obstacle) {
      ctx.save();
      ctx.fillStyle = C.obstacle;
      ctx.shadowColor = C.obstacle;
      ctx.shadowBlur = 8;
      if (ob.type === "cactus") {
        ctx.fillRect(ob.x + ob.w / 2 - 6, ob.y, 12, ob.h);
        ctx.fillRect(ob.x + ob.w / 2 - 20, ob.y + ob.h * 0.3, 14, 8);
        ctx.fillRect(ob.x + ob.w / 2 + 6, ob.y + ob.h * 0.4, 14, 8);
        ctx.fillRect(ob.x + ob.w / 2 - 20, ob.y + ob.h * 0.1, 6, ob.h * 0.25);
        ctx.fillRect(ob.x + ob.w / 2 + 14, ob.y + ob.h * 0.2, 6, ob.h * 0.2);
      } else {
        ctx.fillRect(ob.x, ob.y, ob.w, 14);
        // wing flap driven by time, not frameCount
        const wingY = Math.sin(s.wingTime * 18) > 0 ? ob.y - 8 : ob.y + 8;
        ctx.fillRect(ob.x + 4, wingY, ob.w - 8, 6);
        ctx.fillStyle = "#ff8800";
        ctx.fillRect(ob.x + ob.w - 8, ob.y + 4, 8, 4);
      }
      ctx.restore();
    }

    function drawCloud(cloud: Cloud) {
      ctx.save();
      ctx.fillStyle = C.cloud;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.w / 2, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + cloud.w * 0.3, cloud.y - 8, cloud.w * 0.3, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function spawnObstacle() {
      const isBird = s.speed > 480 && Math.random() < 0.3; // was speed > 8 px/frame → 480 px/s
      const h = isBird ? 20 : Math.random() * 30 + 30;
      const y = isBird ? GROUND_Y - DINO_H - 10 - Math.random() * 30 : GROUND_Y - h;
      s.obstacles.push({
        x: CANVAS_W + 10,
        w: isBird ? 40 : 32,
        h,
        type: isBird ? "bird" : "cactus",
        y,
      });
    }

    function spawnStar() {
      s.stars.push({
        x: CANVAS_W + 10,
        y: GROUND_Y - 50 - Math.random() * 80,
        radius: Math.random() < 0.2 ? 18 : 12,
        points: Math.random() < 0.2 ? 5 : 1,
        angle: 0,
      });
    }

    function checkCollision(ob: Obstacle): boolean {
      const dinoLeft = DINO_X + 6;
      const dinoRight = DINO_X + DINO_W - 6;
      const dinoTop = s.dinoY + 4;
      const dinoBottom = s.dinoY + DINO_H;
      return (
        dinoRight > ob.x + 4 &&
        dinoLeft < ob.x + ob.w - 4 &&
        dinoBottom > ob.y + 4 &&
        dinoTop < ob.y + ob.h
      );
    }

    function loop(ts: number) {
      if (s.gameOver) return;

      // Initialize lastTime on the very first frame
      if (s.lastTime === 0) {
        s.lastTime = ts;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Delta time in seconds, clamped to prevent tab-switch spikes
      const dt = Math.min((ts - s.lastTime) / 1000, 0.033);
      s.lastTime = ts;

      s.elapsed += dt;
      onTimeChange(s.elapsed * 1000);

      // Hard time limit
      if (s.elapsed >= maxTime) {
        s.gameOver = true;
        createHitSound(getAudioCtx());
        onGameOver(s.score);
        return;
      }

      // Speed ramp (px/s, increases over time)
      s.speed = BASE_SPEED + s.elapsed * SPEED_RAMP;
      s.wingTime += dt;

      // Physics (per-second)
      s.dinoVY += GRAVITY * dt;
      s.dinoY += s.dinoVY * dt;
      if (s.dinoY >= GROUND_Y - DINO_H) {
        s.dinoY = GROUND_Y - DINO_H;
        s.dinoVY = 0;
        s.jumpsLeft = 2;
      }

      // Spawn: obstacle interval scales with speed
      // spawnInterval: was Math.max(40, 90 - speed_px_per_frame * 6) frames
      // speed_px_per_frame = s.speed / 60
      // → Math.max(40/60, (90 - (s.speed/60)*6) / 60) seconds
      const spawnIntervalSec = Math.max(40 / 60, (90 - (s.speed / 60) * 6) / 60);
      s.obstacleTimer += dt;
      if (s.obstacleTimer >= spawnIntervalSec) {
        spawnObstacle();
        s.obstacleTimer = 0;
      }

      s.starTimer += dt;
      if (s.starTimer >= STAR_SPAWN_INTERVAL) {
        spawnStar();
        s.starTimer = 0;
      }

      s.cloudTimer += dt;
      if (s.cloudTimer >= CLOUD_SPAWN_INTERVAL) {
        s.clouds.push({ x: CANVAS_W + 10, y: 30 + Math.random() * 50, w: 60 + Math.random() * 60 });
        s.cloudTimer = 0;
      }

      // Move obstacles
      s.obstacles = s.obstacles.filter(ob => {
        ob.x -= s.speed * dt;
        if (checkCollision(ob)) {
          s.gameOver = true;
          createHitSound(getAudioCtx());
          onGameOver(s.score);
          return false;
        }
        return ob.x > -100;
      });

      // Move stars
      s.stars = s.stars.filter(star => {
        star.x -= s.speed * dt;
        star.angle += STAR_SPIN * dt;
        const cx = star.x;
        const cy = star.y;
        const dinoMidX = DINO_X + DINO_W / 2;
        const dinoMidY = s.dinoY + DINO_H / 2;
        if (Math.abs(cx - dinoMidX) < star.radius + 16 && Math.abs(cy - dinoMidY) < star.radius + 20) {
          s.score += star.points;
          onScoreChange(s.score);
          createStarSound(getAudioCtx());
          return false;
        }
        return star.x > -50;
      });

      // Move clouds (30% of game speed)
      s.clouds = s.clouds.filter(c => {
        c.x -= s.speed * 0.3 * dt;
        return c.x > -100;
      });

      // Leg animation (only when on ground, speed-proportional)
      if (s.dinoY >= GROUND_Y - DINO_H - 2) {
        s.legFrame += s.speed * dt;
      }

      // Dust particles
      s.dustParticles = s.dustParticles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += DUST_GRAVITY * dt;
        p.life -= DUST_DECAY * dt;
        return p.life > 0;
      });

      // ---- Draw ----
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, "#040810");
      grad.addColorStop(1, "#0d1c2e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Background stars (scroll driven by elapsed time, not frameCount)
      for (let i = 0; i < 40; i++) {
        const bx = ((i * 173 + s.elapsed * 12) % CANVAS_W);
        const by = (i * 37) % (GROUND_Y - 20);
        ctx.fillStyle = `rgba(180,220,255,${0.2 + (i % 5) * 0.1})`;
        ctx.fillRect(bx, by, 1, 1);
      }

      // Clouds
      s.clouds.forEach(drawCloud);

      // Ground
      ctx.fillStyle = "#1a3a2a";
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
      ctx.fillStyle = "#2aff8f";
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 2);
      // Ground details (scroll by elapsed * speed)
      for (let i = 0; i < 8; i++) {
        const gx = ((i * 90 + s.elapsed * s.speed * 0.5) % CANVAS_W);
        ctx.fillStyle = "rgba(42,255,143,0.15)";
        ctx.fillRect(gx, GROUND_Y + 4, 40, 2);
      }

      // Obstacles
      s.obstacles.forEach(drawObstacle);

      // Stars
      s.stars.forEach(drawStar);

      // Dust
      s.dustParticles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life * 0.6;
        ctx.fillStyle = C.dust;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Dino
      drawDino(s.dinoY, s.legFrame);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [playing, maxTime, onScoreChange, onTimeChange, onGameOver, getAudioCtx]);

  return (
    <div
      className="relative border-2 border-neon-green/40 rounded overflow-hidden cursor-pointer"
      style={{ boxShadow: "0 0 30px hsl(var(--neon-green) / 0.15)" }}
      onClick={jump}
      onTouchStart={e => { e.preventDefault(); jump(); }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="block max-w-full"
      />
    </div>
  );
};

export default DinoGame;
