import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import DinoGame from "@/components/DinoGame";
import GameDemoCanvas from "@/components/GameDemoCanvas";

const MAX_TIME_BUFFER = 15; // seconds buffer after game ends

const GamePage = () => {
  const { game_type } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const table_name = searchParams.get("table_name") || "table1";

  const [phase, setPhase] = useState<"instructions" | "countdown" | "playing" | "waiting">("instructions");
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0); // elapsed ms
  const [maxTime] = useState(90); // 90 seconds total game time (game_type could configure this)
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStartRef = useRef<number>(0);

  const goToResult = useCallback((finalScore: number) => {
    navigate(`/webview/games/result?score=${finalScore}`);
  }, [navigate]);

  // Start countdown
  const startGame = () => {
    setPhase("countdown");
    setCountdown(3);
  };

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      gameStartRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setPhase("waiting");

    const elapsed = (Date.now() - gameStartRef.current) / 1000;
    const remaining = maxTime + MAX_TIME_BUFFER - elapsed;
    const waitMs = Math.max(0, remaining * 1000);

    waitTimerRef.current = setTimeout(() => {
      goToResult(finalScore);
    }, waitMs);
  }, [maxTime, goToResult]);

  // Hard max time enforcement
  useEffect(() => {
    if (phase !== "playing") return;
    const hardMax = (maxTime + MAX_TIME_BUFFER) * 1000;
    const t = setTimeout(() => {
      // force game over after hard max
    }, hardMax);
    return () => clearTimeout(t);
  }, [phase, maxTime]);

  useEffect(() => {
    return () => {
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    };
  }, []);

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600).toString().padStart(2, "0");
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-foreground opacity-30"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              top: Math.random() * 60 + "%",
              left: Math.random() * 100 + "%",
            }}
          />
        ))}
      </div>

      {/* Instructions Screen */}
      {phase === "instructions" && (
        <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg text-center">
          <h1 className="font-pixel text-neon-green text-xl leading-relaxed" style={{ textShadow: "0 0 20px hsl(var(--neon-green))" }}>
            DINO STAR RUSH
          </h1>
          <div className="font-pixel text-foreground text-xs leading-relaxed space-y-3 text-left border border-neon-green/30 p-6 rounded bg-card/80">
            <p className="text-neon-yellow">HOW TO PLAY:</p>
            <p>► Press <span className="text-neon-green">SPACE</span> or <span className="text-neon-green">TAP</span> to jump</p>
            <p>► Avoid the <span className="text-neon-red">obstacles</span> coming at you</p>
            <p>► Collect <span className="text-neon-yellow">★ STARS</span> to earn points</p>
            <p>► The game speeds up over time!</p>
            <p>► Double jump is available!</p>
            <div className="border-t border-foreground/20 pt-3 mt-3">
              <p className="text-muted-foreground">Table: <span className="text-neon-cyan">{table_name}</span></p>
            </div>
          </div>
          <button
            onClick={startGame}
            className="font-pixel text-sm px-8 py-4 bg-neon-green text-background rounded hover:brightness-125 transition-all"
            style={{ boxShadow: "0 0 20px hsl(var(--neon-green) / 0.5)" }}
          >
            START GAME
          </button>
        </div>
      )}

      {/* Countdown */}
      {phase === "countdown" && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <p className="font-pixel text-muted-foreground text-sm">GET READY</p>
          <div
            className="font-pixel text-neon-green"
            style={{ fontSize: "6rem", textShadow: "0 0 40px hsl(var(--neon-green))", animation: "pulse 0.8s ease-in-out" }}
          >
            {countdown === 0 ? "GO!" : countdown}
          </div>
        </div>
      )}

      {/* Game */}
      {(phase === "playing" || phase === "waiting") && (
        <div className="relative z-10 w-full flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full max-w-2xl px-4">
            <div className="font-pixel text-neon-yellow text-xs">
              SCORE: <span className="text-neon-green">{score}</span>
            </div>
            <div className="font-pixel text-xs text-muted-foreground">
              {formatTime(gameTime)}
            </div>
            <div className="font-pixel text-xs text-muted-foreground">
              TABLE: <span className="text-neon-cyan">{table_name}</span>
            </div>
          </div>

          <DinoGame
            playing={phase === "playing"}
            maxTime={maxTime}
            onScoreChange={setScore}
            onTimeChange={setGameTime}
            onGameOver={handleGameOver}
          />

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
