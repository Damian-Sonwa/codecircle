import {type ReactNode, useEffect, useState} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import {AnimatePresence, motion} from 'framer-motion';
import {NavigationDrawer} from '@/components/navigation/NavigationDrawer';
import OnboardingFlow from '@/components/Onboarding/OnboardingFlow';
import {TourOverlay} from '@/components/Onboarding/TourOverlay';
import {Notifications} from '@/components/ui/Notifications';
import {SettingsModal} from '@/components/Chat/SettingsModal';
import {RealtimeBridge} from '@/components/Chat/RealtimeBridge';
import {AmbientBackground} from '@/components/layout/AmbientBackground';
import {useAuthStore} from '@/store/authStore';

interface Props {
  children?: ReactNode;
}

export const AppLayout = ({children}: Props) => {
  const user = useAuthStore((state) => state.user);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  // Wait for user state to stabilize before checking onboarding
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't check onboarding while checking state
    if (isChecking) return;

    // Check if onboarding is needed
    const needsOnboarding = user && (!user.hasOnboarded || !user.profileCompleted || !user.onboardingCompleted);
    
    if (needsOnboarding) {
      setShowOnboarding(true);
      console.log('[AppLayout] Onboarding needed:', {
        hasOnboarded: user?.hasOnboarded,
        profileCompleted: user?.profileCompleted,
        onboardingCompleted: user?.onboardingCompleted
      });
    } else if (user && user.hasOnboarded && user.profileCompleted && user.onboardingCompleted) {
      // Only hide if it was previously shown to avoid flicker
      if (showOnboarding) {
        setShowOnboarding(false);
        console.log('[AppLayout] Onboarding complete, hiding modal');
      }
    }
  }, [user, isChecking, showOnboarding]);

  useEffect(() => {
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, [location.pathname]);

  const content = children ?? <Outlet />;

  return (
    <div className="relative min-h-screen bg-slate-950 pb-20 sm:pb-24 text-slate-100 overflow-x-hidden">
      <AmbientBackground />
      <NavigationDrawer />
      <Notifications />
      <SettingsModal />
      <RealtimeBridge />
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname} initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} transition={{duration: 0.3}}>
          {content}
        </motion.div>
      </AnimatePresence>

      <OnboardingFlow
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onTourStart={() => setShowTour(true)}
      />
      <TourOverlay visible={showTour} onClose={() => setShowTour(false)} />

      <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-30 flex flex-col gap-3 max-w-[calc(100vw-1.5rem)]">
        <motion.button
          whileHover={{scale: 1.05}}
          whileTap={{scale: 0.95}}
          className="glass-card flex items-center gap-2 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-slate-200 whitespace-nowrap"
        >
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="hidden sm:inline">Live class starting soon? Check Classroom</span>
          <span className="sm:hidden">Classroom</span>
        </motion.button>
      </div>
    </div>
  );
};

