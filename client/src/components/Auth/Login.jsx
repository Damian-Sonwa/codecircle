import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MessageCircle, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from './AuthLayout';

const Login = ({ onToggle }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userData = { identifier: username, password };
      const response = await axios.post('/api/auth/login', userData, { withCredentials: true });
      
      if (response.data && response.data.user && response.data.tokens) {
        // Convert new format to old format for AuthContext compatibility
        const userDataForContext = {
          userId: response.data.user._id || response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
          token: response.data.tokens.accessToken,
          ...response.data.user
        };
        login(userDataForContext);
      } else {
        setError('Login failed: Invalid response from server');
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || err.response.data?.error || 'Login failed. Please try again.');
      } else if (err.request) {
        setError('Unable to connect to server. Please check your connection and try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
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
    <AuthLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Welcome Back!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Sign in to continue your conversations
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div variants={itemVariants} className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="h-12 text-base pl-10 border-2 border-gray-200 dark:border-gray-700 focus:border-primary transition-colors bg-white/70 dark:bg-gray-800/70"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-12 text-base pl-10 border-2 border-gray-200 dark:border-gray-700 focus:border-primary transition-colors bg-white/70 dark:bg-gray-800/70"
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
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
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
            className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline"
          >
            Don't have an account? <span className="font-bold">Sign up</span>
          </button>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
};

export default Login;
