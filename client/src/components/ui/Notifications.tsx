import {motion, AnimatePresence} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';

export const Notifications = () => {
  const items = useNotificationStore((state) => state.items);
  const dismiss = useNotificationStore((state) => state.dismiss);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end gap-2 sm:gap-3 p-2 sm:p-4">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{opacity: 0, y: 20, scale: 0.9}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, y: 10, scale: 0.95}}
            transition={{duration: 0.2}}
            className="glass-card pointer-events-auto w-full max-w-[calc(100vw-1rem)] sm:max-w-sm rounded-xl sm:rounded-2xl p-3 sm:p-4"
          >
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-slate-100 break-words">{item.title}</p>
                {item.message && <p className="text-xs sm:text-sm text-slate-300 break-words mt-1">{item.message}</p>}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="text-slate-400 transition hover:text-slate-100 flex-shrink-0 text-lg sm:text-xl leading-none"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};


