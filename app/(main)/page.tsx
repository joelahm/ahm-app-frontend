import { headers } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function HomePage() {
  if (!API_BASE_URL) {
    redirect("/login");
  }

  const cookieHeader = (await headers()).get("cookie") ?? "";
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!response.ok) {
    redirect("/login");
  }

  redirect("/dashboard");
}
