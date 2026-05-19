import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { isAuthenticated } from "@/lib/auth-server";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/");
  }

  return (
    <main className="login-wrap">
      <LoginForm />
    </main>
  );
}
