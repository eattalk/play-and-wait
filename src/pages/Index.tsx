import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              background: `rgba(180,220,255,${Math.random() * 0.4 + 0.1})`,
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
            }}
          />
        ))}
      </div>
      <div className="relative z-10 text-center space-y-6">
        <h1
          className="font-pixel text-neon-green text-2xl leading-relaxed"
          style={{ textShadow: "0 0 30px hsl(var(--neon-green))" }}
        >
          DINO STAR RUSH
        </h1>
        <p className="font-mono text-muted-foreground text-sm">Web Game Platform</p>
        <div className="border border-neon-green/20 rounded p-6 bg-card/60 space-y-3 text-left">
          <p className="font-pixel text-neon-yellow text-xs">URL FORMAT:</p>
          <p className="font-mono text-xs text-foreground/80">
            /webview/games/<span className="text-neon-cyan">&#123;game_type&#125;</span>?table_name=<span className="text-neon-green">&#123;table_name&#125;</span>
          </p>
        </div>
        <button
          className="font-pixel text-xs px-6 py-3 border border-neon-green text-neon-green rounded hover:bg-neon-green hover:text-background transition-all"
          onClick={() => navigate("/webview/games/dino?table_name=table1")}
          style={{ boxShadow: "0 0 15px hsl(var(--neon-green) / 0.3)" }}
        >
          ► PLAY DEMO
        </button>
      </div>
    </div>
  );
};

export default Index;
