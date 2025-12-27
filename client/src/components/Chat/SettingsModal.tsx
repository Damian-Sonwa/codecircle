import {Dialog, DialogBackdrop, DialogPanel} from '@headlessui/react';
import {motion} from 'framer-motion';
import {useUIStore} from '@/store/uiStore';
import {cn} from '@/utils/styles';

const themeOptions = [
  {value: 'system', label: 'System'},
  {value: 'light', label: 'Light'},
  {value: 'dark', label: 'Dark'}
] as const;

export const SettingsModal = () => {
  const {settingsOpen, setSettingsOpen, theme, setTheme, ambientBackground, toggleAmbient, soundEnabled, toggleSound} = useUIStore();

  return (
    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-slate-950/50 backdrop-blur" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
        <DialogPanel as={motion.div} initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} transition={{duration: 0.2} as any} className="glass-card w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-100">Preferences</h2>
            <p className="text-xs sm:text-sm text-slate-400">Tailor the ambience and placeholder encryption settings.</p>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <section>
              <h3 className="mb-2 sm:mb-3 text-[10px] sm:text-xs uppercase tracking-wide text-slate-400">Theme</h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'rounded-2xl border border-white/5 px-4 py-2 text-sm transition',
                      theme === option.value ? 'bg-sky-500/60 text-white' : 'bg-slate-900/60 text-slate-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-100">Ambient background</p>
                <p className="text-[10px] sm:text-xs text-slate-400">Enable animated gradients behind the chat UI.</p>
              </div>
              <button
                onClick={toggleAmbient}
                className={cn(
                  'rounded-full px-4 py-2 text-sm transition',
                  ambientBackground ? 'bg-sky-500/70 text-white' : 'bg-slate-800/70 text-slate-300'
                )}
              >
                {ambientBackground ? 'On' : 'Off'}
              </button>
            </section>
            <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-100">Sound effects</p>
                <p className="text-[10px] sm:text-xs text-slate-400">Toggle send and receive sounds.</p>
              </div>
              <button
                onClick={toggleSound}
                className={cn(
                  'rounded-full px-4 py-2 text-sm transition',
                  soundEnabled ? 'bg-sky-500/70 text-white' : 'bg-slate-800/70 text-slate-300'
                )}
              >
                {soundEnabled ? 'On' : 'Muted'}
              </button>
            </section>
            <section className="rounded-xl sm:rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-3 sm:p-4 text-xs sm:text-sm text-cyan-100">
              <p className="font-semibold">E2E encryption roadmap</p>
              <p className="text-[10px] sm:text-xs text-cyan-200/80 mt-1">
                Encryption indicators are active as placeholders. Secure key exchange and media encryption are planned for the next milestone.
              </p>
            </section>
          </div>
          <div className="mt-4 sm:mt-6 flex justify-end">
            <button onClick={() => setSettingsOpen(false)} className="rounded-full bg-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-100 transition hover:bg-slate-700">
              Close
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};


