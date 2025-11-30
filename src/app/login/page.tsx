import { LoginForm } from "@/components/auth/login-form";
import { CollectronLogo } from "@/components/logo/collectron-logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex items-center gap-3 text-2xl font-bold text-primary">
            <CollectronLogo className="h-10 w-10" />
            <h1 className="font-headline text-3xl font-bold tracking-widest">COLLECTRON</h1>
          </div>
          <p className="text-center text-muted-foreground">
            Welcome! Please sign in to manage your finances.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
