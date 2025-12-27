import {useState, useEffect, useRef} from 'react';
import {useAuthStore} from '@/store/authStore';

/**
 * Centralized hook to determine when the app is ready to render pages
 * Ensures auth token is validated, user profile is loaded, and onboarding status is confirmed
 * Prevents refresh loops by stabilizing state updates
 * CRITICAL: All data fetching and socket initialization must wait for appReady
 */
export const useAppReady = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isChecking, setIsChecking] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const hasInitialized = useRef(false);
  const lastUserRef = useRef<string | undefined>(user?._id || user?.userId);
  const lastTokenRef = useRef<string | undefined>(accessToken);
  const onboardingCheckedRef = useRef(false);

  useEffect(() => {
    // Wait for Zustand persist to hydrate (only once)
    if (!hasInitialized.current) {
      // Check if store is already hydrated (user/token exist immediately)
      const checkAuthState = () => {
        const currentUser = useAuthStore.getState().user;
        const currentToken = useAuthStore.getState().accessToken;
        
        setIsChecking(false);
        hasInitialized.current = true;
        
        console.log('[useAppReady] Initialization complete', {
          hasUser: !!currentUser,
          hasToken: !!currentToken,
          userId: currentUser?._id || currentUser?.userId,
          onboardingCompleted: currentUser?.onboardingCompleted || currentUser?.hasOnboarded
        });
        
        // App is ready if user and token exist AND onboarding is complete (or user is admin)
        const onboardingComplete = currentUser?.onboardingCompleted || 
                                   currentUser?.hasOnboarded || 
                                   currentUser?.profileCompleted ||
                                   currentUser?.role === 'admin' ||
                                   currentUser?.role === 'superadmin';
        
        if (currentUser && currentToken && onboardingComplete) {
          setAppReady(true);
          lastUserRef.current = currentUser?._id || currentUser?.userId;
          lastTokenRef.current = currentToken;
          onboardingCheckedRef.current = true;
          console.log('[useAppReady] App ready set to true');
        } else if (currentUser && currentToken && !onboardingComplete) {
          // User is authenticated but onboarding not complete - app not ready yet
          console.log('[useAppReady] User authenticated but onboarding incomplete');
          onboardingCheckedRef.current = true;
        } else {
          console.log('[useAppReady] No user or token, app not ready');
        }
      };

      // Check immediately if store is already hydrated
      const currentUser = useAuthStore.getState().user;
      const currentToken = useAuthStore.getState().accessToken;
      
      if (currentUser || currentToken) {
        // Store appears to be hydrated, check immediately
        checkAuthState();
      } else {
        // Wait a bit for Zustand persist to hydrate
        const timer = setTimeout(checkAuthState, 300);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    // Only update appReady after initial check is complete
    if (!hasInitialized.current) return;

    const currentUserId = user?._id || user?.userId;
    const userIdChanged = currentUserId !== lastUserRef.current;
    const tokenChanged = accessToken !== lastTokenRef.current;

    // Only update if user or token actually changed (prevent unnecessary re-renders)
    if (!userIdChanged && !tokenChanged && onboardingCheckedRef.current) return;

    console.log('[useAppReady] Auth state changed', {
      userIdChanged,
      tokenChanged,
      hasUser: !!user,
      hasToken: !!accessToken,
      userId: currentUserId,
      onboardingCompleted: user?.onboardingCompleted || user?.hasOnboarded
    });

    lastUserRef.current = currentUserId;
    lastTokenRef.current = accessToken;

    // Check onboarding status
    const onboardingComplete = user?.onboardingCompleted || 
                               user?.hasOnboarded || 
                               user?.profileCompleted ||
                               user?.role === 'admin' ||
                               user?.role === 'superadmin';

    // Set appReady based on auth state AND onboarding status
    if (user && accessToken && onboardingComplete) {
      setAppReady(true);
      onboardingCheckedRef.current = true;
      console.log('[useAppReady] App ready set to true (auth state changed)');
    } else if (user && accessToken && !onboardingComplete) {
      // User authenticated but onboarding incomplete - wait for onboarding
      setAppReady(false);
      onboardingCheckedRef.current = true;
      console.log('[useAppReady] App not ready - onboarding incomplete');
    } else {
      setAppReady(false);
      console.log('[useAppReady] App ready set to false (no user or token)');
    }
  }, [user, accessToken]);

  return {appReady, isChecking};
};

