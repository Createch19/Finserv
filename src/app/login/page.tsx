import { LoginForm } from "@/components/auth/login-form";
import { CollectronLogo } from "@/components/logo/collectron-logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <CollectronLogo className="h-24 w-24 mb-4" />
          <h1 className="font-headline text-3xl font-bold tracking-widest text-primary">COLLECTRON</h1>
          <p className="mt-2 text-center text-muted-foreground">
            Welcome! Please sign in to manage your finances.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
