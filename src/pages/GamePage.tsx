import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import DinoGame from "@/components/DinoGame";
import GameDemoCanvas from "@/components/GameDemoCanvas";

// ── Single shared AudioContext — created on first user interaction ─────────────
let _ac: AudioContext | null = null;

async function initAC(): Promise<AudioContext> {
  if (!_ac || _ac.state === "closed")
    _ac = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ac.state === "suspended") await _ac.resume();
  return _ac;
}

function getAC(): AudioContext | null {
  return (_ac && _ac.state === "running") ? _ac : null;
}

// ── Intro jump sound ──────────────────────────────────────────────────────────
function playIntroJump() {
  const ctx = getAC(); if (!ctx) return;
  const t = ctx.currentTime;
  const o1 = ctx.createOscillator(), g1 = ctx.createGain();
  o1.type = "square";
  o1.frequency.setValueAtTime(500, t);
  o1.frequency.exponentialRampToValueAtTime(220, t + 0.18);
  g1.gain.setValueAtTime(0.22, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o1.connect(g1); g1.connect(ctx.destination);
  o1.start(t); o1.stop(t + 0.18);
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.type = "sine";
  o2.frequency.setValueAtTime(900, t);
  o2.frequency.exponentialRampToValueAtTime(400, t + 0.14);
  g2.gain.setValueAtTime(0.10, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o2.connect(g2); g2.connect(ctx.destination);
  o2.start(t); o2.stop(t + 0.14);
}

// ── 3-2-1 야무진 카운트다운 ───────────────────────────────────────────────────
function playCountdownBeep(n: number) {
  const ctx = getAC(); if (!ctx) return;
  const t = ctx.currentTime;
  if (n === 0) {
    const chords = [[523,659,784],[659,784,988],[784,988,1175],[1047,1319,1568]] as number[][];
    chords.forEach(([f1,f2,f3], i) => {
      [f1,f2,f3].forEach(freq => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i < 2 ? "square" : "sawtooth";
        o.frequency.setValueAtTime(freq, t + i * 0.08);
        g.gain.setValueAtTime(0.18, t + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.22);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.22);
      });
    });
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*(1-i/d.length);
    const ns = ctx.createBufferSource(), ng = ctx.createGain();
    ns.buffer = buf;
    ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t+0.08);
    ns.connect(ng); ng.connect(ctx.destination); ns.start(t);
  } else {
    const baseFreq = [220,330,440][n-1] ?? 440;
    const o1 = ctx.createOscillator(), g1 = ctx.createGain();
    o1.type = "square";
    o1.frequency.setValueAtTime(baseFreq*2, t);
    o1.frequency.exponentialRampToValueAtTime(baseFreq, t+0.22);
    g1.gain.setValueAtTime(0.35, t); g1.gain.exponentialRampToValueAtTime(0.001, t+0.28);
    o1.connect(g1); g1.connect(ctx.destination); o1.start(t); o1.stop(t+0.28);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "sine"; o2.frequency.setValueAtTime(baseFreq*0.5, t);
    g2.gain.setValueAtTime(0.25, t); g2.gain.exponentialRampToValueAtTime(0.001, t+0.30);
    o2.connect(g2); g2.connect(ctx.destination); o2.start(t); o2.stop(t+0.30);
    const buf = ctx.createBuffer(1, ctx.sampleRate*0.04, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*(1-i/d.length);
    const ns = ctx.createBufferSource(), ng = ctx.createGain();
    ns.buffer = buf;
    ng.gain.setValueAtTime(0.28, t); ng.gain.exponentialRampToValueAtTime(0.001, t+0.04);
    ns.connect(ng); ng.connect(ctx.destination); ns.start(t);
  }
}

