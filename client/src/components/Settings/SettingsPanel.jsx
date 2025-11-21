import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Volume2, VolumeX, Vibrate, Shield, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../contexts/ThemeContext';
import { useChatPreferences } from '../../hooks/useChatPreferences';

const SettingsPanel = ({ user, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const { preferences, toggleSound, toggleVibration } = useChatPreferences();

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-gradient-to-br from-[#050815] via-[#0b1221] to-[#101828]">
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#facc151a,transparent_65%)]" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'url(https://grainy-gradient.vercel.app/noise.svg)' }}
        />
      </div>

      <div className="relative z-10 px-6 py-8 md:px-10 md:py-10 space-y-8 text-white">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-[32px] border border-white/10 bg-white/10 backdrop-blur-xl px-6 py-7 md:px-10 shadow-[0_35px_80px_-45px_rgba(250,204,21,0.35)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                <Shield className="h-4 w-4" />
                Account Settings
              </div>
              <h2 className="mt-3 text-3xl font-semibold text-white">Control your experience</h2>
              <p className="text-sm text-white/70 max-w-xl leading-relaxed">
                Personalise the workspace, refine notifications, and manage security preferences for
                {` ${user?.username}'s`} account.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-xs">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Role</p>
              <p className="mt-2 text-lg font-semibold capitalize text-white">{user?.role}</p>
              <p className="mt-1 text-white/60">
                User ID:&nbsp;
                <span className="font-mono text-[13px] text-white/80">{user?.userId}</span>
              </p>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
            className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-6 shadow-[0_25px_60px_-45px_rgba(250,204,21,0.25)]"
          >
            <h3 className="text-lg font-semibold">Appearance</h3>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Mood & focus</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button
                variant={theme === 'light' ? 'secondary' : 'outline'}
                className="justify-start rounded-2xl border border-white/10 bg-white/10 text-white/80 hover:bg-white/15"
                onClick={() => {
                  if (theme === 'dark') toggleTheme();
                }}
              >
                <Sun className="mr-3 h-4 w-4" />
                Light mode
              </Button>
              <Button
                variant={theme === 'dark' ? 'secondary' : 'outline'}
                className="justify-start rounded-2xl border border-white/10 bg-white/10 text-white/80 hover:bg-white/15"
                onClick={() => {
                  if (theme === 'light') toggleTheme();
                }}
              >
                <Moon className="mr-3 h-4 w-4" />
                Dark mode
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/60">
              Theme preference syncs automatically on this device.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-6 shadow-[0_25px_60px_-45px_rgba(250,204,21,0.25)]"
          >
            <h3 className="text-lg font-semibold">Notifications</h3>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Stay in the loop</p>

            <div className="mt-5 space-y-3">
              <Button
                variant={preferences.sound ? 'secondary' : 'outline'}
                className="w-full justify-start rounded-2xl border border-white/10 bg-white/10 text-white/80 hover:bg-white/15"
                onClick={toggleSound}
              >
                {preferences.sound ? (
                  <Volume2 className="mr-3 h-4 w-4" />
                ) : (
                  <VolumeX className="mr-3 h-4 w-4" />
                )}
                Sound alerts {preferences.sound ? 'enabled' : 'disabled'}
              </Button>
              <Button
                variant={preferences.vibration ? 'secondary' : 'outline'}
                className="w-full justify-start rounded-2xl border border-white/10 bg-white/10 text-white/80 hover:bg-white/15"
                onClick={toggleVibration}
              >
                <Vibrate className="mr-3 h-4 w-4" />
                Vibration {preferences.vibration ? 'enabled' : 'disabled'}
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/60">
              Preferences are stored locally. Enable browser notifications when prompted for real-time
              alerts.
            </p>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-6 shadow-[0_25px_60px_-45px_rgba(250,204,21,0.25)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Sign out</h3>
              <p className="text-sm text-white/70">
                Securely end this session. You can sign back in anytime with your credentials.
              </p>
            </div>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default SettingsPanel;


