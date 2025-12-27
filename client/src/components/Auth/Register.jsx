import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MessageCircle, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from './AuthLayout';

const Register = ({ onToggle }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 3) {
      setError('Password must be at least 3 characters');
      setIsLoading(false);
      return;
    }

    if (username.length < 2) {
      setError('Username must be at least 2 characters');
      setIsLoading(false);
      return;
    }

    try {
      // Use api instance with explicit baseURL
      const userData = { username, password };
      const response = await api.post('/api/auth/signup', userData);
      
      // Registration successful
      if (response.data && response.data.userId && response.data.username) {
        login(response.data);
      } else {
        setError('Registration failed: Invalid response from server');
      }
    } catch (err) {
      // Handle errors
      if (err.response) {
        // Server responded with error status
        setError(err.response.data?.error || 'Registration failed. Please try again.');
      } else if (err.request) {
        // Request was made but no response received
        setError('Unable to connect to server. Please check your connection and try again.');
      } else {
        // Something else happened
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <AuthLayout isRegister={true}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent mb-2">
            Join CodeCircle
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Create your account and start connecting!
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div variants={itemVariants} className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="h-12 text-base pl-10 border-2 border-gray-200 dark:border-gray-700 focus:border-sky-500 transition-colors bg-white/70 dark:bg-gray-800/70"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-12 text-base pl-10 border-2 border-gray-200 dark:border-gray-700 focus:border-sky-500 transition-colors bg-white/70 dark:bg-gray-800/70"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-12 text-base pl-10 border-2 border-gray-200 dark:border-gray-700 focus:border-sky-500 transition-colors bg-white/70 dark:bg-gray-800/70"
            />
          </motion.div>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}
          <motion.div variants={itemVariants}>
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <MessageCircle className="h-5 w-5" />
                </span>
              )}
            </Button>
          </motion.div>
        </form>

        <motion.div
          variants={itemVariants}
          className="text-center text-sm mt-6"
        >
          <button
            type="button"
            onClick={onToggle}
            className="text-sky-500 hover:text-sky-600 font-medium transition-colors hover:underline"
          >
            Already have an account? <span className="font-bold">Sign in</span>
          </button>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
};

export default Register;
