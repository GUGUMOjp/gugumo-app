const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseHost = (() => {
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "gugumo";
  }
})();

const supabaseProjectRef = supabaseHost.endsWith(".supabase.co")
  ? supabaseHost.replace(".supabase.co", "")
  : supabaseHost;

export const SUPABASE_AUTH_COOKIE_NAME = `sb-${supabaseProjectRef}-auth-token`;
export const SUPABASE_AUTH_COOKIE_CHUNK_SIZE = 3000;
export const SUPABASE_AUTH_COOKIE_MAX_CHUNKS = 8;

export function getSupabaseAuthCookieChunkName(cookieName: string, index: number) {
  return `${cookieName}.${index}`;
}
