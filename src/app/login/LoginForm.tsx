'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function LoginForm({
  error: initialError,
  notice,
}: {
  error: string;
  notice: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError('Informe seu e-mail e sua senha.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        setError(authError.message);
        setBusy(false);
        return;
      }

      window.location.href = '/dashboard';
    } catch (loginError) {
      console.error('Erro ao entrar:', loginError);
      setError('Não foi possível realizar o login. Tente novamente.');
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="loginCard" onSubmit={handleSubmit}>
        <div className="loginHeader">
          <span className="loginMark" aria-hidden="true">AC</span>
          <div>
            <h1>Acesso</h1>
            <p>Entre com suas credenciais para continuar.</p>
          </div>
        </div>

        {notice && <div className="notice" role="status">{notice}</div>}

        <label htmlFor="email">
          E-mail
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

        <Link className="forgotLink" href="/forgot-password">
          Esqueci minha senha
        </Link>
      </form>
    </main>
  );
}
