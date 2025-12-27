import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

/**
 * Shared layout component for authentication pages
 * Features:
 * - Full-width hero image background
 * - Overlay form with semi-transparent glassmorphism
 * - Responsive design (mobile/tablet/desktop)
 * - Soft color palette and animations
 */
const AuthLayout = ({ children, isRegister = false }) => {
  // Using Unsplash images for socializing/communication theme
  // These are high-quality, free-to-use images
  const heroImageUrl = isRegister
    ? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop' // People socializing
    : 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop'; // People communicating

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Hero Background Image - Full Width */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${heroImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60 dark:from-black/70 dark:via-black/50 dark:to-black/70" />
        
        {/* Subtle animated overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 animate-gradient-x" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <motion.div
          className="absolute top-20 left-10 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl"
          animate={{
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-80 h-80 bg-accent/20 rounded-full blur-3xl"
          animate={{
            y: [0, 30, 0],
            scale: [1, 0.9, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Brand Logo - Top Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-6 left-6 md:top-8 md:left-8 z-20 flex items-center gap-2"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 shadow-lg border border-white/20">
          <MessageCircle className="h-6 w-6 md:h-7 md:w-7 text-white" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
          CodeCircle
        </h1>
      </motion.div>

      {/* Main Content - Form Overlay */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
            className="relative"
          >
            {/* Glassmorphism Card - Updated with better colors */}
            <div className="bg-gradient-to-br from-purple-50/95 via-blue-50/95 to-indigo-50/95 dark:from-purple-900/95 dark:via-indigo-900/95 dark:to-blue-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-200/50 dark:border-purple-700/50 p-6 md:p-8 relative overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/40 via-blue-100/30 to-indigo-100/40 dark:from-purple-800/20 dark:via-blue-800/20 dark:to-indigo-800/20 opacity-60 pointer-events-none" />
              
              {/* Content */}
              <div className="relative z-10">
                {children}
              </div>

              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/20 to-transparent rounded-tr-full pointer-events-none" />
            </div>

            {/* Soft shadow glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl opacity-50 -z-10 animate-pulse" />
          </motion.div>
        </div>
      </div>

      {/* Background Pattern - Subtle */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>
    </div>
  );
};

export default AuthLayout;

