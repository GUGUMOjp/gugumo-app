"use server";

import {
  getCurrentWorkspaceContext,
} from "@/src/server/core";

export async function getCurrentWorkspaceContextAction(accessToken?: string) {
  return getCurrentWorkspaceContext(accessToken);
}
