import {motion} from 'framer-motion';
import {MessageCircle} from 'lucide-react';

interface Props {
  message?: string;
}

export const PostAuthLoading = ({message = 'Preparing your workspace...'}: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <motion.div
        initial={{opacity: 0, scale: 0.9}}
        animate={{opacity: 1, scale: 1}}
        exit={{opacity: 0, scale: 0.9}}
        transition={{duration: 0.3}}
        className="flex flex-col items-center gap-4 sm:gap-6"
      >
        {/* Logo/Branding */}
        <motion.div
          initial={{opacity: 0, y: -20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.1}}
          className="flex items-center gap-2 sm:gap-3"
        >
          <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-sky-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">CodeCircle</h1>
        </motion.div>

        {/* Spinner */}
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{delay: 0.2}}
          className="relative"
        >
          <div className="h-12 w-12 sm:h-16 sm:w-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 h-12 w-12 sm:h-16 sm:w-16 border-4 border-sky-500/20 rounded-full" />
        </motion.div>

        {/* Loading Message */}
        <motion.p
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{delay: 0.3}}
          className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium"
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
};

