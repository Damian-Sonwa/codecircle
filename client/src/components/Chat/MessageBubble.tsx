import {motion, AnimatePresence} from 'framer-motion';
import {useState} from 'react';
import {type Message, type User} from '@/types';
import {formatTimestamp} from '@/utils/date';
import {cn} from '@/utils/styles';
import {Lock} from 'lucide-react';
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
  const {data: summary} = useUserSummary(message.senderId, hover && !isOwn);
  const displayName = sender?.username ?? summary?.username ?? 'Teammate';
  const reactionEntries = Object.entries(message.reactions || {});
  const reactionBar = ['🔥', '💡', '👏', '✅'];
  const isDeleted = Boolean(message.deletedAt);
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
        <div className="mt-4 sm:mt-6 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-700 text-center text-xs sm:text-sm font-semibold text-slate-200 flex-shrink-0">
          {displayName.at(0)?.toUpperCase()}
        </div>
      )}
      <div className="max-w-[90%] sm:max-w-[85%] md:max-w-[75%] space-y-1 sm:space-y-2 min-w-0">
        {!isOwn && <p className="text-[10px] sm:text-xs text-slate-400 truncate">{displayName}</p>}
        <div
          className={cn(
            'rounded-xl sm:rounded-2xl md:rounded-3xl border border-white/5 px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 text-xs sm:text-sm shadow-lift transition break-words',
            isOwn
              ? 'bg-gradient-to-br from-primaryFrom/80 to-primaryTo/70 text-white'
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
            message.content && <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
          )}
          {message.media?.length > 0 && (
            <div className="mt-2 grid gap-2">
              {message.media.map((media) => (
                <a
                  key={media.key}
                  href={media.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40"
                >
                  <div className="p-3 text-xs text-slate-200">
                    {media.type.toUpperCase()} attachment ({Math.round(media.size / 1024)} KB)
                  </div>
                </a>
              ))}
            </div>
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
                      className="rounded-full border border-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs text-slate-200 transition hover:border-primaryTo"
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


