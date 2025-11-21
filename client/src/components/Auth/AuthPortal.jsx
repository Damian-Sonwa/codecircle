import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const AuthPortal = () => {
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ fullName: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

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
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload = await authAPI.login(signInData.email.trim(), signInData.password);
      login(payload);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error ||
          'Unable to sign in. Please confirm your credentials and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload = await authAPI.register(signUpData.email.trim(), signUpData.password);
      login(payload);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error ||
          'Unable to create your account right now. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = (toSignUp) => {
    setErrorMessage('');
    setIsSignUp(toSignUp);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={carouselImages[activeSlide]}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${carouselImages[activeSlide]})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-950/90 to-slate-950/95 mix-blend-multiply" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.18),_transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="flex flex-col justify-center space-y-8">
            <motion.div
              key={isSignUp ? 'create' : 'signin'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="max-w-xl space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/90">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-white drop-shadow-lg">
                {isSignUp
                  ? 'Join the innovators building the future.'
                  : 'Welcome back to your tech collective.'}
              </h1>
              <p className="text-base sm:text-lg text-slate-200/80 leading-relaxed">
                {isSignUp
                  ? 'Collaborate with world-class builders, tackle real-world challenges, and grow with feedback that accelerates your tech journey.'
                  : 'Continue exploring curated learning paths, skill-based communities, and collaborative projects designed to keep you ahead.'}
              </p>
              <div className="flex flex-wrap gap-4">
                {['Communities', 'Mentorship', 'Live Challenges', 'Global Impact'].map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 backdrop-blur-md"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </motion.div>

            <div className="hidden lg:flex items-center gap-4 text-xs text-slate-300/80 uppercase tracking-[0.35em]">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <span>
                {activeSlide === 0 && 'Learn Together'}
                {activeSlide === 1 && 'Tackle Challenges'}
                {activeSlide === 2 && 'Celebrate Wins'}
                {activeSlide === 3 && 'Create Impact'}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="relative"
          >
            <div className="absolute inset-0 translate-x-6 translate-y-6 rounded-[42px] bg-white/8 blur-3xl" />
            <div className="relative rounded-[32px] border border-white/20 bg-white/10 backdrop-blur-3xl shadow-[0_25px_80px_-20px_rgba(15,23,42,0.6)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-br from-sky-500/30 via-transparent to-purple-500/30 blur-3xl" />
              <div className="relative p-8 sm:p-10 space-y-8">
                <div className="flex items-center justify-between text-sm font-semibold text-white/70">
                  <span>{isSignUp ? 'Create your credentials' : 'Sign in securely'}</span>
                  <button
                    type="button"
                    onClick={() => toggleMode(!isSignUp)}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/70 hover:border-white/40 transition"
                  >
                    {isSignUp ? 'Have an account?' : 'Need an account?'}
                  </button>
                </div>

                <form
                  onSubmit={isSignUp ? handleSignUp : handleSignIn}
                  className="space-y-5"
                >
                  {isSignUp && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Jane Doe"
                        value={signUpData.fullName}
                        onChange={(event) =>
                          setSignUpData((prev) => ({ ...prev, fullName: event.target.value }))
                        }
                        className="w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isSignUp ? 'Choose a username' : 'Enter your username'}
                      value={isSignUp ? signUpData.email : signInData.email}
                      onChange={(event) =>
                        isSignUp
                          ? setSignUpData((prev) => ({ ...prev, email: event.target.value }))
                          : setSignInData((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                      value={isSignUp ? signUpData.password : signInData.password}
                      onChange={(event) =>
                        isSignUp
                          ? setSignUpData((prev) => ({ ...prev, password: event.target.value }))
                          : setSignInData((prev) => ({ ...prev, password: event.target.value }))
                      }
                      className="w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 py-3.5 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? isSignUp
                        ? 'Creating Account...'
                        : 'Signing In...'
                      : isSignUp
                      ? 'Create Account'
                      : 'Sign In'}
                  </motion.button>
                </form>

                <div className="flex items-center justify-between text-[11px] text-white/55 uppercase tracking-[0.25em]">
                  <span>Trusted by 50k+ technologists</span>
                  <span>CodeCircle Collective</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {errorMessage && (
          <div className="mt-8 flex justify-center px-4">
            <div className="max-w-md rounded-2xl border border-red-300/70 bg-red-500/15 px-5 py-4 text-sm text-red-100/90 backdrop-blur-md shadow-lg">
              {errorMessage}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 inset-x-0 flex justify-center gap-2">
        {carouselImages.map((_, index) => (
          <span
            key={`slide-indicator-${index}`}
            className={cn(
              'h-2 w-10 rounded-full transition-all duration-500',
              activeSlide === index ? 'bg-white/80' : 'bg-white/30'
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default AuthPortal;


