import { create } from "zustand";

export interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface NotificationStore {
  notifications: ToastNotification[];
  addNotification: (message: string, type?: ToastNotification["type"], duration?: number) => void;
  dismissNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  addNotification: (message, type = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: ToastNotification = { id, message, type, duration };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().dismissNotification(id);
      }, duration);
    }
  },
  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
