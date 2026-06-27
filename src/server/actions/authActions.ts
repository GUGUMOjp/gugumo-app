"use server";

import {
  getCurrentUser,
  signOutCurrentUser,
} from "@/src/server/core";

export async function getCurrentUserAction() {
  return getCurrentUser();
}

export async function signOutAction() {
  return signOutCurrentUser();
}
