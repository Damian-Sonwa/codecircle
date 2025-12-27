import {motion, AnimatePresence} from 'framer-motion';
import {useState, useRef, useEffect} from 'react';
import {type Message, type User} from '@/types';
import {formatTimestamp} from '@/utils/date';
import {cn} from '@/utils/styles';
import {Lock, Play, Pause, Volume2, Image as ImageIcon, File, Music} from 'lucide-react';
import {useUserSummary} from '@/hooks/useUserSummary';

interface Props {
  message: Message;
  sender?: User;
  isOwn: boolean;
  onReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
}

export const MessageBubble = ({message, sender, isOwn, onReact}: Props) => {
  const timestamp = formatTimestamp(message.createdAt);
  const [hover, setHover] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {data: summary} = useUserSummary(message.senderId, hover && !isOwn);
  const displayName = sender?.username ?? summary?.username ?? 'Teammate';
  const reactionEntries = Object.entries(message.reactions || {});
  const reactionBar = ['🔥', '💡', '👏', '✅'];
  const isDeleted = Boolean(message.deletedAt);
  
  // Handle voice message playback
  const voiceNote = (message as any).voiceNote || (message.media?.find((m) => m.type === 'audio'));
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setAudioProgress(0);
    });
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', () => {
        setIsPlaying(false);
        setAudioProgress(0);
      });
    };
  }, [voiceNote]);
  
  const toggleVoicePlayback = () => {
    if (!audioRef.current || !voiceNote) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  return (
    <motion.div
      layout
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      className={cn('relative flex w-full gap-3', isOwn ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isOwn && (
        <div className="mt-4 h-8 w-8 rounded-full bg-slate-700 text-center text-sm font-semibold text-slate-200 flex-shrink-0">
          {displayName.at(0)?.toUpperCase()}
        </div>
      )}
      <div className="max-w-[85%] space-y-1 min-w-0">
        {!isOwn && <p className="text-sm text-slate-400 truncate">{displayName}</p>}
        <div
          className={cn(
            'rounded-xl border border-white/5 px-4 py-3 text-base leading-relaxed shadow-lift transition break-words',
            isOwn
              ? 'bg-gradient-to-br from-sky-500/80 to-sky-500/70 text-white'
              : 'bg-slate-900/70 text-slate-100'
          )}
        >
          {message.isEncrypted && (
            <span className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-cyan-200">
              <Lock className="h-3 w-3" />
              <span className="hidden sm:inline">Encryption placeholder</span>
              <span className="sm:hidden">E2E</span>
            </span>
          )}
          {isDeleted ? (
            <p className="italic text-slate-300/60">Message deleted by author</p>
          ) : (
            <>
              {/* Voice Message */}
              {voiceNote && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <button
                    onClick={toggleVoicePlayback}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 text-sky-500 transition hover:bg-sky-500/30"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </button>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-sky-500 transition-all duration-100"
                        style={{width: `${audioProgress}%`}}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {voiceNote.duration ? `${voiceNote.duration}s` : 'Voice message'}
                    </p>
                  </div>
                  <audio ref={audioRef} src={voiceNote.url} preload="metadata" />
                </div>
              )}
              
              {/* Text/Emoji Content */}
              {message.content && (
                <p className={cn('whitespace-pre-line leading-relaxed', message.type === 'emoji' && 'text-2xl sm:text-3xl')}>
                  {message.content}
                </p>
              )}
              
              {/* Image Attachments */}
              {message.media?.filter((m) => m.type === 'image').length > 0 && (
                <div className="mt-2 grid gap-2">
                  {message.media
                    .filter((m) => m.type === 'image')
                    .map((media) => (
                      <a
                        key={media.key}
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40"
                      >
                        <img src={media.url} alt="Attachment" className="w-full h-auto max-h-96 object-contain" />
                        <div className="p-2 text-xs text-slate-400 flex items-center gap-2">
                          <ImageIcon className="h-3 w-3" />
                          {media.filename || `Image (${Math.round(media.size / 1024)} KB)`}
                        </div>
                      </a>
                    ))}
                </div>
              )}
              
              {/* File Attachments */}
              {message.media?.filter((m) => m.type === 'file').length > 0 && (
                <div className="mt-2 grid gap-2">
                  {message.media
                    .filter((m) => m.type === 'file')
                    .map((media) => (
                      <a
                        key={media.key}
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 transition hover:bg-slate-950/60"
                      >
                        <File className="h-5 w-5 text-sky-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-200 truncate">{media.filename || 'File attachment'}</p>
                          <p className="text-[10px] text-slate-400">{Math.round(media.size / 1024)} KB</p>
                        </div>
                      </a>
                    ))}
                </div>
              )}
            </>
          )}
          <div className="mt-1 flex items-center justify-end gap-1 sm:gap-2 text-[10px] uppercase tracking-wide text-slate-300/70">
            <span className="hidden sm:inline">{timestamp}</span>
            <span className="sm:hidden text-[9px]">{new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
            <span className="hidden sm:inline">{message.readBy?.length > 0 ? 'Read' : message.deliveredTo?.length > 0 ? 'Delivered' : 'Sent'}</span>
          </div>
          {!isDeleted && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-300/80">
              {reactionEntries.map(([emoji, users]) => (
                <span key={emoji} className="rounded-full border border-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs">
                  {emoji} {users.length}
                </span>
              ))}
              {!isOwn && onReact && (
                <div className="flex gap-0.5 sm:gap-1 flex-wrap">
                  {reactionBar.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReact(message, emoji)}
                      className="rounded-full border border-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs text-slate-200 transition hover:border-sky-600"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {!isOwn && hover && summary && (
          <motion.div
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 10}}
            className="absolute left-0 sm:-left-2 top-full mt-2 w-48 sm:w-56 rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:p-4 text-[10px] sm:text-xs text-slate-200 shadow-lift z-10"
          >
            <p className="text-sm font-semibold text-white">{summary.username}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-400">{summary.skillLevel ?? 'Contributor'}</p>
            <p className="mt-2 text-xs text-slate-300">Skills: {summary.skills?.join(', ') ?? 'n/a'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


