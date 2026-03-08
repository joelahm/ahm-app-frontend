import { LoginScreen } from "@/components/auth/login-screen";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const callbackUrl = resolvedSearchParams.callbackUrl ?? "/dashboard";

  return <LoginScreen callbackUrl={callbackUrl} />;
}
