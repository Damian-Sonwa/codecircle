import {useState, useMemo} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {Search, Users, Edit, Trash2, MessageSquare, Calendar, Settings} from 'lucide-react';
import {motion} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';
import {cn} from '@/utils/styles';

interface TechGroup {
  _id: string;
  groupId: string;
  name: string;
  description?: string;
  members: string[];
  messages?: any[];
  createdAt: string;
  updatedAt: string;
}

export const TechGroupsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);

  const {data: groups, isLoading} = useQuery<TechGroup[]>({
    queryKey: ['admin-tech-groups'],
    queryFn: async () => {
      // Fetch all tech groups - you may need to create this endpoint
      const {data} = await api.get('/api/tech-groups');
      return data || [];
    },
  });

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    return groups.filter((group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const {data} = await api.delete(`/api/tech-groups/${groupId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-tech-groups']});
      pushNotification({
        id: `group-deleted-${Date.now()}`,
        title: 'Tech group deleted',
        message: 'Tech group has been deleted successfully',
        type: 'success',
      });
    },
  });

  const handleDelete = (group: TechGroup) => {
    if (confirm(`Are you sure you want to delete "${group.name}"? This action cannot be undone.`)) {
      deleteGroupMutation.mutate(group.groupId);
    }
  };

  if (isLoading) {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tech Groups & Communities</h1>
        <p className="text-sm sm:text-base text-slate-400">Manage tech groups, communities, and assign moderators</p>
      </div>

      {/* Search */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tech groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-900 pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 touch-manipulation"
          />
        </div>
        <div className="mt-2 text-xs sm:text-sm text-slate-400">
          Showing {filteredGroups.length} of {groups?.length || 0} tech groups
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            No tech groups found
          </div>
        ) : (
          filteredGroups.map((group) => (
            <motion.div
              key={group.groupId}
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate mb-1">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-slate-400 line-clamp-2">{group.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    className="p-2 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition"
                    title="Edit group"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                    title="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{group.members?.length || 0} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{group.messages?.length || 0} messages</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

