import {useUIStore} from '@/store/uiStore';

export const SettingsPage = () => {
  const {theme, setTheme, ambientBackground, toggleAmbient, soundEnabled, toggleSound} = useUIStore();

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 pb-8 sm:pb-14 pt-16 sm:pt-20 md:pt-24">
      <div className="glass-card rounded-2xl sm:rounded-[2rem] border border-white/10 bg-slate-900/70 p-4 sm:p-6 md:p-10 shadow-glass">
        <h1 className="text-xl sm:text-2xl font-semibold text-white">App preferences</h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-300">Update theme, ambience, and notification defaults.</p>
        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          <section>
            <p className="text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-slate-400">Theme</p>
            <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
              {(['system', 'light', 'dark'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setTheme(option)}
                  className={
                    option === theme
                      ? 'rounded-2xl bg-gradient-to-r from-primaryFrom to-primaryTo px-4 py-2 text-sm font-semibold text-white shadow-lift'
                      : 'rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-primaryTo'
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
          <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-white">Ambient motion background</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Toggle animated gradients for immersive sessions.</p>
            </div>
            <button
              onClick={toggleAmbient}
              className={
                ambientBackground
                  ? 'rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-4 py-2 text-xs font-semibold text-white shadow-lift'
                  : 'rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300'
              }
            >
              {ambientBackground ? 'Enabled' : 'Disabled'}
            </button>
          </section>
          <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-white">Sound effects</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Play send &amp; notification sounds.</p>
            </div>
            <button
              onClick={toggleSound}
              className={
                soundEnabled
                  ? 'rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-4 py-2 text-xs font-semibold text-white shadow-lift'
                  : 'rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300'
              }
            >
              {soundEnabled ? 'On' : 'Muted'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

