import {Suspense, type ReactNode} from 'react';
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
  return user ? children : <Navigate to="/login" replace />;
};

const RequireAdmin = ({children}: {children: ReactNode}) => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<AuthPage component={<LoginPage />} />} />
          <Route path="/register" element={<AuthPage component={<RegisterPage />} />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="messages" element={<ChatPage />} />
            <Route path="friends" element={<FriendZone />}>
              <Route index element={<Navigate to="/friends/requests" replace />} />
              <Route path="requests" element={<FriendRequestsPage />} />
              <Route path="my-friends" element={<MyFriendsPage />} />
              <Route path="chats" element={<FriendChatsPage />} />
              <Route path="notifications" element={<FriendNotificationsPage />} />
            </Route>
            <Route path="explore" element={<ExplorePage />} />
            <Route path="classroom" element={<ClassroomPage />} />
            <Route path="knowledge" element={<KnowledgeHubPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
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
