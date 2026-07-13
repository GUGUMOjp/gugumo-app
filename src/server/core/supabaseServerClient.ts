import { cookies } from "next/headers";
import {
  createClient,
} from "@supabase/supabase-js";
import {
  getSupabaseAuthCookieChunkName,
  SUPABASE_AUTH_COOKIE_MAX_CHUNKS,
  SUPABASE_AUTH_COOKIE_NAME,
} from "@/lib/supabaseAuthCookie";
import type {
  SupabaseUserClient,
} from "./supabaseUserClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function createRequestSupabaseClient(): Promise<SupabaseUserClient> {
  const cookieStore = await cookies();
  const getCookieValue = (key: string) => {
    const directCookie = cookieStore.get(key)?.value;
    if (directCookie) return decodeCookieValue(directCookie);

    const chunks: string[] = [];
    for (let index = 0; index < SUPABASE_AUTH_COOKIE_MAX_CHUNKS; index += 1) {
      const chunk = cookieStore.get(getSupabaseAuthCookieChunkName(key, index))?.value;

      if (!chunk) break;
      chunks.push(decodeCookieValue(chunk));
    }

    return chunks.length ? chunks.join("") : null;
  };

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => getCookieValue(key),
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    },
  });
}

export async function hasRequestSupabaseSession() {
  const cookieStore = await cookies();

  if (cookieStore.get(SUPABASE_AUTH_COOKIE_NAME)?.value) return true;

  return Boolean(cookieStore.get(getSupabaseAuthCookieChunkName(SUPABASE_AUTH_COOKIE_NAME, 0))?.value);
}
