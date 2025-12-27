import {type FormEvent, useState, useEffect, useMemo} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {api, endpoints} from '@/services/api';
import {useAuthStore} from '@/store/authStore';
import {useNotificationStore} from '@/store/notificationStore';
import {PostAuthLoading} from './PostAuthLoading';
import {validateForm, commonRules, type ValidationResult} from '@/utils/validation';

interface Props {
  defaultView?: 'login' | 'register';
}

export const AuthSlider = ({defaultView = 'login'}: Props) => {
  const [view, setView] = useState<'login' | 'register'>(defaultView);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setAuth = useAuthStore((state) => state.setAuth);
  const pushNotification = useNotificationStore((state) => state.push);

  const carouselImages = useMemo(
    () => [
      'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1560264357-8d9202250f21?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
    ],
    []
  );

  useEffect(() => {
    if (carouselImages.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    
    // Client-side validation
    if (view === 'login') {
      const loginValidation = validateForm(
        {identifier, password},
        {
          identifier: commonRules.required,
          password: commonRules.required,
        }
      );
      
      if (!loginValidation.isValid) {
        setErrors(loginValidation.errors);
        return;
      }
    } else {
      const signupValidation = validateForm(
        {username, email, password},
        {
          username: commonRules.username,
          email: commonRules.email,
          password: commonRules.password,
        }
      );
      
      if (!signupValidation.isValid) {
        setErrors(signupValidation.errors);
        return;
      }
    }
    
    setLoading(true);
    try {
      if (view === 'login') {
        const {data} = await api.post(endpoints.auth.login, {identifier, password});
        console.log('[Auth] Login response:', data);
        if (!data) {
          throw new Error('No response data received from server');
        }
        setAuth(data);
        console.log('[Auth] Auth state set, showing loading screen...');
        setShowLoading(true);
        
        // Wait for Zustand persist to save and state to update
        // Also wait for RequireAuth to recognize the user
        setTimeout(() => {
          console.log('[Auth] Navigating to dashboard...');
          // Use window.location for a hard navigation to ensure clean state
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        const {data} = await api.post(endpoints.auth.signup, {username, email, password});
        console.log('[Auth] Signup response:', data);
        if (!data) {
          throw new Error('No response data received from server');
        }
        setAuth(data);
        console.log('[Auth] Auth state set, showing loading screen...');
        setShowLoading(true);
        
        // Wait for Zustand persist to save and state to update
        // Also wait for RequireAuth to recognize the user
        setTimeout(() => {
          console.log('[Auth] Navigating to dashboard...');
          // Use window.location for a hard navigation to ensure clean state
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (error: any) {
      console.error('[Auth] Error:', error);
      
      // Extract user-friendly error message
      const errorMessage = error.userMessage || error.response?.data?.message || error.response?.data?.error || error.message || 'Authentication failed. Please check your connection and try again.';
      const errorField = error.errorField;
      
      // Set field-specific error if field is provided
      if (errorField) {
        setErrors({[errorField]: errorMessage});
      } else {
        // Show general error notification
        pushNotification({
          id: `auth-error-${Date.now()}`,
          title: view === 'login' ? 'Login Failed' : 'Signup Failed',
          message: errorMessage,
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen after successful auth
  if (showLoading) {
    return <PostAuthLoading message="Preparing your workspace..." />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-500 to-violet-500 px-3 sm:px-4 py-6 sm:py-10">
      {/* Subtle animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.1),_transparent_50%)]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="mb-2">
            <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-white drop-shadow-lg">CodeCircle</span>
          </h1>
          <p className="mt-3">
            <span className="text-lg sm:text-xl md:text-2xl text-white/90 font-medium drop-shadow-md">Where Tech Minds Meet &amp; Learn</span>
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 sm:p-8 md:p-10"
        >
          <div className="flex justify-end mb-4">
            {view === 'login' ? (
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Need an account?{' '}
                <button 
                  onClick={() => setView('register')} 
                  className="text-sky-500 hover:text-sky-600 font-medium transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-sky-500/50 rounded px-1"
                >
                  Sign up
                </button>
              </span>
            ) : (
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{' '}
                <button 
                  onClick={() => setView('login')} 
                  className="text-sky-500 hover:text-sky-600 font-medium transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-sky-500/50 rounded px-1"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={view}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-5"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                  {view === 'login' ? 'Welcome Back!' : 'Create Account'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {view === 'login' ? 'Sign in to continue your journey' : 'Join the community and start learning'}
                </p>
              </div>

              {view === 'register' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5 sm:mb-2">
                    Username
                  </label>
                  <input
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      if (errors.username) setErrors({...errors, username: ''});
                    }}
                    required
                    className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 transition duration-200 ${
                      errors.username
                        ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-sky-500 focus:border-sky-500'
                    }`}
                    placeholder="Choose a username"
                  />
                  {errors.username && (
                    <p className="mt-1 text-xs text-rose-500">{errors.username}</p>
                  )}
                </div>
              )}

              {view === 'register' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5 sm:mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (errors.email) setErrors({...errors, email: ''});
                    }}
                    required
                    className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 transition duration-200 ${
                      errors.email
                        ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-sky-500 focus:border-sky-500'
                    }`}
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-rose-500">{errors.email}</p>
                  )}
                </div>
              )}

              {view === 'login' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5 sm:mb-2">
                    Email or Username
                  </label>
                  <input
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      if (errors.identifier) setErrors({...errors, identifier: ''});
                    }}
                    required
                    className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 transition duration-200 ${
                      errors.identifier
                        ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-sky-500 focus:border-sky-500'
                    }`}
                    placeholder="Enter your email or username"
                  />
                  {errors.identifier && (
                    <p className="mt-1 text-xs text-rose-500">{errors.identifier}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5 sm:mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setErrors({...errors, password: ''});
                  }}
                  required
                  className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 transition duration-200 ${
                    errors.password
                      ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-sky-500 focus:border-sky-500'
                  }`}
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-500">{errors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-500 hover:bg-sky-600 text-white py-2.5 sm:py-3 px-4 font-semibold text-sm sm:text-base shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {view === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  view === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </motion.form>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

