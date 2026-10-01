import { getCurrentProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function Login({ searchParams }: LoginPageProps) {
  const current = await getCurrentProfile();
  if (current) redirect('/dashboard');

  const params = await searchParams;
  const error = params?.error ? decodeURIComponent(params.error) : '';

  return <LoginForm error={error} />;
}
