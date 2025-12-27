import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type LiveSessionApplication} from '@/types';
import {useNotificationStore} from '@/store/notificationStore';
import {CheckCircle2, XCircle, Clock, Loader2} from 'lucide-react';
import {motion} from 'framer-motion';
import {formatTimestamp} from '@/utils/date';
import {cn} from '@/utils/styles';
import {useState} from 'react';

export const LiveSessionApplications = () => {
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  const {data: applications = [], isLoading} = useQuery<LiveSessionApplication[]>({
    queryKey: ['admin-live-session-applications', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const {data} = await api.get(`${endpoints.admin.liveSessionApplications}${params}`);
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({applicationId, adminNotes}: {applicationId: string; adminNotes?: string}) => {
      await api.post(endpoints.admin.approveApplication(applicationId), {adminNotes: adminNotes || ''});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-live-session-applications']});
      queryClient.invalidateQueries({queryKey: ['live-session-application-status']});
      pushNotification({
        id: `approve-${Date.now()}`,
        title: 'Application approved',
        message: 'User has been granted access to live sessions.',
      });
    },
    onError: (error: any) => {
      pushNotification({
        id: `approve-error-${Date.now()}`,
        title: 'Approval failed',
        message: error.response?.data?.error || 'Failed to approve application.',
        type: 'error',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({applicationId, adminNotes}: {applicationId: string; adminNotes?: string}) => {
      await api.post(endpoints.admin.rejectApplication(applicationId), {adminNotes: adminNotes || ''});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-live-session-applications']});
      queryClient.invalidateQueries({queryKey: ['live-session-application-status']});
      pushNotification({
        id: `reject-${Date.now()}`,
        title: 'Application rejected',
        message: 'Application has been rejected.',
      });
    },
    onError: (error: any) => {
      pushNotification({
        id: `reject-error-${Date.now()}`,
        title: 'Rejection failed',
        message: error.response?.data?.error || 'Failed to reject application.',
        type: 'error',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primaryTo" />
          <p className="text-sm text-slate-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'accepted', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-medium transition',
                statusFilter === status
                  ? 'bg-gradient-to-r from-primaryFrom to-primaryTo text-white'
                  : 'bg-slate-900/60 text-slate-300 border border-white/10 hover:border-primaryTo/40'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({applications.filter((app) => status === 'all' || app.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {applications.length === 0 ? (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-8 text-center">
            <p className="text-sm text-slate-400">No applications found</p>
          </div>
        ) : (
          applications.map((application) => (
            <motion.div
              key={application.applicationId}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primaryFrom to-primaryTo flex items-center justify-center text-white font-semibold">
                      {application.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{application.username}</h3>
                      <p className="text-xs text-slate-400">Tech Skill: {application.techSkill}</p>
                    </div>
                    <div
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                        application.status === 'pending' && 'bg-yellow-400/20 text-yellow-400',
                        application.status === 'accepted' && 'bg-emerald-400/20 text-emerald-400',
                        application.status === 'rejected' && 'bg-rose-400/20 text-rose-400'
                      )}
                    >
                      {application.status === 'pending' && <Clock className="h-3 w-3" />}
                      {application.status === 'accepted' && <CheckCircle2 className="h-3 w-3" />}
                      {application.status === 'rejected' && <XCircle className="h-3 w-3" />}
                      <span>{application.status}</span>
                    </div>
                  </div>

                  {application.message && (
                    <p className="text-sm text-slate-300 mb-2 mt-3">{application.message}</p>
                  )}
                  {application.availability && (
                    <p className="text-xs text-slate-400 mb-2">Availability: {application.availability}</p>
                  )}
                  {application.roomId && (
                    <p className="text-xs text-slate-500">Room: {application.roomId}</p>
                  )}
                  {application.adminNotes && (
                    <div className="mt-2 p-2 rounded-lg bg-slate-900/60 border border-white/10">
                      <p className="text-xs text-slate-500 mb-1">Admin Notes:</p>
                      <p className="text-xs text-slate-300">{application.adminNotes}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Applied: {formatTimestamp(application.createdAt)}
                  </p>
                </div>

                {application.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => approveMutation.mutate({applicationId: application.applicationId})}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-medium transition hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate({applicationId: application.applicationId})}
                      disabled={rejectMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-medium transition hover:bg-rose-500/30 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};



