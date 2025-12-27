import {useState, useMemo} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {UnifiedConversationList} from '@/components/Chat/UnifiedConversationList';
import ChatWindow from '@/components/Chat/ChatWindow';
import {useChatStore} from '@/store/chatStore';
import {useConversations} from '@/hooks/useConversations';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {Plus, Users, Loader2, X, UserPlus, Mail, MessageSquare} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';
import {cn} from '@/utils/styles';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';
import {EmptyState} from '@/components/EmptyState';

export const MyTechCirclePage = () => {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const {appReady} = useAppReady();
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const {data: conversations, isLoading, error} = useConversations({type: 'private-circle'});
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Filter to only show private circle conversations
  // This hook MUST be called unconditionally, even if conversations is undefined
  const circleConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.filter((conv) => conv.conversationType === 'private-circle');
  }, [conversations]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId || !circleConversations) return null;
    return circleConversations.find((conv) => conv._id === activeConversationId);
  }, [activeConversationId, circleConversations]);

  // ALL MUTATION HOOKS MUST BE CALLED BEFORE CONDITIONAL RETURNS
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
      const errorMessage = error.userMessage || error.response?.data?.message || error.response?.data?.error || 'Could not create circle';
      pushNotification({
        id: `circle-error-${Date.now()}`,
        title: 'Failed to create circle',
        message: errorMessage,
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
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-sky-500 text-white shadow-lift transition hover:bg-sky-600 hover:scale-105"
                  title="Create new circle"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {!isLoading && circleConversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center px-4">
                <EmptyState
                  icon={Users}
                  title="No circles yet"
                  description="Create your first private circle to start collaborating with your team."
                  action={{
                    label: 'Create Circle',
                    onClick: () => setShowCreateModal(true),
                  }}
                />
              </div>
            ) : (
              <UnifiedConversationList showSearch showNewChatButton={false} />
            )}
          </div>
        }
        mainContent={activeConversationId ? <ChatWindow /> : (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Select a circle"
              description="Choose a circle from the list to start chatting."
            />
          </div>
        )}
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
              className="glass-card rounded-2xl p-4 sm:p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">Create Tech Circle</h3>
                  <p className="text-sm text-slate-400 mt-1">Start a private collaboration team</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCircle} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Circle Name</label>
                  <input
                    type="text"
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                    placeholder="e.g., Frontend Team, Backend Squad"
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px] touch-manipulation"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
                  <textarea
                    value={circleDescription}
                    onChange={(e) => setCircleDescription(e.target.value)}
                    placeholder="What's this circle about?"
                    rows={3}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Add Members</label>
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
                      className="flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px] touch-manipulation"
                    />
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white transition hover:border-sky-600 min-h-[44px] min-w-[44px] touch-manipulation"
                    >
                      <UserPlus className="h-5 w-5" />
                    </button>
                  </div>
                  {selectedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedMembers.map((memberId) => (
                        <span
                          key={memberId}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
                        >
                          {memberId}
                          <button
                            type="button"
                            onClick={() => removeMember(memberId)}
                            className="text-slate-400 hover:text-white min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            <X className="h-4 w-4" />
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
                    className="flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-slate-300 transition hover:border-white/20 min-h-[44px] touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCircleMutation.isPending || !circleName.trim()}
                    className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-3 text-base font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
                  >
                    {createCircleMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
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

