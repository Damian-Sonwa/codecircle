import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { format } from 'date-fns';
import {
  Check,
  CheckCheck,
  Smile,
  MoreVertical,
  Archive,
  Inbox,
  Loader2,
  Sparkles,
  Waves,
  Paperclip,
  Languages,
  MessageCircle,
} from 'lucide-react';
import MessageInput from './MessageInput';
import { motion, AnimatePresence } from 'framer-motion';
import { techGroupsAPI, translatorAPI } from '../../lib/api';
import { useChatPreferences } from '../../hooks/useChatPreferences';
import ClassroomSessionBoard from '../Classroom/ClassroomSessionBoard';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const TRANSLATE_PREF_KEY = 'chat-translate-language';
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
];

const notificationAudioSrc =
  'data:audio/wav;base64,UklGRuQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YYQAAAB///8AAP//AAD///8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA';

const ChatWindow = ({ activeChat, onUnreadChange }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { preferences } = useChatPreferences();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedMessages, setArchivedMessages] = useState([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [translationCache, setTranslationCache] = useState({});
  const [translationLoading, setTranslationLoading] = useState({});
  const [translationError, setTranslationError] = useState({});
  const [translateLanguage, setTranslateLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'auto';
    return localStorage.getItem(TRANSLATE_PREF_KEY) || 'auto';
  });
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const showArchivedRef = useRef(false);
  const audioRef = useRef(null);
  const menuRef = useRef(null);
  const [showClassroomMenu, setShowClassroomMenu] = useState(false);

  const chatKey = useMemo(() => {
    if (!activeChat) return null;
    if (activeChat.type === 'group') return `group:${activeChat.id}`;
    if (activeChat.type === 'private') return `private:${activeChat.id}`;
    return null;
  }, [activeChat]);

  const privateChatId = useMemo(() => {
    if (!activeChat || activeChat.type !== 'private' || !user) return null;
    return [user.userId, activeChat.id].sort().join('-');
  }, [activeChat, user]);

  const isClassroomSession = useMemo(() => {
    if (!activeChat || activeChat.type !== 'group') return false;
    if (activeChat.groupType === 'classroom') return true;
    return activeChat.meta?.group?.type === 'classroom';
  }, [activeChat]);

  const classroomMeta = useMemo(() => {
    if (!isClassroomSession) return null;
    return activeChat.meta?.group || {
      groupId: activeChat.id,
      name: activeChat.name,
      description: '',
    };
  }, [isClassroomSession, activeChat]);

  useEffect(() => {
    audioRef.current = new Audio(notificationAudioSrc);
    audioRef.current.volume = 0.4;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TRANSLATE_PREF_KEY, translateLanguage);
    }
    setTranslationCache({});
    setTranslationLoading({});
    setTranslationError({});
  }, [translateLanguage]);

  useEffect(() => {
    setTranslationCache({});
    setTranslationLoading({});
    setTranslationError({});
  }, [activeChat?.id]);

  const fetchArchivedMessages = useCallback(async () => {
    if (!activeChat || activeChat.type !== 'group') return;
    setIsLoadingArchived(true);
    setArchiveError('');
    try {
      const data = await techGroupsAPI.getArchivedMessages(activeChat.id);
      setArchivedMessages(
        (data || []).map((msg) => ({
          ...msg,
          timestamp: msg.timestamp || new Date().toISOString(),
        }))
      );
    } catch (error) {
      setArchiveError('Failed to load archived messages. Please try again.');
    } finally {
      setIsLoadingArchived(false);
    }
  }, [activeChat]);

  useEffect(() => {
    if (!socket || !activeChat) return;

    const handleMessage = (message) => {
      const isGroupMessage =
        activeChat.type === 'group' && message.groupId === activeChat.id;
      const isPrivateMessage =
        activeChat.type === 'private' &&
        message.chatId &&
        privateChatId &&
        message.chatId === privateChatId;

      if (isGroupMessage || isPrivateMessage) {
        const normalizedMessage = {
          ...message,
          timestamp:
            typeof message.timestamp === 'string'
              ? message.timestamp
              : message.timestamp?.toISOString() || new Date().toISOString(),
        };

        setMessages((prev) => {
          if (prev.find((m) => m.messageId === normalizedMessage.messageId)) {
            return prev.map((m) => (m.messageId === normalizedMessage.messageId ? normalizedMessage : m));
          }
          return [...prev, normalizedMessage];
        });

        if (normalizedMessage.userId !== user.userId) {
          if (preferences.sound && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current
              .play()
              .catch((error) => console.debug('Sound playback skipped', error));
          }
          if (preferences.vibration && 'vibrate' in navigator) {
            navigator.vibrate?.(80);
          }
        }

        socket.emit('message:read', {
          messageId: normalizedMessage.messageId,
          userId: user.userId,
        });

        if (normalizedMessage.userId !== user.userId && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            try {
              new Notification(`New message from ${normalizedMessage.username}`, {
                body: normalizedMessage.message,
                icon: '/vite.svg',
                badge: '/vite.svg',
                tag: normalizedMessage.messageId,
              });
            } catch (err) {
              console.log('Notification error:', err);
            }
          }
        }
      }
    };

    const handleRead = ({ messageId, userId }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.messageId === messageId && !msg.readBy?.includes(userId)) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), userId],
            };
          }
          return msg;
        })
      );
    };

    const handleReact = ({ messageId, userId, emoji }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.messageId === messageId) {
            const reactions = { ...(msg.reactions || {}) };
            if (!reactions[emoji]) reactions[emoji] = [];
            if (!reactions[emoji].includes(userId)) {
              reactions[emoji].push(userId);
            }
            return { ...msg, reactions };
          }
          return msg;
        })
      );
    };

    const handleTypingStart = ({ userId, username }) => {
      setTypingUsers((prev) => {
        if (!prev.find((u) => u.userId === userId)) {
          return [...prev, { userId, username }];
        }
        return prev;
      });
    };

    const handleTypingStop = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    const handleArchived = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg.messageId !== messageId));
      if (showArchivedRef.current) {
        fetchArchivedMessages();
      }
    };

    socket.on('group:message', handleMessage);
    socket.on('private:message', handleMessage);
    socket.on('message:read', handleRead);
    socket.on('message:react', handleReact);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('group:message:archived', handleArchived);

    if (activeChat.type === 'group') {
      socket.emit('group:join', {
        groupId: activeChat.id,
        userId: user.userId,
      });
      socket.once('group:messages', (groupMessages) => {
        setMessages(
          groupMessages.map((msg) => ({
            ...msg,
            timestamp:
              typeof msg.timestamp === 'string'
                ? msg.timestamp
                : msg.timestamp?.toISOString() || new Date().toISOString(),
          })) || []
        );
      });
    } else if (activeChat.type === 'private') {
      socket.emit('private:start', {
        userId: user.userId,
        targetUserId: activeChat.id,
      });
      socket.once('private:messages', (privateMessages) => {
        setMessages(
          privateMessages.map((msg) => ({
            ...msg,
            timestamp:
              typeof msg.timestamp === 'string'
                ? msg.timestamp
                : msg.timestamp?.toISOString() || new Date().toISOString(),
          })) || []
        );
      });
    }

    return () => {
      socket.off('group:message', handleMessage);
      socket.off('private:message', handleMessage);
      socket.off('message:read', handleRead);
      socket.off('message:react', handleReact);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('group:message:archived', handleArchived);
    };
  }, [socket, activeChat, user, privateChatId, fetchArchivedMessages, preferences.sound, preferences.vibration]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, showArchived]);

  useEffect(() => {
    setMessages([]);
    setTypingUsers([]);
    setShowArchived(false);
    setArchivedMessages([]);
    setArchiveError('');
  }, [activeChat]);

  useEffect(() => {
    showArchivedRef.current = showArchived;
  }, [showArchived]);

  useEffect(() => {
    setShowClassroomMenu(false);
  }, [activeChat]);

  useEffect(() => {
    if (!showClassroomMenu) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowClassroomMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showClassroomMenu]);

  useEffect(() => {
    if (!chatKey || !onUnreadChange || !user) return;
    const unreadCount = messages.filter(
      (msg) =>
        msg.userId !== user.userId && !(Array.isArray(msg.readBy) && msg.readBy.includes(user.userId))
    ).length;
    onUnreadChange(chatKey, unreadCount);
  }, [messages, chatKey, onUnreadChange, user]);

  const toggleArchivedView = async () => {
    if (!activeChat || activeChat.type !== 'group') return;
    if (!showArchived && archivedMessages.length === 0) {
      await fetchArchivedMessages();
    }
    setShowArchived((prev) => !prev);
  };

  const handleReaction = (messageId, emoji) => {
    if (socket) {
      socket.emit('message:react', {
        messageId,
        userId: user.userId,
        emoji,
      });
    }
  };

  const handleQuickReact = (messageId) => {
    handleReaction(messageId, '👍');
  };

  const handleArchiveMessage = async (messageId) => {
    if (!activeChat || activeChat.type !== 'group') return;
    try {
      await techGroupsAPI.archiveMessage(activeChat.id, messageId);
      setMessages((prev) => prev.filter((msg) => msg.messageId !== messageId));
      if (showArchivedRef.current) {
        await fetchArchivedMessages();
      }
    } catch (error) {
      setArchiveError('Unable to archive message. Please try again.');
      setTimeout(() => setArchiveError(''), 3000);
    }
  };

  const handleTranslateLanguageChange = (event) => {
    setTranslateLanguage(event.target.value);
  };

  const requestTranslation = async (message) => {
    if (!message?.message || translateLanguage === 'auto') return;
    const key = `${message.messageId}-${translateLanguage}`;
    if (translationCache[key] || translationLoading[key]) return;

    setTranslationLoading((prev) => ({ ...prev, [key]: true }));
    setTranslationError((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const response = await translatorAPI.translate({
        text: message.message,
        target: translateLanguage,
      });
      setTranslationCache((prev) => ({
        ...prev,
        [key]: {
          text: response.translation,
          detected: response.detectedLanguage,
        },
      }));
    } catch (error) {
      console.error('Translation request failed:', error);
      const fallback = error?.response?.data?.error || 'Translation unavailable right now.';
      setTranslationError((prev) => ({
        ...prev,
        [key]: fallback,
      }));
    } finally {
      setTranslationLoading((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-[#030712] via-[#0b1120] to-[#111827] overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 text-center text-slate-200 space-y-4"
        >
          <motion.div
            initial={{ rotate: -6, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-white text-3xl shadow-[0_30px_80px_-40px_rgba(56,189,248,0.7)]"
          >
            <MessageCircle />
          </motion.div>
          <h2 className="text-3xl font-semibold text-white">Connect. Learn. Build. Together.</h2>
          <p className="text-sm text-slate-300 max-w-sm mx-auto">
            Join a tech circle to start co-creating solutions, sharing resources, and leveling up with fellow builders.
          </p>
        </motion.div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1d4ed822,transparent_55%)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'url(https://grainy-gradient.vercel.app/noise.svg)', opacity: 0.4 }} />
      </div>
    );
  }

  const typingDisplay = typingUsers
    .filter((typingUser) => typingUser.userId !== user.userId)
    .map((typingUser) => typingUser.username)
    .slice(0, 3);

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-br from-[#050815] via-[#0b1120] to-[#141e30]">
      <div className="relative z-20 h-20 border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur-xl px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white shadow-[0_12px_30px_-20px_rgba(56,189,248,0.65)]">
            {activeChat.type === 'group'
              ? activeChat.name?.[0]?.toUpperCase() || 'G'
              : activeChat.user?.username?.[0]?.toUpperCase() || 'U'}
            <div className="absolute inset-0 rounded-2xl border border-white/20" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {activeChat.type === 'group'
                ? activeChat.name
                : activeChat.user?.username || 'Chat'}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-300/80">
              {activeChat.type === 'private' && activeChat.user ? (
                activeChat.user.online ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span>Offline</span>
                )
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Waves className="h-3 w-3 text-blue-300" />
                  Real-time collaboration
                </span>
              )}
              {typingDisplay.length > 0 && (
                <span className="inline-flex items-center gap-1 text-sky-200">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="flex h-2 w-8 items-center justify-between"
                  >
                    <span className="inline-flex items-center">
                      {typingDisplay.join(', ')} typing
                      <span className="ml-2 inline-flex gap-1">
                        <motion.span
                          className="h-[6px] w-[6px] rounded-full bg-sky-300"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.span
                          className="h-[6px] w-[6px] rounded-full bg-sky-300"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.span
                          className="h-[6px] w-[6px] rounded-full bg-sky-300"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </span>
                    </span>
                  </motion.span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeChat.type === 'group' && (
            <button
              onClick={toggleArchivedView}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 transition hover:border-sky-300/60 hover:text-white"
            >
              {showArchived ? (
                <>
                  <Inbox className="h-3.5 w-3.5" />
                  Active Chat
                </>
              ) : (
                <>
                  <Archive className="h-3.5 w-3.5" />
                  Archived Log
                </>
              )}
            </button>
          )}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] uppercase tracking-[0.35em] text-white/50">Translate</span>
            <div className="mt-1 flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 text-white/70" />
              <select
                value={translateLanguage}
                onChange={handleTranslateLanguageChange}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              >
                <option value="auto">Original</option>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="text-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <select
            value={translateLanguage}
            onChange={handleTranslateLanguageChange}
            className="sm:hidden rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
          >
            <option value="auto">Translate: Original</option>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="text-slate-900">
                {option.label}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-white/10 bg-white/10 p-2 text-white/80 transition hover:bg-white/20"
            onClick={() => {
              if (isClassroomSession) {
                setShowClassroomMenu((prev) => !prev);
              }
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isClassroomSession && showClassroomMenu && (
        <div
          ref={menuRef}
          className="absolute right-4 top-[5.5rem] z-30 w-80 max-w-[90vw] rounded-2xl border border-white/15 bg-slate-900/95 p-4 text-white shadow-[0_20px_60px_-30px_rgba(14,165,233,0.6)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Classroom tools</p>
              <h3 className="text-lg font-semibold text-white">{classroomMeta?.name}</h3>
            </div>
            <button
              className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70 hover:bg-white/20"
              onClick={() => setShowClassroomMenu(false)}
            >
              Close
            </button>
          </div>
          <ClassroomSessionBoard group={classroomMeta} />
        </div>
      )}

      <div
        ref={chatContainerRef}
        className="relative flex-1 overflow-y-auto px-3 py-6 md:px-8 md:py-8 custom-scrollbar"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#1d4ed822,transparent_65%)]" />
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'url(https://grainy-gradient.vercel.app/noise.svg)', opacity: 0.3 }} />

        {archiveError && (
          <div className="relative z-10 mx-auto mb-3 max-w-md rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            {archiveError}
          </div>
        )}

        <AnimatePresence>
          {(showArchived ? archivedMessages : messages).map((message, index, arr) => {
            const isOwn = message.userId === user.userId;
            const readBy = Array.isArray(message.readBy)
              ? message.readBy
              : message.readBy instanceof Set
              ? Array.from(message.readBy)
              : [];
            const allRead =
              activeChat.type === 'private' &&
              readBy.length >= 2 &&
              readBy.includes(activeChat.id);
            const isUnreadForUser = !isOwn && !readBy.includes(user.userId);

            const showAvatar = index === 0 || arr[index - 1]?.userId !== message.userId;
            const translationKey = `${message.messageId}-${translateLanguage}`;
            const translatedEntry = translationCache[translationKey];
            const translationInFlight = translationLoading[translationKey];
            const translationErrorText = translationError[translationKey];

            return (
              <motion.div
                key={message.messageId}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.2 }}
                className={`relative z-10 flex ${isOwn ? 'justify-end' : 'justify-start'} gap-3 py-1`}
              >
                {!isOwn && showAvatar && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 backdrop-blur text-xs font-semibold text-white">
                    {message.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {!isOwn && !showAvatar && <div className="w-9" />}

                <div
                  className={`flex max-w-[75%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                >
                  {!isOwn && showAvatar && (
                    <span className="mb-1 text-xs text-slate-300/70">{message.username}</span>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className={`relative rounded-3xl px-4 py-3 shadow-[0_18px_45px_-35px_rgba(59,130,246,0.8)] ${
                      isOwn
                        ? 'bg-gradient-to-br from-sky-500/90 via-indigo-500/90 to-purple-500/90 text-white'
                        : 'bg-white/10 text-white backdrop-blur border border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.message}
                    </p>

                    {message.voiceNote?.url && (
                      <div className="mt-3 w-full">
                        <audio
                          controls
                          className="w-full overflow-hidden rounded-2xl"
                          src={`${API_BASE_URL}${message.voiceNote.url}`}
                        />
                        {message.voiceNote.duration ? (
                          <div className="mt-1 text-[11px] text-white/70">
                            {Math.round(message.voiceNote.duration)}s voice note
                          </div>
                        ) : null}
                      </div>
                    )}

                    {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {message.attachments.map((attachment) => (
                          <a
                            key={`${message.messageId}-${attachment.url}`}
                            href={`${API_BASE_URL}${attachment.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/85 transition hover:border-sky-400/50 hover:text-white"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            <span className="max-w-[200px] truncate">{attachment.name}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {translateLanguage !== 'auto' && message.message && (
                      <div className="mt-3 w-full">
                        {translatedEntry ? (
                          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/85">
                            <p className="text-sm font-medium text-white/90">{translatedEntry.text}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/50">
                              Translated from {translatedEntry.detected?.toUpperCase?.() || 'AUTO'} → {translateLanguage.toUpperCase()}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => requestTranslation(message)}
                            disabled={translationInFlight}
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:border-sky-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {translationInFlight ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Translating…
                              </>
                            ) : (
                              <>
                                <Languages className="h-3.5 w-3.5" />
                                Translate
                              </>
                            )}
                          </button>
                        )}
                        {translationErrorText && (
                          <p className="mt-2 text-[11px] text-red-300">{translationErrorText}</p>
                        )}
                      </div>
                    )}

                    <div className={`mt-2 flex items-center gap-2 text-[10px] ${isOwn ? 'justify-end text-white/80' : 'text-slate-300/80'}`}>
                      {!isOwn && isUnreadForUser && (
                        <span className="uppercase tracking-[0.25em] text-amber-300">
                          Unread
                        </span>
                      )}
                      <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
                      {isOwn && (
                        <span className="ml-1">
                          {allRead ? (
                            <CheckCheck className="h-3.5 w-3.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>

                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(message.reactions).map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.messageId, emoji)}
                            className={`inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[11px] transition ${
                              userIds.includes(user.userId)
                                ? 'bg-white/20 text-white'
                                : 'bg-white/10 text-white/80 hover:bg-white/15'
                            }`}
                          >
                            {emoji}
                            {userIds.length > 1 && <span>{userIds.length}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    {!showArchived && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1, scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickReact(message.messageId)}
                        className="absolute -bottom-8 right-3 hidden rounded-full border border-white/10 bg-white/10 p-2 text-white shadow backdrop-blur group-hover:flex"
                        title="Quick react"
                      >
                        <Smile className="h-4 w-4" />
                      </motion.button>
                    )}

                    {!showArchived && !isOwn && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1, scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleArchiveMessage(message.messageId)}
                        className="absolute -bottom-8 left-3 hidden rounded-full border border-white/10 bg-white/10 p-2 text-white/80 shadow backdrop-blur group-hover:flex"
                        title="Archive message"
                      >
                        <Archive className="h-4 w-4" />
                      </motion.button>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={messagesEndRef} />

        {showArchived && isLoadingArchived && (
          <div className="relative z-10 flex items-center justify-center py-4 text-xs text-slate-300/70 gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading archived messages…
          </div>
        )}
        {showArchived && !isLoadingArchived && archivedMessages.length === 0 && (
          <div className="relative z-10 flex items-center justify-center py-6 text-sm text-slate-300/80">
            No archived messages yet.
          </div>
        )}
      </div>

      {!showArchived ? (
        <div className="relative z-20">
          <MessageInput activeChat={activeChat} />
        </div>
      ) : (
        <div className="relative z-20 bg-white/5 backdrop-blur border-t border-white/10 px-4 py-3 text-xs text-slate-300/70 text-center">
          Archived conversations are read-only. Switch back to active view to continue chatting.
        </div>
      )}

      {!showArchived && messages.length > 6 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-28 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_20px_45px_-20px_rgba(79,70,229,0.7)]"
        >
          <Sparkles className="h-4 w-4" />
          New Messages
        </motion.button>
      )}
    </div>
  );
};

export default ChatWindow;
