import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {CheckCircle, XCircle, Clock, UserCheck, GraduationCap, Calendar, User, MessageSquare} from 'lucide-react';
import {motion} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';
import {cn} from '@/utils/styles';

interface ClassroomRequest {
  requestId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdByUsername?: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  adminNotes?: string;
}

interface LiveSessionApplication {
  applicationId: string;
  userId: string;
  username?: string;
  skill: string;
  topic: string;
  proposedDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const ApprovalsPage = () => {
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);

  // Fetch classroom requests
  const {data: classroomRequests, isLoading: isLoadingRequests} = useQuery<ClassroomRequest[]>({
    queryKey: ['admin-classroom-requests'],
    queryFn: async () => {
      const {data} = await api.get('/api/admin/classroom-requests');
      return data || [];
    },
  });

  // Fetch live session applications
  const {data: liveApplications, isLoading: isLoadingApplications} = useQuery<LiveSessionApplication[]>({
    queryKey: ['admin-live-session-applications'],
    queryFn: async () => {
      const {data} = await api.get(endpoints.admin.liveSessionApplications);
      return data || [];
    },
  });

  const approveClassroomMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const {data} = await api.post(`/api/admin/classroom-requests/${requestId}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-classroom-requests']});
      pushNotification({
        id: `classroom-approved-${Date.now()}`,
        title: 'Classroom approved',
        message: 'Classroom request has been approved',
        type: 'success',
      });
    },
  });

  const declineClassroomMutation = useMutation({
    mutationFn: async ({requestId, reason}: {requestId: string; reason?: string}) => {
      const {data} = await api.post(`/api/admin/classroom-requests/${requestId}/decline`, {adminNotes: reason});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-classroom-requests']});
      pushNotification({
        id: `classroom-declined-${Date.now()}`,
        title: 'Classroom declined',
        message: 'Classroom request has been declined',
        type: 'info',
      });
    },
  });

  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const {data} = await api.post(endpoints.admin.approveApplication(applicationId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-live-session-applications']});
      pushNotification({
        id: `application-approved-${Date.now()}`,
        title: 'Application approved',
        message: 'Live session application has been approved',
        type: 'success',
      });
    },
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const {data} = await api.post(endpoints.admin.rejectApplication(applicationId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-live-session-applications']});
      pushNotification({
        id: `application-rejected-${Date.now()}`,
        title: 'Application rejected',
        message: 'Live session application has been rejected',
        type: 'info',
      });
    },
  });

  const pendingClassroomRequests = classroomRequests?.filter((r) => r.status === 'pending') || [];
  const pendingApplications = liveApplications?.filter((a) => a.status === 'pending') || [];

  const handleApproveClassroom = (requestId: string) => {
    if (confirm('Approve this classroom request?')) {
      approveClassroomMutation.mutate(requestId);
    }
  };

  const handleDeclineClassroom = (requestId: string) => {
    const reason = prompt('Reason for declining (optional):');
    if (reason !== null) {
      declineClassroomMutation.mutate({requestId, reason});
    }
  };

  const handleApproveApplication = (applicationId: string) => {
    if (confirm('Approve this live session application?')) {
      approveApplicationMutation.mutate(applicationId);
    }
  };

  const handleRejectApplication = (applicationId: string) => {
    if (confirm('Reject this live session application?')) {
      rejectApplicationMutation.mutate(applicationId);
    }
  };

  if (isLoadingRequests || isLoadingApplications) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Approvals & Moderation</h1>
        <p className="text-sm sm:text-base text-slate-400">Review and approve pending requests</p>
      </div>

      {/* Classroom Requests */}
      <section className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-sky-500" />
          <h2 className="text-lg sm:text-xl font-semibold text-white">Classroom Requests</h2>
          {pendingClassroomRequests.length > 0 && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-500">
              {pendingClassroomRequests.length} pending
            </span>
          )}
        </div>

        {pendingClassroomRequests.length === 0 ? (
          <div className="bg-slate-900 rounded-xl border border-white/5 p-6 sm:p-8 text-center">
            <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-slate-500" />
            <p className="text-sm sm:text-base text-slate-400">No pending classroom requests</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {pendingClassroomRequests.map((request) => (
              <motion.div
                key={request.requestId}
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1">{request.name}</h3>
                    {request.description && (
                      <p className="text-sm text-slate-400 mb-2 line-clamp-2">{request.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{request.createdByUsername || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        request.status === 'pending'
                          ? 'bg-orange-500/20 text-orange-300'
                          : request.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      )}>
                        <Clock className="h-3 w-3 mr-1" />
                        {request.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApproveClassroom(request.requestId)}
                      disabled={approveClassroomMutation.isPending}
                      className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition text-sm font-medium disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeclineClassroom(request.requestId)}
                      disabled={declineClassroomMutation.isPending}
                      className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition text-sm font-medium disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4 inline mr-1" />
                      Decline
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Live Session Applications */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-sky-500" />
          <h2 className="text-lg sm:text-xl font-semibold text-white">Live Session Applications</h2>
          {pendingApplications.length > 0 && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-500">
              {pendingApplications.length} pending
            </span>
          )}
        </div>

        {pendingApplications.length === 0 ? (
          <div className="bg-slate-900 rounded-xl border border-white/5 p-6 sm:p-8 text-center">
            <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-slate-500" />
            <p className="text-sm sm:text-base text-slate-400">No pending live session applications</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {pendingApplications.map((application) => (
              <motion.div
                key={application.applicationId}
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1">{application.topic}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{application.username || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{application.skill}</span>
                      </div>
                      {application.proposedDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{new Date(application.proposedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApproveApplication(application.applicationId)}
                      disabled={approveApplicationMutation.isPending}
                      className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition text-sm font-medium disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectApplication(application.applicationId)}
                      disabled={rejectApplicationMutation.isPending}
                      className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition text-sm font-medium disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4 inline mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
