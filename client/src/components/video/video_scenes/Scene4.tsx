import { motion } from 'framer-motion';

export const Scene4 = () => {
  return (
    <motion.div
      className="absolute inset-0 z-10 w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      <video
        src="/videos/pixar_consistent_4_summit.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      
      <div className="absolute inset-0 bg-black/40 z-20 mix-blend-multiply" />
      
      <motion.div 
        className="absolute inset-0 flex flex-col items-center justify-center z-30 px-4 text-center"
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={{
            hidden: { scale: 3, opacity: 0, filter: "blur(1vw)" },
            visible: { scale: 1, opacity: 1, filter: "blur(0px)", transition: { duration: 1.2, ease: "circOut" } }
          }}
        >
          <h1 className="text-[15vw] font-black text-white uppercase tracking-tighter leading-none font-display drop-shadow-2xl">
            VICTORY
          </h1>
        </motion.div>
        
        <motion.div
          className="mt-[4vh]"
          variants={{
            hidden: { opacity: 0, y: "2vh" },
            visible: { opacity: 1, y: 0, transition: { delay: 1, duration: 0.8 } }
          }}
        >
          <p className="text-[5vw] text-orange-400 font-bold tracking-widest uppercase font-display">
            BE A SHERPA
          </p>
        </motion.div>
      </motion.div>
      
      <motion.div 
        className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-orange-500 rounded-full blur-[15vw] opacity-40 z-20 pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </motion.div>
  );
};
