import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim();
    const password = String(body?.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Informe o e-mail e a senha.' },
        { status: 400 }
      );
    }

    const cookiesToSet: Array<{
      name: string;
      value: string;
      options?: Record<string, unknown>;
    }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              cookiesToSet.push({ name, value, options });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    const response = NextResponse.redirect(
      new URL('/dashboard', request.url),
      303
    );

    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível realizar o login.' },
      { status: 500 }
    );
  }
}
