import {create} from 'zustand';

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'info';
}

interface NotificationState {
  items: NotificationItem[];
  push: (item: NotificationItem) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  push: (item) =>
    set((state) => ({
      items: [...state.items.filter((existing) => existing.id !== item.id), item]
    })),
  dismiss: (id) => set((state) => ({items: state.items.filter((item) => item.id !== id)}))
}));


