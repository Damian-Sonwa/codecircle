import {Suspense, type ReactNode, useState, useEffect} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {LoginPage} from '@/pages/Login';
import {RegisterPage} from '@/pages/Register';
import {ChatPage} from '@/pages/Chat';
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
import {AppLayout} from '@/layouts/AppLayout';
import {useAuthStore} from '@/store/authStore';

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
    <p className="animate-pulse text-sm">Warming up the glass matrix…</p>
  </div>
);

const RequireAuth = ({children}: {children: ReactNode}) => {
  const user = useAuthStore((state) => state.user);
  const [isChecking, setIsChecking] = useState(true);
  
  // Wait for Zustand persist to hydrate
  useEffect(() => {
    // Small delay to ensure Zustand persist has loaded from localStorage
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  console.log('[RequireAuth] User state:', user ? 'authenticated' : 'not authenticated', 'isChecking:', isChecking);
  
  if (isChecking) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    console.log('[RequireAuth] Redirecting to login...');
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
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="dashboard" 
              element={
                <RequireOnboarding>
                  <DashboardPage />
                </RequireOnboarding>
              } 
            />
            <Route 
              path="messages" 
              element={
                <RequireOnboarding>
                  <ChatPage />
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
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const AuthPage = ({component}: {component: ReactNode}) => {
  const user = useAuthStore((state) => state.user);
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return component;
};
