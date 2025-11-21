import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import OAuthCallback from './components/Auth/OAuthCallback';
import Sidebar from './components/Chat/Sidebar';
import ChatWindow from './components/Chat/ChatWindow';
import { Button } from './components/ui/button';
import { LogOut, Moon, Sun, MessageCircle, LifeBuoy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import AuthPortal from './components/Auth/AuthPortal';
import ExploreTechSkills from './components/Explore/ExploreTechSkills';
import AdminDashboard from './components/Admin/AdminDashboard';
import DashboardOverview from './components/Dashboard/DashboardOverview';
import GroupsManager from './components/Groups/GroupsManager';
import ClassroomView from './components/Classroom/ClassroomView';
import SettingsPanel from './components/Settings/SettingsPanel';
import HelpSupportPanel from './components/Support/HelpSupportPanel';
import FriendZone from './components/Friends/FriendZone';
import {
  techGroupsAPI,
  friendsAPI,
  classroomAPI,
  onboardingAPI,
  setAuthToken,
} from './lib/api';
import { cn } from './lib/utils';

const ChatAppBody = () => {
  const { user, logout, loading, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { socket } = useSocket();
  const [activeChat, setActiveChat] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [onboardingState, setOnboardingState] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [guidelinesReminder, setGuidelinesReminder] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState('');
  const [friendsData, setFriendsData] = useState({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState('');
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [userClassroomRequests, setUserClassroomRequests] = useState([]);
  const [adminClassroomRequests, setAdminClassroomRequests] = useState([]);
  const [classroomFeedback, setClassroomFeedback] = useState(null);
  const [adminAlert, setAdminAlert] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const showExplore = activeView === 'explore';
  const onboardingKeyRef = useRef(null);

  useEffect(() => {
    if (user?.token) {
      setAuthToken(user.token);
    } else {
      setAuthToken(null);
    }
  }, [user]);

  useEffect(() => {
    if ((!user || user.role !== 'admin') && showAdminPanel) {
      setShowAdminPanel(false);
    }
  }, [user, showAdminPanel]);

  const fetchGroups = useCallback(async () => {
    if (!user?.token) {
      return;
    }
    setGroupsLoading(true);
    setGroupsError('');
    try {
      const data = await techGroupsAPI.list();
      const filtered = Array.isArray(data)
        ? data.filter((group) => {
            const members = Array.isArray(group.members) ? group.members : [];
            const admins = Array.isArray(group.admins) ? group.admins : [];
            return (
              members.includes(user.userId) ||
              group.createdBy === user.userId ||
              admins.includes(user.userId)
            );
          })
        : [];
      setGroups(filtered);
    } catch (error) {
      console.error('Failed to load tech groups', error);
      if (error?.response?.status === 401) {
        setGroupsError('Session expired. Please sign in again.');
        logout();
      } else {
        setGroupsError('Unable to load tech circles right now.');
      }
    } finally {
      setGroupsLoading(false);
    }
  }, [user, logout]);

  const fetchFriends = useCallback(async () => {
    if (!user?.token) {
      return;
    }
    setFriendsLoading(true);
    setFriendsError('');
    try {
      const data = await friendsAPI.list();
      setFriendsData({
        friends: data.friends || [],
        incomingRequests: data.incomingRequests || [],
        outgoingRequests: data.outgoingRequests || [],
      });
    } catch (error) {
      console.error('Failed to load friends', error);
      if (error?.response?.status === 401) {
        setFriendsError('Session expired. Please sign in again.');
        logout();
      } else {
        setFriendsError('Unable to load friends right now.');
      }
    } finally {
      setFriendsLoading(false);
    }
  }, [user, logout]);

  const fetchUserClassroomRequests = useCallback(async () => {
    if (!user?.token) {
      return;
    }
    try {
      const data = await classroomAPI.listMine();
      setUserClassroomRequests(data || []);
    } catch (error) {
      console.error('Failed to load classroom requests', error);
      if (error?.response?.status === 401) {
        setClassroomFeedback({ type: 'error', message: 'Session expired. Please sign in again.' });
        logout();
      }
    }
  }, [user, logout]);

  const fetchAdminClassroomRequests = useCallback(async () => {
    if (!user?.token || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return;
    }
    try {
      const data = await classroomAPI.listAll();
      setAdminClassroomRequests(data || []);
    } catch (error) {
      console.error('Failed to load admin classroom requests', error);
      if (error?.response?.status === 401) {
        setAdminAlert({ type: 'error', message: 'Session expired. Please sign in again.' });
        logout();
      }
    }
  }, [user, logout]);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      return;
    }
    fetchGroups();
  }, [user, fetchGroups]);

  useEffect(() => {
    if (!user?.token) {
      setFriendsData({ friends: [], incomingRequests: [], outgoingRequests: [] });
      setUserClassroomRequests([]);
      setAdminClassroomRequests([]);
      setUnreadCounts({});
      return;
    }
    fetchFriends();
    fetchUserClassroomRequests();
    if (user.role === 'admin' || user.role === 'superadmin') {
      fetchAdminClassroomRequests();
    } else {
      setAdminClassroomRequests([]);
    }
  }, [
    user,
    fetchFriends,
    fetchUserClassroomRequests,
    fetchAdminClassroomRequests,
  ]);

  useEffect(() => {
    if (!socket || !user?.token) {
      return;
    }

    const refreshFriends = () => {
      fetchFriends();
    };
    socket.on('friend:request', refreshFriends);
    socket.on('friend:request:updated', refreshFriends);
    return () => {
      socket.off('friend:request', refreshFriends);
      socket.off('friend:request:updated', refreshFriends);
    };
  }, [socket, user, fetchFriends]);

  useEffect(() => {
    if (!socket || !user?.token) {
      return;
    }

    const upsertRequest = (request, updater) => {
      if (!request) return;
      setUserClassroomRequests((prev) => {
        const exists = prev.some((item) => item.requestId === request.requestId);
        if (request.createdBy !== user.userId && !exists) {
          return prev;
        }
        if (!exists && request.createdBy === user.userId) {
          return [request, ...prev];
        }
        return prev.map((item) =>
          item.requestId === request.requestId ? updater(item, request) : item
        );
      });
      if (user.role === 'admin') {
        setAdminClassroomRequests((prev) => {
          const exists = prev.some((item) => item.requestId === request.requestId);
          if (!exists) {
            return [request, ...prev];
          }
          return prev.map((item) =>
            item.requestId === request.requestId ? updater(item, request) : item
          );
        });
      }
    };
    
    const handleCreated = (request) => {
      if (request.createdBy === user.userId) {
        setUserClassroomRequests((prev) => [
          request,
          ...prev.filter((item) => item.requestId !== request.requestId),
        ]);
        setClassroomFeedback({
          type: 'pending',
          message:
            'Your classroom session request has been sent. Please wait while an admin approves it.',
        });
      }
      if (user.role === 'admin') {
        setAdminClassroomRequests((prev) => [
          request,
          ...prev.filter((item) => item.requestId !== request.requestId),
        ]);
        setAdminAlert({
          type: 'info',
          message: `${request.createdByUsername} requested a classroom: ${request.name}`,
        });
      }
    };

    const handleUpdated = (request) => {
      upsertRequest(request, (_, next) => next);
      if (request.status === 'approved' && request.createdBy === user.userId) {
        setClassroomFeedback({
          type: 'success',
          message: `${request.name} has been approved! Open it from your classroom list.`,
        });
        fetchGroups();
      }
      if (request.status === 'declined' && request.createdBy === user.userId) {
        setClassroomFeedback({
          type: 'info',
          message:
            request.adminNotes ||
            `${request.name} was declined by the admin. You can try submitting again later.`,
        });
      }
      if (user.role === 'admin') {
        setAdminAlert({
          type: request.status === 'approved' ? 'success' : request.status === 'declined' ? 'info' : 'info',
          message:
            request.status === 'approved'
              ? `${request.name} has been approved.`
              : request.status === 'declined'
              ? `${request.name} was declined.`
              : '',
        });
      }
    };
    
    const applyRequestUpdate = (request) => {
      if (!request?.requestId) return;
      setUserClassroomRequests((prev) => {
        const index = prev.findIndex((item) => item.requestId === request.requestId);
        if (index === -1) {
          return [request, ...prev];
        }
        const next = [...prev];
        next[index] = request;
        return next;
      });

      if (request.status === 'approved') {
        setClassroomFeedback({
          type: 'success',
          message:
            request.systemMessage?.message ||
            `${request.name} has been approved! Open it from your classroom list.`,
        });
        fetchGroups();
      } else if (request.status === 'declined') {
        setClassroomFeedback({
          type: 'info',
          message:
            request.systemMessage?.message ||
            request.adminNotes ||
            `${request.name} was declined by the admin. You can try submitting again later.`,
        });
      }
    };

    socket.on('classroom:request:created', handleCreated);
    socket.on('classroom:request:updated', handleUpdated);
    socket.on('classroomRequestUpdate', applyRequestUpdate);
    
    return () => {
      socket.off('classroom:request:created', handleCreated);
      socket.off('classroom:request:updated', handleUpdated);
      socket.off('classroomRequestUpdate', applyRequestUpdate);
    };
  }, [socket, user, fetchGroups]);

  useEffect(() => {
    if (!socket || !user?.token) {
      return;
    }

    const incrementUnread = (chatKey) => {
      if (!chatKey) return;
      setUnreadCounts((prev) => {
        const current = prev[chatKey] || 0;
        return { ...prev, [chatKey]: current + 1 };
      });
    };

    const handleGroupMessage = (message) => {
      if (!message?.groupId || message.userId === user.userId) {
        return;
      }
      if (activeChat?.type === 'group' && activeChat.id === message.groupId) {
          return;
      }
      incrementUnread(`group:${message.groupId}`);
    };

    const handlePrivateMessage = (message) => {
      if (!message) return;
      if (message.userId === user.userId) return;
      let otherId = message.userId;
      if (message.chatId) {
        const participants = message.chatId.split('-');
        const alternate = participants.find((id) => id !== user.userId);
        if (alternate) {
          otherId = alternate;
        }
      }
      if (!otherId) return;
      if (activeChat?.type === 'private' && activeChat.id === otherId) {
        return;
      }
      incrementUnread(`private:${otherId}`);
    };

    socket.on('group:message', handleGroupMessage);
    socket.on('private:message', handlePrivateMessage);

    return () => {
      socket.off('group:message', handleGroupMessage);
      socket.off('private:message', handlePrivateMessage);
    };
  }, [socket, user, activeChat]);

  const handleGroupCreated = useCallback((group) => {
    if (!group) return;
    setGroups((prev) => {
      const exists = prev.some((item) => item.groupId === group.groupId);
      if (exists) {
        return prev.map((item) =>
          item.groupId === group.groupId ? { ...item, ...group } : item
        );
      }
      return [group, ...prev];
    });
    setActiveChat((prev) => {
      if (prev?.type === 'group' && prev.id === group.groupId) {
        return { ...prev, name: group.name, groupType: group.type };
      }
      return prev;
    });
  }, []);

  const handleGroupUpdated = useCallback((group) => {
    if (!group) return;
    setGroups((prev) =>
      prev.map((item) => (item.groupId === group.groupId ? { ...item, ...group } : item))
    );
    setActiveChat((prev) => {
      if (prev?.type === 'group' && prev.id === group.groupId) {
        return { ...prev, name: group.name, groupType: group.type };
      }
          return prev;
    });
  }, []);

  const handleCreateGroup = useCallback(
    async ({ name, description = '', topics = [], createdBy, type }) => {
    if (!user) {
        throw new Error('You need to be signed in to create a circle.');
      }
      const created = await techGroupsAPI.create({
        name,
        description,
        topics,
        createdBy: createdBy || user.userId,
        type,
      });
      handleGroupCreated(created);
      return created;
    },
    [user, handleGroupCreated]
  );

  const handleUpdateGroup = useCallback(
    async (groupId, updates) => {
      const updated = await techGroupsAPI.update(groupId, updates);
      handleGroupUpdated(updated);
      setActiveChat((prev) => {
        if (prev?.type === 'group' && prev.id === groupId) {
          return { ...prev, name: updated.name };
        }
        return prev;
      });
      return updated;
    },
    [handleGroupUpdated]
  );

  const handleDeleteGroup = useCallback(async (groupId) => {
    await techGroupsAPI.remove(groupId);
    setGroups((prev) => prev.filter((group) => group.groupId !== groupId));
    setActiveChat((prev) => {
      if (prev?.type === 'group' && prev.id === groupId) {
        return null;
      }
      return prev;
    });
  }, []);

  const handleLeaveGroup = useCallback(async (groupId) => {
    if (!user) return;
    await techGroupsAPI.leave(groupId, user.userId);
    setGroups((prev) => prev.filter((group) => group.groupId !== groupId));
    setActiveChat((prev) => {
      if (prev?.type === 'group' && prev.id === groupId) {
        return null;
      }
      return prev;
    });
  }, [user]);

  const handleChatSelect = useCallback(
    (chat) => {
      if (!chat) return;
      setActiveChat(chat);
      if (chat.type === 'private') {
        setActiveView('friendZone');
      } else {
        setActiveView('messages');
      }
      setUnreadCounts((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (chat.type === 'group') {
          delete next[`group:${chat.id}`];
        } else if (chat.type === 'private') {
          delete next[`private:${chat.id}`];
        }
        return next;
      });
    },
    []
  );

  const handleClearActiveChat = useCallback(() => {
    setActiveChat(null);
  }, []);

  const handleRefreshGroups = useCallback(() => {
    if (user) {
      fetchGroups();
    }
  }, [user, fetchGroups]);

  const handleSendFriendRequest = useCallback(
    async (targetUsername) => {
      if (!targetUsername?.trim()) {
        throw new Error('Please enter a valid username.');
      }
      try {
        const data = await friendsAPI.sendRequest(targetUsername.trim());
        setFriendsData({
          friends: data.friends || [],
          incomingRequests: data.incomingRequests || [],
          outgoingRequests: data.outgoingRequests || [],
        });
        return {
          message: `Friend request sent to ${targetUsername.trim()}.`,
        };
      } catch (error) {
        console.error('Send friend request failed', error);
        if (error?.response?.status === 401) {
          logout();
          throw new Error('Session expired. Please sign in again.');
        }
        throw new Error(
          error?.response?.data?.error || 'Unable to send friend request right now.'
        );
      }
    },
    [logout]
  );

  const handleRespondFriendRequest = useCallback(async (requesterId, action) => {
    if (!requesterId || !action) {
      throw new Error('Requester and action are required.');
    }
    try {
      const data = await friendsAPI.respond(requesterId, action);
      setFriendsData({
        friends: data.friends || [],
        incomingRequests: data.incomingRequests || [],
        outgoingRequests: data.outgoingRequests || [],
      });
      return {
        message:
          action === 'accept'
            ? 'Friend request accepted.'
            : 'Friend request declined.',
      };
    } catch (error) {
      console.error('Respond to friend request failed', error);
      throw new Error(
        error?.response?.data?.error || 'Unable to update friend request right now.'
      );
    }
  }, []);

  const handleExploreClose = useCallback(() => {
    setActiveView((prev) => (prev === 'explore' ? 'messages' : prev));
  }, []);

  const handleExploreComplete = useCallback(
    (result) => {
      if (result?.group) {
        handleGroupCreated(result.group);
        setActiveChat({
          type: 'group',
          id: result.group.groupId,
          name: result.group.name,
          groupType: result.group.type,
          meta: { group: result.group },
        });
        setActiveView('messages');
      }
      if (result?.summary) {
        setGuidelinesReminder({
          score: result.summary.score,
          total: result.summary.total,
          skillName: result.summary.skillName,
          level: result.summary.level,
          existing: result.summary.existing,
          status: result.summary.status,
        });
      }
    },
    [handleGroupCreated]
  );

  const needsOnboarding = Boolean(user && !user.onboardingCompleted);

  const handleCreateClassroomRequest = useCallback(
    async ({ name, description }) => {
      setClassroomFeedback(null);
      try {
        const request = await classroomAPI.createRequest({ name, description });
        setUserClassroomRequests((prev) => {
          const filtered = prev.filter((item) => item.requestId !== request.requestId);
          return [request, ...filtered];
        });
        setClassroomFeedback({
          type: 'pending',
          message:
            'Your classroom session request has been sent. Please wait while an admin approves it.',
        });
        return request;
      } catch (error) {
        console.error('Create classroom request failed', error);
        if (error?.response?.status === 401) {
          setClassroomFeedback({ type: 'error', message: 'Session expired. Please sign in again.' });
          logout();
          throw error;
        }
        const message =
          error?.response?.data?.error || 'Unable to create classroom request right now.';
        setClassroomFeedback({ type: 'error', message });
        throw error;
      }
    },
    [logout]
  );

  const handleApproveClassroomRequest = useCallback(
    async (requestId) => {
      try {
        const updated = await classroomAPI.approve(requestId);
        setAdminClassroomRequests((prev) =>
          prev.map((item) => (item.requestId === updated.requestId ? updated : item))
        );
        setUserClassroomRequests((prev) =>
          prev.map((item) => (item.requestId === updated.requestId ? updated : item))
        );
        setAdminAlert({
          type: 'success',
          message: `${updated.name} has been approved.`,
        });
        await fetchGroups();
        return updated;
      } catch (error) {
        console.error('Approve classroom request failed', error);
        setAdminAlert({
          type: 'error',
          message:
            error?.response?.data?.error || 'Unable to approve classroom request right now.',
        });
        throw error;
      }
    },
    [fetchGroups]
  );

  const handleDeclineClassroomRequest = useCallback(async (requestId, adminNotes) => {
    try {
      const updated = await classroomAPI.decline(requestId, adminNotes);
      setAdminClassroomRequests((prev) =>
        prev.map((item) => (item.requestId === updated.requestId ? updated : item))
      );
      setUserClassroomRequests((prev) =>
        prev.map((item) => (item.requestId === updated.requestId ? updated : item))
      );
      setAdminAlert({
        type: 'info',
        message: `${updated.name} was declined.`,
      });
      return updated;
    } catch (error) {
      console.error('Decline classroom request failed', error);
      setAdminAlert({
        type: 'error',
        message:
          error?.response?.data?.error || 'Unable to decline classroom request right now.',
      });
      throw error;
    }
  }, []);

  const handleUnreadChange = useCallback((chatKey, count) => {
    if (!chatKey) return;
    setUnreadCounts((prev) => {
      if (prev[chatKey] === count) {
        return prev;
      }
      return { ...prev, [chatKey]: count };
    });
  }, []);

  const dismissClassroomFeedback = useCallback(() => {
    setClassroomFeedback(null);
  }, []);

  const handleNavigate = useCallback(
    (view) => {
      if (!view) return;
      if (view === 'admin') {
        setShowAdminPanel(true);
      } else {
        setShowAdminPanel(false);
      }
      if (view === 'explore') {
        setActiveView('messages');
        setTimeout(() => setActiveView('explore'), 0);
        return;
      }
      setActiveView(view);
    },
    []
  );

  useEffect(() => {
    if (!user || user.onboardingCompleted) {
      setOnboardingState(null);
      onboardingKeyRef.current = null;
      return;
    }

    const key = `onboardingState_${user.userId}`;
    onboardingKeyRef.current = key;

    const loadState = () => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOnboardingState(parsed);
          return;
        } catch (error) {
          console.warn('Failed to parse onboarding state, resetting.', error);
          localStorage.removeItem(key);
        }
      }

      const seedState = {
        currentStep: 0,
        completed: false,
        completedSteps: [],
        data: null,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(seedState));
      setOnboardingState(seedState);
    };

    loadState();
  }, [user]);

  const handleOnboardingUpdate = useCallback(
    (snapshot) => {
      if (!user || !onboardingKeyRef.current || !snapshot) return;
      setOnboardingState((prev) => {
        const prevNormalized = {
          currentStep: prev?.currentStep ?? 0,
          completed: prev?.completed ?? false,
          completedSteps: prev?.completedSteps ?? [],
          data: prev?.data ?? null,
          completedAt: prev?.completedAt ?? null,
        };

        const snapshotNormalized = {
          currentStep: snapshot.currentStep ?? prevNormalized.currentStep,
          completed: snapshot.completed ?? prevNormalized.completed,
          completedSteps: snapshot.completedSteps ?? prevNormalized.completedSteps,
          data: snapshot.data ?? prevNormalized.data,
          completedAt: snapshot.completedAt ?? prevNormalized.completedAt,
        };

        if (JSON.stringify(prevNormalized) === JSON.stringify(snapshotNormalized)) {
          return prev;
        }

        const next = {
          ...snapshotNormalized,
          updatedAt: new Date().toISOString(),
        };

        localStorage.setItem(onboardingKeyRef.current, JSON.stringify(next));
        return next;
      });
    },
    [user]
  );

  const handleOnboardingComplete = useCallback(async (payload) => {
    if (!user || !onboardingKeyRef.current) return;
    
    // If user wants to go back to auth, logout and clear onboarding
    if (payload?.goBackToAuth || payload?.cancelled) {
      console.log('[App] User cancelled onboarding, logging out');
      setOnboardingState(null);
      onboardingKeyRef.current = null;
      logout();
      return;
    }
    
    try {
      await onboardingAPI.complete();
      console.log('[App] Onboarding API call successful');
    } catch (error) {
      console.error('[App] Failed to mark onboarding complete', error);
    }

    const next = {
      ...onboardingState,
      completed: true,
      completedAt: new Date().toISOString(),
      ...(payload || {}),
    };
    localStorage.setItem(onboardingKeyRef.current, JSON.stringify(next));
    setOnboardingState(next);
    updateUser({ 
      onboardingCompleted: true,
      hasOnboarded: true,
      profileCompleted: true,
      ...(payload?.data ? {
        skills: payload.data.skills,
        skillLevel: payload.data.level,
      } : {})
    });
    console.log('[App] Onboarding marked as complete, modal should close');
    
    // Ensure we navigate to dashboard view and clear onboarding state
    setActiveView('dashboard');
    setOnboardingState(null);
    
    // Force a small delay to ensure state updates propagate
    setTimeout(() => {
      console.log('[App] Dashboard should now be visible');
    }, 100);
  }, [user, onboardingState, updateUser, logout]);

  const renderMainContent = useCallback(() => {
    const resolvedView = activeView === 'explore' ? 'messages' : activeView;

    switch (resolvedView) {
      case 'dashboard':
        return (
          <DashboardOverview
            user={user}
            groups={groups}
            onNavigate={handleNavigate}
            onSelectGroup={handleChatSelect}
            onCreateGroup={handleCreateGroup}
          />
        );
      case 'groups':
        return (
          <GroupsManager
            groups={groups}
            activeChat={activeChat}
            onSelectGroup={handleChatSelect}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onLeaveGroup={handleLeaveGroup}
            onRefresh={handleRefreshGroups}
            isRefreshing={groupsLoading}
            unreadCounts={unreadCounts}
            currentUser={user}
          />
        );
      case 'friendZone':
        return (
          <FriendZone
            currentUser={user}
            friendsData={friendsData}
            friendsLoading={friendsLoading}
            friendsError={friendsError}
            onSendFriendRequest={handleSendFriendRequest}
            onRespondFriendRequest={handleRespondFriendRequest}
            onRefreshFriends={fetchFriends}
            onSelectFriend={handleChatSelect}
            activeChat={activeChat}
            onClearActiveChat={handleClearActiveChat}
            unreadCounts={unreadCounts}
            onUnreadChange={handleUnreadChange}
          />
        );
      case 'classroom':
        return (
          <ClassroomView
            groups={groups}
            onCreateSession={handleCreateClassroomRequest}
            onSelectGroup={handleChatSelect}
            requests={userClassroomRequests}
            feedback={classroomFeedback}
            onDismissFeedback={dismissClassroomFeedback}
          />
        );
      case 'settings':
        return <SettingsPanel user={user} onLogout={logout} />;
      case 'messages':
      default:
        return <ChatWindow activeChat={activeChat} onUnreadChange={handleUnreadChange} />;
    }
  }, [
    activeChat,
    activeView,
    classroomFeedback,
    dismissClassroomFeedback,
    groups,
    groupsLoading,
    handleChatSelect,
    handleClearActiveChat,
    handleCreateClassroomRequest,
    handleCreateGroup,
    handleNavigate,
    handleRespondFriendRequest,
    handleUnreadChange,
    handleSendFriendRequest,
    handleUpdateGroup,
    handleDeleteGroup,
    handleLeaveGroup,
    fetchFriends,
    friendsData,
    friendsError,
    friendsLoading,
    logout,
    unreadCounts,
    user,
    userClassroomRequests,
  ]);

  useEffect(() => {
    if (!guidelinesReminder) return;
    const timer = setTimeout(() => setGuidelinesReminder(null), 6000);
    return () => clearTimeout(timer);
  }, [guidelinesReminder]);

  const urlParams = new URLSearchParams(window.location.search);
  const isOAuthCallback = urlParams.get('userId') || urlParams.get('error');

  if (isOAuthCallback) {
    return <OAuthCallback />;
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <motion.div
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ rotate: 360, scale: 1, opacity: 1 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1.6 }}
          className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent"
        />
        <p className="text-sm text-muted-foreground">Preparing your workspace…</p>
      </div>
    );
  }

  // Show auth page if no user, or if user explicitly logged out
  // Check if there's a stored session that should be restored
  if (!user) {
    // Clear any stale onboarding state when showing auth
    if (onboardingState) {
      setOnboardingState(null);
      onboardingKeyRef.current = null;
    }
    return <AuthPortal />;
  }

  return (
      <div className="h-screen flex flex-col bg-whatsapp-light-bg dark:bg-background relative overflow-x-hidden md:overflow-hidden">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-16 border-b border-border/50 bg-primary dark:bg-[#202c33] flex items-center justify-between px-4 md:px-6 relative z-10 shadow-md"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="h-7 w-7 text-primary-foreground" />
            <h1 className="text-xl md:text-2xl font-bold text-primary-foreground">
              CodeCircle
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              data-tour-id="dashboard"
              onClick={() => handleNavigate('dashboard')}
              className={cn(
                'text-primary-foreground/80 hover:text-primary-foreground',
                activeView === 'dashboard' && 'bg-primary-foreground/15 text-primary-foreground'
              )}
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-tour-id="explore"
              onClick={() => handleNavigate('explore')}
              className={cn(
                'text-primary-foreground/80 hover:text-primary-foreground',
                showExplore && 'bg-primary-foreground/15 text-primary-foreground'
              )}
            >
              Join Tech Group
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-tour-id="friend-zone"
              onClick={() => handleNavigate('friendZone')}
              className={cn(
                'text-primary-foreground/80 hover:text-primary-foreground',
                activeView === 'friendZone' && 'bg-primary-foreground/15 text-primary-foreground'
              )}
            >
              Friend Zone
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-tour-id="messages"
              onClick={() => handleNavigate('messages')}
              className={cn(
                'text-primary-foreground/80 hover:text-primary-foreground',
                activeView === 'messages' && 'bg-primary-foreground/15 text-primary-foreground'
              )}
            >
              Messages
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-tour-id="classroom"
              onClick={() => handleNavigate('classroom')}
              className={cn(
                'text-primary-foreground/80 hover:text-primary-foreground',
                activeView === 'classroom' && 'bg-primary-foreground/15 text-primary-foreground'
              )}
            >
              Classroom
            </Button>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('admin')}
                className={cn(
                  'text-primary-foreground/80 hover:text-primary-foreground',
                  showAdminPanel && 'bg-primary-foreground/15 text-primary-foreground'
                )}
              >
                Admin
              </Button>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-3 text-primary-foreground/80 hover:text-primary-foreground"
                onClick={() => setShowHelpSupport(true)}
              >
                <LifeBuoy className="mr-2 h-4 w-4" /> Help / Support
              </Button>
            </div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="rounded-full hover:bg-accent transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-sm"
              data-tour-id="profile"
            >
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold">
                {user.username[0].toUpperCase()}
              </div>
              <span className="font-medium text-sm text-primary-foreground hidden md:inline">
                {user.username}
              </span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Logout"
                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </motion.header>
        <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-y-auto md:overflow-hidden">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0 w-0 md:w-80"
          >
            <Sidebar
              activeChat={activeChat}
              activeView={activeView}
              onChatSelect={handleChatSelect}
              onNavigate={handleNavigate}
              groups={groups}
              groupsError={groupsError}
              isGroupsLoading={groupsLoading}
              onCreateGroup={handleCreateGroup}
              onRefreshGroups={handleRefreshGroups}
              unreadCounts={unreadCounts}
              onOpenHelpSupport={() => setShowHelpSupport(true)}
            />
          </motion.div>
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex-1 flex flex-col min-w-0"
          >
            {renderMainContent()}
          </motion.div>
        </div>
        {needsOnboarding && (
          <OnboardingFlow
            key={user.userId}
            initialState={onboardingState}
            onUpdate={handleOnboardingUpdate}
            onComplete={handleOnboardingComplete}
          />
        )}
        <ExploreTechSkills
          isOpen={showExplore}
          groups={groups}
          onClose={handleExploreClose}
          onComplete={handleExploreComplete}
          onGroupCreated={handleGroupCreated}
          onGroupUpdated={handleGroupUpdated}
        />
        <HelpSupportPanel open={showHelpSupport} onClose={() => setShowHelpSupport(false)} />
        {(user?.role === 'admin' || user?.role === 'superadmin') && showAdminPanel && (
          <AdminDashboard
            onClose={() => setShowAdminPanel(false)}
            classroomRequests={adminClassroomRequests}
            onRefreshClassroom={fetchAdminClassroomRequests}
            onApproveClassroom={handleApproveClassroomRequest}
            onDeclineClassroom={handleDeclineClassroomRequest}
            adminAlert={adminAlert}
            onDismissAdminAlert={() => setAdminAlert(null)}
          />
        )}
        <AnimatePresence>
          {guidelinesReminder && (
            <motion.div
              key="guidelines-reminder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none fixed bottom-6 right-6 z-[140]"
            >
              <div className="pointer-events-auto w-[320px] rounded-3xl border border-white/10 bg-slate-900/90 px-5 py-4 shadow-[0_20px_45px_-20px_rgba(59,130,246,0.6)] backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.35em] text-sky-300/90">Great work</p>
                <p className="mt-2 text-sm text-white/90">
                  You scored <span className="font-semibold text-emerald-300">{guidelinesReminder.score}%</span> on the {guidelinesReminder.skillName} ({guidelinesReminder.level}) verifier.
                  {guidelinesReminder.existing
                    ? ' You have access to a live circle. Keep it collaborative, cite sources, and respect every builder.'
                    : ' Lead your new circle with empathy. Invite peers, share resources, and follow the community guidelines.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
};

const ChatApp = () => (
  <SocketProvider>
    <ChatAppBody />
  </SocketProvider>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

