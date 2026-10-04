import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { authDestination } from "@/lib/auth-destination";

export const metadata = { title: "注册" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const destination = authDestination(next);
  if (await getCurrentUser()) redirect(destination);
  return <AuthForm mode="register" next={destination} />;
}
