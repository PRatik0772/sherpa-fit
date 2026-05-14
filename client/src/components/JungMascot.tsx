import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface JungMascotProps {
  message: string;
  context?: "today" | "log" | "analytics" | "journey" | "profile";
}

export function JungMascot({ message, context = "today" }: JungMascotProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [bobPhase, setBobPhase] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let start = 0;
    const animate = (ts: number) => {
      if (!start) start = ts;
      setBobPhase((ts - start) / 1000);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, []);

  if (dismissed) return null;

  const bobY = Math.sin(bobPhase * 1.8) * 4;
  const tiltDeg = Math.sin(bobPhase * 1.2 + 0.5) * 3;
  const scale = 1 + Math.sin(bobPhase * 2.4) * 0.02;

  return (
    <div
      className={`mx-4 mb-4 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      data-testid="jung-mascot"
    >
      <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-2xl p-4 border border-blue-100/50 flex items-start gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-100/40 to-transparent rounded-bl-full" />
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-slate-400 hover:text-slate-600 transition z-10"
          data-testid="button-dismiss-jung"
        >
          <X size={14} />
        </button>
        <div className="relative flex-shrink-0" style={{ width: 52, height: 52 }}>
          <img
            src="/images/jung-character.png"
            alt="Jung"
            className="w-12 h-auto drop-shadow-lg"
            style={{
              transform: `translateY(${bobY}px) rotate(${tiltDeg}deg) scale(${scale})`,
              transition: "transform 0.1s ease-out",
            }}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-blue-200/30 rounded-full blur-sm"
            style={{ transform: `translateX(-50%) scaleX(${1 - Math.abs(bobY) * 0.03})` }}
          />
        </div>
        <div className="pr-6 pt-0.5">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest font-display">Jung says</p>
          <p className="text-[13px] text-slate-600 mt-1 leading-relaxed font-body">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function getJungMessage(context: string, data: { calories?: number; calTarget?: number; water?: number; waterTarget?: number; activeMin?: number; workouts?: number }): string {
  const { calories = 0, calTarget = 2000, water = 0, waterTarget = 2500, activeMin = 0, workouts = 0 } = data;

  if (context === "today") {
    if (calories === 0 && water === 0) return "Hey! Ready to crush it today? Start by logging your breakfast.";
    if (water < waterTarget * 0.3) return "Don't forget to hydrate! Grab a glass of water.";
    if (calories > calTarget * 0.8) return "Almost at your calorie goal - nice work today!";
    if (activeMin === 0) return "Haven't moved yet? Even a 10-minute walk makes a difference.";
    return "Looking great! Keep up the consistency.";
  }

  if (context === "log") {
    return "Quick tip: logging meals right after eating helps you stay accurate.";
  }

  if (context === "analytics") {
    if (workouts >= 3) return "You're building a solid workout habit. Keep that momentum going!";
    return "Consistency beats perfection. Focus on showing up every day.";
  }

  return "I'm here to help. Let's make progress together.";
}
