import { motion } from 'framer-motion';

export const Scene3 = () => {
  return (
    <motion.div
      className="absolute inset-0 z-10 w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <video
        src="/videos/pixar_consistent_3_climb.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-20" />
      
      <motion.div 
        className="absolute top-[15vh] left-[5vw] z-30"
        initial="hidden"
        animate="visible"
      >
        <motion.h2 
          className="text-[15vw] font-black text-white/10 uppercase tracking-tighter leading-none font-display absolute -top-[8vw] -left-[2vw]"
          variants={{
            hidden: { x: "-5vw", opacity: 0 },
            visible: { x: 0, opacity: 0.2, transition: { duration: 1.5 } }
          }}
        >
          CLIMB
        </motion.h2>

        <div className="overflow-hidden">
          <motion.h2 
            className="text-[10vw] font-black text-white uppercase tracking-tighter leading-none font-display drop-shadow-xl relative z-10"
            variants={{
              hidden: { y: "100%" },
              visible: { y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            NEVER
          </motion.h2>
        </div>
        
        <div className="overflow-hidden">
           <motion.h2 
            className="text-[10vw] font-black text-white uppercase tracking-tighter leading-none font-display drop-shadow-xl relative z-10"
            variants={{
              hidden: { y: "100%" },
              visible: { y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 } }
            }}
          >
            STOP
          </motion.h2>
        </div>
      </motion.div>
      
      <motion.div
        className="absolute bottom-[10vh] left-[5vw] z-30"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-[2vw] rounded-[1.5vw]">
           <p className="text-[3vw] text-white font-mono font-bold">ALTITUDE: 8,848M</p>
        </div>
      </motion.div>
    </motion.div>
  );
};
