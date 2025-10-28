
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <div className="mb-4">
        <FileQuestion className="h-24 w-24 text-primary" />
      </div>
      <h1 className="mb-2 font-headline text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mb-6 text-muted-foreground">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link href="/dashboard" passHref>
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
