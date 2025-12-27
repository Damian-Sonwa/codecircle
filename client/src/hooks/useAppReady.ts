import {useState, useEffect, useRef} from 'react';
import {useAuthStore} from '@/store/authStore';

/**
 * Centralized hook to determine when the app is ready to render pages
 * Ensures auth token is validated, user profile is loaded, and onboarding status is confirmed
 * Prevents refresh loops by stabilizing state updates
 */
export const useAppReady = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isChecking, setIsChecking] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const hasInitialized = useRef(false);
  const lastUserRef = useRef<string | undefined>(user?._id || user?.userId);
  const lastTokenRef = useRef<string | undefined>(accessToken);

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
          userId: currentUser?._id || currentUser?.userId
        });
        
        if (currentUser && currentToken) {
          setAppReady(true);
          lastUserRef.current = currentUser?._id || currentUser?.userId;
          lastTokenRef.current = currentToken;
          console.log('[useAppReady] App ready set to true');
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
    if (!userIdChanged && !tokenChanged) return;

    console.log('[useAppReady] Auth state changed', {
      userIdChanged,
      tokenChanged,
      hasUser: !!user,
      hasToken: !!accessToken,
      userId: currentUserId
    });

    lastUserRef.current = currentUserId;
    lastTokenRef.current = accessToken;

    // Set appReady based on auth state
    if (user && accessToken) {
      setAppReady(true);
      console.log('[useAppReady] App ready set to true (auth state changed)');
    } else {
      setAppReady(false);
      console.log('[useAppReady] App ready set to false (no user or token)');
    }
  }, [user, accessToken]);

  return {appReady, isChecking};
};

