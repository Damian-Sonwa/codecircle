import {useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {api} from '@/services/api';
import {Shield, Database, Bell, Key, ToggleLeft, ToggleRight, Save} from 'lucide-react';
import {motion} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';

interface FeatureToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const SettingsPage = () => {
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);

  const [featureToggles, setFeatureToggles] = useState<FeatureToggle[]>([
    {
      id: 'assessments',
      label: 'Skill Assessments',
      description: 'Enable skill assessment tests for tech groups',
      enabled: true,
    },
    {
      id: 'live_sessions',
      label: 'Live Sessions',
      description: 'Allow users to request and host live sessions',
      enabled: true,
    },
    {
      id: 'classroom_requests',
      label: 'Classroom Requests',
      description: 'Allow users to request classroom sessions',
      enabled: true,
    },
    {
      id: 'private_circles',
      label: 'Private Circles',
      description: 'Enable private team/circle creation',
      enabled: true,
    },
    {
      id: 'friend_requests',
      label: 'Friend Requests',
      description: 'Enable friend request system',
      enabled: true,
    },
  ]);

  const updateFeatureMutation = useMutation({
    mutationFn: async ({id, enabled}: {id: string; enabled: boolean}) => {
      // In a real app, this would call an API endpoint
      // For now, we'll just update local state
      return {id, enabled};
    },
    onSuccess: () => {
      pushNotification({
        id: `feature-updated-${Date.now()}`,
        title: 'Feature updated',
        message: 'Feature toggle has been updated',
        type: 'success',
      });
    },
  });

  const handleToggle = (id: string) => {
    const updated = featureToggles.map((toggle) =>
      toggle.id === id ? {...toggle, enabled: !toggle.enabled} : toggle
    );
    setFeatureToggles(updated);
    const toggle = updated.find((t) => t.id === id);
    if (toggle) {
      updateFeatureMutation.mutate({id, enabled: toggle.enabled});
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin Settings</h1>
        <p className="text-sm sm:text-base text-slate-400">System configuration and preferences</p>
      </div>

      {/* Feature Toggles */}
      <section className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Feature Toggles</h2>
        <div className="space-y-3 sm:space-y-4">
          {featureToggles.map((toggle) => (
            <motion.div
              key={toggle.id}
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <ToggleLeft className="h-5 w-5 text-slate-400" />
                    <h3 className="text-base sm:text-lg font-semibold text-white">{toggle.label}</h3>
                  </div>
                  <p className="text-sm text-slate-400">{toggle.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(toggle.id)}
                  className={toggle.enabled ? 'text-emerald-400' : 'text-slate-500'}
                  title={toggle.enabled ? 'Disable feature' : 'Enable feature'}
                >
                  {toggle.enabled ? (
                    <ToggleRight className="h-6 w-6 sm:h-8 sm:w-8" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* System Settings */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">System Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
          >
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-sky-500" />
              <h3 className="text-lg font-semibold text-white">Security</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">Manage security settings and access controls</p>
            <button className="px-4 py-2 rounded-lg bg-slate-800 text-sm text-white hover:bg-slate-700 transition">
              Configure Security
            </button>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.1}}
            className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
          >
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-sky-500" />
              <h3 className="text-lg font-semibold text-white">Database</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">Database management and backup settings</p>
            <button className="px-4 py-2 rounded-lg bg-slate-800 text-sm text-white hover:bg-slate-700 transition">
              Manage Database
            </button>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.2}}
            className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
          >
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-6 w-6 text-sky-500" />
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">Configure system-wide notification settings</p>
            <button className="px-4 py-2 rounded-lg bg-slate-800 text-sm text-white hover:bg-slate-700 transition">
              Configure Notifications
            </button>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.3}}
            className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
          >
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-6 w-6 text-sky-500" />
              <h3 className="text-lg font-semibold text-white">API Keys</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">Manage API keys and external integrations</p>
            <button className="px-4 py-2 rounded-lg bg-slate-800 text-sm text-white hover:bg-slate-700 transition">
              Manage API Keys
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
