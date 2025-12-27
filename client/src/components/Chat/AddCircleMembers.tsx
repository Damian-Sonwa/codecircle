import {useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {motion, AnimatePresence} from 'framer-motion';
import {X, UserPlus, Loader2, Mail, User, CheckCircle, AlertCircle} from 'lucide-react';
import {api, endpoints} from '@/services/api';
import {useNotificationStore} from '@/store/notificationStore';
import {useAuthStore} from '@/store/authStore';
import {cn} from '@/utils/styles';

interface Props {
  circleId: string;
  circleName: string;
  isOpen: boolean;
  onClose: () => void;
  currentMembers: string[]; // Array of userIds
}

interface PendingMember {
  identifier: string; // username or email
  type: 'username' | 'email';
  userId?: string;
  username?: string;
  error?: string;
  loading?: boolean;
}

export const AddCircleMembers = ({circleId, circleName, isOpen, onClose, currentMembers}: Props) => {
  const [searchInput, setSearchInput] = useState('');
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);
  const user = useAuthStore((state) => state.user);

  const addMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await api.post(endpoints.privateCircles.addMembers(circleId), {
        userIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['conversations', 'private-circle']});
      queryClient.invalidateQueries({queryKey: ['conversations']});
      queryClient.invalidateQueries({queryKey: ['private-circles']});
      setPendingMembers([]);
      setSearchInput('');
      pushNotification({
        id: `members-added-${Date.now()}`,
        title: 'Members added',
        message: 'New members have been added to the circle',
        type: 'success',
      });
      onClose();
    },
    onError: (error: any) => {
      pushNotification({
        id: `add-members-error-${Date.now()}`,
        title: 'Failed to add members',
        message: error.response?.data?.error || 'Could not add members',
        type: 'error',
      });
    },
  });

  const searchUserMutation = useMutation({
    mutationFn: async (identifier: string) => {
      // Try to find user by username or email
      const response = await api.post(endpoints.privateCircles.addMembers(circleId), {
        username: identifier.includes('@') ? undefined : identifier,
        email: identifier.includes('@') ? identifier : undefined,
      });
      return response.data;
    },
    onError: (error: any) => {
      // This is expected if user not found - we'll handle it in the UI
    },
  });

  const handleAddMember = async () => {
    if (!searchInput.trim()) return;

    const identifier = searchInput.trim();
    const isEmail = identifier.includes('@');
    
    // Check if already in pending list
    if (pendingMembers.some((m) => m.identifier.toLowerCase() === identifier.toLowerCase())) {
      pushNotification({
        id: `duplicate-member-${Date.now()}`,
        title: 'Already added',
        message: 'This user is already in the list',
        type: 'info',
      });
      setSearchInput('');
      return;
    }

    const pendingMember: PendingMember = {
      identifier,
      type: isEmail ? 'email' : 'username',
      loading: true,
    };

    setPendingMembers([...pendingMembers, pendingMember]);
    setSearchInput('');

    // Try to add user - backend will validate and return error if invalid
    try {
      const response = await api.post(endpoints.privateCircles.addMembers(circleId), {
        username: isEmail ? undefined : identifier,
        email: isEmail ? identifier : undefined,
      });
      
      // Success - user was added
      // Extract user info from response if available
      const addedMembers = response.data?.members || [];
      const addedMember = addedMembers.find((m: any) => 
        m.userId && !currentMembers.includes(m.userId)
      );
      
      setPendingMembers((prev) =>
        prev.map((m) =>
          m.identifier === identifier
            ? {
                ...m,
                userId: addedMember?.userId,
                username: addedMember?.username || identifier,
                loading: false,
              }
            : m
        )
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to add user';
      
      setPendingMembers((prev) =>
        prev.map((m) =>
          m.identifier === identifier
            ? {
                ...m,
                error: errorMessage,
                loading: false,
              }
            : m
        )
      );
    }
  };

  const removePendingMember = (identifier: string) => {
    setPendingMembers(pendingMembers.filter((m) => m.identifier !== identifier));
  };

  const handleSubmit = async () => {
    const validMembers = pendingMembers.filter((m) => m.userId && !m.error);
    if (validMembers.length === 0) {
      pushNotification({
        id: `no-valid-members-${Date.now()}`,
        title: 'No valid members',
        message: 'Please add at least one valid member',
        type: 'error',
      });
      return;
    }

    const userIds = validMembers.map((m) => m.userId!);
    addMembersMutation.mutate(userIds);
  };

  const validMembersCount = pendingMembers.filter((m) => m.userId && !m.error).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{scale: 0.95, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            exit={{scale: 0.95, opacity: 0}}
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Add Members</h3>
                <p className="text-xs text-slate-400 mt-1">{circleName}</p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Username or Email
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {searchInput.includes('@') ? (
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    ) : (
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    )}
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMember();
                        }
                      }}
                      placeholder="Enter username or email"
                      className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!searchInput.trim()}
                    className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white transition hover:border-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Press Enter or click the button to add
                </p>
              </div>

              {pendingMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Members to Add ({validMembersCount})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pendingMembers.map((member) => (
                      <div
                        key={member.identifier}
                        className={cn(
                          'flex items-center justify-between rounded-xl border px-3 py-2.5',
                          member.error
                            ? 'border-rose-500/50 bg-rose-500/10'
                            : member.userId
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-white/10 bg-slate-900/60'
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {member.loading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400 flex-shrink-0" />
                          ) : member.error ? (
                            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                          ) : member.userId ? (
                            <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {member.username || member.identifier}
                            </p>
                            {member.error && (
                              <p className="text-xs text-rose-400">{member.error}</p>
                            )}
                            {member.userId && !member.error && (
                              <p className="text-xs text-slate-400">
                                {member.type === 'email' ? member.identifier : `@${member.identifier}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removePendingMember(member.identifier)}
                          className="text-slate-400 hover:text-white transition ml-2 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={addMembersMutation.isPending || validMembersCount === 0}
                  className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addMembersMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add {validMembersCount > 0 ? `${validMembersCount} ` : ''}Member{validMembersCount !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

