import {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {NavLink, useNavigate} from 'react-router-dom';
import {
  LayoutDashboard,
  MessagesSquare,
  Lock,
  Globe2,
  Layers,
  GraduationCap,
  Brain,
  Trophy,
  UserRound,
  Settings,
  LogOut,
  Plus,
  Menu,
  UserPlus,
  Users
} from 'lucide-react';
import {cn} from '@/utils/styles';
import {useAuthStore} from '@/store/authStore';
import {useUIStore} from '@/store/uiStore';
import {useNotificationStore} from '@/store/notificationStore';
import {api, endpoints} from '@/services/api';

const techCategories = [
  {label: 'Fullstack Devs', path: '/explore?tag=fullstack'},
  {label: 'Backend Devs', path: '/explore?tag=backend'},
  {label: 'Frontend Devs', path: '/explore?tag=frontend'},
  {label: 'Cybersecurity Experts', path: '/explore?tag=cybersecurity'},
  {label: 'Data Analysts', path: '/explore?tag=data'},
  {label: 'Cloud Engineers', path: '/explore?tag=cloud'},
  {label: 'UI/UX Designers', path: '/explore?tag=uiux'},
  {label: 'AI/ML Engineers', path: '/explore?tag=ai'}
];

const menuItems = [
  {icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard'},
  {icon: MessagesSquare, label: 'Community Hangout', to: '/community-hangout', group: 'chat'},
  {icon: Users, label: 'My Tech Circle', to: '/my-tech-circle', group: 'chat'},
  {icon: UserPlus, label: 'Friend Zone', to: '/friends', group: 'chat'},
  {icon: Globe2, label: 'Explore Tech Skills', to: '/explore'},
  {icon: Layers, label: 'Tech Categories', to: '/explore/categories', expandable: true},
  {icon: GraduationCap, label: 'Classroom', to: '/classroom'},
  {icon: Brain, label: 'Knowledge Hub', to: '/knowledge'},
  {icon: Trophy, label: 'Leaderboard', to: '/leaderboard'},
  {icon: UserRound, label: 'Profile', to: '/profile'},
  {icon: Settings, label: 'Settings', to: '/settings'}
];

export const NavigationDrawer = () => {
  const [open, setOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const {user, clearAuth} = useAuthStore();
  const navigate = useNavigate();
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const pushNotification = useNotificationStore((state) => state.push);

  const handleLogout = async () => {
    try {
      await api.post(endpoints.auth.logout);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const handleCreateQuickAction = (type: 'post' | 'class' | 'message') => {
    pushNotification({
      id: `qa-${type}-${Date.now()}`,
      title: 'Quick action',
      message: type === 'post' ? 'Draft a new tech insight!' : type === 'class' ? 'Set up a new class from the Classroom page.' : 'Start a new conversation from Messages.'
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group fixed left-2 top-2 sm:left-4 sm:top-4 z-40 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 shadow-glass transition-all hover:border-sky-600 hover:text-sky-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{x: '-100%'}}
              animate={{x: 0}}
              exit={{x: '-100%'}}
              transition={{type: 'spring', stiffness: 200, damping: 22}}
              className="absolute left-0 top-0 h-full w-[85vw] max-w-80 overflow-y-auto bg-slate-900/70 px-4 py-6 sm:px-6 sm:py-8 shadow-lift backdrop-blur-xl"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Learn. Chat. Grow.</p>
                  <h2 className="text-xl font-semibold text-slate-100">Tech Community Hub</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/10 bg-slate-800/70 px-3 py-1 text-xs text-slate-300 transition-all hover:text-sky-600 hover:border-sky-600/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  aria-label="Close navigation menu"
                >
                  Close
                </button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item, index) => {
                  const prevItem = index > 0 ? menuItems[index - 1] : null;
                  const showGroupDivider = prevItem && prevItem.group !== item.group && item.group;
                  
                  return (
                    <div key={item.label}>
                      {showGroupDivider && <div className="my-3 border-t border-white/10" />}
                      <NavLink
                        to={item.to}
                        className={({isActive}) =>
                          cn(
                            'group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-slate-300 transition-all hover:border-sky-500/40 hover:bg-slate-900/70 hover:text-slate-50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500/30',
                            isActive ? 'border-sky-500/60 bg-gradient-to-r from-sky-500/20 to-sky-500/20 text-white shadow-inner' : ''
                          )
                        }
                        onClick={() => {
                          setOpen(false);
                          if (item.expandable) {
                            setShowCategories((prev) => !prev);
                          }
                        }}
                      >
                        <item.icon className={cn(
                          'h-5 w-5 transition group-hover:scale-110',
                          item.group === 'chat' ? 'text-violet-500' : 'text-sky-500'
                        )} />
                        <span>{item.label}</span>
                        {item.group === 'chat' && (
                          <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500">Chat</span>
                        )}
                      </NavLink>
                      {item.expandable && showCategories && (
                        <motion.ul
                          initial={{opacity: 0, height: 0}}
                          animate={{opacity: 1, height: 'auto'}}
                          className="ml-4 mt-2 space-y-1 border-l border-white/10 pl-4"
                        >
                          {techCategories.map((category) => (
                            <li key={category.label}>
                              <NavLink
                                to={category.path}
                                className="block rounded-xl px-3 py-2 text-xs text-slate-400 transition-all hover:bg-slate-800/70 hover:text-slate-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                onClick={() => setOpen(false)}
                              >
                                {category.label}
                              </NavLink>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-slate-300 transition-all hover:border-sky-500/40 hover:bg-slate-900/70 hover:text-slate-50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                >
                  <Settings className="h-5 w-5 text-sky-500" />
                  Open Preferences
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl border border-rose-500/40 px-4 py-3 text-left text-sm text-rose-400 transition-all hover:bg-rose-500/20 hover:border-rose-500/60 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </nav>

              <div className="mt-10 rounded-3xl border border-sky-500/30 bg-slate-900/60 p-5">
                <p className="text-xs uppercase tracking-widest text-sky-500">Quick actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCreateQuickAction('post')}
                    className="glass-card flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-slate-200 transition-all hover:text-sky-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <Plus className="h-4 w-4" /> Create Post
                  </button>
                  <button
                    onClick={() => handleCreateQuickAction('class')}
                    className="glass-card flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-slate-200 transition-all hover:text-sky-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <Plus className="h-4 w-4" /> Create Class
                  </button>
                  <button
                    onClick={() => handleCreateQuickAction('message')}
                    className="glass-card flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-slate-200 transition-all hover:text-sky-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <Plus className="h-4 w-4" /> New Message
                  </button>
                </div>
              </div>

              <div className="mt-8 text-xs text-slate-500">
                {user?.username && (
                  <p>
                    Signed in as <span className="text-slate-200">{user.username}</span>
                  </p>
                )}
                <p>Where Tech Minds Meet &amp; Learn.</p>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

