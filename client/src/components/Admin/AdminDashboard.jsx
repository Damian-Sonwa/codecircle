import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldAlert,
  UserMinus,
  RefreshCcw,
  Trash2,
  Activity,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Ban,
  CalendarPlus,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';

const statusBadgeStyles = {
  active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  suspended: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  deleted: 'bg-red-500/15 text-red-300 border border-red-500/20',
};

const roleBadgeStyles = {
  admin: 'bg-sky-500/15 text-sky-300 border border-sky-500/20',
  user: 'bg-slate-500/15 text-slate-300 border border-slate-500/20',
  superadmin: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
};

const AdminDashboard = ({
  onClose,
  classroomRequests = [],
  onRefreshClassroom,
  onApproveClassroom,
  onDeclineClassroom,
  adminAlert,
  onDismissAdminAlert,
  currentUser,
}) => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [violations, setViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isViolationsLoading, setIsViolationsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logError, setLogError] = useState('');
  const [violationsError, setViolationsError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [classroomErrorMessage, setClassroomErrorMessage] = useState('');
  const [classroomActionId, setClassroomActionId] = useState(null);
  const [classroomActionType, setClassroomActionType] = useState(null);
  const [roleActionId, setRoleActionId] = useState(null);
  const [roleActionError, setRoleActionError] = useState('');
  const [roleActionSuccess, setRoleActionSuccess] = useState('');
  const [promoteUsername, setPromoteUsername] = useState('');
  const [promoteRole, setPromoteRole] = useState('admin');
  const [promoteMessage, setPromoteMessage] = useState('');
  const [promoteError, setPromoteError] = useState('');

  const currentUserRole = currentUser?.role || 'user';

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await adminAPI.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Unable to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (targetUser, nextRole) => {
    if (!targetUser || !nextRole) return;
    setRoleActionError('');
    setRoleActionSuccess('');
    setPromoteError('');
    setPromoteMessage('');
    setRoleActionId(targetUser.userId);
    try {
      await adminAPI.updateRole(targetUser.userId, nextRole);
      setUsers((prev) =>
        prev.map((user) =>
          user.userId === targetUser.userId ? { ...user, role: nextRole } : user
        )
      );
      setRoleActionSuccess(
        `${targetUser.username} is now ${nextRole === 'user' ? 'a member' : nextRole}.`
      );
      await loadLogs();
    } catch (err) {
      setRoleActionError(
        err?.response?.data?.error || 'Unable to update user role right now.'
      );
    } finally {
      setRoleActionId(null);
    }
  };

  const handlePromoteSubmit = (event) => {
    event.preventDefault();
    setPromoteError('');
    setPromoteMessage('');
    if (!promoteUsername.trim()) {
      setPromoteError('Enter a username to promote.');
      return;
    }
    const candidate = users.find(
      (user) => user.username?.toLowerCase() === promoteUsername.trim().toLowerCase()
    );
    if (!candidate) {
      setPromoteError('User not found. Make sure the username matches exactly.');
      return;
    }
    if (candidate.role === promoteRole) {
      setPromoteError('User already has the selected role.');
      return;
    }
    if (promoteRole === 'superadmin' && currentUserRole !== 'superadmin') {
      setPromoteError('Only a superadmin can assign the superadmin role.');
      return;
    }
    handleRoleChange(candidate, promoteRole)
      .then(() => {
        setPromoteUsername('');
        setPromoteMessage(
          `${candidate.username} promoted to ${promoteRole === 'admin' ? 'admin' : 'superadmin'}.`
        );
      })
      .catch(() => {
        setPromoteError('Unable to promote user. Please try again.');
      });
  };

  const loadLogs = async () => {
    setIsLogsLoading(true);
    setLogError('');
    try {
      const data = await adminAPI.getLogs(25);
      setLogs(data);
    } catch (err) {
      setLogError('Unable to load recent admin actions.');
    } finally {
      setIsLogsLoading(false);
    }
  };

  const loadViolations = async () => {
    setIsViolationsLoading(true);
    setViolationsError('');
    try {
      const data = await adminAPI.getViolations(50);
      setViolations(data);
    } catch (err) {
      setViolationsError('Unable to load violations. Please try again.');
    } finally {
      setIsViolationsLoading(false);
    }
  };

  const sortedClassroomRequests = useMemo(() => {
    if (!Array.isArray(classroomRequests)) return [];
    return [...classroomRequests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [classroomRequests]);

  const adminAlertStyles = useMemo(
    () => ({
      success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
      error: 'border-red-400/40 bg-red-500/10 text-red-100',
      info: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
    }),
    []
  );

  const classroomStatusStyles = useMemo(
    () => ({
      pending: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
      approved: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
      declined: 'border-red-400/40 bg-red-500/10 text-red-100',
    }),
    []
  );

  const handleApproveClassroom = async (requestId) => {
    if (!onApproveClassroom) return;
    setClassroomErrorMessage('');
    setClassroomActionId(requestId);
    setClassroomActionType('approve');
    try {
      await onApproveClassroom(requestId);
    } catch (err) {
      setClassroomErrorMessage(
        err?.response?.data?.error || 'Unable to approve classroom request right now.'
      );
    } finally {
      setClassroomActionId(null);
      setClassroomActionType(null);
    }
  };

  const handleDeclineClassroom = async (requestId) => {
    if (!onDeclineClassroom) return;
    const adminNotes = window.prompt('Optional note for the requester?', '') || '';
    setClassroomErrorMessage('');
    setClassroomActionId(requestId);
     setClassroomActionType('decline');
    try {
      await onDeclineClassroom(requestId, adminNotes);
    } catch (err) {
      setClassroomErrorMessage(
        err?.response?.data?.error || 'Unable to decline classroom request right now.'
      );
    } finally {
      setClassroomActionId(null);
      setClassroomActionType(null);
    }
  };

  useEffect(() => {
    loadUsers();
    loadLogs();
    loadViolations();
  }, []);

  useEffect(() => {
    onRefreshClassroom?.();
  }, [onRefreshClassroom]);

  const suspendedUsers = useMemo(
    () => users.filter((user) => user.status === 'suspended'),
    [users]
  );

  useEffect(() => {
    if (!roleActionSuccess) return;
    const timeout = setTimeout(() => setRoleActionSuccess(''), 4000);
    return () => clearTimeout(timeout);
  }, [roleActionSuccess]);

  const openConfirm = (action, targetUser) => {
    setConfirmAction({
      action,
      target: targetUser,
      reason: '',
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setIsExecutingAction(true);
    try {
      if (confirmAction.action === 'suspend') {
        await adminAPI.suspendUser(confirmAction.target.userId, confirmAction.reason);
      } else if (confirmAction.action === 'reinstate') {
        await adminAPI.reinstateUser(confirmAction.target.userId);
      } else if (confirmAction.action === 'delete') {
        await adminAPI.deleteUser(confirmAction.target.userId);
      }
      await Promise.all([loadUsers(), loadLogs(), loadViolations()]);
      setConfirmAction(null);
    } catch (err) {
      setError('Action failed. Please try again.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/80 backdrop-blur-3xl shadow-[0_40px_120px_-40px_rgba(15,23,42,0.9)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Admin Control Panel</h2>
            <p className="text-xs text-slate-400 uppercase tracking-[0.3em]">
              Manage users • Monitor actions • Maintain safety
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {adminAlert && (
          <div
            className={`mx-8 mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
              adminAlertStyles[adminAlert.type] || adminAlertStyles.info
            }`}
          >
            <Info className="h-4 w-4 mt-0.5" />
            <div className="flex-1">{adminAlert.message}</div>
            {onDismissAdminAlert && (
              <button
                onClick={onDismissAdminAlert}
                className="text-xs uppercase tracking-[0.25em] text-white/80 hover:text-white"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div className="grid gap-6 p-8 lg:grid-cols-[2fr,1fr] overflow-y-auto max-h-[calc(90vh-4rem)]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wide">
                <Activity className="h-4 w-4 text-sky-300" />
                User Directory
              </div>
              <button
                onClick={loadUsers}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/20"
              >
                <RefreshCcw className="h-3 w-3" />
                Refresh
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {error}
              </div>
            )}
            {roleActionError && (
              <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {roleActionError}
              </div>
            )}
            {roleActionSuccess && (
              <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                {roleActionSuccess}
              </div>
            )}
            {promoteError && (
              <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {promoteError}
              </div>
            )}
            {promoteMessage && (
              <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                {promoteMessage}
              </div>
            )}

            {(currentUserRole === 'admin' || currentUserRole === 'superadmin') && (
              <form
                onSubmit={handlePromoteSubmit}
                className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/80 md:grid-cols-[2fr,1fr,auto]"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                    Username
                  </label>
                  <input
                    value={promoteUsername}
                    onChange={(event) => setPromoteUsername(event.target.value)}
                    placeholder="e.g. admin.chaturway"
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                    Role
                  </label>
                  <select
                    value={promoteRole}
                    onChange={(event) => setPromoteRole(event.target.value)}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                  >
                    <option value="admin">Admin</option>
                    {currentUserRole === 'superadmin' && (
                      <option value="superadmin">Superadmin</option>
                    )}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-full"
                    disabled={!promoteUsername.trim() || roleActionId !== null}
                  >
                    Promote
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
              <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                    <tr>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Last Seen</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-xs text-white/60">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </td>
                      </tr>
                    ) : (
                      users.map((item) => (
                        <tr key={item.userId} className="hover:bg-white/5 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase text-white/70">
                                {item.username?.[0] || 'U'}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{item.username}</div>
                                <div className="text-[11px] uppercase tracking-wide text-white/40">
                                  ID: {item.userId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-wide',
                                roleBadgeStyles[item.role] || roleBadgeStyles.user
                              )}
                            >
                              {item.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-wide',
                                statusBadgeStyles[item.status] || statusBadgeStyles.active
                              )}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/60">
                            {item.lastSeen
                              ? formatDistanceToNow(new Date(item.lastSeen), { addSuffix: true })
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {(currentUserRole === 'admin' || currentUserRole === 'superadmin') &&
                                item.role === 'user' && (
                                  <button
                                    onClick={() => handleRoleChange(item, 'admin')}
                                    className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-200 hover:bg-sky-500/20"
                                    disabled={roleActionId === item.userId}
                                  >
                                    {roleActionId === item.userId ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ShieldCheck className="h-3 w-3" />
                                    )}
                                    Promote
                                  </button>
                                )}
                              {currentUserRole === 'superadmin' &&
                                item.role === 'admin' && (
                                  <button
                                    onClick={() => handleRoleChange(item, 'user')}
                                    className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 hover:bg-white/20"
                                    disabled={roleActionId === item.userId}
                                  >
                                    {roleActionId === item.userId ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ShieldAlert className="h-3 w-3" />
                                    )}
                                    Revoke Admin
                                  </button>
                                )}
                              {currentUserRole === 'superadmin' &&
                                item.role !== 'superadmin' && (
                                  <button
                                    onClick={() => handleRoleChange(item, 'superadmin')}
                                    className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
                                    disabled={roleActionId === item.userId}
                                  >
                                    {roleActionId === item.userId ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3" />
                                    )}
                                    Make Superadmin
                                  </button>
                                )}
                              {item.status !== 'suspended' && item.status !== 'deleted' && (
                                <button
                                  onClick={() => openConfirm('suspend', item)}
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-500/20"
                                >
                                  <ShieldAlert className="h-3 w-3" />
                                  Suspend
                                </button>
                              )}
                              {item.status === 'suspended' && (
                                <button
                                  onClick={() => openConfirm('reinstate', item)}
                                  className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  Reinstate
                                </button>
                              )}
                              {item.status !== 'deleted' && (
                                <button
                                  onClick={() => openConfirm('delete', item)}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-200 hover:bg-red-500/20"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wide">
                  <UserMinus className="h-4 w-4 text-amber-300" />
                  Suspended Users
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/60">
                  {suspendedUsers.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {suspendedUsers.length === 0 ? (
                  <p className="text-xs text-white/50">
                    No suspended users. Keep enforcing the community guidelines!
                  </p>
                ) : (
                  suspendedUsers.map((userItem) => (
                    <div
                      key={userItem.userId}
                      className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{userItem.username}</span>
                        <button
                          onClick={() => openConfirm('reinstate', userItem)}
                          className="text-[11px] uppercase tracking-wide text-emerald-200 hover:text-emerald-100"
                        >
                          Reinstate
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-amber-200/80 uppercase tracking-wide">
                        Suspended{' '}
                        {userItem.suspendedAt
                          ? formatDistanceToNow(new Date(userItem.suspendedAt), {
                              addSuffix: true,
                            })
                          : '—'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wide">
                  <CalendarPlus className="h-4 w-4 text-sky-300" />
                  Classroom Requests
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/15 text-white/70 hover:bg-white/15"
                  onClick={() => onRefreshClassroom?.()}
                >
                  <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
              {classroomErrorMessage && (
                <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {classroomErrorMessage}
                </div>
              )}
              <div className="mt-4 space-y-3 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                {sortedClassroomRequests.length === 0 ? (
                  <p className="text-xs text-white/50">
                    No classroom requests awaiting action.
                  </p>
                ) : (
                  sortedClassroomRequests.map((request, index) => {
                    const isProcessing = classroomActionId === request.requestId;
                    const requestKey =
                      request.requestId ||
                      `${request.createdBy || 'request'}-${request.createdAt || index}`;
                    return (
                      <div
                        key={requestKey}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{request.name}</p>
                            <p className="text-[11px] uppercase tracking-[0.25em] text-white/50">
                              {request.createdByUsername}{' '}
                              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.25em] ${
                              classroomStatusStyles[request.status]
                            }`}
                          >
                            {request.status}
                          </span>
                        </div>
                        {request.description && (
                          <p className="mt-2 text-xs text-white/65 leading-relaxed">
                            {request.description}
                          </p>
                        )}
                        {request.status === 'declined' && request.adminNotes && (
                          <p className="mt-2 text-[11px] text-red-200/80">
                            Admin note: {request.adminNotes}
                          </p>
                        )}
                        {request.status === 'approved' && request.approvedByUsername && (
                          <p className="mt-2 text-[11px] text-emerald-200/80">
                            Approved by {request.approvedByUsername}
                          </p>
                        )}
                        {request.status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="rounded-full bg-emerald-500/80 text-white hover:bg-emerald-500"
                              onClick={() => handleApproveClassroom(request.requestId)}
                              disabled={!!classroomActionId}
                            >
                              {isProcessing && classroomActionType === 'approve' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Approving…
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full border border-red-400/40 text-red-200 hover:bg-red-500/20"
                              onClick={() => handleDeclineClassroom(request.requestId)}
                              disabled={!!classroomActionId}
                            >
                              {isProcessing && classroomActionType === 'decline' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating…
                                </>
                              ) : (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Decline
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wide">
                  <AlertTriangle className="h-4 w-4 text-orange-300" />
                  Recent Violations
                </div>
                <button
                  onClick={loadViolations}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/20"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Refresh
                </button>
              </div>
              {violationsError && (
                <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {violationsError}
                </div>
              )}
              <div className="mt-4 space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                {isViolationsLoading ? (
                  <div className="flex items-center justify-center py-6 text-xs text-white/60">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading violations…
                  </div>
                ) : violations.length === 0 ? (
                  <p className="text-xs text-white/50">
                    No violations recorded recently. Great job keeping conversations healthy!
                  </p>
                ) : (
                  violations.map((violation) => (
                    <div
                      key={violation.violationId}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-wide text-white/50">
                          {violation.status === 'auto-suspended' ? (
                            <span className="inline-flex items-center gap-1 text-red-300">
                              <Ban className="h-3.5 w-3.5" />
                              Auto-suspended
                            </span>
                          ) : (
                            'Warning'
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                          {formatDistanceToNow(new Date(violation.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-white/70">
                        <span className="font-semibold text-white/85">{violation.username}</span>{' '}
                        triggered <span className="font-mono text-orange-300">"{violation.triggerWord}"</span>
                      </div>
                      <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                        {violation.offendingContent}
                      </div>
                      {violation.groupId && (
                        <div className="mt-2 text-[10px] uppercase tracking-wide text-white/40">
                          Group: {violation.groupId}
                        </div>
                      )}
                      {violation.chatId && (
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-white/40">
                          Chat: {violation.chatId}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wide">
                  <ShieldAlert className="h-4 w-4 text-red-300" />
                  Recent Admin Actions
                </div>
                <button
                  onClick={loadLogs}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/20"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Refresh
                </button>
              </div>

              {logError && (
                <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {logError}
                </div>
              )}

              <div className="mt-4 space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                {isLogsLoading ? (
                  <div className="flex items-center justify-center py-6 text-xs text-white/60">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading logs…
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-xs text-white/50">
                    No admin activity recorded yet. Actions will appear here.
                  </p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.logId}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/60">
                          {log.action === 'suspend' && (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
                          )}
                          {log.action === 'reinstate' && (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                          )}
                          {log.action === 'delete' && (
                            <Trash2 className="h-3.5 w-3.5 text-red-300" />
                          )}
                          <span>{log.action}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-white/70">
                        {log.adminUsername} ➜ {log.targetUsername}
                      </div>
                      {log.details && (
                        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                          {log.details}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <AnimatePresence>
          {confirmAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {confirmAction.action === 'suspend' && 'Suspend user'}
                    {confirmAction.action === 'reinstate' && 'Reinstate user'}
                    {confirmAction.action === 'delete' && 'Delete user'}
                  </h3>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="rounded-full border border-white/10 bg-white/10 p-1.5 text-white/80 hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  {confirmAction.action === 'suspend' &&
                    `Suspending will prevent ${confirmAction.target.username} from signing in.`}
                  {confirmAction.action === 'reinstate' &&
                    `Reinstating will allow ${confirmAction.target.username} to sign in again.`}
                  {confirmAction.action === 'delete' &&
                    `Deleting will permanently remove ${confirmAction.target.username}. This action cannot be undone.`}
                </p>
                {confirmAction.action === 'suspend' && (
                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Optional reason
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                      placeholder="Add context for this suspension"
                      value={confirmAction.reason}
                      onChange={(event) =>
                        setConfirmAction((prev) => ({ ...prev, reason: event.target.value }))
                      }
                    />
                  </div>
                )}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:bg-white/20"
                    disabled={isExecutingAction}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeConfirmAction}
                    disabled={isExecutingAction}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition',
                      confirmAction.action === 'delete'
                        ? 'bg-red-500/80 text-white hover:bg-red-500'
                        : confirmAction.action === 'suspend'
                        ? 'bg-amber-500/80 text-white hover:bg-amber-500'
                        : 'bg-emerald-500/80 text-white hover:bg-emerald-500'
                    )}
                  >
                    {isExecutingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;


