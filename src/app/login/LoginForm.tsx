'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function LoginForm({ error: initialError }: { error: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError('');

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      window.location.assign('/dashboard');
    } catch {
      setError('Não foi possível realizar o login. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="loginCard" onSubmit={submit}>
        <div className="loginHeader">
          <span className="loginMark" aria-hidden="true">AC</span>
          <div>
            <h1>Acesso</h1>
            <p>Entre com suas credenciais para continuar.</p>
          </div>
        </div>

        <label htmlFor="email">
          E-mail
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="seu@email.com" />
        </label>

        <label htmlFor="password">
          Senha
          <div className="passwordField">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Digite sua senha"
            />
            <button
              type="button"
              className="passwordToggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </label>

        {error && <div className="error" role="alert">{error}</div>}

        <button type="submit" className="btn loginBtn" disabled={busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
