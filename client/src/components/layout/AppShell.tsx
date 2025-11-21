import {type ReactNode, useEffect, useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {ConversationList} from '@/components/chat/ConversationList';
import {ChatWindow} from '@/components/chat/ChatWindow';
import {ProfileCard} from '@/components/chat/ProfileCard';
import {useChatStore} from '@/store/chatStore';
import {Menu, X} from 'lucide-react';

interface Props {
  sidebar?: ReactNode;
}

export const AppShell = ({sidebar}: Props) => {
  const sidebarOpen = useChatStore((state) => state.sidebarOpen);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const [isMobile, setIsMobile] = useState(false);

  // Track window size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-hide sidebar on mobile when conversation is selected
  useEffect(() => {
    if (activeConversationId && isMobile) {
      setSidebarOpen(false);
    }
  }, [activeConversationId, isMobile, setSidebarOpen]);

  const showSidebar = sidebarOpen || !isMobile;

  return (
    <div className="relative flex min-h-screen flex-col bg-transparent px-2 py-2 sm:px-4 sm:py-4 md:px-6 md:py-6 text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-2 sm:gap-4 min-w-0">
        <ProfileCard />
        <div className="relative flex flex-1 flex-col gap-2 sm:gap-4 lg:flex-row min-h-0">
          {/* Mobile sidebar toggle button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="glass-card fixed left-2 top-16 z-40 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 text-slate-200 transition hover:text-primaryTo"
            >
              {sidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          )}

          {/* Mobile overlay - behind sidebar */}
          {isMobile && sidebarOpen && (
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className="fixed inset-0 z-20 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                initial={isMobile ? {x: '-100%', opacity: 0} : undefined}
                animate={isMobile ? {x: 0, opacity: 1} : undefined}
                exit={isMobile ? {x: '-100%', opacity: 0} : undefined}
                transition={{type: 'spring', stiffness: 200, damping: 22}}
                className={`${
                  isMobile ? 'fixed left-0 top-0 z-30 h-full w-[85vw] max-w-80' : 'relative z-auto w-full lg:w-80 flex-shrink-0'
                }`}
              >
                <div className={`h-full overflow-y-auto ${isMobile ? 'bg-slate-900/95 backdrop-blur-xl' : ''}`}>
                  {sidebar ?? <ConversationList />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Window */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <ChatWindow />
          </div>
        </div>
      </main>
    </div>
  );
};


