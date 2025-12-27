import {motion} from 'framer-motion';
import {useUIStore} from '@/store/uiStore';

export const AmbientBackground = () => {
  const enabled = useUIStore((state) => state.ambientBackground);
  if (!enabled) return null;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-1/3 top-1/3 h-[60vw] w-[60vw] rounded-full bg-gradient-to-r from-sky-500/60 to-sky-500/30 blur-3xl"
        animate={{scale: [1, 1.05, 1], x: [0, 40, -20], y: [0, -30, 20]}}
        transition={{repeat: Infinity, duration: 30, ease: 'easeInOut'}}
      />
      <motion.div
        className="absolute left-1/2 top-1/4 h-[40vw] w-[40vw] rounded-full bg-gradient-to-r from-secondaryFrom/40 to-secondaryTo/20 blur-[120px]"
        animate={{scale: [1.1, 0.95, 1.1], x: [0, -30, 10], y: [0, 20, -10]}}
        transition={{repeat: Infinity, duration: 26, ease: 'easeInOut'}}
      />
    </div>
  );
};


