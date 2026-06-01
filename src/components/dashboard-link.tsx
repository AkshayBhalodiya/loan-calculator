"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

type DashboardLinkProps = {
  className?: string;
};

export default function DashboardLink({ className }: DashboardLinkProps) {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || !session?.user?.email) return null;

  return (
    <Link href="/dashboard" className={className}>
      Dashboard
    </Link>
  );
}
