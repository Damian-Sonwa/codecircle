import {useState, useMemo} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {Search, GraduationCap, Calendar, Users, Lock, Archive, Edit, Trash2, UserCheck} from 'lucide-react';
import {motion} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';
import {cn} from '@/utils/styles';

interface ClassSession {
  _id: string;
  sessionId: string;
  name: string;
  description?: string;
  instructorId?: string;
  instructorName?: string;
  skill: string;
  scheduledDate?: string;
  duration?: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  attendees?: string[];
  maxAttendees?: number;
  createdAt: string;
}

export const ClassesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);

  // Fetch classes (tech groups with type 'classroom')
  const {data: allGroups, isLoading} = useQuery({
    queryKey: ['admin-classes'],
    queryFn: async () => {
      // Fetch all tech groups and filter for classrooms
      const {data} = await api.get('/api/tech-groups');
      return (data || []).filter((group: any) => group.type === 'classroom');
    },
  });

  const filteredClasses = useMemo(() => {
    if (!allGroups) return [];
    return allGroups.filter((cls: any) => {
      const matchesSearch =
        cls.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.skill?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || cls.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allGroups, searchQuery, statusFilter]);

  const cancelClassMutation = useMutation({
    mutationFn: async (groupId: string) => {
      // Update class status to cancelled
      const {data} = await api.put(`/api/tech-groups/${groupId}`, {status: 'cancelled'});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-classes']});
      pushNotification({
        id: `class-cancelled-${Date.now()}`,
        title: 'Class cancelled',
        message: 'Class has been cancelled',
        type: 'success',
      });
    },
  });

  const archiveClassMutation = useMutation({
    mutationFn: async (groupId: string) => {
      // Archive class
      const {data} = await api.put(`/api/tech-groups/${groupId}`, {archived: true});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-classes']});
      pushNotification({
        id: `class-archived-${Date.now()}`,
        title: 'Class archived',
        message: 'Class has been archived',
        type: 'success',
      });
    },
  });

  const handleCancel = (groupId: string) => {
    if (confirm('Cancel this class session?')) {
      cancelClassMutation.mutate(groupId);
    }
  };

  const handleArchive = (groupId: string) => {
    if (confirm('Archive this class? It will be hidden from active classes.')) {
      archiveClassMutation.mutate(groupId);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Class & Session Management</h1>
        <p className="text-sm sm:text-base text-slate-400">Manage classes, sessions, attendance, and assignments</p>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 touch-manipulation"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 touch-manipulation min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="text-xs sm:text-sm text-slate-400">
          Showing {filteredClasses.length} of {allGroups?.length || 0} classes
        </div>
      </div>

      {/* Classes List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredClasses.length === 0 ? (
          <div className="bg-slate-900 rounded-xl border border-white/5 p-6 sm:p-8 text-center">
            <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-slate-500" />
            <p className="text-sm sm:text-base text-slate-400">No classes found</p>
          </div>
        ) : (
          filteredClasses.map((cls: any) => (
            <motion.div
              key={cls.groupId || cls._id}
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6 hover:border-sky-500/30 transition"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-1">{cls.name}</h3>
                      {cls.description && (
                        <p className="text-sm text-slate-400 mb-2 line-clamp-2">{cls.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-400">
                        {cls.skill && (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{cls.skill}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{cls.members?.length || 0} enrolled</span>
                        </div>
                        {cls.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{new Date(cls.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            cls.status === 'scheduled'
                              ? 'bg-blue-500/20 text-blue-300'
                              : cls.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-300'
                          )}
                        >
                          {cls.status || 'active'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    className="p-2 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition"
                    title="Edit class"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {cls.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancel(cls.groupId || cls._id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition"
                      title="Cancel class"
                    >
                      <Lock className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(cls.groupId || cls._id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-slate-800 transition"
                    title="Archive class"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
