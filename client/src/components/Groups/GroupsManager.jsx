import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCcw,
  MessageCircle,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { techGroupsAPI } from '../../lib/api';

const GroupsManager = ({
  groups,
  activeChat,
  onSelectGroup,
  onUpdateGroup,
  onDeleteGroup,
  onLeaveGroup,
  onRefresh,
  isRefreshing = false,
  unreadCounts = {},
  currentUser,
}) => {
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [adminPanelsOpen, setAdminPanelsOpen] = useState({});
  const [requestsMap, setRequestsMap] = useState({});
  const [requestsLoading, setRequestsLoading] = useState({});
  const [requestsFeedback, setRequestsFeedback] = useState({});

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  const setRequestState = (groupId, updater, setter) => {
    setter((prev) => ({
      ...prev,
      [groupId]: typeof updater === 'function' ? updater(prev[groupId]) : updater,
    }));
  };

  const loadJoinRequests = async (group) => {
    const groupId = group.groupId;
    setRequestState(groupId, true, setRequestsLoading);
    setRequestState(groupId, null, setRequestsFeedback);
    try {
      const data = await techGroupsAPI.listJoinRequests(groupId);
      setRequestState(groupId, data, setRequestsMap);
    } catch (error) {
      console.error('Failed to load join requests', error);
      setRequestState(groupId, {
        type: 'error',
        message:
          error?.response?.data?.error || 'Unable to load join requests for this circle right now.',
      }, setRequestsFeedback);
    } finally {
      setRequestState(groupId, false, setRequestsLoading);
    }
  };

  const handleToggleAdminPanel = async (group) => {
    const groupId = group.groupId;
    setAdminPanelsOpen((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    const nextOpen = !adminPanelsOpen[groupId];
    if (nextOpen && !requestsMap[groupId]) {
      await loadJoinRequests(group);
    }
  };

  const handleDecision = async (group, requestId, action) => {
    const groupId = group.groupId;
    setRequestState(groupId, true, setRequestsLoading);
    setRequestState(groupId, null, setRequestsFeedback);
    try {
      let response;
      if (action === 'approve') {
        response = await techGroupsAPI.approveJoinRequest(groupId, requestId);
      } else {
        response = await techGroupsAPI.declineJoinRequest(groupId, requestId);
      }

      setRequestsMap((prev) => {
        const existing = prev[groupId] || [];
        const updated = existing.map((item) =>
          item.requestId === requestId ? response.request : item
        );
        return { ...prev, [groupId]: updated };
      });

      setRequestsFeedback((prev) => ({
        ...prev,
        [groupId]: {
          type: 'success',
          message:
            action === 'approve'
              ? 'Member approved successfully.'
              : 'Request declined.',
        },
      }));

      onRefresh?.();
    } catch (error) {
      console.error(`Failed to ${action} join request`, error);
      setRequestsFeedback((prev) => ({
        ...prev,
        [groupId]: {
          type: 'error',
          message:
            error?.response?.data?.error || `Unable to ${action} this request right now.`,
        },
      }));
    } finally {
      setRequestState(groupId, false, setRequestsLoading);
    }
  };

  const handleStartEdit = (group) => {
    setErrorMessage('');
    const isSuperAdmin = currentUser?.role === 'superadmin';
    if (group.createdBy !== currentUser?.userId && !isSuperAdmin) {
      setErrorMessage('Only the circle creator can rename this circle.');
      return;
    }
    setEditingGroupId(group.groupId);
    setEditingName(group.name);
    setEditingDescription(group.description || '');
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditingName('');
    setEditingDescription('');
  };

  const handleSave = async (groupId) => {
    const target = groups.find((group) => group.groupId === groupId);
    const isSuperAdmin = currentUser?.role === 'superadmin';
    if (target && target.createdBy !== currentUser?.userId && !isSuperAdmin) {
      setErrorMessage('Only the circle creator can rename this circle.');
      return;
    }
    if (!editingName.trim()) {
      setErrorMessage('Group name cannot be empty.');
      return;
    }
    setSavingId(groupId);
    setErrorMessage('');
    try {
      const updated = await onUpdateGroup?.(groupId, {
        name: editingName.trim(),
        description: editingDescription.trim(),
      });
      if (updated) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error('Failed to update group', error);
      setErrorMessage(error?.response?.data?.error || 'Failed to update group details.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (groupId) => {
    const target = groups.find((group) => group.groupId === groupId);
    const isSuperAdmin = currentUser?.role === 'superadmin';
    if (target && target.createdBy !== currentUser?.userId && !isSuperAdmin) {
      setErrorMessage('Only the circle creator can delete this circle.');
      return;
    }
    if (
      !target ||
      !window.confirm(
        `Delete "${target.name}"? This circle and its messages will be permanently removed.`
      )
    ) {
      return;
    }
    setDeletingId(groupId);
    setErrorMessage('');
    try {
      await onDeleteGroup?.(groupId);
      if (editingGroupId === groupId) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error('Failed to delete group', error);
      setErrorMessage(error?.response?.data?.error || 'Unable to delete this circle right now.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLeave = async (groupId) => {
    const target = groups.find((group) => group.groupId === groupId);
    if (
      !target ||
      !window.confirm(`Leave "${target.name}"? You will lose access to its messages and updates.`)
    ) {
      return;
    }
    setLeavingId(groupId);
    setErrorMessage('');
    try {
      await onLeaveGroup?.(groupId);
      if (editingGroupId === groupId) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error('Failed to leave group', error);
      setErrorMessage(error?.response?.data?.error || 'Unable to leave this circle right now.');
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-gradient-to-br from-[#030712] via-[#0b1120] to-[#111827]">
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1d4ed822,transparent_65%)]" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'url(https://grainy-gradient.vercel.app/noise.svg)' }}
        />
      </div>

      <div className="relative z-10 px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
              <Users className="h-4 w-4" />
              Manage Tech Circles
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-white">Your communities</h2>
            <p className="text-sm text-white/70">
              Rename, archive, or jump back into any circle you facilitate or joined.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="rounded-full border border-white/10 hover:bg-white/10 text-white/70"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-4">
          <AnimatePresence>
            {sortedGroups.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center text-sm text-white/60"
              >
                You have not joined or created any tech circles yet. Launch one from the dashboard or
                explore existing communities to collaborate instantly.
              </motion.div>
            ) : (
              sortedGroups.map((group) => {
                const isEditing = editingGroupId === group.groupId;
                const isActive = activeChat?.type === 'group' && activeChat?.id === group.groupId;
                const isSaving = savingId === group.groupId;
                const isDeleting = deletingId === group.groupId;
                const isLeaving = leavingId === group.groupId;
                const unread = unreadCounts[`group:${group.groupId}`] || 0;
                const isGroupAdmin = Array.isArray(group.admins)
                  ? group.admins.includes(currentUser?.userId)
                  : false;
                const isSuperAdmin = currentUser?.role === 'superadmin';
                const canManageGroup = group.createdBy === currentUser?.userId || isSuperAdmin;
                const adminPanelOpen = !!adminPanelsOpen[group.groupId];
                const joinRequests = requestsMap[group.groupId] || [];
                const pendingRequests = joinRequests.filter((item) => item.status === 'pending');
                const feedback = requestsFeedback[group.groupId];
                const requestsAreLoading = !!requestsLoading[group.groupId];
                return (
                  <motion.div
                    key={group.groupId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'rounded-3xl border px-6 py-5 backdrop-blur-xl transition shadow-[0_25px_60px_-45px_rgba(59,130,246,0.35)]',
                      isActive
                        ? 'border-sky-400/60 bg-sky-500/15 text-white'
                        : 'border-white/10 bg-white/8 text-white/80 hover:border-sky-400/40 hover:bg-sky-500/10'
                    )}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1 space-y-3">
                        {isEditing ? (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                                Circle Name
                              </label>
                              <input
                                type="text"
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                className="w-full rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                                disabled={isSaving}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                                Description
                              </label>
                              <textarea
                                rows={3}
                                value={editingDescription}
                                onChange={(event) => setEditingDescription(event.target.value)}
                                className="w-full rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                                disabled={isSaving}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-semibold text-white">{group.name}</h3>
                              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/60">
                                {group.memberCount ?? group.members?.length ?? 0} members
                              </span>
                              {unread > 0 && (
                                <span className="rounded-full border border-sky-400/40 bg-sky-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-100">
                                  {unread} unread
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed">
                              {group.description || 'No description provided yet.'}
                            </p>
                            {isGroupAdmin && (
                              <div className="mt-3 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/60">
                                    {group.pendingJoinCount ?? pendingRequests.length} pending requests
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full border border-white/15 text-white/80 hover:bg-white/15"
                                    onClick={() => handleToggleAdminPanel(group)}
                                  >
                                    {adminPanelOpen ? 'Hide requests' : 'Review join requests'}
                                  </Button>
                                </div>
                                <AnimatePresence initial={false}>
                                  {adminPanelOpen && (
                                    <motion.div
                                      key={`${group.groupId}-admin-panel`}
                                      initial={{ opacity: 0, y: -6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -6 }}
                                      className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                                    >
                                      {feedback && (
                                        <div
                                          className={cn(
                                            'rounded-xl border px-3 py-2 text-sm',
                                            feedback.type === 'error'
                                              ? 'border-red-400/50 bg-red-500/10 text-red-100'
                                              : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                                          )}
                                        >
                                          {feedback.message}
                                        </div>
                                      )}
                                      {requestsAreLoading ? (
                                        <div className="flex items-center justify-center gap-2 text-sm text-white/70">
                                          <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
                                        </div>
                                      ) : joinRequests.length === 0 ? (
                                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/60">
                                          No join requests yet.
                                        </div>
                                      ) : (
                                        joinRequests.map((request) => (
                                          <div
                                            key={request.requestId}
                                            className="space-y-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                              <div>
                                                <p className="text-sm font-semibold text-white">
                                                  {request.username}
                                                </p>
                                                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                                                  Level: {request.level || '—'}
                                                </p>
                                              </div>
                                              <span
                                                className={cn(
                                                  'rounded-full px-3 py-1 text-[11px] uppercase tracking-wide',
                                                  request.status === 'approved'
                                                    ? 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                                                    : request.status === 'declined'
                                                    ? 'border border-red-400/40 bg-red-500/10 text-red-100'
                                                    : 'border border-white/15 bg-white/10 text-white/70'
                                                )}
                                              >
                                                {request.status}
                                              </span>
                                            </div>
                                            {Array.isArray(request.answers?.summary) && request.answers.summary.length > 0 && (
                                              <div className="space-y-2 rounded-lg border border-white/10 bg-slate-900/40 px-3 py-3 text-xs text-slate-200/90">
                                                {request.answers.summary.map((item) => (
                                                  <div key={item.id}>
                                                    <p className="font-semibold text-slate-100/90">{item.question}</p>
                                                    <p className="text-slate-300/80">Answer: {item.answer}</p>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                              <Button
                                                size="sm"
                                                className="rounded-full bg-emerald-500/80 text-white hover:bg-emerald-500"
                                                onClick={() => handleDecision(group, request.requestId, 'approve')}
                                                disabled={requestsAreLoading || request.status === 'approved'}
                                              >
                                                <ShieldCheck className="mr-2 h-4 w-4" /> Approve
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="rounded-full border border-red-400/40 text-red-200 hover:bg-red-500/20"
                                                onClick={() => handleDecision(group, request.requestId, 'decline')}
                                                disabled={requestsAreLoading || request.status === 'declined'}
                                              >
                                                <AlertCircle className="mr-2 h-4 w-4" /> Decline
                                              </Button>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                            {group.topics?.length ? (
                              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-white/60">
                                {group.topics.map((topic) => (
                                  <span
                                    key={`${group.groupId}-${topic}`}
                                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 md:items-end">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full border border-white/15 text-white/80 hover:bg-white/15"
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                              onClick={() => handleSave(group.groupId)}
                              disabled={isSaving || !editingName.trim()}
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving…
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-full"
                              onClick={() => {
                                onSelectGroup?.({
                                  type: 'group',
                                  id: group.groupId,
                                  name: group.name,
                                  groupType: group.type,
                                  meta: { group },
                                });
                              }}
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Open Chat
                            </Button>
                            {canManageGroup && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full border border-white/15 text-white/80 hover:bg-white/15"
                                onClick={() => handleStartEdit(group)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            )}
                            {canManageGroup ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full border border-red-400/40 text-red-200 hover:bg-red-500/20"
                                onClick={() => handleDelete(group.groupId)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Removing…
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full border border-amber-400/40 text-amber-200 hover:bg-amber-500/20"
                                onClick={() => handleLeave(group.groupId)}
                                disabled={isLeaving}
                              >
                                {isLeaving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Leaving…
                                  </>
                                ) : (
                                  'Leave Circle'
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GroupsManager;


