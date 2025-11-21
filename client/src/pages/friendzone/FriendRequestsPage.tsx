import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {UserPlus, X, Clock} from 'lucide-react';
import {api, endpoints} from '@/services/api';
import {type UserSummary} from '@/types';
import {useNotificationStore} from '@/store/notificationStore';

export const FriendRequestsPage = () => {
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);

  // Fetch friends data (includes requests)
  const {data, isLoading} = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const {data} = await api.get<{friends: UserSummary[]; requests: UserSummary[]}>(endpoints.users.friends);
      return data;
    }
  });

  // Fetch outgoing requests (sent by current user)
  // Note: This might need a new endpoint. For now, we'll use a placeholder approach
  const {data: outgoingData} = useQuery({
    queryKey: ['outgoing-requests'],
    queryFn: async () => {
      // TODO: Create endpoint for outgoing requests
      // For now, return empty array
      return [] as UserSummary[];
    },
    enabled: false // Disabled until endpoint is created
  });

  const respondMutation = useMutation({
    mutationFn: ({requesterId, accept}: {requesterId: string; accept: boolean}) =>
      api.post(endpoints.friends.respond(requesterId), {accept}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({queryKey: ['friends']});
      pushNotification({
        id: `request-${variables.requesterId}-${Date.now()}`,
        title: variables.accept ? 'Friend request accepted' : 'Friend request declined',
        message: variables.accept ? 'You are now friends!' : 'Request declined'
      });
    }
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (targetUserId: string) => {
      // TODO: Create endpoint to cancel outgoing request
      return api.delete(`/friends/request/${targetUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['outgoing-requests']});
      pushNotification({
        id: `cancel-${Date.now()}`,
        title: 'Request cancelled',
        message: 'Friend request has been cancelled'
      });
    }
  });

  const handleAccept = (requesterId: string) => {
    respondMutation.mutate({requesterId, accept: true});
  };

  const handleDecline = (requesterId: string) => {
    respondMutation.mutate({requesterId, accept: false});
  };

  const handleCancel = (targetUserId: string) => {
    cancelRequestMutation.mutate(targetUserId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">Loading requests...</p>
      </div>
    );
  }

  const incomingRequests = data?.requests ?? [];
  const outgoingRequests = outgoingData ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Incoming Requests */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primaryTo" />
          <h2 className="text-lg sm:text-xl font-semibold text-white">Incoming Requests</h2>
          {incomingRequests.length > 0 && (
            <span className="rounded-full bg-primaryTo/20 px-2 py-0.5 text-xs text-primaryTo">{incomingRequests.length}</span>
          )}
        </div>

        {incomingRequests.length === 0 ? (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center">
            <UserPlus className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-slate-500 mb-3" />
            <p className="text-sm text-slate-400">No pending friend requests</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {incomingRequests.map((request) => (
              <div
                key={request._id}
                className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl p-4 sm:p-5"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primaryFrom to-primaryTo flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                    {request.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-white truncate">{request.username}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {request.skills?.slice(0, 2).map((skill) => (
                        <span key={skill} className="text-[10px] sm:text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                      {request.skills && request.skills.length > 2 && (
                        <span className="text-[10px] sm:text-xs text-slate-400">+{request.skills.length - 2}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleAccept(request._id)}
                    disabled={respondMutation.isPending}
                    className="flex-1 sm:flex-initial rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-lift transition hover:scale-105 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(request._id)}
                    disabled={respondMutation.isPending}
                    className="flex-1 sm:flex-initial rounded-full border border-white/10 bg-slate-900/60 px-4 sm:px-5 py-2 text-xs sm:text-sm text-slate-300 transition hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Outgoing Requests */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
          <h2 className="text-lg sm:text-xl font-semibold text-white">Outgoing Requests</h2>
          {outgoingRequests.length > 0 && (
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{outgoingRequests.length}</span>
          )}
        </div>

        {outgoingRequests.length === 0 ? (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center">
            <Clock className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-slate-500 mb-3" />
            <p className="text-sm text-slate-400">No pending outgoing requests</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {outgoingRequests.map((request) => (
              <div
                key={request._id}
                className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl p-4 sm:p-5"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                    {request.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-white truncate">{request.username}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {request.skills?.slice(0, 2).map((skill) => (
                        <span key={skill} className="text-[10px] sm:text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(request._id)}
                  disabled={cancelRequestMutation.isPending}
                  className="w-full sm:w-auto rounded-full border border-white/10 bg-slate-900/60 px-4 sm:px-5 py-2 text-xs sm:text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  Cancel Request
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

