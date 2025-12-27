import {useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {useAuthStore} from '@/store/authStore';
import {useNotificationStore} from '@/store/notificationStore';
import {Send, Clock, Code} from 'lucide-react';
import {motion} from 'framer-motion';

const TECH_SKILLS = [
  'Frontend',
  'Backend',
  'Fullstack',
  'Mobile',
  'AI/ML',
  'Data Science',
  'Cybersecurity',
  'Cloud',
  'DevOps',
  'UI/UX',
];

export const LiveSessionApplicationForm = () => {
  const user = useAuthStore((state) => state.user);
  const pushNotification = useNotificationStore((state) => state.push);
  const queryClient = useQueryClient();

  // Get tech skill from user's onboarding data
  const userTechSkill = user?.skills?.[0] || user?.onboardingAnswers?.techSkill || '';

  const [techSkill, setTechSkill] = useState(userTechSkill || '');
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState('');

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!techSkill) {
        throw new Error('Please select a tech skill');
      }
      const {data} = await api.post(endpoints.liveSessions.apply, {
        techSkill,
        message: message.trim(),
        availability: availability.trim(),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['live-session-application-status']});
      pushNotification({
        id: `application-${Date.now()}`,
        title: 'Application submitted',
        message: 'Your application has been submitted and is pending review.',
      });
      setMessage('');
      setAvailability('');
    },
    onError: (error: any) => {
      pushNotification({
        id: `application-error-${Date.now()}`,
        title: 'Application failed',
        message: error.response?.data?.error || 'Failed to submit application. Please try again.',
        type: 'error',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techSkill) {
      pushNotification({
        id: `application-validation-${Date.now()}`,
        title: 'Tech skill required',
        message: 'Please select a tech skill to continue.',
        type: 'error',
      });
      return;
    }
    applyMutation.mutate();
  };

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8"
    >
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">Apply for Live Session</h2>
        <p className="text-sm text-slate-400">Join interactive live sessions with instructors and peers</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-2">
            <Code className="h-4 w-4 text-sky-500" />
            Tech Skill <span className="text-rose-400">*</span>
          </label>
          <select
            value={techSkill}
            onChange={(e) => setTechSkill(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
            required
          >
            <option value="">Select your tech skill</option>
            {TECH_SKILLS.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
          {userTechSkill && !techSkill && (
            <p className="mt-1 text-xs text-slate-500">Your onboarding skill: {userTechSkill}</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-2">
            <Send className="h-4 w-4 text-primaryTo" />
            Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us why you want to join..."
            maxLength={500}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition resize-none"
          />
          <p className="mt-1 text-xs text-slate-500">{message.length}/500</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-2">
            <Clock className="h-4 w-4 text-primaryTo" />
            Availability (Optional)
          </label>
          <input
            type="text"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="e.g., Weekdays 6-8 PM EST"
            maxLength={200}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={applyMutation.isPending || !techSkill}
          className="w-full rounded-full bg-gradient-to-r from-sky-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {applyMutation.isPending ? 'Submitting...' : 'Apply for Live Session'}
        </button>
      </form>
    </motion.div>
  );
};



