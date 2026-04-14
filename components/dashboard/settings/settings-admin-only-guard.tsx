"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-context";

const PROFILE_SETTINGS_PATH = "/dashboard/settings/profile";

export const SettingsAdminOnlyGuard = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, session } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!session) {
      return;
    }

    if (session.user.role !== "ADMIN" && pathname !== PROFILE_SETTINGS_PATH) {
      router.replace(PROFILE_SETTINGS_PATH);
    }
  }, [isLoading, pathname, router, session]);

  if (isLoading) {
    return null;
  }

  if (session && session.user.role !== "ADMIN") {
    return null;
  }

  return null;
};
