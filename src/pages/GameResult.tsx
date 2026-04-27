import { useSearchParams } from "react-router-dom";

const GameResult = () => {
  const [searchParams] = useSearchParams();
  const rawScore = parseInt(searchParams.get("score") || "0", 10);
  // 전송 형식: displayScore * 1000 + uniqueSuffix(0~999) → 화면엔 displayScore만 표시
  const score = Math.floor(rawScore / 1000);

  return (
    <div className="min-h-full bg-background flex flex-col items-center justify-center gap-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-foreground opacity-20"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
            }}
          />
        ))}
      </div>
      <div className="relative z-10 text-center space-y-6 p-10 border border-neon-green/30 rounded bg-card/80">
        <h1 className="font-pixel text-neon-green text-xl" style={{ textShadow: "0 0 20px hsl(var(--neon-green))" }}>
          RESULT
        </h1>
        <div className="font-pixel text-neon-yellow text-4xl" style={{ textShadow: "0 0 30px hsl(var(--neon-yellow))" }}>
          {score}
        </div>
        <p className="font-pixel text-muted-foreground text-xs">YOUR FINAL SCORE</p>

        <div className="pt-4 border-t border-neon-green/20">
          <p className="font-pixel text-neon-green text-lg animate-pulse" style={{ textShadow: "0 0 15px hsl(var(--neon-green))" }}>
            WAITING FOR OTHER PLAYERS...
          </p>
          <p className="font-pixel text-muted-foreground text-[10px] mt-2">
            ALL SCORES WILL BE RANKED SOON
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameResult;
