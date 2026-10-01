import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export async function createClient(){const c=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>c.getAll(),setAll:xs=>{try{xs.forEach(({name,value,options})=>c.set(name,value,options))}catch{}}}})}