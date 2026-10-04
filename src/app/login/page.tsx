import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { authDestination } from "@/lib/auth-destination";

export const metadata = { title: "登录 · 想法共享" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = authDestination(next);
  if (await getCurrentUser()) redirect(destination);
  return <AuthForm mode="login" next={destination} />;
}
