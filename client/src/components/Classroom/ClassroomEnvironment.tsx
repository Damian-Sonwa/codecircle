import {useState, useEffect, useRef} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {getSocket} from '@/services/socket';
import {useAuthStore} from '@/store/authStore';
import {useNotificationStore} from '@/store/notificationStore';
import {type RoomDetails, type LiveSessionApplication} from '@/types';
import {Video, Mic, MicOff, VideoOff, Users, MessageSquare, Send} from 'lucide-react';
import {motion} from 'framer-motion';
import {formatTimestamp} from '@/utils/date';

interface Message {
  _id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

interface Props {
  application: LiveSessionApplication;
}

export const ClassroomEnvironment = ({application}: Props) => {
  const user = useAuthStore((state) => state.user);
  const pushNotification = useNotificationStore((state) => state.push);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomId = application.roomId || '';

  const {data: roomDetails} = useQuery<RoomDetails>({
    queryKey: ['room-details', roomId],
    queryFn: async () => {
      const {data} = await api.get(endpoints.liveSessions.room(roomId));
      return data;
    },
    enabled: Boolean(roomId),
  });

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('room:join', {roomId});

    const handleMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleTyping = ({userId, username}: {userId: string; username: string}) => {
      setTypingUsers((prev) => new Set(prev).add(username));
      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(username);
          return next;
        });
      }, 3000);
    };

    socket.on('room:message', handleMessage);
    socket.on('room:typing', handleTyping);

    return () => {
      socket.off('room:message', handleMessage);
      socket.off('room:typing', handleTyping);
      socket.emit('room:leave', {roomId});
    };
  }, [roomId]);

  const handleVideoToggle = async () => {
    try {
      if (isVideoEnabled) {
        localStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
        setIsVideoEnabled(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsVideoEnabled(true);
      }
    } catch (error) {
      pushNotification({
        id: `video-error-${Date.now()}`,
        title: 'Video error',
        message: 'Could not access camera. Please check permissions.',
        type: 'error',
      });
    }
  };

  const handleAudioToggle = async () => {
    try {
      if (isAudioEnabled) {
        localStreamRef.current?.getAudioTracks().forEach((track) => track.stop());
        setIsAudioEnabled(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => track.stop());
          stream.getAudioTracks().forEach((track) => {
            localStreamRef.current?.addTrack(track);
          });
        } else {
          localStreamRef.current = stream;
        }
        setIsAudioEnabled(true);
      }
    } catch (error) {
      pushNotification({
        id: `audio-error-${Date.now()}`,
        title: 'Audio error',
        message: 'Could not access microphone. Please check permissions.',
        type: 'error',
      });
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !roomId) return;

    const socket = getSocket();
    if (socket) {
      const message: Message = {
        _id: `msg-${Date.now()}`,
        userId: user?._id || '',
        username: user?.username || 'Unknown',
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
      };

      socket.emit('room:message', {roomId, message});
      setMessages((prev) => [...prev, message]);
      setMessageText('');
    }
  };

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Top Bar */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">{roomDetails?.techSkill || application.techSkill} Classroom</h2>
            <p className="text-xs text-slate-400 mt-1">
              {roomDetails?.participantCount || 0} participants
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleVideoToggle}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition',
                isVideoEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-white/10 hover:border-primaryTo'
              )}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button
              onClick={handleAudioToggle}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition',
                isAudioEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-white/10 hover:border-primaryTo'
              )}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Main Video/Audio Area */}
        <div className="lg:col-span-2 glass-card rounded-2xl sm:rounded-3xl p-4 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-slate-900/40 rounded-xl relative overflow-hidden">
            {isVideoEnabled && videoRef.current ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primaryFrom to-primaryTo flex items-center justify-center text-white text-2xl font-semibold mx-auto mb-4">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <p className="text-sm text-slate-400">Video is off</p>
                <p className="text-xs text-slate-500 mt-1">Click the video icon to enable</p>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel - Chat & Participants */}
        <div className="flex flex-col gap-4">
          {/* Participants */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primaryTo" />
              <h3 className="text-sm font-semibold text-white">Participants</h3>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {roomDetails?.participants.map((participant) => (
                <div key={participant.userId} className="flex items-center gap-2 text-xs">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primaryFrom to-primaryTo flex items-center justify-center text-white text-[10px] font-semibold">
                    {participant.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-300 truncate">{participant.username}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-primaryTo" />
              <h3 className="text-sm font-semibold text-white">Live Chat</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={cn(
                      'text-xs p-2 rounded-lg',
                      msg.userId === user?._id
                        ? 'bg-primaryTo/20 text-right ml-auto max-w-[80%]'
                        : 'bg-slate-900/60 text-left'
                    )}
                  >
                    <p className="font-semibold text-slate-200 mb-1">{msg.username}</p>
                    <p className="text-slate-300">{msg.content}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formatTimestamp(msg.timestamp)}
                    </p>
                  </div>
                ))
              )}
              {typingUsers.size > 0 && (
                <p className="text-xs text-slate-500 italic">
                  {Array.from(typingUsers).join(', ')} typing...
                </p>
              )}
            </div>

            {/* Message Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primaryTo"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primaryFrom to-primaryTo text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}



