import { supabase } from "@/lib/supabase";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";

export type CurrentUser = {
  id: string;
  email: string | null;
};

type AuthError = {
  cause: unknown;
};

function toAuthError(cause: unknown): AuthError {
  return {
    cause,
  };
}

export async function getCurrentUser(): Promise<ServerResult<CurrentUser | null, AuthError>> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return err(toAuthError(error));
  }

  if (!data.user) {
    return ok(null);
  }

  return ok({
    id: data.user.id,
    email: data.user.email ?? null,
  });
}

export async function signOutCurrentUser(): Promise<ServerResult<void, AuthError>> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return err(toAuthError(error));
  }

  return ok(undefined);
}
