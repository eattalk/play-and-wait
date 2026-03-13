import { useEffect, useRef } from "react";

// Lightweight auto-play demo canvas for the instructions screen
const CW = 700, CH = 180, GY = 140;
const DX = 80, DW = 36, DH = 44;
const GRAV = 2520, JV = -840;

const GameDemoCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const state = {
      dy: GY - DH, dvy: 0,
      obstacles: [{ x: CW + 50, h: 44 }, { x: CW + 320, h: 32 }] as { x: number; h: number }[],
      stars: [] as { x: number; y: number; angle: number }[],
      speed: 280, elapsed: 0, lastTime: 0,
      autoJumpTimer: 0, nextJump: 1.2,
      starTimer: 0, obstacleTimer: 0, nextObs: 1.5,
    };

    function loop(ts: number) {
      if (state.lastTime === 0) { state.lastTime = ts; rafRef.current = requestAnimationFrame(loop); return; }
      const dt = Math.min((ts - state.lastTime) / 1000, 0.033);
      state.lastTime = ts;
      state.elapsed += dt;

      // Auto jump
      state.autoJumpTimer += dt;
      if (state.autoJumpTimer >= state.nextJump) {
        if (state.dy >= GY - DH - 2) {
          state.dvy = JV;
          state.nextJump = 1.0 + Math.random() * 0.8;
          state.autoJumpTimer = 0;
        }
      }

      // Physics
      state.dvy += GRAV * dt;
      state.dy += state.dvy * dt;
      if (state.dy >= GY - DH) { state.dy = GY - DH; state.dvy = 0; }

      // Obstacles
      state.obstacleTimer += dt;
      if (state.obstacleTimer >= state.nextObs) {
        state.obstacles.push({ x: CW + 10, h: 30 + Math.random() * 28 });
        state.nextObs = 1.0 + Math.random() * 1.0;
        state.obstacleTimer = 0;
      }
      state.obstacles = state.obstacles.filter(o => { o.x -= state.speed * dt; return o.x > -60; });

      // Stars
      state.starTimer += dt;
      if (state.starTimer > 1.5) {
        state.stars.push({ x: CW + 10, y: GY - 55 - Math.random() * 50, angle: 0 });
        state.starTimer = 0;
      }
      state.stars = state.stars.filter(st => { st.x -= state.speed * dt; st.angle += 3 * dt; return st.x > -30; });

      // Draw
      ctx.clearRect(0, 0, CW, CH);
      const grad = ctx.createLinearGradient(0, 0, 0, CH);
      grad.addColorStop(0, "#040810"); grad.addColorStop(1, "#0d1c2e");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH);

      // Stars bg
      for (let i = 0; i < 25; i++) {
        const bx = ((i * 173 + state.elapsed * 12) % CW);
        const by = (i * 37) % (GY - 10);
        ctx.fillStyle = `rgba(180,220,255,${0.15 + (i % 4) * 0.1})`;
        ctx.fillRect(bx, by, 1, 1);
      }

      // Ground
      ctx.fillStyle = "#1a3a2a"; ctx.fillRect(0, GY, CW, CH - GY);
      ctx.fillStyle = "#2aff8f"; ctx.fillRect(0, GY, CW, 2);

      // Obstacles
      state.obstacles.forEach(ob => {
        ctx.save();
        ctx.fillStyle = "#ff4444"; ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 8;
        const ox = ob.x + 16 - 6, oy = GY - ob.h;
        ctx.fillRect(ox, oy, 12, ob.h);
        ctx.fillRect(ox - 14, oy + ob.h * 0.3, 14, 8);
        ctx.fillRect(ox + 12, oy + ob.h * 0.4, 14, 8);
        ctx.restore();
      });

      // Stars
      state.stars.forEach(st => {
        ctx.save();
        ctx.translate(st.x, st.y); ctx.rotate(st.angle);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const oa = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const ia = oa + (2 * Math.PI) / 10;
          if (i === 0) ctx.moveTo(Math.cos(oa) * 11, Math.sin(oa) * 11);
          else ctx.lineTo(Math.cos(oa) * 11, Math.sin(oa) * 11);
          ctx.lineTo(Math.cos(ia) * 5, Math.sin(ia) * 5);
        }
        ctx.closePath();
        ctx.fillStyle = "#ffcc00"; ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 10;
        ctx.fill(); ctx.restore();
      });

      // Dino
      ctx.save();
      ctx.fillStyle = "#2aff8f"; ctx.shadowColor = "#2aff8f"; ctx.shadowBlur = 10;
      ctx.fillRect(DX, state.dy, DW, DH - 12);
      ctx.fillRect(DX + 8, state.dy - 14, 22, 18);
      ctx.fillStyle = "#0a0e1a";
      ctx.fillRect(DX + 22, state.dy - 10, 5, 5);
      ctx.fillStyle = "#2aff8f";
      ctx.fillRect(DX + 24, state.dy - 5, 10, 4);
      ctx.fillRect(DX - 8, state.dy + 4, 12, 7);
      const lf = state.elapsed * state.speed;
      const lo = Math.sin(lf * 0.005) * 6;
      ctx.fillRect(DX + 4, state.dy + DH - 15, 10, 13 + lo);
      ctx.fillRect(DX + 18, state.dy + DH - 15, 10, 13 - lo);
      ctx.restore();

      // HUD hint labels
      // Jump hint arrow when near obstacle
      const nearest = state.obstacles.find(o => o.x > DX && o.x < DX + 220);
      if (nearest && nearest.x < DX + 160) {
        ctx.save();
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = "#2aff8f";
        ctx.shadowColor = "#2aff8f"; ctx.shadowBlur = 8;
        ctx.fillText("JUMP!", DX + 10, state.dy - 22);
        // Arrow up
        ctx.beginPath();
        ctx.moveTo(DX + 18, state.dy - 30);
        ctx.lineTo(DX + 12, state.dy - 18);
        ctx.lineTo(DX + 24, state.dy - 18);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // Star hint
      const nearStar = state.stars.find(st => st.x > DX && st.x < DX + 180 && Math.abs(st.y - (state.dy + DH / 2)) > 20);
      if (nearStar) {
        ctx.save();
        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffcc00"; ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 8;
        ctx.fillText("★ POINTS!", nearStar.x - 20, nearStar.y - 18);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
  }, []);

  return (
    <canvas
      ref={ref}
      width={CW}
      height={CH}
      className="block max-w-full rounded opacity-90"
    />
  );
};

export default GameDemoCanvas;
