"use client";

import { useNotificationStore } from "@/hooks/use-notification-store";

export default function NotificationToastContainer() {
  const { notifications, dismissNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-md px-4 sm:px-0 pointer-events-none">
      {notifications.map((toast) => {
        let bgStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200";
        let iconColor = "text-indigo-500";
        let iconSvg = (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );

        if (toast.type === "success") {
          bgStyle = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-300";
          iconColor = "text-emerald-600 dark:text-emerald-400";
          iconSvg = (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        } else if (toast.type === "error") {
          bgStyle = "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/30 text-rose-900 dark:text-rose-300";
          iconColor = "text-rose-600 dark:text-rose-400";
          iconSvg = (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        } else if (toast.type === "warning") {
          bgStyle = "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/30 text-amber-900 dark:text-amber-300";
          iconColor = "text-amber-600 dark:text-amber-400";
          iconSvg = (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          );
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-slide-in ${bgStyle}`}
            role="alert"
          >
            <div className="flex items-center gap-3">
              <div className={iconColor}>{iconSvg}</div>
              <p className="text-sm font-medium leading-normal">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissNotification(toast.id)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
