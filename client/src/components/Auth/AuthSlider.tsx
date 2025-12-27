import {type FormEvent, useState, useEffect, useMemo} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {api, endpoints} from '@/services/api';
import {useAuthStore} from '@/store/authStore';
import {useNotificationStore} from '@/store/notificationStore';

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
  const [activeSlide, setActiveSlide] = useState(0);
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
    setLoading(true);
    try {
      if (view === 'login') {
        const {data} = await api.post(endpoints.auth.login, {identifier, password});
        console.log('[Auth] Login response:', data);
        if (!data) {
          throw new Error('No response data received from server');
        }
        setAuth(data);
        console.log('[Auth] Auth state set, waiting for state to persist...');
        
        // Wait for Zustand persist to save and state to update
        // Also wait for RequireAuth to recognize the user
        setTimeout(() => {
          console.log('[Auth] Navigating to dashboard...');
          // Use window.location for a hard navigation to ensure clean state
          window.location.href = '/dashboard';
        }, 500);
      } else {
        const {data} = await api.post(endpoints.auth.signup, {username, email, password});
        console.log('[Auth] Signup response:', data);
        if (!data) {
          throw new Error('No response data received from server');
        }
        setAuth(data);
        console.log('[Auth] Auth state set, waiting for state to persist...');
        
        // Wait for Zustand persist to save and state to update
        // Also wait for RequireAuth to recognize the user
        setTimeout(() => {
          console.log('[Auth] Navigating to dashboard...');
          // Use window.location for a hard navigation to ensure clean state
          window.location.href = '/dashboard';
        }, 500);
      }
    } catch (error: unknown) {
      const err = error as {config?: {url?: string; baseURL?: string}; response?: {data?: {error?: string}}; message?: string};
      console.error('[Auth] Error:', error);
      console.error('[Auth] Request URL:', err.config?.url);
      console.error('[Auth] Base URL:', err.config?.baseURL);
      console.error('[Auth] Full error:', err.response?.data || err.message);
      
      // Show error notification
      const errorMessage = err.response?.data?.error || err.message || 'Authentication failed. Please check your connection and try again.';
      pushNotification({
        id: `auth-error-${Date.now()}`,
        title: view === 'login' ? 'Login Failed' : 'Signup Failed',
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-3 sm:px-4 py-6 sm:py-10 text-slate-100">
      {/* Background Image Carousel */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          {carouselImages[activeSlide] && (
            <motion.div
              key={carouselImages[activeSlide]}
              initial={{opacity: 0, scale: 1.05}}
              animate={{opacity: 1, scale: 1}}
              exit={{opacity: 0, scale: 0.98}}
              transition={{duration: 1.2, ease: 'easeInOut'}}
              className="absolute inset-0"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{backgroundImage: `url(${carouselImages[activeSlide]})`}}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-950/90 to-slate-950/95 mix-blend-multiply" />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.18),_transparent_45%)]" />
      </div>

      <div className="relative grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-white/10 bg-slate-900/70 shadow-glass md:grid-cols-2">
        <motion.div
          animate={{x: view === 'login' ? '0%' : '100%'}}
          transition={{type: 'spring', stiffness: 170, damping: 20}}
          className="absolute inset-y-0 w-full md:w-1/2"
        >
          <div className="h-full bg-gradient-to-br from-sky-500/80 via-sky-500/80 to-violet-500/80 backdrop-blur-sm" />
        </motion.div>
        <div className="relative hidden flex-col justify-between px-8 py-12 md:flex md:px-12 md:py-16">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] md:tracking-[0.5em] text-white/70">Where Tech Minds Meet &amp; Learn</p>
            <h2 className="mt-4 text-2xl md:text-3xl font-semibold text-white">Join the community</h2>
            <p className="mt-2 text-xs md:text-sm text-white/80">
              Connect with developers across Fullstack, Cybersecurity, AI and more. Share knowledge, attend live classes, and chat in realtime.
            </p>
          </div>
          <div className="space-y-2 text-xs text-white/80">
            <p>• Skill-based communities &amp; classrooms</p>
            <p>• Private &amp; group chats with encryption indicators</p>
            <p>• Leaderboards, badges, and immersive onboarding</p>
          </div>
        </div>
        <div className="relative px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12">
          <div className="flex justify-end text-xs text-slate-400">
            {view === 'login' ? (
              <span>
                Need an account?{' '}
                <button 
                  onClick={() => setView('register')} 
                  className="text-sky-500 transition-all hover:text-sky-600 hover:underline active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/50 rounded px-1"
                >
                  Create one
                </button>
              </span>
            ) : (
              <span>
                Already joined?{' '}
                <button 
                  onClick={() => setView('login')} 
                  className="text-sky-500 transition-all hover:text-sky-600 hover:underline active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/50 rounded px-1"
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
              initial={{opacity: 0, x: 40}}
              animate={{opacity: 1, x: 0}}
              exit={{opacity: 0, x: -40}}
              transition={{duration: 0.35, ease: 'easeInOut'}}
              className="mt-4 sm:mt-8 space-y-4 sm:space-y-5"
            >
              <h2 className="text-xl sm:text-2xl font-semibold text-white">{view === 'login' ? 'Sign in' : 'Create account'}</h2>
              <p className="text-xs text-slate-400">Glassmorphism portals, micro-animations, and realtime connections await.</p>
              {view === 'register' && (
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Username</label>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 transition-all focus:border-primaryTo focus:outline-none focus:ring-2 focus:ring-primaryTo/30 hover:border-white/20"
                  />
                </div>
              )}
              {view === 'register' && (
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 transition-all focus:border-primaryTo focus:outline-none focus:ring-2 focus:ring-primaryTo/30 hover:border-white/20"
                  />
                </div>
              )}
              {view === 'login' && (
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Email or username</label>
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 transition-all focus:border-primaryTo focus:outline-none focus:ring-2 focus:ring-primaryTo/30 hover:border-white/20"
                  />
                </div>
              )}
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 focus:border-secondaryTo focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-primaryFrom to-primaryTo py-3 text-sm font-semibold text-white shadow-lift transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primaryTo/50"
              >
                {loading ? 'One moment…' : view === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </motion.form>
          </AnimatePresence>
        </div>
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center gap-2">
        {carouselImages.map((_, index) => (
          <span
            key={`slide-indicator-${index}`}
            className={`h-2 w-10 rounded-full transition-all duration-500 ${
              activeSlide === index ? 'bg-white/80' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

