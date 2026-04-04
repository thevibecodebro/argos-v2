"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AuthenticatedAppShell } from "./app-shell";

type AuthenticatedAppChromeProps = {
  children: React.ReactNode;
  user: {
    email: string;
    fullName: string;
    orgName?: string | null;
    role: "rep" | "manager" | "executive" | "admin" | null;
  };
};

export function AuthenticatedAppChrome({
  children,
  user,
}: AuthenticatedAppChromeProps) {
  const pathname = usePathname();

  return (
    <AuthenticatedAppShell currentPath={pathname} user={user}>
      {children}
    </AuthenticatedAppShell>
  );
}
