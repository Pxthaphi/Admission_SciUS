"use client";

import { useSession } from "next-auth/react";

export function useIsViewer() {
  const { data: session } = useSession();
  return (session?.user as any)?.adminRole === "VIEWER";
}