// ── Goal fanfare ──────────────────────────────────────────────────────────────
function playGoalFanfare() {
  const ctx = getAC(); if (!ctx) return;
  const t = ctx.currentTime;
  [523,659,784,1047].forEach((freq,i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.setValueAtTime(freq, t+i*0.12);
    g.gain.setValueAtTime(0.22, t+i*0.12); g.gain.exponentialRampToValueAtTime(0.001, t+i*0.12+0.25);
    o.connect(g); g.connect(ctx.destination); o.start(t+i*0.12); o.stop(t+i*0.12+0.25);
  });
}
    const o1 = ctx.createOscillator(), g1 = ctx.createGain();
    o1.type = "square";
    o1.frequency.setValueAtTime(500, t);
    o1.frequency.exponentialRampToValueAtTime(220, t + 0.18);
    g1.gain.setValueAtTime(0.22, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o1.connect(g1); g1.connect(ctx.destination);
    o1.start(t); o1.stop(t + 0.18);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "sine";
    o2.frequency.setValueAtTime(900, t);
    o2.frequency.exponentialRampToValueAtTime(400, t + 0.14);
    g2.gain.setValueAtTime(0.10, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o2.connect(g2); g2.connect(ctx.destination);
    o2.start(t); o2.stop(t + 0.14);
  } catch (_) { /* ignore */ }
}

// ── 3-2-1 야무진 카운트다운 ───────────────────────────────────────────────────
function playCountdownBeep(n: number) {
  try {
    const ctx = getAC();
    const t = ctx.currentTime;
    if (n === 0) {
      const chords = [[523,659,784],[659,784,988],[784,988,1175],[1047,1319,1568]] as number[][];
      chords.forEach(([f1,f2,f3], i) => {
        [f1,f2,f3].forEach(freq => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = i < 2 ? "square" : "sawtooth";
          o.frequency.setValueAtTime(freq, t + i * 0.08);
          g.gain.setValueAtTime(0.18, t + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.22);
          o.connect(g); g.connect(ctx.destination);
          o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.22);
        });
      });
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*(1-i/d.length);
      const ns = ctx.createBufferSource(), ng = ctx.createGain();
      ns.buffer = buf;
      ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t+0.08);
      ns.connect(ng); ng.connect(ctx.destination); ns.start(t);
    } else {
      const baseFreq = [220,330,440][n-1] ?? 440;
      const o1 = ctx.createOscillator(), g1 = ctx.createGain();
      o1.type = "square";
      o1.frequency.setValueAtTime(baseFreq*2, t);
      o1.frequency.exponentialRampToValueAtTime(baseFreq, t+0.22);
      g1.gain.setValueAtTime(0.35, t); g1.gain.exponentialRampToValueAtTime(0.001, t+0.28);
      o1.connect(g1); g1.connect(ctx.destination); o1.start(t); o1.stop(t+0.28);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type = "sine"; o2.frequency.setValueAtTime(baseFreq*0.5, t);
      g2.gain.setValueAtTime(0.25, t); g2.gain.exponentialRampToValueAtTime(0.001, t+0.30);
      o2.connect(g2); g2.connect(ctx.destination); o2.start(t); o2.stop(t+0.30);
      const buf = ctx.createBuffer(1, ctx.sampleRate*0.04, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*(1-i/d.length);
      const ns = ctx.createBufferSource(), ng = ctx.createGain();
      ns.buffer = buf;
      ng.gain.setValueAtTime(0.28, t); ng.gain.exponentialRampToValueAtTime(0.001, t+0.04);
      ns.connect(ng); ng.connect(ctx.destination); ns.start(t);
    }
  } catch (_) { /* ignore */ }
}

// ── Goal fanfare ──────────────────────────────────────────────────────────────
function playGoalFanfare() {
  try {
    const ctx = getAC();
    const t = ctx.currentTime;
    [523,659,784,1047].forEach((freq,i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.setValueAtTime(freq, t+i*0.12);
      g.gain.setValueAtTime(0.22, t+i*0.12); g.gain.exponentialRampToValueAtTime(0.001, t+i*0.12+0.25);
      o.connect(g); g.connect(ctx.destination); o.start(t+i*0.12); o.stop(t+i*0.12+0.25);
    });
  } catch (_) { /* ignore */ }
}

