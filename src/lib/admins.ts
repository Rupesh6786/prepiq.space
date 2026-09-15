/**
 * Admin access is decided by Firebase UID.
 * Add UIDs here, or set VITE_ADMIN_UIDS="uid1,uid2" in your project env.
 * Mirror the same UIDs in your Firestore security rules.
 */
const ENV_UIDS = (import.meta.env["VITE_ADMIN_UIDS"] as string | undefined) ?? "";

export const ADMIN_UIDS: string[] = [
  // Primary admin account (must match firebase.rules)
  "vvggelVeCKZdkqT1orVBnucy2Xu2",
  ...ENV_UIDS.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

export function isAdminUid(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return ADMIN_UIDS.includes(uid);
}
