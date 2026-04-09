'use client';

import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    OAuthAccountNotLinked: 'This email is already registered with a different sign-in method. Please sign in using your original method.',
    EmailCreateAccount: 'Could not create account with this email. Please try again.',
    Callback: 'There was an issue with the authentication callback. Please try again.',
    OAuthSignin: 'Could not initiate OAuth sign-in. Please try again.',
    OAuthCallback: 'Could not complete OAuth sign-in. Please try again.',
    SessionRequired: 'You must be signed in to access this page.',
    Default: 'An authentication error occurred. Please try again.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <CardTitle>Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {errorMessages[error || ''] || errorMessages.Default}
          </p>
          {error && (
            <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              Error code: {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Link href={`/${locale}/auth/signin`}>
              <Button className="w-full">Back to Sign In</Button>
            </Link>
            <Link href={`/${locale}/auth/signup`}>
              <Button variant="outline" className="w-full">Create Account</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
