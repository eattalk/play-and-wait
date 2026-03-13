import { useEffect, useRef } from "react";

// Demo canvas — same aspect ratio as main game (1000×300)
const CW = 1000, CH = 220, GY = 170;
const DX = 100, DW = 40, DH = 48;
const GRAV = 2520, JV = -860;

function playDemoJump(ctx: AudioContext) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(360, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
}

function playDemoLand(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.4;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf; src.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.25, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  src.start(ctx.currentTime);
}

function playDemoStar(ctx: AudioContext) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(700, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.1);
  g.gain.setValueAtTime(0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
}

const GameDemoCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const getAudio = () => {
      if (!audioRef.current)
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioRef.current.state === "suspended") audioRef.current.resume();
      return audioRef.current;
    };

    const s = {
      dy: GY - DH, dvy: 0, wasGround: true,
      obstacles: [{ x: CW + 60, h: 40 }, { x: CW + 380, h: 30 }] as { x: number; h: number }[],
      stars: [] as { x: number; y: number; angle: number }[],
      speed: 270, elapsed: 0, lastTime: 0,
      autoTimer: 0, nextJump: 1.1,
      starTimer: 0, obsTimer: 0, nextObs: 1.6,
    };

    function loop(ts: number) {
      if (s.lastTime === 0) { s.lastTime = ts; rafRef.current = requestAnimationFrame(loop); return; }
      const dt = Math.min((ts - s.lastTime) / 1000, 0.033);
      s.lastTime = ts; s.elapsed += dt;

      // Auto jump when near obstacle
      const nearest = s.obstacles.find(o => o.x > DX && o.x < DX + 220);
      s.autoTimer += dt;
      if (s.autoTimer >= s.nextJump || (nearest && nearest.x < DX + 140 && s.dy >= GY - DH - 2)) {
        if (s.dy >= GY - DH - 2) {
          s.dvy = JV;
          s.nextJump = 1.0 + Math.random() * 0.7;
          s.autoTimer = 0;
          try { playDemoJump(getAudio()); } catch (_) { /* ignore */ }
        }
      }

      const wasGround = s.dy >= GY - DH - 2;
      s.dvy += GRAV * dt; s.dy += s.dvy * dt;
      if (s.dy >= GY - DH) {
        s.dy = GY - DH; s.dvy = 0;
        if (!wasGround) try { playDemoLand(getAudio()); } catch (_) { /* ignore */ }
      }

      s.obsTimer += dt;
      if (s.obsTimer >= s.nextObs) {
        s.obstacles.push({ x: CW + 10, h: 28 + Math.random() * 32 });
        s.nextObs = 1.1 + Math.random() * 0.9; s.obsTimer = 0;
      }
      s.obstacles = s.obstacles.filter(o => { o.x -= s.speed * dt; return o.x > -60; });

      s.starTimer += dt;
      if (s.starTimer > 1.4) { s.stars.push({ x: CW + 10, y: GY - 56 - Math.random() * 56, angle: 0 }); s.starTimer = 0; }
      s.stars = s.stars.filter(st => {
        st.x -= s.speed * dt; st.angle += 3 * dt;
        if (Math.abs(st.x - (DX + DW / 2)) < 22 && Math.abs(st.y - (s.dy + DH / 2)) < 24) {
          try { playDemoStar(getAudio()); } catch (_) { /* ignore */ }
          return false;
        }
        return st.x > -30;
      });

      // ── Render ──────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, CW, CH);
      const grad = ctx.createLinearGradient(0, 0, 0, CH);
      grad.addColorStop(0, "#040810"); grad.addColorStop(1, "#0d1c2e");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH);

      for (let i = 0; i < 38; i++) {
        const bx = ((i * 173 + s.elapsed * 12) % CW);
        const by = (i * 37) % (GY - 10);
        ctx.fillStyle = `rgba(180,220,255,${0.15 + (i % 4) * 0.08})`; ctx.fillRect(bx, by, 1, 1);
      }

      ctx.fillStyle = "#132d1e"; ctx.fillRect(0, GY, CW, CH - GY);
      ctx.fillStyle = "#2aff8f"; ctx.fillRect(0, GY, CW, 2);

      s.obstacles.forEach(ob => {
        ctx.save(); ctx.fillStyle = "#ff4444"; ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 8;
        const ox = ob.x + 16 - 6, oy = GY - ob.h;
        ctx.fillRect(ox, oy, 12, ob.h);
        ctx.fillRect(ox - 14, oy + ob.h * 0.3, 14, 8);
        ctx.fillRect(ox + 12, oy + ob.h * 0.4, 14, 8);
        ctx.restore();
      });

      s.stars.forEach(st => {
        ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.angle);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const oa = (i * 4 * Math.PI) / 5 - Math.PI / 2, ia = oa + (2 * Math.PI) / 10;
          if (i === 0) ctx.moveTo(Math.cos(oa) * 12, Math.sin(oa) * 12);
          else         ctx.lineTo(Math.cos(oa) * 12, Math.sin(oa) * 12);
          ctx.lineTo(Math.cos(ia) * 5.5, Math.sin(ia) * 5.5);
        }
        ctx.closePath(); ctx.fillStyle = "#ffcc00"; ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 10; ctx.fill();
        ctx.restore();
      });

      // Dino
      ctx.save(); ctx.fillStyle = "#2aff8f"; ctx.shadowColor = "#2aff8f"; ctx.shadowBlur = 10;
      ctx.fillRect(DX, s.dy, DW, DH - 12);
      ctx.fillRect(DX + 8, s.dy - 14, 22, 18);
      ctx.fillStyle = "#0a0e1a"; ctx.fillRect(DX + 24, s.dy - 10, 5, 5);
      ctx.fillStyle = "#2aff8f";
      ctx.fillRect(DX + 26, s.dy - 5, 10, 4);
      ctx.fillRect(DX - 8, s.dy + 4, 12, 7);
      const lo = Math.sin(s.elapsed * s.speed * 0.005) * 6;
      ctx.fillRect(DX + 4,  s.dy + DH - 15, 10, 13 + lo);
      ctx.fillRect(DX + 20, s.dy + DH - 15, 10, 13 - lo);
      ctx.restore();

      // JUMP hint
      const closeOb = s.obstacles.find(o => o.x > DX && o.x < DX + 170);
      if (closeOb) {
        ctx.save();
        ctx.fillStyle = "#2aff8f"; ctx.shadowColor = "#2aff8f"; ctx.shadowBlur = 10;
        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.textAlign = "left";
        ctx.fillText("JUMP!", DX + 4, s.dy - 26);
        ctx.beginPath();
        ctx.moveTo(DX + 18, s.dy - 32); ctx.lineTo(DX + 12, s.dy - 20); ctx.lineTo(DX + 24, s.dy - 20);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // STAR hint
      const closeStar = s.stars.find(st => st.x > DX + 30 && st.x < DX + 200);
      if (closeStar) {
        ctx.save(); ctx.fillStyle = "#ffcc00"; ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 8;
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.textAlign = "left";
        ctx.fillText("★ +SCORE", closeStar.x - 30, closeStar.y - 22);
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
      style={{ display: "block", width: "100%", height: "auto" }}
      className="rounded opacity-90"
    />
  );
};

export default GameDemoCanvas;
