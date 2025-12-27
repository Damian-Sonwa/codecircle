import {Suspense, type ReactNode, useState, useEffect} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {LoginPage} from '@/pages/Login';
import {RegisterPage} from '@/pages/Register';
import {ChatPage} from '@/pages/Chat';
import {CommunityHangoutPage} from '@/pages/CommunityHangout';
import {MyTechCirclePage} from '@/pages/MyTechCircle';
import {DashboardPage} from '@/pages/Dashboard';
import {ExplorePage} from '@/pages/Explore';
import {ClassroomPage} from '@/pages/Classroom';
import {KnowledgeHubPage} from '@/pages/KnowledgeHub';
import {LeaderboardPage} from '@/pages/Leaderboard';
import {ProfilePage} from '@/pages/Profile';
import {SettingsPage} from '@/pages/Settings';
import {AdminPage} from '@/pages/Admin';
import {FriendZone} from '@/pages/friendzone/FriendZone';
import {FriendRequestsPage} from '@/pages/friendzone/FriendRequestsPage';
import {MyFriendsPage} from '@/pages/friendzone/MyFriendsPage';
import {FriendChatsPage} from '@/pages/friendzone/FriendChatsPage';
import {FriendNotificationsPage} from '@/pages/friendzone/FriendNotificationsPage';
import {TechCategoryPage} from '@/pages/TechCategory';
import {AppLayout} from '@/layouts/AppLayout';
import {AdminLayout} from '@/layouts/AdminLayout';
import {RequireRole} from '@/components/Admin/RequireRole';
import {AnalyticsPage} from '@/pages/admin/AnalyticsPage';
import {UsersPage} from '@/pages/admin/UsersPage';
import {ClassesPage} from '@/pages/admin/ClassesPage';
import {ApprovalsPage} from '@/pages/admin/ApprovalsPage';
import {SettingsPage as AdminSettingsPage} from '@/pages/admin/SettingsPage';
import {useAuthStore} from '@/store/authStore';

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
    <p className="animate-pulse text-sm">Warming up the glass matrix…</p>
  </div>
);

const RequireAuth = ({children}: {children: ReactNode}) => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isChecking, setIsChecking] = useState(true);
  
  // Wait for Zustand persist to hydrate
  useEffect(() => {
    // Longer delay to ensure Zustand persist has loaded from localStorage
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  console.log('[RequireAuth] User state:', user ? 'authenticated' : 'not authenticated', 'isChecking:', isChecking, 'hasToken:', !!accessToken);
  
  if (isChecking) {
    return <LoadingScreen />;
  }
  
  // Check both user and token to ensure auth is complete
  if (!user || !accessToken) {
    console.log('[RequireAuth] No user or token, redirecting to login...');
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RequireAdmin = ({children}: {children: ReactNode}) => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

const RequireOnboarding = ({children}: {children: ReactNode}) => {
  const user = useAuthStore((state) => state.user);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  if (isChecking) {
    return <LoadingScreen />;
  }
  
  // If user hasn't completed onboarding, they should be handled by AppLayout's onboarding modal
  // This component just ensures they can't bypass it
  return <>{children}</>;
};

const DefaultRedirect = () => {
  const user = useAuthStore((state) => state.user);
  // Admins go to admin panel, regular users to dashboard
  const redirectPath = (user?.role === 'admin' || user?.role === 'superadmin') ? '/admin' : '/dashboard';
  return <Navigate to={redirectPath} replace />;
};

export default function App() {
  // Version indicator - helps verify new builds are loaded
  useEffect(() => {
    const version = '2024-01-15-refactor-v3';
    console.log('[App] Version:', version);
    console.log('[App] Routing: Auth-first, Onboarding-protected');
    console.log('[App] Build Time:', new Date().toISOString());
    
    // Add visible version indicator in development
    if (import.meta.env.DEV) {
      const indicator = document.createElement('div');
      indicator.id = 'version-indicator';
      indicator.style.cssText = 'position:fixed;top:0;right:0;background:red;color:white;padding:4px 8px;font-size:10px;z-index:99999;font-family:monospace;';
      indicator.textContent = `V: ${version}`;
      document.body.appendChild(indicator);
    }
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Default route redirects to login */}
          <Route index element={<Navigate to="/login" replace />} />
          
          {/* Auth routes - redirect to dashboard if already logged in */}
          <Route path="/login" element={<AuthPage component={<LoginPage />} />} />
          <Route path="/register" element={<AuthPage component={<RegisterPage />} />} />

          {/* Protected routes - require auth AND onboarding */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DefaultRedirect />} />
            <Route 
              path="dashboard" 
              element={
                <RequireOnboarding>
                  <DashboardPage />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="community-hangout" 
              element={
                <RequireOnboarding>
                  <CommunityHangoutPage />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="my-tech-circle" 
              element={
                <RequireOnboarding>
                  <MyTechCirclePage />
                </RequireOnboarding>
              } 
            />
            {/* Legacy route - redirect to community hangout */}
            <Route 
              path="messages" 
              element={
                <RequireOnboarding>
                  <Navigate to="/community-hangout" replace />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="friends" 
              element={
                <RequireOnboarding>
                  <FriendZone />
                </RequireOnboarding>
              }
            >
              <Route index element={<Navigate to="/friends/requests" replace />} />
              <Route path="requests" element={<FriendRequestsPage />} />
              <Route path="my-friends" element={<MyFriendsPage />} />
              <Route path="chats" element={<FriendChatsPage />} />
              <Route path="notifications" element={<FriendNotificationsPage />} />
            </Route>
            <Route 
              path="explore" 
              element={
                <RequireOnboarding>
                  <ExplorePage />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="classroom" 
              element={
                <RequireOnboarding>
                  <ClassroomPage />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="knowledge" 
              element={
                <RequireOnboarding>
                  <KnowledgeHubPage />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="leaderboard" 
              element={
                <RequireOnboarding>
                  <LeaderboardPage />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="profile" 
              element={
                <RequireOnboarding>
                  <ProfilePage />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="settings" 
              element={
                <RequireOnboarding>
                  <SettingsPage />
                </RequireOnboarding>
              } 
            />
          </Route>

          {/* Admin routes - separate layout, role-protected */}
          <Route
            path="admin"
            element={
              <RequireAuth>
                <RequireRole role="admin" allowedRoles={['admin', 'superadmin']}>
                  <AdminLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/admin/analytics" replace />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
          
          {/* Legacy admin route - redirect to new admin panel */}
          <Route 
            path="admin-old" 
            element={
              <RequireOnboarding>
                <AdminPage />
              </RequireOnboarding>
            } 
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const AuthPage = ({component}: {component: ReactNode}) => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  if (isChecking) {
    return <LoadingScreen />;
  }
  
  // Only redirect if both user and token exist
  if (user && accessToken) {
    // Admins should go to admin panel, regular users to dashboard
    const redirectPath = (user.role === 'admin' || user.role === 'superadmin') ? '/admin' : '/dashboard';
    console.log('[AuthPage] User already authenticated, redirecting to', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }
  return component;
};
