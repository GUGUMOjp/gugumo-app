"use server";

import {
  getCurrentWorkspaceContext,
} from "@/src/server/core";

export async function getCurrentWorkspaceContextAction() {
  return getCurrentWorkspaceContext();
}
