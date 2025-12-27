import {useState, useRef, useEffect, useCallback} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Send, Smile, Paperclip, Mic, Square, Loader2, X, Image as ImageIcon, File, Music} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import {motion, AnimatePresence} from 'framer-motion';
import {useChatStore} from '@/store/chatStore';
import {getSocket} from '@/services/socket';
import {useVoiceRecorder} from '@/hooks/useVoiceRecorder';
import {useNotificationStore} from '@/store/notificationStore';
import {useAuthStore} from '@/store/authStore';
import {useConversations} from '@/hooks/useConversations';
import {api, endpoints} from '@/services/api';
import {uploadsAPI} from '@/lib/api';
import {cn} from '@/utils/styles';

interface AttachmentPreview {
  id: string;
  file: File;
  url: string;
  type: 'image' | 'file' | 'audio';
  name: string;
  size: number;
  uploading: boolean;
  progress: number;
  error?: string;
}

interface Props {
  conversationId?: string;
  conversationType?: 'group' | 'private' | 'classroom' | 'team' | 'private-circle';
  groupId?: string; // For group chats
  targetUserId?: string; // For private chats
  circleId?: string; // For private circles
  className?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'];

export const ChatInput = ({conversationId, conversationType = 'group', groupId, targetUserId, circleId, className}: Props) => {
  const user = useAuthStore((state) => state.user);
  const composerText = useChatStore((state) => state.composerText);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);
  const {data: conversations} = useConversations({type: 'all'});
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSending, setIsSending] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  
  const {start: startVoiceRecorder, stop: stopVoiceRecorder, isRecording: isVoiceRecording, unsupported: voiceUnsupported} = useVoiceRecorder();

  // Reset when conversation changes
  useEffect(() => {
    setComposerText('');
    setAttachments([]);
    setShowEmojiPicker(false);
    setIsRecording(false);
    setRecordingDuration(0);
  }, [conversationId, setComposerText]);

  // Click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target) &&
        !target.closest('[data-emoji-button]')
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup recording interval
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const handleTypingStart = useCallback(() => {
    if (!conversationId || isTypingRef.current) return;
    const socket = getSocket();
    if (socket) {
      isTypingRef.current = true;
      if (conversationType === 'group' && groupId) {
        (socket as any).emit('typing:start', {groupId, userId: user?._id, username: user?.username});
      } else if (conversationType === 'private' && targetUserId) {
        (socket as any).emit('typing:start', {userId: user?._id, username: user?.username, isPrivate: true, targetUserId});
      } else if (conversationId) {
        (socket as any).emit('typing:start', {conversationId});
      }
    }
  }, [conversationId, conversationType, groupId, targetUserId, user]);

  const handleTypingStop = useCallback(() => {
    if (!conversationId || !isTypingRef.current) return;
    const socket = getSocket();
    if (socket) {
      isTypingRef.current = false;
      if (conversationType === 'group' && groupId) {
        (socket as any).emit('typing:stop', {groupId, userId: user?._id});
      } else if (conversationType === 'private' && targetUserId) {
        (socket as any).emit('typing:stop', {userId: user?._id, isPrivate: true, targetUserId});
      } else if (conversationId) {
        (socket as any).emit('typing:stop', {conversationId});
      }
    }
  }, [conversationId, conversationType, groupId, targetUserId, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComposerText(e.target.value);
    
    if (!isTypingRef.current) {
      handleTypingStart();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  const handleEmojiSelect = (emojiData: {emoji: string}) => {
    const cursorPosition = inputRef.current?.selectionStart || composerText.length;
    const textBefore = composerText.substring(0, cursorPosition);
    const textAfter = composerText.substring(cursorPosition);
    setComposerText(textBefore + emojiData.emoji + textAfter);
    setShowEmojiPicker(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPosition + emojiData.emoji.length, cursorPosition + emojiData.emoji.length);
    }, 0);
  };

  const getFileType = (file: File): 'image' | 'file' | 'audio' => {
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) return 'image';
    if (ALLOWED_AUDIO_TYPES.includes(file.type) || file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    const fileType = getFileType(file);
    if (fileType === 'image' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are supported';
    }
    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments: AttachmentPreview[] = files.map((file) => {
      const error = validateFile(file);
      const url = URL.createObjectURL(file);
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        url,
        type: getFileType(file),
        name: file.name,
        size: file.size,
        uploading: false,
        progress: 0,
        error,
      };
    });

    setAttachments((prev) => [...prev, ...newAttachments]);

    // Auto-upload valid files
    for (const attachment of newAttachments) {
      if (!attachment.error) {
        uploadAttachment(attachment);
      }
    }

    e.target.value = '';
  };

  const uploadAttachment = async (attachment: AttachmentPreview) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === attachment.id ? {...a, uploading: true, progress: 0} : a))
    );

    try {
      const toBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const base64 = await toBase64(attachment.file);
      const uploadResult = await uploadsAPI.upload({
        fileName: attachment.file.name,
        contentType: attachment.file.type,
        data: base64.split(',')[1],
        scope: attachment.type === 'audio' ? 'voice' : 'attachments',
      });

      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachment.id
            ? {...a, uploading: false, progress: 100, url: uploadResult.url, error: undefined}
            : a
        )
      );
    } catch (error: any) {
      console.error('Upload failed:', error);
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachment.id
            ? {...a, uploading: false, error: error.message || 'Upload failed'}
            : a
        )
      );
      pushNotification({
        id: `upload-error-${attachment.id}`,
        title: 'Upload failed',
        message: `Failed to upload ${attachment.name}`,
        type: 'error',
      });
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.url.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const startRecording = async () => {
    if (voiceUnsupported) {
      pushNotification({
        id: 'voice-unsupported',
        title: 'Voice recording not supported',
        message: 'Your browser does not support voice recording',
        type: 'error',
      });
      return;
    }

    try {
      await startVoiceRecorder();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      pushNotification({
        id: 'voice-error',
        title: 'Recording failed',
        message: 'Could not start voice recording',
        type: 'error',
      });
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      const blob = await stopVoiceRecorder();
      if (!blob || blob.size === 0) {
        setIsRecording(false);
        setRecordingDuration(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
        return;
      }

      // Create attachment for voice message
      const voiceFile = new File([blob], `voice-${Date.now()}.webm`, {type: 'audio/webm'});
      const voiceAttachment: AttachmentPreview = {
        id: `voice-${Date.now()}`,
        file: voiceFile,
        url: URL.createObjectURL(blob),
        type: 'audio',
        name: `Voice message (${recordingDuration}s)`,
        size: blob.size,
        uploading: true,
        progress: 0,
      };

      setAttachments((prev) => [...prev, voiceAttachment]);
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      // Upload voice message
      await uploadAttachment(voiceAttachment);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const determineMessageType = (): 'text' | 'emoji' | 'image' | 'file' | 'audio' => {
    if (attachments.length > 0) {
      const firstAttachment = attachments[0];
      if (firstAttachment.type === 'audio') return 'audio';
      if (firstAttachment.type === 'image') return 'image';
      return 'file';
    }
    if (composerText.trim().match(/^[\p{Emoji}\s]+$/u)) return 'emoji';
    return 'text';
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!conversationId || isSending) return;
    if (!composerText.trim() && attachments.length === 0) return;

    // Check if any attachments are still uploading
    const uploadingAttachments = attachments.filter((a) => a.uploading || !a.error);
    if (uploadingAttachments.length !== attachments.length) {
      pushNotification({
        id: 'upload-pending',
        title: 'Upload in progress',
        message: 'Please wait for attachments to finish uploading',
        type: 'error',
      });
      return;
    }

    setIsSending(true);
    handleTypingStop();

    try {
      const messageType = determineMessageType();
      const validAttachments = attachments.filter((a) => !a.error && a.progress === 100);
      
      const messageData: any = {
        conversationId,
        senderId: user?._id,
        type: messageType,
        content: composerText.trim(),
        attachments: validAttachments.map((a) => ({
          type: a.type,
          url: a.url,
          filename: a.name,
          size: a.size,
        })),
        createdAt: new Date().toISOString(),
      };

      // Add voice-specific data
      const voiceAttachment = validAttachments.find((a) => a.type === 'audio');
      if (voiceAttachment) {
        messageData.duration = recordingDuration;
      }

      const socket = getSocket();
      if (socket) {
        // Determine conversation type from conversation data
        const conv = conversations?.find((c) => c._id === conversationId);
        const convType = conv?.conversationType || conversationType;
        
        // Use appropriate socket event based on conversation type
        if (convType === 'private-circle' || circleId) {
          // Private circle message
          (socket as any).emit('circle:message', {
            circleId: circleId || conversationId,
            userId: user?._id,
            username: user?.username,
            type: messageType,
            message: messageData.content,
            attachments: messageData.attachments,
            voiceNote: voiceAttachment
              ? {
                  url: voiceAttachment.url,
                  mimeType: voiceAttachment.file.type,
                  duration: messageData.duration,
                  waveform: [],
                }
              : null,
            messageId: `msg-${Date.now()}`,
            timestamp: messageData.createdAt,
          });
        } else if (conversationType === 'group' && groupId) {
          // Community group message
          (socket as any).emit('group:message', {
            groupId,
            userId: user?._id,
            username: user?.username,
            type: messageType,
            message: messageData.content,
            attachments: messageData.attachments,
            voiceNote: voiceAttachment
              ? {
                  url: voiceAttachment.url,
                  mimeType: voiceAttachment.file.type,
                  duration: messageData.duration,
                  waveform: [],
                }
              : null,
            messageId: `msg-${Date.now()}`,
            timestamp: messageData.createdAt,
          });
        } else if (conversationType === 'private' && targetUserId) {
          // Friend DM message
          (socket as any).emit('private:message', {
            userId: user?._id,
            targetUserId,
            username: user?.username,
            type: messageType,
            message: messageData.content,
            attachments: messageData.attachments,
            voiceNote: voiceAttachment
              ? {
                  url: voiceAttachment.url,
                  mimeType: voiceAttachment.file.type,
                  duration: messageData.duration,
                  waveform: [],
                }
              : null,
            messageId: `msg-${Date.now()}`,
            timestamp: messageData.createdAt,
          });
        } else {
          // Use unified message:send event
          (socket as any).emit('message:send', messageData);
        }
      } else {
        // Fallback to HTTP API
        await api.post(endpoints.messages(conversationId), messageData);
      }

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['messages', conversationId]});
      queryClient.invalidateQueries({queryKey: ['conversations']});

      // Reset state
      setComposerText('');
      setAttachments([]);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      pushNotification({
        id: 'send-error',
        title: 'Failed to send',
        message: error.response?.data?.error || 'Could not send message',
        type: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = composerText.trim().length > 0 || attachments.length > 0;
  const canSend = hasContent && !isSending && attachments.every((a) => !a.uploading && !a.error);

  return (
    <div className={cn('glass-card mt-2 sm:mt-4 rounded-2xl sm:rounded-3xl p-3 sm:p-4 relative', className)}>
      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            ref={emojiPickerRef}
            initial={{opacity: 0, y: 10, scale: 0.95}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, y: 10, scale: 0.95}}
            transition={{duration: 0.2}}
            className="absolute bottom-full mb-2 right-0 z-50 max-w-[calc(100vw-2rem)]"
          >
            <div className="bg-slate-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                width={Math.min(320, window.innerWidth - 32)}
                height={Math.min(360, window.innerHeight * 0.4)}
                searchDisabled={false}
                skinTonesDisabled={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={cn(
                'relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs',
                attachment.error
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                  : attachment.uploading
                  ? 'border-primaryTo/50 bg-primaryTo/10 text-primaryTo'
                  : 'border-white/10 bg-white/5 text-slate-200'
              )}
            >
              {attachment.type === 'image' && <ImageIcon className="h-4 w-4 flex-shrink-0" />}
              {attachment.type === 'file' && <File className="h-4 w-4 flex-shrink-0" />}
              {attachment.type === 'audio' && <Music className="h-4 w-4 flex-shrink-0" />}
              
              <span className="max-w-[160px] truncate">{attachment.name}</span>
              
              {attachment.uploading && (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px]">{attachment.progress}%</span>
                </div>
              )}
              
              {attachment.error && (
                <span className="text-[10px] text-rose-300">{attachment.error}</span>
              )}
              
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="ml-1 text-slate-400 hover:text-white transition"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-rose-400" />
          Recording… {recordingDuration}s
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSend} className="flex items-end gap-2 sm:gap-3">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,audio/*"
          multiple
          onChange={handleFileSelect}
        />

        {/* Attachment Button */}
        <motion.button
          type="button"
          whileHover={{scale: 1.05}}
          whileTap={{scale: 0.95}}
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || isRecording}
          className="flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-900/70 text-slate-200 transition hover:text-primaryTo disabled:opacity-50 touch-manipulation active:scale-95"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
        </motion.button>

        {/* Voice Recording Button */}
        <motion.button
          type="button"
          whileHover={{scale: 1.05}}
          whileTap={{scale: 0.95}}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isSending || voiceUnsupported}
          className={cn(
            'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition disabled:opacity-50',
            isRecording
              ? 'bg-rose-500/20 text-rose-300'
              : 'bg-slate-900/70 text-slate-200 hover:text-primaryTo'
          )}
          title={isRecording ? 'Stop recording' : 'Record voice message'}
        >
          {isRecording ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
        </motion.button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={composerText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={handleTypingStart}
            onBlur={handleTypingStop}
            placeholder="Type a message..."
            disabled={isSending || isRecording}
            className="min-h-[44px] sm:min-h-[60px] w-full resize-none rounded-full border-2 border-white/10 bg-slate-900/70 px-4 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primaryTo focus:border-primaryTo transition-all duration-200 disabled:opacity-50 touch-manipulation"
          />
        </div>

        {/* Emoji Button */}
        <motion.button
          type="button"
          data-emoji-button
          whileHover={{scale: 1.05}}
          whileTap={{scale: 0.95}}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isSending || isRecording}
          className={cn(
            'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition disabled:opacity-50',
            showEmojiPicker
              ? 'bg-primaryTo/20 text-primaryTo'
              : 'bg-slate-900/70 text-slate-200 hover:text-primaryTo'
          )}
          title="Add emoji"
        >
          <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
        </motion.button>

        {/* Send Button */}
        <motion.button
          type="submit"
          whileHover={{scale: canSend ? 1.05 : 1}}
          whileTap={{scale: canSend ? 0.95 : 1}}
          disabled={!canSend}
          className={cn(
            'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
            canSend
              ? 'bg-gradient-to-tr from-primaryFrom to-primaryTo text-white hover:shadow-lg'
              : 'bg-slate-900/70 text-slate-400'
          )}
          title="Send message"
        >
          {isSending ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
        </motion.button>
      </form>
    </div>
  );
};

