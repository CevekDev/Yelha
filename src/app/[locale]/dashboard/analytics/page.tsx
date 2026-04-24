import { redirect } from 'next/navigation';

export default function AnalyticsPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard`);
}
