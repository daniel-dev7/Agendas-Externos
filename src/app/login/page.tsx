import { getCurrentProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { login } from './actions';

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function Login({ searchParams }: LoginPageProps) {
  const current = await getCurrentProfile();
  if (current) redirect('/dashboard');

  const params = await searchParams;
  const error = params?.error ? decodeURIComponent(params.error) : '';

  return (
    <main className="login">
      <form className="loginCard" action={login}>
        <div className="brand">
          <b>Agenda Clínica</b>
          <small>Gestão de agendas</small>
        </div>

        <h1>Acesso</h1>
        <p>Entre com suas credenciais para acessar a agenda.</p>

        <label htmlFor="email">
          E-mail
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </label>

        <label htmlFor="password">
          Senha
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="btn">
          Entrar
        </button>
      </form>
    </main>
  );
}
