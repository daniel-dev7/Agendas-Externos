'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login } from './actions';

export default function LoginForm({ error }: { error: string }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login">
      <form className="loginCard" action={login}>
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

        <button type="submit" className="btn loginBtn">Entrar</button>
      </form>
    </main>
  );
}
