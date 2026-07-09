import { init } from "@instantdb/admin";
import schema from "@/instant.schema";

let instantAdminDb: ReturnType<typeof init<typeof schema, true>> | null = null;

export function getInstantAdminDb() {
  const appId =
    process.env.INSTANT_APP_ID ?? process.env.NEXT_PUBLIC_INSTANT_APP_ID;
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;

  if (!appId) {
    throw new Error("InstantDB app id is not configured.");
  }

  if (!adminToken) {
    throw new Error("InstantDB admin token is not configured.");
  }

  instantAdminDb ??= init({
    appId,
    adminToken,
    schema,
    useDateObjects: true,
  });

  return instantAdminDb;
}
