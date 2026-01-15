
import { Notification, NotificationType } from '../types';

type Listener = (notifications: Notification[]) => void;

let notifications: Notification[] = [];
let listeners: Listener[] = [];

const notify = () => {
  listeners.forEach(l => l([...notifications]));
};

export const notificationService = {
  subscribe: (listener: Listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  add: (message: string, type: NotificationType = 'info', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString();
    const notification: Notification = { id, type, message, duration };
    notifications.push(notification);
    notify();

    if (duration > 0) {
      setTimeout(() => {
        notificationService.remove(id);
      }, duration);
    }
  },

  remove: (id: string) => {
    notifications = notifications.filter(n => n.id !== id);
    notify();
  },
  
  // Shortcuts
  success: (msg: string) => notificationService.add(msg, 'success'),
  error: (msg: string) => notificationService.add(msg, 'error', 5000),
  warning: (msg: string) => notificationService.add(msg, 'warning', 4000),
  info: (msg: string) => notificationService.add(msg, 'info'),
};
