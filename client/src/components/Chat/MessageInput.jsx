import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../providers/SocketProvider';
import { Button } from '../ui/button';
import { Send, Smile, Paperclip, Mic, Square, Loader2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadsAPI } from '../../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const MessageInput = ({ activeChat }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isVoiceUploading, setIsVoiceUploading] = useState(false);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        !event.target.closest('button[data-emoji-button]')
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      const recorder = mediaRecorderRef.current;
      if (recorder?.stream) {
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    setMessage('');
    setAttachments([]);
    setShowEmojiPicker(false);
  }, [activeChat?.id, activeChat?.type]);

  const toBase64 = (fileOrBlob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(fileOrBlob);
    });

  const resetRecordingState = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleSend = () => {
    if (!socket || !activeChat) return;
    if (!message.trim() && attachments.length === 0) return;

    const messageData = {
      userId: user.userId,
      username: user.username,
      message: message.trim(),
      attachments,
      timestamp: new Date().toISOString(),
    };

    if (activeChat.type === 'group') {
      socket.emit('group:message', {
        ...messageData,
        groupId: activeChat.id,
      });
    } else if (activeChat.type === 'private') {
      socket.emit('private:message', {
        ...messageData,
        targetUserId: activeChat.id,
      });
    }

    setMessage('');
    setAttachments([]);
    handleTypingStop();
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleVoiceMessageSend = (voiceMeta, duration) => {
    if (!socket || !activeChat) return;

    const messageData = {
      userId: user.userId,
      username: user.username,
      message: '[Voice message]',
      attachments: [],
      voiceNote: {
        url: voiceMeta.url,
        mimeType: voiceMeta.type,
        duration,
        waveform: voiceMeta.waveform || [],
      },
      timestamp: new Date().toISOString(),
    };

    if (activeChat.type === 'group') {
      socket.emit('group:message', {
        ...messageData,
        groupId: activeChat.id,
      });
    } else if (activeChat.type === 'private') {
      socket.emit('private:message', {
        ...messageData,
        targetUserId: activeChat.id,
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (!isTypingRef.current) {
      handleTypingStart();
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  const handleTypingStart = () => {
    if (!socket || !activeChat || isTypingRef.current) return;

    isTypingRef.current = true;

    if (activeChat.type === 'group') {
      socket.emit('typing:start', {
        groupId: activeChat.id,
        userId: user.userId,
        username: user.username,
      });
    } else if (activeChat.type === 'private') {
      socket.emit('typing:start', {
        userId: user.userId,
        username: user.username,
        isPrivate: true,
        targetUserId: activeChat.id,
      });
    }
  };

  const handleTypingStop = () => {
    if (!socket || !activeChat || !isTypingRef.current) return;

    isTypingRef.current = false;
    clearTimeout(typingTimeoutRef.current);

    if (activeChat.type === 'group') {
      socket.emit('typing:stop', {
        groupId: activeChat.id,
        userId: user.userId,
      });
    } else if (activeChat.type === 'private') {
      socket.emit('typing:stop', {
        userId: user.userId,
        isPrivate: true,
        targetUserId: activeChat.id,
      });
    }
  };

  const handleEmojiSelect = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAttachment(true);
      const base64 = await toBase64(file);
      const payload = await uploadsAPI.upload({
        fileName: file.name,
        contentType: file.type,
        data: base64.split(',')[1],
        scope: 'attachments',
      });
      setAttachments((prev) => [...prev, payload]);
    } catch (error) {
      console.error('Attachment upload failed', error);
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = '';
    }
  };

  const startRecording = async () => {
    if (isRecording || isVoiceUploading) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('Audio recording not supported in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        try {
          setIsVoiceUploading(true);
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
          const base64 = await toBase64(blob);
          const upload = await uploadsAPI.upload({
            fileName: `voice-${Date.now()}.webm`,
            contentType: 'audio/webm',
            data: base64.split(',')[1],
            scope: 'voice',
          });
          handleVoiceMessageSend(upload, recordingDuration);
        } catch (error) {
          console.error('Voice upload failed', error);
        } finally {
          setIsVoiceUploading(false);
          resetRecordingState();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Unable to start audio recording', error);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    try {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error('Failed to stop recording', error);
      resetRecordingState();
    }
  };

  if (!activeChat) return null;

  return (
    <div className="bg-card/95 backdrop-blur-sm border-t border-border/50 px-2 md:px-4 py-3 relative">
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full mb-2 right-0 md:right-4 z-50"
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                width={320}
                height={360}
                searchDisabled={false}
                skinTonesDisabled={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(attachments.length > 0 || isUploadingAttachment) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <a
              key={attachment.url}
              href={`${API_BASE_URL}${attachment.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80 hover:border-sky-400/40 hover:text-white"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="max-w-[160px] truncate">{attachment.name}</span>
            </a>
          ))}
          {isUploadingAttachment && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </span>
          )}
        </div>
      )}

      {isRecording && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-rose-400" />
          Recording… {recordingDuration}s
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          type="file"
          accept="image/*,video/*,application/pdf,audio/*,.zip,.rar,.7z,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-accent transition-colors flex-shrink-0"
            title="Attach file"
            onClick={handleAttachmentClick}
            disabled={isUploadingAttachment || isVoiceUploading}
          >
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 rounded-full flex-shrink-0 transition-colors ${isRecording ? 'bg-rose-500/20' : 'hover:bg-accent'}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? 'Stop recording' : 'Record a voice message'}
            disabled={isVoiceUploading}
          >
            {isRecording ? <Square className="h-5 w-5 text-rose-300" /> : <Mic className="h-5 w-5 text-muted-foreground" />}
          </Button>
        </motion.div>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message"
            className="w-full rounded-full border-2 border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 placeholder:text-muted-foreground"
            disabled={isVoiceUploading}
          />
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            data-emoji-button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`h-10 w-10 rounded-full hover:bg-accent transition-colors flex-shrink-0 ${
              showEmojiPicker ? 'bg-accent' : ''
            }`}
            title="Add emoji"
            disabled={isVoiceUploading}
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleSend}
            disabled={(!message.trim() && attachments.length === 0) || isVoiceUploading}
            className={`h-10 w-10 rounded-full flex-shrink-0 transition-all duration-200 shadow-md hover:shadow-lg ${
              message.trim() || attachments.length > 0
                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default MessageInput;
