import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MessengerTestClient from '@/components/dashboard/messenger-test-client';

export const metadata = { title: 'Test Messenger — YelhaDms', robots: { index: false } };

export default async function MessengerTestPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // Block debug page in production — dev/staging only
  if (process.env.NODE_ENV === 'production') {
    redirect(`/${locale}/dashboard`);
  }

  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/signin`);

  return <MessengerTestClient />;
}