// ── Chiptune BGM — uses same shared AudioContext ──────────────────────────────
class ChiptuneBGM {
  private masterGain: GainNode | null = null;
  private running = false;
  private noteIdx = 0;
  private beatTimer = 0;
  private rafId = 0;
  private lastTs = 0;

  private melody = [
    523,659,784,659,523,659,784,1047,
    880,784,659,784,523,659,523,392,
    523,659,784,880,784,659,523,659,
    392,523,659,523,392,330,392,523,
  ];
  private bass = [
    130,130,164,164,130,130,164,196,
    164,164,130,164,130,130,130,98,
    130,130,164,174,164,130,130,130,
    98,130,130,130,98,82,98,130,
  ];

  private getMaster(): { ctx: AudioContext; master: GainNode } {
    const ctx = getAC();
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.07, ctx.currentTime);
      this.masterGain.connect(ctx.destination);
    }
    return { ctx, master: this.masterGain };
  }

  private playNote(freq: number, bassFreq: number) {
    try {
      const { ctx, master } = this.getMaster();
      const t = ctx.currentTime;
      const dur = 0.13;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = "square"; osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t+dur);
      osc.connect(g); g.connect(master); osc.start(t); osc.stop(t+dur);
      const b = ctx.createOscillator(), bg = ctx.createGain();
      b.type = "triangle"; b.frequency.setValueAtTime(bassFreq, t);
      bg.gain.setValueAtTime(0.4, t); bg.gain.exponentialRampToValueAtTime(0.001, t+dur*1.5);
      b.connect(bg); bg.connect(master); b.start(t); b.stop(t+dur*1.5);
    } catch (_) { /* ignore */ }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    const BPM = 160, beatLen = 60/BPM;
    const tick = (ts: number) => {
      if (!this.running) return;
      if (this.lastTs === 0) { this.lastTs = ts; this.rafId = requestAnimationFrame(tick); return; }
      const dt = Math.min((ts-this.lastTs)/1000, 0.05);
      this.lastTs = ts;
      this.beatTimer += dt;
      if (this.beatTimer >= beatLen) {
        this.beatTimer -= beatLen;
        const idx = this.noteIdx % this.melody.length;
        this.playNote(this.melody[idx], this.bass[idx]);
        this.noteIdx++;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    try {
      const { ctx, master } = this.getMaster();
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      this.masterGain = null;
    } catch (_) { /* ignore */ }
  }

  close() { this.stop(); }
}

const MAX_TIME_BUFFER = 15;
const MAX_GAME_TIME = 50;
const GOAL_WARN_SECS = 7;

