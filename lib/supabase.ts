import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseAuthCookieChunkName,
  SUPABASE_AUTH_COOKIE_CHUNK_SIZE,
  SUPABASE_AUTH_COOKIE_MAX_CHUNKS,
} from "./supabaseAuthCookie";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getDocumentCookieValue(name: string) {
  if (typeof document === "undefined") return null;

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  return cookie ? decodeCookieValue(cookie.slice(prefix.length)) : null;
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;

  const directCookieValue = getDocumentCookieValue(name);
  if (directCookieValue) return directCookieValue;

  const chunks: string[] = [];
  for (let index = 0; index < SUPABASE_AUTH_COOKIE_MAX_CHUNKS; index += 1) {
    const chunk = getDocumentCookieValue(getSupabaseAuthCookieChunkName(name, index));

    if (!chunk) break;
    chunks.push(chunk);
  }

  if (chunks.length) return chunks.join("");

  try {
    const storedSession = window.localStorage.getItem(name);

    if (storedSession) {
      setCookieValue(name, storedSession);
      window.localStorage.removeItem(name);
      return storedSession;
    }
  } catch {
    // Ignore storage migration failures and treat the user as unauthenticated.
  }

  return null;
}

function setCookieValue(name: string, value: string) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const cookieOptions = `Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  const chunks = value.match(new RegExp(`.{1,${SUPABASE_AUTH_COOKIE_CHUNK_SIZE}}`, "g")) ?? [value];

  removeCookieValue(name);

  if (chunks.length > SUPABASE_AUTH_COOKIE_MAX_CHUNKS) {
    console.warn("Supabase session is too large to persist safely.");
    return;
  }

  if (chunks.length === 1) {
    document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieOptions}`;
  } else {
    chunks.forEach((chunk, index) => {
      document.cookie = `${getSupabaseAuthCookieChunkName(name, index)}=${encodeURIComponent(chunk)}; ${cookieOptions}`;
    });
  }
}

function removeCookieValue(name: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;

  for (let index = 0; index < SUPABASE_AUTH_COOKIE_MAX_CHUNKS; index += 1) {
    document.cookie = `${getSupabaseAuthCookieChunkName(name, index)}=; Path=/; Max-Age=0; SameSite=Lax`;
  }

  try {
    window.localStorage.removeItem(name);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: {
        getItem: (key) => getCookieValue(key),
        setItem: (key, value) => setCookieValue(key, value),
        removeItem: (key) => removeCookieValue(key),
      },
    },
  },
);
