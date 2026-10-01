'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase-server';

export async function createClinic(formData: FormData) {
  const current = await getCurrentProfile();

  if (!current || !['admin', 'operator'].includes(current.profile.role)) {
    return { error: 'Você não tem permissão para criar clínicas.' };
  }

  const name = String(formData.get('name') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim().toUpperCase();

  if (!name || !code) {
    return { error: 'Informe o nome e o código da clínica.' };
  }

  if (!/^[A-Z0-9_-]{2,30}$/.test(code)) {
    return {
      error: 'O código deve ter entre 2 e 30 caracteres, usando apenas letras, números, hífen ou sublinhado.',
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('clinics').insert({
    name,
    code,
    active: true,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Já existe uma clínica com esse código.' };
    }

    return { error: 'Não foi possível criar a clínica.' };
  }

  revalidatePath('/clinicas');
  revalidatePath('/dashboard');

  return { success: true };
}
