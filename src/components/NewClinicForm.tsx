'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, X } from 'lucide-react';
import { createClinic } from '@/app/clinicas/actions';

export default function NewClinicForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setMessage('');
    startTransition(async () => {
      const result = await createClinic(formData);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      formRef.current?.reset();
      setMessage('Clínica criada com sucesso.');
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button className="btn" type="button" onClick={() => setOpen(true)}>
        <Plus size={17} />
        Nova clínica
      </button>
    );
  }

  return (
    <div className="card clinicFormCard">
      <div className="clinicFormHeader">
        <div>
          <h3><Building2 size={18} /> Nova clínica</h3>
          <p className="muted">Cadastre o parceiro que receberá suas próprias agendas.</p>
        </div>
        <button className="iconBtn" type="button" onClick={() => { setOpen(false); setMessage(''); }} aria-label="Fechar formulário" title="Fechar">
          <X size={17} />
        </button>
      </div>

      <form ref={formRef} className="form clinicForm" action={submit}>
        <label>
          Nome da clínica
          <input name="name" placeholder="Ex.: Clínica São Lucas" required />
        </label>

        <label>
          Código
          <input
            name="code"
            placeholder="Ex.: CSL"
            required
            maxLength={30}
            onChange={(event) => {
              event.currentTarget.value = event.currentTarget.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
            }}
          />
        </label>

        <button className="btn" type="submit" disabled={isPending}>
          {isPending ? 'Criando...' : 'Criar clínica'}
        </button>
      </form>

      {message && (
        <div className={message.includes('sucesso') ? 'notice' : 'error'} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
