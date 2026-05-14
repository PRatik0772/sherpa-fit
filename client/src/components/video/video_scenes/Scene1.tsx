import { motion } from 'framer-motion';

export const Scene1 = () => {
  return (
    <motion.div
      className="absolute inset-0 z-10 w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <video
        src="/videos/pixar_consistent_1_fat.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-20" />
      
      <motion.div 
        className="absolute bottom-[10vh] left-[5vw] right-[5vw] z-30"
        initial="hidden"
        animate="visible"
      >
        <div className="overflow-hidden mb-[1vh]">
          <motion.h1 
            className="text-[12vw] font-black text-white uppercase tracking-tighter leading-none font-display drop-shadow-xl"
            variants={{
              hidden: { y: "100%" },
              visible: { y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            START
          </motion.h1>
        </div>
        
        <div className="overflow-hidden mb-[2vh]">
           <motion.h1 
            className="text-[12vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 uppercase tracking-tighter leading-none font-display drop-shadow-xl"
            variants={{
              hidden: { y: "100%" },
              visible: { y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 } }
            }}
          >
            NOW
          </motion.h1>
        </div>

        <motion.p 
          className="text-[4vw] text-slate-300 font-body uppercase tracking-widest font-bold border-l-[0.5vw] border-white pl-[2vw]"
          variants={{
            hidden: { opacity: 0, x: "-2vw" },
            visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.4 } }
          }}
        >
          No excuses. Just begin.
        </motion.p>
      </motion.div>
    </motion.div>
  );
};
