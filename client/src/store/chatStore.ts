import {create} from 'zustand';

interface TypingMap {
  [conversationId: string]: {[userId: string]: boolean};
}

interface ChatState {
  activeConversationId?: string;
  composerText: string;
  typing: TypingMap;
  encryptionPreview?: boolean;
  sidebarOpen: boolean;
  setActiveConversation: (id: string) => void;
  setComposerText: (text: string) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setEncryptionPreview: (flag: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: undefined,
  composerText: '',
  typing: {},
  encryptionPreview: false,
  sidebarOpen: true,
  setActiveConversation: (id) => set({activeConversationId: id, sidebarOpen: false}),
  setComposerText: (text) => set({composerText: text}),
  setTyping: (conversationId, userId, isTyping) =>
    set((state) => ({
      typing: {
        ...state.typing,
        [conversationId]: {
          ...state.typing[conversationId],
          [userId]: isTyping
        }
      }
    })),
  setEncryptionPreview: (flag) => set({encryptionPreview: flag}),
  setSidebarOpen: (open) => set({sidebarOpen: open}),
  toggleSidebar: () => set((state) => ({sidebarOpen: !state.sidebarOpen})),
  reset: () => set({composerText: '', typing: {}, encryptionPreview: false, sidebarOpen: true})
}));


