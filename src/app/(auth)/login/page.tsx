import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ email?: string; role?: string }>;
}) {
  const { email, role } = await searchParams;
  return <LoginForm initialEmail={typeof email === "string" ? email.slice(0, 120) : ""} initialRole={role === "faculty" ? "faculty" : "student"} />;
}
