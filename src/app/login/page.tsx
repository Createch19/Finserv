import { LoginForm } from "@/components/auth/login-form";
import { CreditCard } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex items-center gap-2 text-2xl font-bold text-primary">
            <CreditCard className="h-8 w-8" />
            <h1 className="font-headline text-3xl font-semibold">FINSERV</h1>
          </div>
          <p className="text-center text-muted-foreground">
            Welcome back! Please sign in to manage your finances.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
