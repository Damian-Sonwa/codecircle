import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type LiveSessionApplication} from '@/types';
import {Clock, CheckCircle2, XCircle, Loader2} from 'lucide-react';
import {motion} from 'framer-motion';
import {cn} from '@/utils/styles';
import {formatTimestamp} from '@/utils/date';

export const ApplicationStatusDisplay = () => {
  const {data, isLoading} = useQuery<{status: string; application: LiveSessionApplication | null}>({
    queryKey: ['live-session-application-status'],
    queryFn: async () => {
      const {data} = await api.get(endpoints.liveSessions.applicationStatus);
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primaryTo" />
          <p className="text-sm text-slate-400">Loading application status...</p>
        </div>
      </div>
    );
  }

  if (!data || data.status === 'none' || !data.application) {
    return null; // Form will be shown instead
  }

  const {application} = data;
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/20',
      borderColor: 'border-yellow-400/40',
      label: 'Pending Review',
      description: 'Your application is being reviewed by administrators.',
    },
    accepted: {
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/20',
      borderColor: 'border-emerald-400/40',
      label: 'Accepted',
      description: 'Congratulations! You can now join live sessions.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-400/20',
      borderColor: 'border-rose-400/40',
      label: 'Rejected',
      description: 'Your application was not approved at this time.',
    },
  };

  const config = statusConfig[application.status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      className={cn('glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 border', config.borderColor)}
    >
      <div className="flex items-start gap-4">
        <div className={cn('rounded-full p-3', config.bgColor)}>
          <Icon className={cn('h-6 w-6', config.color)} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{config.label}</h3>
          <p className="text-sm text-slate-400 mb-4">{config.description}</p>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Tech Skill:</span>
              <span className="ml-2 text-slate-200">{application.techSkill}</span>
            </div>
            {application.message && (
              <div>
                <span className="text-slate-500">Message:</span>
                <p className="mt-1 text-slate-300">{application.message}</p>
              </div>
            )}
            {application.availability && (
              <div>
                <span className="text-slate-500">Availability:</span>
                <span className="ml-2 text-slate-300">{application.availability}</span>
              </div>
            )}
            {application.approvedAt && (
              <div>
                <span className="text-slate-500">Approved:</span>
                <span className="ml-2 text-slate-300">{formatTimestamp(application.approvedAt)}</span>
              </div>
            )}
            {application.rejectedAt && (
              <div>
                <span className="text-slate-500">Rejected:</span>
                <span className="ml-2 text-slate-300">{formatTimestamp(application.rejectedAt)}</span>
              </div>
            )}
            {application.adminNotes && (
              <div className="mt-3 p-3 rounded-lg bg-slate-900/60 border border-white/10">
                <span className="text-slate-500 text-xs">Admin Notes:</span>
                <p className="mt-1 text-sm text-slate-300">{application.adminNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};



