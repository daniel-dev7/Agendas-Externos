import { createClient } from './supabase-server';

export async function getCurrentProfile() {
  const s = await createClient();

  const { data: claimsData } = await s.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) return null;

  const { data: profile, error } = await s
    .from('profiles')
    .select('id,full_name,role,clinic_id,active,permissions')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile || !profile.active) return null;

  return { userId, profile };
}
