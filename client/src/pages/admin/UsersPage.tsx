import {useState, useMemo} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {Search, Edit, Trash2, Shield, UserX, UserCheck, Mail, Calendar} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';
import {cn} from '@/utils/styles';

interface User {
  _id: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastSeen?: string;
  online?: boolean;
}

export const UsersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'instructor'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);

  const {data: users, isLoading} = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const {data} = await api.get('/admin/users');
      return data;
    },
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const {data} = await api.post(`/admin/users/${userId}/suspend`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-users']});
      pushNotification({
        id: `user-suspended-${Date.now()}`,
        title: 'User suspended',
        message: 'User has been suspended successfully',
        type: 'success',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const {data} = await api.delete(`/admin/users/${userId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-users']});
      pushNotification({
        id: `user-deleted-${Date.now()}`,
        title: 'User deleted',
        message: 'User has been deleted successfully',
        type: 'success',
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({userId, updates}: {userId: string; updates: Partial<User>}) => {
      const {data} = await api.put(endpoints.admin.updateUser(userId), updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['admin-users']});
      setShowEditModal(false);
      setSelectedUser(null);
      pushNotification({
        id: `user-updated-${Date.now()}`,
        title: 'User updated',
        message: 'User details have been updated',
        type: 'success',
      });
    },
  });

  const handleSuspend = (user: User) => {
    if (confirm(`Are you sure you want to suspend ${user.username}?`)) {
      suspendUserMutation.mutate(user.userId);
    }
  };

  const handleDelete = (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.username}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.userId);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-sm sm:text-base text-slate-400">Manage users, roles, and permissions</p>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
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
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 touch-manipulation min-w-[140px]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>
        <div className="text-xs sm:text-sm text-slate-400">
          Showing {filteredUsers.length} of {users?.length || 0} users
        </div>
      </div>

      {/* Users Table - Mobile Card View / Desktop Table View */}
      <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-white/10">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">User</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Email</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Role</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Joined</th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <motion.tr
                    key={user.userId}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    className="hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{user.username}</p>
                          {user.online && (
                            <span className="text-xs text-emerald-400">Online</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300 min-w-0">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                          user.role === 'admin' || user.role === 'superadmin'
                            ? 'bg-purple-500/20 text-purple-300'
                            : user.role === 'instructor'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-700 text-slate-300'
                        )}
                      >
                        {user.role === 'admin' || user.role === 'superadmin' ? (
                          <Shield className="h-3 w-3" />
                        ) : null}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                          user.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        )}
                      >
                        {user.status === 'active' ? (
                          <UserCheck className="h-3 w-3 mr-1" />
                        ) : (
                          <UserX className="h-3 w-3 mr-1" />
                        )}
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-500/10 transition touch-manipulation active:scale-95"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleSuspend(user)}
                            className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition touch-manipulation active:scale-95"
                            title="Suspend user"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition touch-manipulation active:scale-95"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-400">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <motion.div
                key={user.userId}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{user.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {user.online && (
                          <span className="text-xs text-emerald-400">Online</span>
                        )}
                        <span className="text-xs text-slate-400 truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 rounded-lg text-slate-400 hover:text-primaryTo hover:bg-primaryTo/10 transition touch-manipulation active:scale-95"
                      title="Edit user"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {user.status === 'active' ? (
                      <button
                        onClick={() => handleSuspend(user)}
                        className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition touch-manipulation active:scale-95"
                        title="Suspend user"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition touch-manipulation active:scale-95"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                      user.role === 'admin' || user.role === 'superadmin'
                        ? 'bg-purple-500/20 text-purple-300'
                        : user.role === 'instructor'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-700 text-slate-300'
                    )}
                  >
                    {user.role === 'admin' || user.role === 'superadmin' ? (
                      <Shield className="h-3 w-3" />
                    ) : null}
                    {user.role}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                      user.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    )}
                  >
                    {user.status === 'active' ? (
                      <UserCheck className="h-3 w-3 mr-1" />
                    ) : (
                      <UserX className="h-3 w-3 mr-1" />
                    )}
                    {user.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <EditUserModal
            user={selectedUser}
            onClose={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            onSave={(updates) => {
              updateUserMutation.mutate({userId: selectedUser.userId, updates});
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const EditUserModal = ({
  user,
  onClose,
  onSave,
}: {
  user: User;
  onClose: () => void;
  onSave: (updates: Partial<User>) => void;
}) => {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({username, email, role, status});
  };

  return (
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{scale: 0.95, opacity: 0}}
          animate={{scale: 1, opacity: 1}}
          exit={{scale: 0.95, opacity: 0}}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 rounded-xl border border-white/10 p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
        <h2 className="text-xl font-semibold text-white mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105"
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

