// Canonical role system — single source of truth for all files
// bdl_member (6) ranks above vie_scolaire (7)

export const ROLE_KEYS = [
  "administrator",
  "president",
  "presidente",
  "vice_president",
  "vice_presidente",
  "secretary_general",
  "secretary_general2",
  "communication_manager",
  "communication_manager2",
  "bdl_member",
  "vie_scolaire",
  "student",
] as const;

export type RoleKey = typeof ROLE_KEYS[number];

// Lower number = higher precedence
export const rolePrecedence: Record<RoleKey, number> = {
  administrator: 1,
  president: 2,
  presidente: 2,
  vice_president: 3,
  vice_presidente: 3,
  secretary_general: 4,
  secretary_general2: 4,
  communication_manager: 5,
  communication_manager2: 5,
  bdl_member: 6,
  vie_scolaire: 7,
  student: 8,
};

export const roleLabel = (r: string): string =>
  r === "administrator"          ? "Administrateur"        :
  r === "president"              ? "Président"             :
  r === "presidente"             ? "Présidente"            :
  r === "vice_president"         ? "Vice-président"        :
  r === "vice_presidente"        ? "Vice-présidente"       :
  r === "secretary_general"      ? "Secrétaire Général"    :
  r === "secretary_general2"     ? "Secrétaire Générale"   :
  r === "communication_manager"  ? "Dir. ComCom"           :
  r === "communication_manager2" ? "Dir. ComCom"           :
  r === "vie_scolaire"           ? "Vie Scolaire"          :
  r === "bdl_member"             ? "Membre BDL"            : "Étudiant";

export const getPrimaryRole = (roles: string[]): RoleKey => {
  if (!roles.length) return "student";
  return roles.reduce((best, r) => {
    const rk = ROLE_KEYS.includes(r as RoleKey) ? (r as RoleKey) : "student";
    const bk = ROLE_KEYS.includes(best as RoleKey) ? (best as RoleKey) : "student";
    return rolePrecedence[rk] < rolePrecedence[bk] ? rk : bk;
  }, roles[0]) as RoleKey;
};
