import {useState} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {UnifiedConversationList} from '@/components/Chat/UnifiedConversationList';
import ChatWindow from '@/components/Chat/ChatWindow';
import {useChatStore} from '@/store/chatStore';
import {useConversations} from '@/hooks/useConversations';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {useMemo} from 'react';
import {Plus, Users, Loader2, X, UserPlus, Mail} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';
import {cn} from '@/utils/styles';

export const MyTechCirclePage = () => {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const {data: conversations} = useConversations({type: 'private-circle'});
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Filter to only show private circle conversations
  const circleConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.filter((conv) => conv.conversationType === 'private-circle');
  }, [conversations]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId || !circleConversations) return null;
    return circleConversations.find((conv) => conv._id === activeConversationId);
  }, [activeConversationId, circleConversations]);

  const createCircleMutation = useMutation({
    mutationFn: async (data: {name: string; description: string; memberIds: string[]}) => {
      const response = await api.post(endpoints.privateCircles.create, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['conversations', 'private-circle']});
      queryClient.invalidateQueries({queryKey: ['private-circles']});
      setShowCreateModal(false);
      setCircleName('');
      setCircleDescription('');
      setMemberSearch('');
      setSelectedMembers([]);
      pushNotification({
        id: `circle-created-${Date.now()}`,
        title: 'Circle created',
        message: 'Your private circle has been created successfully',
      });
    },
    onError: (error: any) => {
      pushNotification({
        id: `circle-error-${Date.now()}`,
        title: 'Failed to create circle',
        message: error.response?.data?.error || 'Could not create circle',
        type: 'error',
      });
    },
  });

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleName.trim()) return;
    createCircleMutation.mutate({
      name: circleName.trim(),
      description: circleDescription.trim(),
      memberIds: selectedMembers,
    });
  };

  const handleAddMember = () => {
    if (!memberSearch.trim()) return;
    // For now, just add the search term as a member ID
    // In production, you'd search for users first
    if (!selectedMembers.includes(memberSearch.trim())) {
      setSelectedMembers([...selectedMembers, memberSearch.trim()]);
      setMemberSearch('');
    }
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
  };

  return (
    <>
      <AppShell
        sidebar={
          <div className="flex h-full flex-col">
            <div className="mb-4 px-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">My Tech Circle</h2>
                  <p className="text-xs text-slate-400">Private collaboration teams</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo text-white shadow-lift transition hover:scale-105"
                  title="Create new circle"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <UnifiedConversationList showSearch showNewChatButton={false} />
          </div>
        }
        mainContent={activeConversationId ? <ChatWindow /> : undefined}
      />

      {/* Create Circle Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{scale: 0.95, opacity: 0}}
              animate={{scale: 1, opacity: 1}}
              exit={{scale: 0.95, opacity: 0}}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">Create Tech Circle</h3>
                  <p className="text-xs text-slate-400 mt-1">Start a private collaboration team</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCircle} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Circle Name</label>
                  <input
                    type="text"
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                    placeholder="e.g., Frontend Team, Backend Squad"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primaryTo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Description (optional)</label>
                  <textarea
                    value={circleDescription}
                    onChange={(e) => setCircleDescription(e.target.value)}
                    placeholder="What's this circle about?"
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primaryTo resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Add Members</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMember();
                        }
                      }}
                      placeholder="Username or email"
                      className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primaryTo"
                    />
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-white transition hover:border-primaryTo"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                  {selectedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedMembers.map((memberId) => (
                        <span
                          key={memberId}
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs text-slate-200"
                        >
                          {memberId}
                          <button
                            type="button"
                            onClick={() => removeMember(memberId)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCircleMutation.isPending || !circleName.trim()}
                    className="flex-1 rounded-xl bg-gradient-to-r from-primaryFrom to-primaryTo px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {createCircleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Circle
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

