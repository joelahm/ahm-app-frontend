"use client";

import { Spinner } from "@heroui/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { LoginForm } from "@/components/auth/login-form";

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <section className="grid min-h-[70vh] place-items-center py-8">
      <LoginForm redirectTo={callbackUrl} />
    </section>
  );
};

export default LoginPage;