const GamePage = () => {
  const { game_type } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const table_name = searchParams.get("table_name") || "table1";

  const [phase, setPhase] = useState<"instructions" | "countdown" | "playing" | "waiting">("instructions");
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [autoStart, setAutoStart] = useState(5);
  const [showGoal, setShowGoal] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStartRef = useRef<number>(0);
  const bgmRef = useRef<ChiptuneBGM | null>(null);
  const goalPlayedRef = useRef(false);

  const goToResult = useCallback((finalScore: number) => {
    bgmRef.current?.close(); bgmRef.current = null;
    navigate(`/webview/games/result?score=${finalScore}`);
  }, [navigate]);

  const startGame = () => {
    if (autoStartRef.current) { clearInterval(autoStartRef.current); autoStartRef.current = null; }
    setPhase("countdown");
    setCountdown(3);
  };

  // 첫 인트로 상호작용: AudioContext 잠금 해제 + BGM 시작 + 점프 사운드
  const handleIntroInteraction = useCallback(() => {
    // 오디오 컨텍스트 활성화
    getAC();
    // 점프 사운드
    playIntroJump();
    // BGM 시작 (중복 방지)
    if (!bgmRef.current) bgmRef.current = new ChiptuneBGM();
    bgmRef.current.start();
    setAudioUnlocked(true);
  }, []);

  // Auto-start
  useEffect(() => {
    if (phase !== "instructions") return;
    setAutoStart(5);
    autoStartRef.current = setInterval(() => {
      setAutoStart(prev => {
        if (prev <= 1) {
          clearInterval(autoStartRef.current!);
          autoStartRef.current = null;
          setPhase("countdown");
          setCountdown(3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (autoStartRef.current) clearInterval(autoStartRef.current); };
  }, [phase]);

  // Space/ArrowUp → intro interaction
  useEffect(() => {
    if (phase !== "instructions") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); handleIntroInteraction(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleIntroInteraction]);

  // Countdown beeps
  useEffect(() => {
    if (phase !== "countdown") return;
    playCountdownBeep(countdown);
    if (countdown <= 0) {
      setPhase("playing");
      setShowGoal(false);
      goalPlayedRef.current = false;
      gameStartRef.current = Date.now();
      // BGM 이미 시작됐으면 유지, 아니면 시작
      if (!bgmRef.current) bgmRef.current = new ChiptuneBGM();
      bgmRef.current.start();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // 골인 warning
  useEffect(() => {
    if (phase !== "playing") return;
    const remainingSecs = MAX_GAME_TIME - gameTime / 1000;
    if (remainingSecs <= GOAL_WARN_SECS && !goalPlayedRef.current) {
      goalPlayedRef.current = true;
      setShowGoal(true);
      playGoalFanfare();
    }
  }, [phase, gameTime]);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setPhase("waiting");
    bgmRef.current?.stop();
    const elapsed = (Date.now() - gameStartRef.current) / 1000;
    const remaining = MAX_GAME_TIME + MAX_TIME_BUFFER - elapsed;
    const waitMs = Math.max(0, remaining * 1000);
    waitTimerRef.current = setTimeout(() => { goToResult(finalScore); }, waitMs);
  }, [goToResult]);

  useEffect(() => {
    return () => {
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
      bgmRef.current?.close(); bgmRef.current = null;
    };
  }, []);

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const remainingSecs = Math.max(0, MAX_GAME_TIME - Math.floor(gameTime / 1000));

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">

      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 70 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-foreground opacity-30"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
            }}
          />
        ))}
      </div>

      {/* ── Instructions ── */}
      {phase === "instructions" && (
        <div
          className="relative z-10 flex flex-col items-center justify-center flex-1 gap-4 px-6"
          onClick={handleIntroInteraction}
        >
          <h1
            className="font-pixel text-neon-green"
            style={{ fontSize: "clamp(1rem, 2.5vw, 1.6rem)", textShadow: "0 0 24px hsl(var(--neon-green))" }}
          >
            DINO STAR RUSH
          </h1>

          <div
            className="w-full border-2 border-neon-green/30 rounded overflow-hidden"
            style={{ maxWidth: "960px", boxShadow: "0 0 28px hsl(var(--neon-green) / 0.12)" }}
          >
            <GameDemoCanvas unlocked={audioUnlocked} />
          </div>

          <div className="flex items-center gap-6">
            <span className="font-pixel text-neon-green text-xs" style={{ textShadow: "0 0 8px hsl(var(--neon-green))" }}>
              SPACE / TAP = JUMP
            </span>
            <span className="font-pixel text-neon-yellow text-xs" style={{ textShadow: "0 0 8px hsl(var(--neon-yellow))" }}>
              ★ = POINTS
            </span>
            <span className="font-pixel text-muted-foreground text-xs">
              TABLE: <span className="text-neon-cyan">{table_name}</span>
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); handleIntroInteraction(); startGame(); }}
              className="font-pixel px-12 py-4 bg-neon-green text-background rounded hover:brightness-125 transition-all relative overflow-hidden"
              style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)", boxShadow: "0 0 24px hsl(var(--neon-green) / 0.5)" }}
            >
              <span
                className="absolute left-0 top-0 h-full bg-background/20"
                style={{ width: `${((5 - autoStart) / 5) * 100}%`, transition: "width 1s linear" }}
              />
              <span className="relative z-10">▶ START GAME</span>
            </button>
            <p className="font-pixel text-muted-foreground" style={{ fontSize: "clamp(0.5rem, 1vw, 0.7rem)" }}>
              자동 시작 <span className="text-neon-yellow">{autoStart}</span>초
            </p>
          </div>
        </div>
      )}

      {/* ── Countdown ── */}
      {phase === "countdown" && (
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-4">
          <p className="font-pixel text-muted-foreground text-sm tracking-widest">GET READY</p>
          <div
            className="font-pixel text-neon-green"
            style={{ fontSize: "clamp(5rem, 14vw, 9rem)", textShadow: "0 0 48px hsl(var(--neon-green))", animation: "pulse 0.8s ease-in-out" }}
          >
            {countdown === 0 ? "GO!" : countdown}
          </div>
        </div>
      )}

      {/* ── Game ── */}
      {(phase === "playing" || phase === "waiting") && (
        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">

          {/* HUD bar */}
          <div className="flex items-center justify-between px-6 py-2 shrink-0">
            <div className="font-pixel text-neon-yellow" style={{ fontSize: "clamp(0.6rem, 1.2vw, 0.85rem)" }}>
              SCORE: <span className="text-neon-green">{score}</span>
            </div>
            <div
              className="font-pixel"
              style={{
                fontSize: "clamp(0.7rem, 1.4vw, 1rem)",
                color: remainingSecs <= GOAL_WARN_SECS ? "#ff4444" : "hsl(var(--muted-foreground))",
                textShadow: remainingSecs <= GOAL_WARN_SECS ? "0 0 16px #ff4444" : "none",
                transition: "color 0.3s, text-shadow 0.3s",
              }}
            >
              {remainingSecs <= GOAL_WARN_SECS ? `⏱ ${remainingSecs}s` : formatTime(gameTime)}
            </div>
            <div className="font-pixel text-muted-foreground" style={{ fontSize: "clamp(0.6rem, 1.2vw, 0.85rem)" }}>
              TABLE: <span className="text-neon-cyan">{table_name}</span>
            </div>
          </div>

          {/* Game canvas */}
          <div className="flex-1 flex items-center justify-center px-4 pb-4">
            <div className="w-full" style={{ maxWidth: "1100px" }}>
              <DinoGame
                playing={phase === "playing"}
                maxTime={MAX_GAME_TIME}
                onScoreChange={setScore}
                onTimeChange={setGameTime}
                onGameOver={handleGameOver}
              />
            </div>
          </div>

          {/* 골인! overlay */}
          {showGoal && phase === "playing" && (
            <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
              <div className="font-pixel text-center" style={{ animation: "pulse 0.6s ease-in-out infinite" }}>
                <p style={{ fontSize: "clamp(2rem, 6vw, 4rem)", color: "#ffcc00", textShadow: "0 0 40px #ffcc00, 0 0 80px #ff8800" }}>
                  🏁 골인!
                </p>
                <p style={{ fontSize: "clamp(0.6rem, 1.2vw, 0.9rem)", color: "#ff8800", marginTop: "0.5rem" }}>
                  {remainingSecs}초 남았다!
                </p>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {phase === "waiting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-20">
              <div className="font-pixel text-center space-y-4 p-8 border border-neon-green/40 rounded bg-card/90">
                <p className="text-neon-green text-lg">GAME OVER!</p>
                <p className="text-neon-yellow text-sm">SCORE: {score}</p>
                <p className="text-muted-foreground text-xs mt-4">Waiting for other players...</p>
                <div className="flex gap-1 justify-center mt-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-neon-green"
                      style={{ animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePage;
