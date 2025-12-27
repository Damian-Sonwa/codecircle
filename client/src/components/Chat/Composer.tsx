import {type FormEvent, useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Send, Mic, Lock, Smile, Paperclip} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {useChatStore} from '@/store/chatStore';
import {getSocket} from '@/services/socket';
import {useVoiceRecorder} from '@/hooks/useVoiceRecorder';
import {useNotificationStore} from '@/store/notificationStore';
import {api, endpoints} from '@/services/api';

interface Props {
  conversationId?: string;
}

const EMOJI_LIST = ['😀', '😂', '❤️', '👍', '🔥', '🎉', '💡', '✅', '🚀', '👏'];

export const Composer = ({conversationId}: Props) => {
  const composerText = useChatStore((state) => state.composerText);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const setEncryptionPreview = useChatStore((state) => state.setEncryptionPreview);
  const {start, stop, isRecording, unsupported} = useVoiceRecorder();
  const pushNotification = useNotificationStore((state) => state.push);
  const queryClient = useQueryClient();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    setEncryptionPreview(composerText.includes('/encrypt'));
  }, [composerText, setEncryptionPreview]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!conversationId || !composerText.trim()) return;
    const socket = getSocket();
    if (socket) {
      (socket as any).emit('message:send', {conversationId, content: composerText});
    } else {
      await api.post(endpoints.messages(conversationId), {content: composerText});
    }
    queryClient.invalidateQueries({queryKey: ['messages', conversationId]});
    queryClient.invalidateQueries({queryKey: ['conversations']});
    setComposerText('');
  };

  const handleVoice = async () => {
    if (unsupported) {
      pushNotification({id: 'voice-unsupported', title: 'Voice message not supported in this browser'});
      return;
    }
    if (!isRecording) {
      await start();
    } else {
      const blob = await stop();
      if (!blob || !conversationId) return;
      pushNotification({id: 'voice-placeholder', title: 'Voice clip ready', message: 'Upload placeholder ready for future encryption'});
      const socket = getSocket();
      if (socket) {
        (socket as any).emit('message:send', {
          conversationId,
          media: [
            {
              key: `voice-${Date.now()}`,
              url: URL.createObjectURL(blob),
              type: 'audio',
              size: blob.size
            }
          ],
          isEncrypted: false
        });
      }
      queryClient.invalidateQueries({queryKey: ['messages', conversationId]});
      queryClient.invalidateQueries({queryKey: ['conversations']});
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setComposerText(composerText + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-emoji-picker]')) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmojiPicker]);

  return (
    <form onSubmit={handleSubmit} className="glass-card mt-2 sm:mt-4 flex items-end gap-2 sm:gap-3 rounded-2xl sm:rounded-3xl p-3 sm:p-4 relative">
      <div className="flex flex-1 flex-col gap-1 sm:gap-2">
        <textarea
          value={composerText}
          onChange={(event) => setComposerText(event.target.value)}
          onFocus={() => {
            const socket = getSocket();
            if (conversationId && socket) (socket as any).emit('typing:start', {conversationId});
          }}
          onBlur={() => {
            const socket = getSocket();
            if (conversationId && socket) (socket as any).emit('typing:stop', {conversationId});
          }}
          placeholder="Type a message..."
          className="min-h-[50px] sm:min-h-[60px] w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        {/* Hide E2E indicator on mobile to save space */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-widest text-cyan-200">
          <Lock className="h-3 w-3" />
          E2E encryption indicator placeholder
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative" data-emoji-picker>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-900/70 text-slate-200 transition hover:text-primaryTo"
          >
            <Smile className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{opacity: 0, y: 10, scale: 0.95}}
                animate={{opacity: 1, y: 0, scale: 1}}
                exit={{opacity: 0, y: 10, scale: 0.95}}
                className="absolute bottom-full right-0 mb-2 glass-card rounded-xl p-2 border border-white/10 shadow-lift z-10"
              >
                <div className="grid grid-cols-5 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-slate-800/70 hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-900/70 text-slate-200 transition hover:text-primaryTo"
          title="Attachments (coming soon)"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleVoice}
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-900/70 text-slate-200 transition hover:text-primaryTo"
        >
          <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse text-rose-400' : 'text-current'}`} />
        </button>
        <button
          type="submit"
          disabled={!conversationId || !composerText.trim()}
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primaryFrom to-primaryTo text-white shadow-lift transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
};

