import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Share2, UserPlus, Link as LinkIcon, Send} from 'lucide-react';
import {api, endpoints} from '@/services/api';
import {type UserSummary} from '@/types';
import {useNotificationStore} from '@/store/notificationStore';

export const FriendsPage = () => {
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);
  const {data} = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const {data} = await api.get<{friends: UserSummary[]; requests: UserSummary[]}>(endpoints.users.friends);
      return data;
    }
  });

  const inviteMutation = useMutation({
    mutationFn: (channel: string) => api.post(endpoints.friends.invite, {channel}),
    onSuccess: (response) => {
      pushNotification({id: `invite-${Date.now()}`, title: 'Invite generated', message: `Share this link: ${window.location.origin}/invite/${response.data.inviteCode}`});
    }
  });

  const respondMutation = useMutation({
    mutationFn: ({requesterId, accept}: {requesterId: string; accept: boolean}) => api.post(endpoints.friends.respond(requesterId), {accept}),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['friends']})
  });

  const startPrivateChat = (friend: UserSummary) => {
    pushNotification({id: `chat-${friend._id}`, title: 'Private chat', message: `Start a conversation with ${friend.username} from Messages.`});
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 pb-14 pt-20 sm:pt-24">
      <header className="rounded-2xl sm:rounded-[2rem] border border-white/10 bg-slate-900/60 p-6 sm:p-10 shadow-glass">
        <h1 className="text-xl sm:text-3xl font-semibold text-white">Invite friends & collaborators</h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-300">Build your circle via invite links or social sharing.</p>
      </header>

      <section className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7">
          <h2 className="text-base sm:text-lg font-semibold text-white">Generate invite link</h2>
          <p className="mt-2 text-xs text-slate-400">Share this with peers from WhatsApp, LinkedIn, X, Instagram, or TikTok.</p>
          <div className="mt-4 grid gap-2 sm:gap-3 text-xs sm:text-sm text-slate-200">
            <button onClick={() => inviteMutation.mutate('link')} className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/10 px-3 sm:px-4 py-2 sm:py-3">
              <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> <span className="truncate">Copy invite link</span>
            </button>
            <button onClick={() => inviteMutation.mutate('whatsapp')} className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/10 px-3 sm:px-4 py-2 sm:py-3">
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> <span className="truncate">Invite via WhatsApp</span>
            </button>
            <button onClick={() => inviteMutation.mutate('linkedin')} className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/10 px-3 sm:px-4 py-2 sm:py-3">
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> <span className="truncate">Invite via LinkedIn</span>
            </button>
          </div>
        </div>
        <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7">
          <h2 className="text-base sm:text-lg font-semibold text-white">Friend requests</h2>
          <div className="mt-4 space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-200">
            {data?.requests?.length
              ? data.requests.map((request) => (
                  <div key={request._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/60 px-3 sm:px-4 py-2 sm:py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{request.username}</p>
                      <p className="text-xs text-slate-400 truncate">{request.skills?.slice(0, 2).join(', ')}{request.skills && request.skills.length > 2 ? '...' : ''}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => respondMutation.mutate({requesterId: request._id, accept: true})} className="flex-1 sm:flex-initial rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white">
                        Accept
                      </button>
                      <button onClick={() => respondMutation.mutate({requesterId: request._id, accept: false})} className="flex-1 sm:flex-initial rounded-full border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs text-slate-300">
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              : <p className="text-xs sm:text-sm text-slate-400">No pending requests.</p>}
          </div>
        </div>
      </section>

      <section className="mt-6 sm:mt-10">
        <h2 className="text-base sm:text-lg font-semibold text-white">Your friends</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data?.friends?.length
            ? data.friends.map((friend) => (
                <div key={friend._id} className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">{friend.username}</p>
                    <p className="text-xs text-slate-400 truncate">{friend.skills?.slice(0, 2).join(', ')}{friend.skills && friend.skills.length > 2 ? '...' : ''}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => startPrivateChat(friend)} className="flex-1 sm:flex-initial rounded-full border border-white/10 px-3 sm:px-4 py-2 text-xs text-slate-300">
                      <Send className="mr-1 inline h-3 w-3" /> <span className="hidden sm:inline">Message</span><span className="sm:hidden">Msg</span>
                    </button>
                    <button className="flex-1 sm:flex-initial rounded-full border border-white/10 px-3 sm:px-4 py-2 text-xs text-slate-300">
                      <UserPlus className="mr-1 inline h-3 w-3" /> <span className="hidden sm:inline">Collaborate</span><span className="sm:hidden">Collab</span>
                    </button>
                  </div>
                </div>
              ))
            : <p className="text-xs sm:text-sm text-slate-400">Use quick invites to start building your list.</p>}
        </div>
      </section>
    </div>
  );
};

