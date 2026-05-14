import { motion } from 'framer-motion';

export const Scene2 = () => {
  return (
    <motion.div
      className="absolute inset-0 z-10 w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <video
        src="/videos/pixar_consistent_2_training.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-20" />
      
      <motion.div 
        className="absolute bottom-[10vh] right-[5vw] left-[5vw] z-30 text-right"
        initial="hidden"
        animate="visible"
      >
        <div className="overflow-hidden flex justify-end mb-[1vh]">
          <motion.h2 
            className="text-[10vw] font-black text-white uppercase tracking-tighter leading-none font-display drop-shadow-xl"
            variants={{
              hidden: { y: "100%" },
              visible: { y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            SWEAT IS
          </motion.h2>
        </div>
        
        <div className="overflow-hidden flex justify-end mb-[2vh]">
           <motion.h2 
            className="text-[10vw] font-black text-blue-400 uppercase tracking-tighter leading-none font-display drop-shadow-xl"
            variants={{
              hidden: { y: "100%" },
              visible: { y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 } }
            }}
          >
            EARNED
          </motion.h2>
        </div>

        <motion.div 
          className="h-[0.5vh] bg-blue-500 ml-auto mb-[1vh] origin-right"
          variants={{
            hidden: { scaleX: 0 },
            visible: { scaleX: 1, transition: { duration: 0.8, delay: 0.3 } }
          }}
          style={{ width: '30%' }}
        />

        <motion.p 
          className="text-[3.5vw] text-slate-300 font-body font-medium"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.8, delay: 0.5 } }
          }}
        >
          Every drop counts.
        </motion.p>
      </motion.div>
    </motion.div>
  );
};
