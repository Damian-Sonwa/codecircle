import {useState, useEffect} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {UserPlus, X, Clock, Loader2, Mail, Search} from 'lucide-react';
import {api, endpoints} from '@/services/api';
import {type UserSummary} from '@/types';
import {useNotificationStore} from '@/store/notificationStore';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';

export const FriendRequestsPage = () => {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const {appReady} = useAppReady();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pushNotification = useNotificationStore((state) => state.push);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Fetch friends data (includes requests) - only when app is ready
  const {data, isLoading} = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const {data} = await api.get<{
        friends: UserSummary[];
        incomingRequests: UserSummary[];
        outgoingRequests: UserSummary[];
        friendRequests?: UserSummary[]; // Legacy field
        sentFriendRequests?: UserSummary[]; // Legacy field
      }>(endpoints.users.friends);
      // Map legacy fields to new fields for compatibility
      return {
        friends: data.friends || [],
        incomingRequests: data.incomingRequests || data.friendRequests || [],
        outgoingRequests: data.outgoingRequests || data.sentFriendRequests || [],
      };
    },
    enabled: appReady, // Only fetch when app is ready
    refetchOnMount: true,
  });

  // ALL MUTATION HOOKS MUST BE CALLED BEFORE CONDITIONAL RETURNS
  const sendRequestMutation = useMutation({
    mutationFn: async (identifier: string) => {
      return api.post(endpoints.friends.request, {
        targetUsername: identifier.includes('@') ? undefined : identifier,
        targetEmail: identifier.includes('@') ? identifier : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['friends']});
      setSearchInput('');
      pushNotification({
        id: `request-sent-${Date.now()}`,
        title: 'Friend request sent',
        message: 'Your friend request has been sent',
      });
    },
    onError: (error: any) => {
      pushNotification({
        id: `request-error-${Date.now()}`,
        title: 'Failed to send request',
        message: error.response?.data?.error || 'Could not send friend request',
        type: 'error',
      });
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({requesterId, accept}: {requesterId: string; accept: boolean}) =>
      api.post(endpoints.friends.respond(requesterId), {accept}),
    onSuccess: (data, variables) => {
      // Invalidate queries first
      queryClient.invalidateQueries({queryKey: ['friends']});
      queryClient.invalidateQueries({queryKey: ['conversations']});
      
      pushNotification({
        id: `request-${variables.requesterId}-${Date.now()}`,
        title: variables.accept ? 'Friend request accepted' : 'Friend request declined',
        message: data?.data?.message || (variables.accept ? 'You are now friends!' : 'Request declined'),
        type: variables.accept ? 'success' : 'info'
      });

      // If accepted, wait for conversations to update, then navigate to chat
      if (variables.accept) {
        setTimeout(() => {
          // Navigate to chats page with friendId parameter
          // The FriendChatsPageEnhanced will handle opening the conversation
          navigate(`/friends/chats?friendId=${variables.requesterId}`, {replace: false});
        }, 800); // Increased delay to ensure conversations are updated
      }
    }
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (targetUserId: string) => {
      return api.delete(`/api/friends/request/${targetUserId}`);
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

  useEffect(() => {
    if (appReady && !isLoading && data) {
      console.log('[FriendRequests] App ready, friends data loaded');
    }
  }, [appReady, isLoading, data]);

  // CONDITIONAL RETURNS AFTER ALL HOOKS
  if (!appReady) {
    return <AppLoader message="Loading friend requests..." />;
  }

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setIsSearching(true);
    try {
      await sendRequestMutation.mutateAsync(searchInput.trim());
    } finally {
      setIsSearching(false);
    }
  };

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

  const incomingRequests = data?.incomingRequests ?? [];
  const outgoingRequests = data?.outgoingRequests ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Add Friend Form */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500" />
          <h2 className="text-lg sm:text-xl font-semibold text-white">Add Friend</h2>
        </div>
        <form onSubmit={handleSendRequest} className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Username or email address"
                className="w-full rounded-full border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={isSearching || sendRequestMutation.isPending}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || sendRequestMutation.isPending || !searchInput.trim()}
              className="rounded-full bg-gradient-to-r from-sky-500 to-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(isSearching || sendRequestMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Send Request
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Enter a username or email address to send a friend request
          </p>
        </form>
      </section>
      {/* Incoming Requests */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500" />
          <h2 className="text-lg sm:text-xl font-semibold text-white">Incoming Requests</h2>
          {incomingRequests.length > 0 && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-500">{incomingRequests.length}</span>
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
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
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
                    onClick={() => handleAccept(request._id || request.userId)}
                    disabled={respondMutation.isPending}
                    className="flex-1 sm:flex-initial rounded-full bg-gradient-to-r from-sky-500 to-sky-500 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(request._id || request.userId)}
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
                  onClick={() => handleCancel(request._id || request.userId)}
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

