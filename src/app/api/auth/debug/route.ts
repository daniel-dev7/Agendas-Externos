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

  const cookies = request.cookies.getAll();
  const authCookieNames = cookies
    .map((cookie) => cookie.name)
    .filter((name) => name.includes('-auth-token'));

  const { data, error } = await supabase.auth.getClaims();

  return NextResponse.json(
    {
      hasAuthCookie: authCookieNames.length > 0,
      authCookieCount: authCookieNames.length,
      hasClaims: Boolean(data?.claims),
      subPresent: Boolean(data?.claims?.sub),
      error: error?.message ?? null,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
