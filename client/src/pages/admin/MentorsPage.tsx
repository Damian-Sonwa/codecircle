import {useState, useMemo} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {Search, UserCheck, UserX, GraduationCap, Mail, Calendar, Award} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';
import {cn} from '@/utils/styles';

interface Mentor {
  _id: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  skills?: string[];
  classesAssigned?: number;
  studentsTaught?: number;
}

export const MentorsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);

  // Fetch mentors (users with instructor role)
  const {data: allUsers, isLoading} = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const {data} = await api.get(endpoints.admin.users);
      return data;
    },
  });

  // Filter to get mentors only
  const mentors = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((user: any) => user.role === 'instructor' || user.role === 'mentor');
  }, [allUsers]);

  const filteredMentors = useMemo(() => {
    return mentors.filter((mentor: Mentor) => {
      const matchesSearch =
        mentor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mentor.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || mentor.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [mentors, searchQuery, statusFilter]);

  const approveMentorMutation = useMutation({
    mutationFn: async (userId: string) => {
      const {data} = await api.put(endpoints.admin.updateUser(userId), {role: 'instructor', status: 'active'});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-users']});
      pushNotification({
        id: `mentor-approved-${Date.now()}`,
        title: 'Mentor approved',
        message: 'Mentor has been approved successfully',
        type: 'success',
      });
    },
  });

  const revokeMentorMutation = useMutation({
    mutationFn: async (userId: string) => {
      const {data} = await api.put(endpoints.admin.updateUser(userId), {role: 'user'});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-users']});
      pushNotification({
        id: `mentor-revoked-${Date.now()}`,
        title: 'Mentor access revoked',
        message: 'Mentor access has been revoked',
        type: 'success',
      });
    },
  });

  const handleApprove = (mentor: Mentor) => {
    if (confirm(`Approve ${mentor.username} as a mentor?`)) {
      approveMentorMutation.mutate(mentor.userId);
    }
  };

  const handleRevoke = (mentor: Mentor) => {
    if (confirm(`Revoke mentor access for ${mentor.username}?`)) {
      revokeMentorMutation.mutate(mentor.userId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Mentor Management</h1>
        <p className="text-sm sm:text-base text-slate-400">Approve mentors, assign to classrooms, and manage mentor access</p>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search mentors..."
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
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="text-xs sm:text-sm text-slate-400">
          Showing {filteredMentors.length} of {mentors.length} mentors
        </div>
      </div>

      {/* Mentors Table */}
      <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-white/10">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Mentor</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Email</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Joined</th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMentors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No mentors found
                  </td>
                </tr>
              ) : (
                filteredMentors.map((mentor: Mentor) => (
                  <motion.tr
                    key={mentor.userId}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    className="hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{mentor.username}</p>
                          {mentor.skills && mentor.skills.length > 0 && (
                            <p className="text-xs text-slate-400 truncate">{mentor.skills.slice(0, 2).join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300 min-w-0">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{mentor.email}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                          mentor.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-orange-500/20 text-orange-300'
                        )}
                      >
                        {mentor.status === 'active' ? (
                          <UserCheck className="h-3 w-3 mr-1" />
                        ) : (
                          <Award className="h-3 w-3 mr-1" />
                        )}
                        {mentor.status}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">{new Date(mentor.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {mentor.status !== 'active' ? (
                          <button
                            onClick={() => handleApprove(mentor)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevoke(mentor)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                          >
                            Revoke Access
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredMentors.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-400">
              No mentors found
            </div>
          ) : (
            filteredMentors.map((mentor: Mentor) => (
              <motion.div
                key={mentor.userId}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{mentor.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 truncate">{mentor.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {mentor.status !== 'active' ? (
                      <button
                        onClick={() => handleApprove(mentor)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRevoke(mentor)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                      mentor.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-orange-500/20 text-orange-300'
                    )}
                  >
                    {mentor.status === 'active' ? (
                      <UserCheck className="h-3 w-3 mr-1" />
                    ) : (
                      <Award className="h-3 w-3 mr-1" />
                    )}
                    {mentor.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(mentor.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

