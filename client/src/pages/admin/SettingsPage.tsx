import {Shield, Database, Bell, Key} from 'lucide-react';

export const SettingsPage = () => {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin Settings</h1>
        <p className="text-sm sm:text-base text-slate-400">System configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-slate-900 rounded-xl border border-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-sky-500" />
            <h2 className="text-lg font-semibold text-white">Security</h2>
          </div>
          <p className="text-sm text-slate-400">Security settings coming soon</p>
        </div>

        <div className="bg-slate-900 rounded-xl border border-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-6 w-6 text-primaryTo" />
            <h2 className="text-lg font-semibold text-white">Database</h2>
          </div>
          <p className="text-sm text-slate-400">Database management coming soon</p>
        </div>

        <div className="bg-slate-900 rounded-xl border border-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-6 w-6 text-primaryTo" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
          <p className="text-sm text-slate-400">Notification settings coming soon</p>
        </div>

        <div className="bg-slate-900 rounded-xl border border-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-6 w-6 text-primaryTo" />
            <h2 className="text-lg font-semibold text-white">API Keys</h2>
          </div>
          <p className="text-sm text-slate-400">API key management coming soon</p>
        </div>
      </div>
    </div>
  );
};

