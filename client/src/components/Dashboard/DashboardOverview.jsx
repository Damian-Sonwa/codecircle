import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Users,
  MessageCircle,
  Compass,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';

const DashboardOverview = ({
  user,
  groups,
  onNavigate,
  onSelectGroup,
  onCreateGroup,
  isCreating = false,
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const userGroups = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.filter((group) => {
      const members = Array.isArray(group.members) ? group.members : [];
      const admins = Array.isArray(group.admins) ? group.admins : [];
      return (
        members.includes(user?.userId) ||
        group.createdBy === user?.userId ||
        admins.includes(user?.userId)
      );
    });
  }, [groups, user?.userId]);

  const totalGroups = userGroups.length;
  const recentGroups = userGroups.slice(0, 4);

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (!newGroupName.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const created = await onCreateGroup?.({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        topics: [],
      });
      if (created) {
        setNewGroupName('');
        setNewGroupDescription('');
        onSelectGroup?.({
          type: 'group',
          id: created.groupId,
          name: created.name,
        });
        onNavigate?.('messages');
      }
    } catch (creationError) {
      console.error('Failed to create group from dashboard', creationError);
      setError(
        creationError?.response?.data?.error ||
          'Unable to create a new circle right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-gradient-to-br from-[#030712] via-[#0b1120] to-[#111827]">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2563eb1a,transparent_60%)]" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'url(https://grainy-gradient.vercel.app/noise.svg)' }}
        />
      </div>

      <div className="relative z-10 px-6 py-8 md:px-10 md:py-12 space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-[32px] border border-white/10 bg-white/10 backdrop-blur-xl px-6 py-8 md:px-10 md:py-12 shadow-[0_35px_80px_-45px_rgba(59,130,246,0.45)]"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-sky-200">
                <Sparkles className="h-4 w-4" />
                Welcome Back
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-white">
                Hi {user?.username}! Ready to keep building?
              </h2>
              <p className="text-sm text-slate-200/80 max-w-2xl leading-relaxed">
                Jump straight into your conversations, join new tech circles, or kick-start a fresh
                community of peers. Everything you need to collaborate lives here.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 text-white/80">
              <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Circles</p>
                <p className="mt-2 text-3xl font-semibold text-white">{totalGroups}</p>
                <p className="mt-1 text-xs text-white/60">Active tech communities</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Role</p>
                <p className="mt-2 text-lg font-semibold capitalize text-white">{user?.role}</p>
                <p className="mt-1 text-xs text-white/60">Access level</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Momentum</p>
                <p className="mt-2 text-lg font-semibold text-white">Keep Collaborating</p>
                <p className="mt-1 text-xs text-white/60">Invite peers and share insights</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="grid gap-8 lg:grid-cols-[2fr,1fr]"
        >
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-6 shadow-[0_25px_60px_-40px_rgba(59,130,246,0.5)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Quick actions</h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Pick a track to jump in instantly
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate?.('messages')}
                    className="rounded-full"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Messages
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.('explore')}
                    className="rounded-full border border-sky-400/60 text-sky-200 hover:bg-sky-500/10"
                  >
                    <Compass className="mr-2 h-4 w-4" />
                    Join Tech Group
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.('groups')}
                    className="rounded-full border border-white/15 text-white/80 hover:bg-white/10"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Manage Circles
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-6 shadow-[0_25px_60px_-45px_rgba(59,130,246,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Recent circles</h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Jump back into your spaces
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full hover:bg-white/10 text-white/70"
                  onClick={() => onNavigate?.('groups')}
                >
                  View all
                </Button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {recentGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-sm text-white/60">
                    You have no circles yet. Create a new one or explore existing communities to get
                    started.
                  </div>
                ) : (
                  recentGroups.map((group) => (
                    <motion.button
                      key={group.groupId}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectGroup?.({
                          type: 'group',
                          id: group.groupId,
                          name: group.name,
                          groupType: group.type,
                          meta: { group },
                        });
                        onNavigate?.('messages');
                      }}
                      className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-left text-white/80 transition hover:border-sky-400/50 hover:bg-sky-500/10"
                    >
                      <p className="text-sm font-semibold text-white">{group.name}</p>
                      <p className="mt-2 text-xs text-white/60">
                        {group.memberCount ?? group.members?.length ?? 0} members ·{' '}
                        {group.topics?.length ? group.topics.join(', ') : 'General circle'}
                      </p>
                    </motion.button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-6 shadow-[0_25px_60px_-40px_rgba(59,130,246,0.35)]">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
              <PlusCircle className="h-4 w-4 text-sky-300" />
              Launch a new circle
            </div>
            <p className="mt-2 text-xs text-white/60">
              Start a dedicated space and invite others to collaborate with you.
            </p>

            <form onSubmit={handleCreateGroup} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Circle Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                  placeholder="e.g. Frontend Builders Circle"
                  required
                  disabled={isSubmitting || isCreating}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  value={newGroupDescription}
                  onChange={(event) => setNewGroupDescription(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                  placeholder="Share what this circle will explore together"
                  disabled={isSubmitting || isCreating}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!newGroupName.trim() || isSubmitting || isCreating}
                className="w-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 text-sm font-semibold uppercase tracking-[0.3em]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Launching…
                  </>
                ) : (
                  'Create Circle'
                )}
              </Button>
            </form>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default DashboardOverview;


