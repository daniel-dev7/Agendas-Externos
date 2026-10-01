import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  if (!userId) {
    return NextResponse.json({
      authenticated: false,
      userId: null,
      profile: null,
      error: 'Sem claims de autenticação',
    });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,full_name,role,clinic_id,active')
    .eq('id', userId)
    .single();

  return NextResponse.json(
    {
      authenticated: true,
      userId,
      profile: profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role,
            clinic_id: profile.clinic_id,
            active: profile.active,
          }
        : null,
      error: error?.message ?? null,
      errorCode: error?.code ?? null,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
