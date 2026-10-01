'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase-browser';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const router=useRouter();

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(busy)return;
    setBusy(true);
    setError('');

    try{
      const client=createClient();
      if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
        throw new Error('Configuração do Supabase não encontrada no ambiente da aplicação.');
      }

      const {error:signInError}=await client.auth.signInWithPassword({
        email:email.trim(),
        password
      });

      if(signInError){
        setError(signInError.message);
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    }catch(err){
      setError(err instanceof Error ? err.message : 'Não foi possível realizar o login.');
    }finally{
      setBusy(false);
    }
  }

  return <main className="login">
    <form className="loginCard" onSubmit={submit}>
      <div className="brand"><b>Agenda Clínica</b><small>Gestão de agendas</small></div>
      <h1>Acesso</h1>
      <p>Entre com suas credenciais para acessar a agenda.</p>
      <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
      <label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>
      {error&&<div className="error" role="alert">{error}</div>}
      <button type="submit" className="btn" disabled={busy}>{busy?'Entrando...':'Entrar'}</button>
    </form>
  </main>
}