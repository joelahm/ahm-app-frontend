import { redirect } from "next/navigation";

import { invitationsApi } from "@/apis/invitations";
import { RegisterForm } from "@/components/auth/register-form";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

const RegisterPage = async ({ searchParams }: InvitePageProps) => {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token?.trim();

  if (!token) {
    redirect("/login");
  }

  try {
    const validation = await invitationsApi.validateToken(token);

    if (!validation.valid || !validation.email) {
      redirect("/login");
    }

    return (
      <section className="py-4">
        <RegisterForm
          isEmailDisabled
          defaultEmail={validation.email}
          inviteToken={token}
        />
      </section>
    );
  } catch {
    redirect("/login");
  }
};

export default RegisterPage;
