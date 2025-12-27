import {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {useQueryClient} from '@tanstack/react-query';
import {useAuthStore} from '@/store/authStore';
import {api, endpoints} from '@/services/api';
import {useNotificationStore} from '@/store/notificationStore';
import {cn} from '@/utils/styles';

const skillOptions = ['Fullstack', 'Backend', 'Frontend', 'Cybersecurity', 'Data Science', 'Cloud', 'UI/UX', 'AI/ML'];
const verificationQuestions = [
  {
    key: 'goal',
    question: 'What is your primary goal in this community?'
  },
  {
    key: 'share',
    question: 'What topic would you love to teach or share?'
  }
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onTourStart?: () => void;
}

export const OnboardingFlow = ({visible, onClose, onTourStart}: Props) => {
  const [step, setStep] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Professional'>('Beginner');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const updateUser = useAuthStore((state) => state.updateUser);
  const pushNotification = useNotificationStore((state) => state.push);
  const queryClient = useQueryClient();

  const reset = () => {
    setStep(0);
    setSelectedSkills([]);
    setSkillLevel('Beginner');
    setAnswers({});
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]));
  };

  const submitOnboarding = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (selectedSkills.length === 0) {
        pushNotification({
          id: 'onboarding-error',
          title: 'Skills Required',
          message: 'Please select at least one skill area to continue.',
          type: 'error'
        });
        setLoading(false);
        return;
      }
      
      if (!skillLevel) {
        pushNotification({
          id: 'onboarding-error',
          title: 'Skill Level Required',
          message: 'Please select your skill level to continue.',
          type: 'error'
        });
        setLoading(false);
        return;
      }
      
      // Call API to complete onboarding
      try {
        await api.post(endpoints.onboarding.complete, {
          skills: selectedSkills,
          skillLevel,
          answers
        });
        console.log('[Onboarding] Successfully completed onboarding via API');
      } catch (apiError: any) {
        console.error('[Onboarding] API error:', apiError);
        pushNotification({
          id: 'onboarding-api-error',
          title: 'Warning',
          message: apiError.response?.data?.error || 'Onboarding saved locally, but server sync failed.',
          type: 'error'
        });
        // Continue anyway to update local state
      }
      
      // Update user state to mark onboarding as complete
      // This must happen BEFORE navigation
      updateUser({
        hasOnboarded: true,
        profileCompleted: true,
        onboardingCompleted: true,
        skills: selectedSkills,
        skillLevel
      });
      
      console.log('[Onboarding] User state updated, waiting for persistence...');
      
      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['conversations']});
      
      // Show success notification
      pushNotification({
        id: 'onboarding-complete',
        title: '🎉 Welcome aboard!',
        message: 'Your profile is set up. You have been added to the Welcome Lounge.',
        type: 'success'
      });
      
      // Close onboarding modal
      reset();
      onClose();
      
      // Wait longer for Zustand persist to save and state to propagate
      setTimeout(() => {
        console.log('[Onboarding] Navigating to dashboard with hard reload...');
        // Use window.location for a hard navigation to ensure clean state
        // This forces a full page reload so RequireAuth sees the updated user
        window.location.href = '/dashboard';
      }, 800);
    } catch (error: any) {
      console.error('[Onboarding] Error:', error);
      pushNotification({
        id: 'onboarding-error',
        title: 'Error',
        message: error.message || 'Failed to complete onboarding. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur p-3 sm:p-4" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
          <motion.div
            initial={{scale: 0.94, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            exit={{scale: 0.94, opacity: 0}}
            transition={{type: 'spring', stiffness: 180, damping: 18}}
            className="glass-card w-full max-w-3xl rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-10 max-h-[90vh] overflow-y-auto"
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-slate-400">Learn. Chat. Grow.</p>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-100">Tailor your tech experience</h2>
            <div className="mt-4 sm:mt-8">
              {step === 0 && (
                <div>
                  <p className="text-xs sm:text-sm text-slate-300">Select the skill areas that excite you. This powers group recommendations.</p>
                  <div className="mt-4 sm:mt-5 flex flex-wrap gap-2 sm:gap-3">
                    {skillOptions.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={
                          selectedSkills.includes(skill)
                            ? 'rounded-xl sm:rounded-2xl border border-primaryTo/60 bg-primaryFrom/40 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-lift transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primaryTo/50'
                            : 'rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/60 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-300 transition-all hover:border-primaryFrom/40 hover:bg-slate-800/60 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primaryFrom/30'
                        }
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <p className="text-xs sm:text-sm text-slate-300">What best describes your level?</p>
                  <div className="mt-4 sm:mt-6 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {(['Beginner', 'Intermediate', 'Professional'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setSkillLevel(level)}
                        className={cn(
                          'rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/60 px-3 sm:px-4 md:px-5 py-4 sm:py-5 md:py-6 text-left text-xs sm:text-sm text-slate-200 transition-all hover:border-primaryTo/40 hover:bg-slate-800/60 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primaryTo/30',
                          skillLevel === level ? 'border-primaryTo/60 bg-primaryFrom/30 text-white shadow-lift' : undefined
                        )}
                      >
                        <span className="text-base sm:text-lg font-semibold">{level}</span>
                        <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-slate-300">
                          {level === 'Beginner' && 'Building foundations with peers.'}
                          {level === 'Intermediate' && 'Sharpening skills & collaborating.'}
                          {level === 'Professional' && 'Leading, mentoring, and innovating.'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 sm:space-y-6">
                  <p className="text-xs sm:text-sm text-slate-300">Help us personalise your experience.</p>
                  {verificationQuestions.map((item) => (
                    <div key={item.key}>
                      <label className="text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-widest text-slate-400">{item.question}</label>
                      <textarea
                        value={answers[item.key] ?? ''}
                        onChange={(event) => setAnswers((prev) => ({...prev, [item.key]: event.target.value}))}
                        className="mt-2 w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/70 p-3 sm:p-4 text-xs sm:text-sm text-slate-100 transition-all focus:border-primaryTo focus:outline-none focus:ring-2 focus:ring-primaryTo/30 hover:border-white/20"
                        rows={3}
                        placeholder="Share a quick thought"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
              <button
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="rounded-full border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs tracking-wide text-slate-300 transition-all hover:text-primaryTo hover:border-primaryTo/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primaryTo/30"
              >
                Skip for now
              </button>
              <div className="flex items-center gap-2 sm:gap-3">
                {step > 0 && (
                  <button
                    onClick={() => setStep((prev) => prev - 1)}
                    className="rounded-full border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-200 transition-all hover:border-primaryTo hover:bg-slate-800/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primaryTo/30"
                  >
                    Back
                  </button>
                )}
                {step < 2 && (
                  <button
                    onClick={() => setStep((prev) => prev + 1)}
                    disabled={step === 0 && selectedSkills.length === 0}
                    className="rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lift transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primaryTo/50"
                  >
                    Next
                  </button>
                )}
                {step === 2 && (
                  <button
                    onClick={submitOnboarding}
                    disabled={loading}
                    className="rounded-full bg-gradient-to-r from-secondaryFrom to-secondaryTo px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lift transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-secondaryTo/50"
                  >
                    {loading ? 'Saving...' : 'Finish & Start Tour'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

