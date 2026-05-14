import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';

const SCENE_DURATIONS = {
  scene1: 6000,
  scene2: 6000,
  scene3: 6000,
  scene4: 8000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div className="w-full h-full bg-black overflow-hidden relative">
      <motion.div 
        className="absolute top-[4vh] left-[5vw] z-50 flex items-center gap-3"
        initial={{ opacity: 0, scale: 0.8, x: "-5vw" }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 1, type: "spring", stiffness: 100 }}
      >
        <img src="/images/sherpafit_logo_new.png" alt="SherpaFit Logo" className="w-[22vw] object-contain drop-shadow-lg" />
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-50">
        <motion.div 
          className="h-full bg-orange-500"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 26, ease: "linear" }}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="scene1" />}
        {currentScene === 1 && <Scene2 key="scene2" />}
        {currentScene === 2 && <Scene3 key="scene3" />}
        {currentScene === 3 && <Scene4 key="scene4" />}
      </AnimatePresence>
      
      <div className="absolute inset-0 pointer-events-none z-40 opacity-30 mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      />
    </div>
  );
}
