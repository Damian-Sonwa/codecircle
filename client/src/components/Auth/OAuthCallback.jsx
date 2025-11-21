import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { MessageCircle, CheckCircle, XCircle, Loader } from 'lucide-react';

/**
 * OAuth Callback Component
 * Handles OAuth redirects from Google/GitHub and automatically logs in the user
 */
const OAuthCallback = () => {
  const { login } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const username = urlParams.get('username');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');

    if (error) {
      // Handle error - redirect to login after showing error
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      return;
    }

    if (userId && username) {
      // Auto-login the user
      const userData = {
        userId,
        username,
        provider,
      };

      login(userData);

      // Redirect to main app after brief success message (remove query params)
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } else {
      // No valid auth data, redirect to login
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, [login]);

  // Get params for display
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const userId = urlParams.get('userId');
  const username = urlParams.get('username');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900 dark:via-indigo-900 dark:to-blue-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-200/50 dark:border-purple-700/50 p-8 md:p-12 max-w-md w-full text-center"
      >
        {error ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                <XCircle className="h-16 w-16 text-red-500 relative z-10" />
              </div>
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Authentication Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {error === 'google_auth_failed' 
                ? 'Google authentication failed. Please try again.'
                : error === 'github_auth_failed'
                ? 'GitHub authentication failed. Please try again.'
                : 'An error occurred during authentication.'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to login...
            </p>
          </>
        ) : userId && username ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <CheckCircle className="h-16 w-16 text-primary relative z-10" />
              </div>
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome, {username}! 🎉
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Authentication successful. You're being signed in...
            </p>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="flex justify-center"
            >
              <Loader className="h-6 w-6 text-primary" />
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <MessageCircle className="h-16 w-16 text-primary relative z-10" />
              </div>
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Processing...
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Please wait while we sign you in.
            </p>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="flex justify-center"
            >
              <Loader className="h-6 w-6 text-primary" />
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default OAuthCallback;

