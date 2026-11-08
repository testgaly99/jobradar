export function istAdmin(email: string | undefined | null, adminEnv: string | undefined): boolean {
  if (!email || !adminEnv) return false;
  const mail = email.trim().toLowerCase();
  return adminEnv.split(",").some((a) => a.trim().toLowerCase() === mail && mail !== "");
}
