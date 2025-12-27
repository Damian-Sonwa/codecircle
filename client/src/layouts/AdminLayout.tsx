import {useState, useEffect} from 'react';
import {Outlet, NavLink, useNavigate} from 'react-router-dom';
import {useAuthStore} from '@/store/authStore';
import {LogOut, Users, Users2, BarChart3, GraduationCap, CheckCircle, Settings, Shield, Menu, X} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {api, endpoints} from '@/services/api';
import {cn} from '@/utils/styles';

export const AdminLayout = () => {
  const {user, clearAuth} = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await api.post(endpoints.auth.logout);
    clearAuth();
    navigate('/login');
  };

  const menuItems = [
    {icon: BarChart3, label: 'Overview', to: '/admin'},
    {icon: Users, label: 'Users', to: '/admin/users'},
    {icon: GraduationCap, label: 'Mentors', to: '/admin/mentors'},
    {icon: GraduationCap, label: 'Classes', to: '/admin/classes'},
    {icon: CheckCircle, label: 'Approvals', to: '/admin/approvals'},
    {icon: Users2, label: 'Tech Groups', to: '/admin/tech-groups'},
    {icon: BarChart3, label: 'Analytics', to: '/admin/analytics'},
    {icon: Settings, label: 'Settings', to: '/admin/settings'},
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-white shadow-lg"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || !isMobile) && (
          <motion.aside
            initial={isMobile ? {x: '-100%'} : false}
            animate={{x: 0}}
            exit={isMobile ? {x: '-100%'} : false}
            transition={{type: 'spring', stiffness: 300, damping: 30}}
            className={cn(
              'fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-900 flex flex-col',
              isMobile && 'shadow-2xl'
            )}
          >
            <div className="p-4 sm:p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">Admin Panel</h1>
                  <p className="text-xs text-slate-400">Control Center</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={({isActive}) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition touch-manipulation',
                        isActive
                          ? 'bg-sky-500/20 text-sky-500 border border-sky-500/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800">
              <div className="mb-4 px-4 py-2 rounded-lg bg-slate-800/50">
                <p className="text-xs text-slate-400 mb-1">Logged in as</p>
                <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                <p className="text-xs text-sky-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition touch-manipulation active:bg-slate-700"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
};
