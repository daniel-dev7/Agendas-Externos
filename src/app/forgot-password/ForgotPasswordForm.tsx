'use client';

import { FormEvent, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError('');
    setSent(false);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setBusy(false);
      return;
    }

    setSent(true);
    setBusy(false);
  }

  return (
    <main className="login">
      <form className="loginCard" onSubmit={handleSubmit}>
        <div className="loginHeader">
          <span className="loginMark" aria-hidden="true">
            <Mail size={19} />
          </span>
          <div>
            <h1>Redefinir senha</h1>
            <p>Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
          </div>
        </div>

        <label htmlFor="reset-email">
          E-mail
          <input
            id="reset-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {error && <div className="error" role="alert">{error}</div>}

        {sent && (
          <div className="notice" role="status">
            Se esse e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.
            Verifique também a pasta de spam.
          </div>
        )}

        <button type="submit" className="btn loginBtn" disabled={busy}>
          {busy ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>

        <Link className="backLink" href="/login">
          <ArrowLeft size={16} />
          Voltar para o login
        </Link>
      </form>
    </main>
  );
}
