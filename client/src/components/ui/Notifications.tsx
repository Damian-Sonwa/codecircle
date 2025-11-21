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
                <div className="flex items-center gap-2">
                  {item.type === 'success' && (
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs">✓</span>
                    </div>
                  )}
                  {item.type === 'error' && (
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center">
                      <span className="text-red-400 text-xs">!</span>
                    </div>
                  )}
                  {item.type === 'info' && (
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-blue-400 text-xs">i</span>
                    </div>
                  )}
                  <p className="text-sm sm:text-base font-semibold text-slate-100 break-words">{item.title}</p>
                </div>
                {item.message && <p className="text-xs sm:text-sm text-slate-300 break-words mt-1 ml-7">{item.message}</p>}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="text-slate-400 transition-all hover:text-slate-100 hover:bg-slate-800/50 rounded p-1 flex-shrink-0 text-lg sm:text-xl leading-none active:scale-90"
                aria-label="Dismiss notification"
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


