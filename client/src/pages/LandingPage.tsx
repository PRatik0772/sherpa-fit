import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/lib/capacitor";

const SCENE_VIDEOS = [
  "/videos/pixar_consistent_1_fat.mp4",
  "/videos/pixar_consistent_2_training.mp4",
  "/videos/pixar_consistent_3_climb.mp4",
  "/videos/pixar_consistent_4_summit.mp4",
];

const SCENE_TEXT = [
  { title: "START", accent: "NOW" },
  { title: "SWEAT IS", accent: "EARNED" },
  { title: "NEVER", accent: "STOP" },
  { title: "BE A", accent: "SHERPA" },
];

const DURATION = 6000;

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showA, setShowA] = useState(true);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const transitioning = useRef(false);
  const prefetchLink = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowOverlay(true), 600);
    return () => clearTimeout(t);
  }, []);

  const prefetchVideo = useCallback((url: string) => {
    if (!prefetchLink.current) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "video";
      document.head.appendChild(link);
      prefetchLink.current = link;
    }
    prefetchLink.current.href = url;
  }, []);

  useEffect(() => {
    return () => {
      if (prefetchLink.current) {
        prefetchLink.current.remove();
        prefetchLink.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (videoARef.current && showA) {
      videoARef.current.src = SCENE_VIDEOS[activeIdx];
      videoARef.current.load();
      videoARef.current.play().catch(() => {});
    } else if (videoBRef.current && !showA) {
      videoBRef.current.src = SCENE_VIDEOS[activeIdx];
      videoBRef.current.load();
      videoBRef.current.play().catch(() => {});
    }
  }, [activeIdx, showA]);

  useEffect(() => {
    const nextIdx = (activeIdx + 1) % SCENE_VIDEOS.length;
    const prefetchTimer = setTimeout(() => {
      prefetchVideo(SCENE_VIDEOS[nextIdx]);
    }, 2000);

    const transitionTimer = setTimeout(() => {
      if (transitioning.current) return;
      transitioning.current = true;

      const nextI = (activeIdx + 1) % SCENE_VIDEOS.length;
      const incomingRef = showA ? videoBRef : videoARef;

      if (incomingRef.current) {
        incomingRef.current.src = SCENE_VIDEOS[nextI];
        incomingRef.current.load();
        incomingRef.current.play().catch(() => {});
      }

      setTimeout(() => {
        setShowA(prev => !prev);
        setActiveIdx(nextI);

        setTimeout(() => {
          const outgoingRef = showA ? videoARef : videoBRef;
          if (outgoingRef.current) {
            outgoingRef.current.pause();
            outgoingRef.current.removeAttribute("src");
            outgoingRef.current.load();
          }
          transitioning.current = false;
        }, 1000);
      }, 200);
    }, DURATION);

    return () => {
      clearTimeout(prefetchTimer);
      clearTimeout(transitionTimer);
    };
  }, [activeIdx, showA, prefetchVideo]);

  const scene = SCENE_TEXT[activeIdx];

  return (
    <div
      className="landing-fullscreen"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100dvh",
        background: "#000",
        overflow: "hidden",
      }}
      data-testid="landing-page"
    >
      <video
        ref={videoARef}
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: showA ? 1 : 0,
          transition: "opacity 0.8s ease-in-out",
          willChange: "opacity",
        }}
      />

      <video
        ref={videoBRef}
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: showA ? 0 : 1,
          transition: "opacity 0.8s ease-in-out",
          willChange: "opacity",
        }}
      />

      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.15) 100%)", zIndex: 10 }} />

      <div className="safe-pad-top" style={{ position: "absolute", top: 12, left: 20, zIndex: 30, paddingTop: 8 }}>
        <motion.img
          src="/images/sherpa-logo-dark.png"
          alt="Sherpa Fit"
          style={{ width: 120, objectFit: "contain" }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          style={{ position: "absolute", bottom: 150, left: 20, right: 20, zIndex: 30 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
        >
          <h1
            style={{
              fontSize: "13vw",
              fontWeight: 900,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
              margin: 0,
            }}
          >
            {scene.title}
          </h1>
          <h1
            style={{
              fontSize: "13vw",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              fontFamily: "'Space Grotesk', sans-serif",
              background: "linear-gradient(to right, #fb923c, #ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "4px 0 0 0",
            }}
          >
            {scene.accent}
          </h1>
        </motion.div>
      </AnimatePresence>

      <motion.div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          padding: "16px 20px",
          paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)",
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: showOverlay ? 1 : 0, y: showOverlay ? 0 : 30 }}
        transition={{ duration: 0.8 }}
      >
        <button
          onClick={() => { triggerHaptic('medium'); onGetStarted(); }}
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 16,
            background: "#fff",
            color: "#000",
            fontWeight: 700,
            fontSize: 16,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          }}
          data-testid="button-get-started"
        >
          Get Started
        </button>
      </motion.div>
    </div>
  );
}
