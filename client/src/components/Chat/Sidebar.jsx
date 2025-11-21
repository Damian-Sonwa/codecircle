import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  MessageSquare,
  Compass,
  Users,
  GraduationCap,
  Settings,
  ChevronDown,
  LogOut,
  CircuitBoard,
  Rocket,
  Volume2,
  VolumeX,
  Vibrate,
  RefreshCcw,
  Loader2,
  Plus,
  LifeBuoy,
  UserCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useChatPreferences } from '../../hooks/useChatPreferences';

const SKILL_CATEGORIES = [
  'Cybersecurity',
  'Full Stack Development',
  'Frontend',
  'Backend',
  'Data Analysis',
  'UI/UX',
  'AI & ML',
  'Cloud & DevOps',
];

const NAV_ITEMS = [
  { label: 'Dashboard', icon: Home, view: 'dashboard' },
  { label: 'Messages', icon: MessageSquare, view: 'messages' },
  { label: 'Friend Zone', icon: UserCircle2, view: 'friendZone' },
  { label: 'Join Tech Group', icon: Compass, view: 'explore' },
  { label: 'My Groups', icon: Users, view: 'groups' },
  { label: 'Classroom', icon: GraduationCap, view: 'classroom' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

const Sidebar = ({
  activeChat,
  activeView,
  groups = [],
  groupsError,
  isGroupsLoading,
  onChatSelect,
  onNavigate,
  onCreateGroup,
  onRefreshGroups,
  unreadCounts = {},
  onOpenHelpSupport,
}) => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { preferences, toggleSound, toggleVibration } = useChatPreferences();
  const getIsDesktop = () => (typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [isOpen, setIsOpen] = useState(getIsDesktop);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [skillPanelOpen, setSkillPanelOpen] = useState(true);
  const [creationError, setCreationError] = useState('');

  const sortedGroups = useMemo(
    () =>
      [...groups].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    [groups]
  );

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const nextDesktop = window.innerWidth >= 768;
      setIsDesktop(nextDesktop);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setIsOpen(true);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isDesktop) {
      document.body.style.overflow = '';
      return () => {
        document.body.style.overflow = '';
      };
    }
    if (isOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDesktop, isOpen]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !onCreateGroup) return;
    try {
      setIsCreatingGroup(true);
      setCreationError('');
      const created = await onCreateGroup({
        name: newGroupName.trim(),
        description: `${newGroupName.trim()} – community-led circle`,
        createdBy: user.userId,
      });
      setNewGroupName('');
      if (created) {
        onChatSelect?.({ type: 'group', id: created.groupId, name: created.name });
      }
      if (socket) {
        socket.emit('group:join', {
          groupId: created.groupId,
          userId: user.userId,
        });
      }
    } catch (error) {
      console.error('Failed to create group', error);
      setCreationError(
        error?.response?.data?.error || 'Unable to create a new circle right now.'
      );
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleSelectGroup = (group) => {
    onChatSelect?.({
      type: 'group',
      id: group.groupId,
      name: group.name,
      groupType: group.type,
      meta: { group },
    });
    if (socket) {
      socket.emit('group:join', { groupId: group.groupId, userId: user.userId });
    }
    if (!isDesktop) {
      setIsOpen(false);
    }
  };

  const getUnreadCount = (key) => (key ? unreadCounts[key] || 0 : 0);

  const sidebarContent = (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex h-full flex-col gap-6"
    >
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-sky-500/20 p-2 text-sky-300">
            <CircuitBoard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">CodeCircle</h2>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400/80">
              Connect • Innovate • Grow
            </p>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-full border border-white/10 bg-white/10 p-2 text-white hover:bg-white/20 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_20px_50px_-30px_rgba(56,189,248,0.7)]">
        <p className="text-[11px] uppercase tracking-[0.3em] text-sky-200">Main Menu</p>
        <div className="mt-3 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400/50 hover:bg-sky-500/10 hover:text-white',
                activeView === item.view && 'border-sky-400/60 bg-sky-500/15 text-white'
              )}
              onClick={() => onNavigate?.(item.view)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
          <button
            className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400/50 hover:bg-sky-500/10 hover:text-white"
            onClick={() => onOpenHelpSupport?.()}
          >
            <LifeBuoy className="h-4 w-4" /> Help / Support
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_20px_50px_-30px_rgba(56,189,248,0.5)]">
        <button
          onClick={() => setSkillPanelOpen((prev) => !prev)}
          className="flex w-full items-center justify-between text-sm font-semibold text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Rocket className="h-4 w-4 text-purple-300" />
            Tech Skill Categories
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-300 transition-transform',
              skillPanelOpen ? 'rotate-180' : 'rotate-0'
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {skillPanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="mt-4 space-y-2"
            >
              {SKILL_CATEGORIES.map((category) => (
                <button
                  key={category}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white"
                >
                  {category}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          <span>My Tech Circles</span>
          <span>{sortedGroups.length}</span>
        </div>
        {groupsError && (
          <div className="mx-3 mt-3 rounded-2xl border border-red-400/50 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
            {groupsError}
          </div>
        )}
        {creationError && (
          <div className="mx-3 mt-3 rounded-2xl border border-red-400/50 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
            {creationError}
          </div>
        )}
        <div className="max-h-[240px] overflow-y-auto space-y-2 p-3 custom-scrollbar">
          {isGroupsLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-xs text-slate-300/80">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading circles…
            </div>
          ) : sortedGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-3 py-4 text-center text-xs text-slate-300/80">
              No circles yet. Start by creating your own circle!
            </div>
          ) : (
            sortedGroups.map((group) => {
              const unreadKey = `group:${group.groupId}`;
              const unread = getUnreadCount(unreadKey);
              return (
              <motion.button
                key={group.groupId}
                whileHover={{ x: 4 }}
                className={cn(
                  'w-full rounded-2xl border border-transparent px-4 py-3 text-left text-sm transition',
                  activeChat?.type === 'group' && activeChat?.id === group.groupId
                    ? 'border-sky-400 bg-sky-500/10 text-white shadow-[0_12px_35px_-20px_rgba(56,189,248,0.6)]'
                    : 'border-white/5 bg-white/5 text-slate-200 hover:border-sky-400/40 hover:bg-sky-500/10'
                )}
                  onClick={() => handleSelectGroup(group)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{group.name}</span>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-400">
                      <span>{group.memberCount ?? group.members?.length ?? 0} members</span>
                      {unread > 0 && (
                        <span className="flex h-5 items-center justify-center rounded-full bg-sky-500/80 px-2 text-[10px] font-semibold text-white">
                          {unread}
                        </span>
                      )}
                    </div>
                </div>
              </motion.button>
              );
            })
          )}
        </div>
        <div className="border-t border-white/10 px-4 py-3">
          <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-3 text-xs text-sky-100">
            <p className="font-semibold uppercase tracking-[0.3em]">Create circle</p>
            <p className="mt-2 text-[11px] text-sky-200/90">
              Launch a new tech tribe tailored to your current learning journey.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                placeholder="Group name"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
              />
              <button
                onClick={handleCreateGroup}
                disabled={isCreatingGroup || !newGroupName.trim()}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:border-sky-400/50 hover:bg-sky-500/20 disabled:opacity-60"
              >
                <Plus className="h-3 w-3" />
                {isCreatingGroup ? 'Launching…' : 'Create'}
              </button>
              {onRefreshGroups && (
                <button
                  onClick={onRefreshGroups}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:border-sky-400/50 hover:bg-sky-500/20"
                  type="button"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Sync
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_18px_45px_-25px_rgba(56,189,248,0.6)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white text-xl font-semibold">
            {user?.username?.slice(0, 2)?.toUpperCase() || 'U'}
          </div>
          <div className="text-sm text-white/90">
            <p className="font-semibold">{user?.username}</p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Level 1 Builder</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={toggleSound}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] transition backdrop-blur',
              preferences.sound
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                : 'border-white/10 bg-white/10 text-white/70 hover:border-white/20'
            )}
          >
            {preferences.sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Sound
          </button>
          <button
            onClick={toggleVibration}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] transition backdrop-blur',
              preferences.vibration
                ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                : 'border-white/10 bg-white/10 text-white/70 hover:border-white/20'
            )}
          >
            <Vibrate className="h-3.5 w-3.5" />
            {preferences.vibration ? 'Vibrate' : 'No Vibrate'}
          </button>
        </div>
        <button
          onClick={logout}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 hover:bg-white/20"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </motion.div>
  );

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed left-4 top-20 z-[200] rounded-full border border-white/20 bg-white/10 p-3 text-white backdrop-blur-xl shadow-[0_20px_45px_-30px_rgba(56,189,248,0.5)]"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {(isOpen || isDesktop) && (
          <>
            {!isDesktop && (
              <motion.div
                key="sidebar-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[140] bg-slate-950/70 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />
            )}
            <motion.aside
              key="tech-sidebar"
              initial={{ x: -240, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -240, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed left-0 top-0 z-[150] h-full w-[88%] max-w-[320px] overflow-y-auto border-r border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#050c1d] px-6 py-8 backdrop-blur-3xl shadow-[0_35px_120px_-45px_rgba(59,130,246,0.8)] md:static md:w-[280px] md:max-w-none md:translate-x-0"
            >
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url(https://grainy-gradient.vercel.app/noise.svg)' }} />
              <div className="relative flex h-full flex-col gap-6">
                {sidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;

