import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Loader2,
  RefreshCcw,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import ChatWindow from '../chat/ChatWindow';
import { cn } from '../../lib/utils';

const FriendZone = ({
  currentUser,
  friendsData = { friends: [], incomingRequests: [], outgoingRequests: [] },
  friendsLoading = false,
  friendsError = '',
  onSendFriendRequest,
  onRespondFriendRequest,
  onRefreshFriends,
  onSelectFriend,
  activeChat,
  onClearActiveChat,
  unreadCounts = {},
  onUnreadChange = () => {},
}) => {
  const [friendUsername, setFriendUsername] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [formFeedback, setFormFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const friends = useMemo(
    () =>
      [...(friendsData?.friends || [])].sort((a, b) =>
        a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
      ),
    [friendsData?.friends]
  );

  const incomingRequests = friendsData?.incomingRequests || [];
  const outgoingRequests = friendsData?.outgoingRequests || [];

  const filteredFriends = useMemo(() => {
    if (!filterTerm.trim()) {
      return friends;
    }
    return friends.filter((friend) =>
      friend.username.toLowerCase().includes(filterTerm.trim().toLowerCase())
    );
  }, [friends, filterTerm]);

  const unreadForFriend = (friendId) => unreadCounts[`private:${friendId}`] || 0;

  const selectedFriend =
    activeChat?.type === 'private'
      ? friends.find((friend) => friend.userId === activeChat.id)
      : null;

  const handleAddFriend = async (event) => {
    event.preventDefault();
    if (!onSendFriendRequest) return;
    setIsSubmitting(true);
    setFormFeedback(null);
    try {
      const result = await onSendFriendRequest(friendUsername.trim());
      setFormFeedback({ type: 'success', message: result?.message || 'Friend request sent.' });
      setFriendUsername('');
    } catch (error) {
      setFormFeedback({
        type: 'error',
        message: error?.message || 'Unable to send friend request right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (requesterId, action) => {
    if (!onRespondFriendRequest) return;
    setRespondingId(requesterId);
    setFormFeedback(null);
    try {
      const result = await onRespondFriendRequest(requesterId, action);
      setFormFeedback({
        type: action === 'accept' ? 'success' : 'info',
        message: result?.message || 'Request updated.',
      });
    } catch (error) {
      setFormFeedback({
        type: 'error',
        message: error?.message || 'Unable to update friend request.',
      });
    } finally {
      setRespondingId(null);
    }
  };

  const handleSelectFriend = (friend) => {
    if (!friend || !onSelectFriend) return;
    onSelectFriend({
      type: 'private',
      id: friend.userId,
      user: friend,
    });
  };

  const renderStatusPill = (status) => {
    const base = 'px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.3em]';
    switch (status) {
      case 'accepted':
        return `${base} bg-emerald-500/15 text-emerald-200 border border-emerald-400/40`;
      case 'pending':
        return `${base} bg-amber-500/15 text-amber-200 border border-amber-400/40`;
      default:
        return `${base} bg-slate-500/15 text-slate-200 border border-white/10`;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col xl:flex-row gap-4 xl:gap-6">
      <motion.aside
        initial={{ x: -12, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full xl:max-w-sm flex-shrink-0 overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-white shadow-[0_30px_80px_-40px_rgba(14,165,233,0.45)]"
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Friend Zone</p>
            <h2 className="mt-1 text-2xl font-semibold">Your personal tech lounge</h2>
            <p className="mt-2 text-sm text-white/65 leading-relaxed">
              👋 Welcome to your Friend Zone — a private space to connect one-on-one, share wins,
              send voice notes, or swap GIFs with the builders you trust.
            </p>
          </div>

          <form onSubmit={handleAddFriend} className="space-y-3">
            <label className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              Add a Friend
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={friendUsername}
                  onChange={(event) => setFriendUsername(event.target.value)}
                  placeholder="Search by username (name preferred)"
                  className="w-full rounded-full border border-white/10 bg-white/10 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-sky-300/80"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !friendUsername.trim()}
                className="rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400 w-full sm:w-auto"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </form>

          {formFeedback && (
            <div
              className={cn(
                'rounded-2xl border px-4 py-3 text-xs leading-relaxed',
                formFeedback.type === 'success' && 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
                formFeedback.type === 'info' && 'border-sky-400/40 bg-sky-500/10 text-sky-100',
                formFeedback.type === 'error' && 'border-red-400/40 bg-red-500/10 text-red-200'
              )}
            >
              {formFeedback.message}
            </div>
          )}

          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Pending Requests</span>
            <div className="flex items-center gap-2">
              {friendsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />}
              <button
                type="button"
                onClick={onRefreshFriends}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <RefreshCcw className="h-3 w-3" />
                Refresh
              </button>
            </div>
          </div>

          {friendsError && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-100">
              {friendsError}
            </div>
          )}

          {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/65">
              No pending invitations right now. Send requests or wait for others to connect.
            </div>
          )}

          {incomingRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Awaiting your response</p>
              {incomingRequests.map((request) => (
                <div
                  key={`incoming-${request.userId}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{request.username}</p>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Pending</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-emerald-500/80 text-white hover:bg-emerald-500"
                        onClick={() => handleRespond(request.userId, 'accept')}
                        disabled={respondingId === request.userId}
                      >
                        {respondingId === request.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full border border-red-400/40 text-red-200 hover:bg-red-500/20"
                        onClick={() => handleRespond(request.userId, 'decline')}
                        disabled={respondingId === request.userId}
                      >
                        {respondingId === request.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="mr-1.5 h-4 w-4" />
                            Decline
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {outgoingRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Waiting on others</p>
              {outgoingRequests.map((request) => (
                <div
                  key={`outgoing-${request.userId}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70"
                >
                  Friend invite sent to{' '}
                  <span className="font-semibold text-white">{request.username}</span>. Waiting for reply.
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                Your Friends ({friends.length})
              </p>
              <div className="relative w-full sm:w-36">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={filterTerm}
                  onChange={(event) => setFilterTerm(event.target.value)}
                  placeholder="Filter"
                  className="w-full rounded-full border border-white/10 bg-white/10 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                />
              </div>
            </div>
            {friends.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-xs text-white/65">
                You haven’t added anyone yet. Start by sending an invite using the form above.
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-white/65">
                No friends match “{filterTerm}”.
              </div>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredFriends.map((friend) => {
                  const unread = unreadForFriend(friend.userId);
                  const isActive =
                    activeChat?.type === 'private' && activeChat?.id === friend.userId;
                  return (
                    <motion.button
                      key={friend.userId}
                      whileHover={{ x: 4 }}
                      className={cn(
                        'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm transition',
                        isActive &&
                          'border-sky-400 bg-sky-500/10 text-white shadow-[0_18px_45px_-30px_rgba(56,189,248,0.6)]'
                      )}
                      onClick={() => handleSelectFriend(friend)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{friend.username}</span>
                            <span
                              className={cn(
                                'inline-flex h-2.5 w-2.5 rounded-full',
                                friend.online ? 'bg-emerald-400' : 'bg-slate-500'
                              )}
                              aria-hidden
                            />
                          </div>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                            {friend.status || 'accepted'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {unread > 0 && (
                            <span className="inline-flex min-w-[24px] justify-center rounded-full bg-sky-500/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white">
                              {unread}
                            </span>
                          )}
                          <span className={renderStatusPill(friend.status || 'accepted')}>
                            {friend.status || 'accepted'}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      <motion.section
        initial={{ x: 12, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex-1 min-w-0 overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_35px_90px_-45px_rgba(56,189,248,0.55)]"
      >
        {activeChat?.type === 'private' && selectedFriend ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/15 text-white/70 hover:bg-white/10"
                  onClick={onClearActiveChat}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back to Friends
                </Button>
                <div>
                  <p className="text-lg font-semibold text-white">{selectedFriend.username}</p>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                    {selectedFriend.online ? 'Online now' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="uppercase tracking-[0.35em]">Private Chat</span>
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow activeChat={activeChat} onUnreadChange={onUnreadChange} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 sm:px-10 text-center text-white/70">
            <div className="rounded-full border border-white/10 bg-white/5 p-6">
              <UserPlus className="h-10 w-10 text-sky-300" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-white">Start a private chat</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
              Choose a friend from the list on the left to open your direct message space. Share
              links, voice notes, GIFs, or game invites — everything stays between the two of you.
            </p>
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default FriendZone;

