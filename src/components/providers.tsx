"use client";

import { SessionProvider } from "next-auth/react";
import NotificationToastContainer from "@/components/notification-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <NotificationToastContainer />
    </SessionProvider>
  );
}
