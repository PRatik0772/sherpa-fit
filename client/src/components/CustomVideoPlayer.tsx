import { Play, Pause, Maximize2, RotateCcw } from "lucide-react";
import ReactPlayer from "react-player";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface CustomVideoPlayerProps {
  url: string;
  poster?: string;
}

export function CustomVideoPlayer({ url, poster }: CustomVideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef<any>(null);

  const handleSeek = (value: number[]) => {
    setPlayed(value[0]);
    playerRef.current?.seekTo(value[0]);
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = String(date.getUTCSeconds()).padStart(2, "0");
    if (hh) {
      return `${hh}:${String(mm).padStart(2, "0")}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  return (
    <div 
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        playing={playing}
        light={poster}
        onProgress={(state: { played: number }) => setPlayed(state.played)}
        onDuration={setDuration}
        playIcon={
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity group-hover:bg-black/20">
                <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center pl-1 shadow-[0_0_30px_rgba(33,150,243,0.4)] hover:scale-105 transition-transform">
                    <Play fill="currentColor" className="text-white w-8 h-8" />
                </div>
            </div>
        }
        config={{
            youtube: {
                playerVars: { showinfo: 0, controls: 0, modestbranding: 1 } as any
            }
        }}
      />

      {/* Custom Controls Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity duration-300",
        !showControls && playing ? "opacity-0" : "opacity-100"
      )}>
        <div className="space-y-2">
            {/* Scrubber */}
            <Slider
              value={[played]}
              max={1}
              step={0.01}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            
            <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                    <button onClick={() => setPlaying(!playing)} className="hover:text-primary transition-colors">
                        {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                    </button>
                    <div className="text-xs font-mono opacity-80">
                        {formatTime(played * duration)} / {formatTime(duration)}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="hover:text-primary transition-colors">
                        <RotateCcw size={18} />
                    </button>
                    <button className="hover:text-primary transition-colors">
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}