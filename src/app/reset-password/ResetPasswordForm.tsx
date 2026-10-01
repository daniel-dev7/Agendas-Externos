'use client';

import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setError('');

    if (password.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('As senhas não conferem.');
      return;
    }

    setBusy(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    await supabase.auth.signOut();
    window.location.assign('/login?reset=success');
  }

  return (
    <main className="login">
      <form className="loginCard" onSubmit={handleSubmit}>
        <div className="loginHeader">
          <span className="loginMark" aria-hidden="true">
            <KeyRound size={19} />
          </span>
          <div>
            <h1>Nova senha</h1>
            <p>Crie uma nova senha para acessar sua conta.</p>
          </div>
        </div>

        <label htmlFor="new-password">
          Nova senha
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <label htmlFor="confirm-password">
          Confirmar nova senha
          <input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Digite a senha novamente"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>

        {error && <div className="error" role="alert">{error}</div>}

        <button type="submit" className="btn loginBtn" disabled={busy}>
          {busy ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </main>
  );
}
