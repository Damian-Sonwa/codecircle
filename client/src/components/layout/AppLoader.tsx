import {motion} from 'framer-motion';
import {Loader2} from 'lucide-react';

interface AppLoaderProps {
  message?: string;
}

export const AppLoader = ({message = 'Loading your workspace...'}: AppLoaderProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      <motion.div
        initial={{opacity: 0, scale: 0.8}}
        animate={{opacity: 1, scale: 1}}
        transition={{duration: 0.5}}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <motion.div
            animate={{rotate: 360}}
            transition={{repeat: Infinity, ease: 'linear', duration: 1.5}}
            className="h-16 w-16 border-4 border-sky-500 border-t-transparent rounded-full"
          />
          <Loader2 className="absolute inset-0 h-8 w-8 m-auto text-sky-500" />
        </div>
        <h2 className="text-xl font-semibold">{message}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Preparing your personalized CodeCircle experience.</p>
      </motion.div>
    </div>
  );
};

