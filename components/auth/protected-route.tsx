"use client";

import type { ReactNode } from "react";

import { Spinner } from "@heroui/spinner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth-context";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner color="primary" label="Checking session..." />
      </div>
    );
  }

  return <>{children}</>;
};
