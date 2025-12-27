import {AnimatePresence, motion} from 'framer-motion';
import {useState} from 'react';
import {api, endpoints} from '@/services/api';
import {useAuthStore} from '@/store/authStore';

const tourSteps = [
  {title: 'Dashboard', description: 'Track your progress, leaderboard rank, and personalised recommendations.'},
  {title: 'Explore Tech Skills', description: 'Join curated communities filtered by skill, level, or interest.'},
  {title: 'Messages', description: 'Chat in realtime with groups or private 1:1 conversations.'},
  {title: 'Classroom', description: 'Attend live classes, review materials, and chat with instructors.'},
  {title: 'Profile', description: 'Showcase your skills, achievements, and connect with friends.'}
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const TourOverlay = ({visible, onClose}: Props) => {
  const [current, setCurrent] = useState(0);
  const updateUser = useAuthStore((state) => state.updateUser);

  const completeTour = async () => {
    await api.post(endpoints.onboarding.tourComplete);
    updateUser({hasOnboarded: true});
    onClose();
    setCurrent(0);
  };

  const nextStep = () => {
    if (current < tourSteps.length - 1) {
      setCurrent((prev) => prev + 1);
    } else {
      completeTour();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="pointer-events-none fixed inset-0 z-40" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur" />
          <motion.div
            key={current}
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="pointer-events-auto absolute bottom-4 sm:bottom-10 left-1/2 w-[calc(100vw-1.5rem)] sm:w-[90vw] max-w-xl -translate-x-1/2 rounded-2xl sm:rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 sm:p-6 md:p-8 shadow-lift"
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.45em] text-sky-500">Guided tour</p>
            <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-semibold text-slate-100">{tourSteps[current].title}</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-300">{tourSteps[current].description}</p>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex gap-1 justify-center sm:justify-start">
                {tourSteps.map((_, index) => (
                  <span
                    key={index}
                    className={
                      index === current
                        ? 'h-1.5 sm:h-2 w-4 sm:w-6 rounded-full bg-gradient-to-r from-sky-500 to-sky-500'
                        : 'h-1.5 sm:h-2 w-4 sm:w-6 rounded-full bg-slate-700'
                    }
                  />
                ))}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setCurrent(0);
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial rounded-full border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs text-slate-300 transition hover:text-sky-600"
                >
                  Skip tour
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 sm:flex-initial rounded-full bg-gradient-to-r from-sky-500 to-sky-500 px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-[1.03]"
                >
                  {current === tourSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

