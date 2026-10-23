import { describe, it, expect } from "vitest";
import {
  ROLE_KEYS,
  rolePrecedence,
  roleLabel,
  getPrimaryRole,
  type RoleKey,
} from "../roles";

// ─── ROLE_KEYS ────────────────────────────────────────────────────────────────

describe("ROLE_KEYS", () => {
  it("contient 15 rôles", () => {
    expect(ROLE_KEYS).toHaveLength(15);
  });

  it("chaque rôle a une entrée dans rolePrecedence", () => {
    for (const r of ROLE_KEYS) {
      expect(rolePrecedence[r]).toBeDefined();
    }
  });
});

// ─── rolePrecedence ───────────────────────────────────────────────────────────

describe("rolePrecedence", () => {
  it("administrator est le plus haut (rang 1)", () => {
    expect(rolePrecedence["administrator"]).toBe(1);
  });

  it("administrator bat president", () => {
    expect(rolePrecedence["administrator"]).toBeLessThan(rolePrecedence["president"]);
  });

  it("president bat vice_president", () => {
    expect(rolePrecedence["president"]).toBeLessThan(rolePrecedence["vice_president"]);
  });

  it("vice_president bat secretary_general", () => {
    expect(rolePrecedence["vice_president"]).toBeLessThan(rolePrecedence["secretary_general"]);
  });

  it("secretary_general bat communication_manager", () => {
    expect(rolePrecedence["secretary_general"]).toBeLessThan(rolePrecedence["communication_manager"]);
  });

  it("communication_manager bat bdl_member", () => {
    expect(rolePrecedence["communication_manager"]).toBeLessThan(rolePrecedence["bdl_member"]);
  });

  it("bdl_member bat vie_scolaire", () => {
    expect(rolePrecedence["bdl_member"]).toBeLessThan(rolePrecedence["vie_scolaire"]);
  });

  it("vie_scolaire bat student", () => {
    expect(rolePrecedence["vie_scolaire"]).toBeLessThan(rolePrecedence["student"]);
  });

  it("student et ancien_eleve ont le même rang", () => {
    expect(rolePrecedence["student"]).toBe(rolePrecedence["ancien_eleve"]);
  });

  it("consultant est entre administrator et president", () => {
    expect(rolePrecedence["consultant"]).toBeGreaterThan(rolePrecedence["administrator"]);
    expect(rolePrecedence["consultant"]).toBeLessThan(rolePrecedence["president"]);
  });

  it("consultante et consultant ont des rangs proches (consultante < consultant)", () => {
    expect(rolePrecedence["consultante"]).toBeLessThan(rolePrecedence["consultant"]);
  });

  it("rôles genrés ont le même rang (president/a, vice_president/a, secretary_general/2, communication_manager/2)", () => {
    expect(rolePrecedence["president"]).toBe(rolePrecedence["presidente"]);
    expect(rolePrecedence["vice_president"]).toBe(rolePrecedence["vice_presidente"]);
    expect(rolePrecedence["secretary_general"]).toBe(rolePrecedence["secretary_general2"]);
    expect(rolePrecedence["communication_manager"]).toBe(rolePrecedence["communication_manager2"]);
  });
});

// ─── roleLabel ────────────────────────────────────────────────────────────────

describe("roleLabel", () => {
  it("retourne le bon label pour chaque rôle connu", () => {
    expect(roleLabel("administrator")).toBe("Administrateur");
    expect(roleLabel("president")).toBe("Président");
    expect(roleLabel("presidente")).toBe("Présidente");
    expect(roleLabel("vice_president")).toBe("Vice-Président");
    expect(roleLabel("vice_presidente")).toBe("Vice-Présidente");
    expect(roleLabel("secretary_general")).toBe("Secrétaire Général");
    expect(roleLabel("secretary_general2")).toBe("Secrétaire Générale");
    expect(roleLabel("communication_manager")).toBe("Directeur ComCom");
    expect(roleLabel("communication_manager2")).toBe("Directrice ComCom");
    expect(roleLabel("bdl_member")).toBe("Membre BDL");
    expect(roleLabel("vie_scolaire")).toBe("Vie Scolaire");
    expect(roleLabel("consultant")).toBe("Consultant");
    expect(roleLabel("consultante")).toBe("Consultante");
    expect(roleLabel("ancien_eleve")).toBe("Ancien Élève");
  });

  it("retourne Étudiant pour student et tout rôle inconnu", () => {
    expect(roleLabel("student")).toBe("Étudiant");
    expect(roleLabel("role_inexistant")).toBe("Étudiant");
    expect(roleLabel("")).toBe("Étudiant");
  });
});

// ─── getPrimaryRole ───────────────────────────────────────────────────────────

describe("getPrimaryRole", () => {
  it("retourne student pour un tableau vide", () => {
    expect(getPrimaryRole([])).toBe("student");
  });

  it("retourne le seul rôle passé", () => {
    expect(getPrimaryRole(["president"])).toBe("president");
    expect(getPrimaryRole(["bdl_member"])).toBe("bdl_member");
    expect(getPrimaryRole(["student"])).toBe("student");
  });

  it("retourne administrator sur plusieurs rôles incluant administrator", () => {
    expect(getPrimaryRole(["bdl_member", "administrator", "student"])).toBe("administrator");
    expect(getPrimaryRole(["administrator", "president"])).toBe("administrator");
  });

  it("retourne president quand il est le plus haut rang présent", () => {
    expect(getPrimaryRole(["student", "president", "bdl_member"])).toBe("president");
  });

  it("retourne president et non presidente si les deux sont présents (même rang, premier dans la liste l'emporte)", () => {
    const result = getPrimaryRole(["president", "presidente"]);
    expect(["president", "presidente"]).toContain(result);
    expect(rolePrecedence[result]).toBe(2);
  });

  it("un rôle inconnu est traité comme student", () => {
    expect(getPrimaryRole(["role_bidon"])).toBe("student");
  });

  it("rôle inconnu + président → president gagne", () => {
    expect(getPrimaryRole(["role_bidon", "president"])).toBe("president");
  });

  it("ancien_eleve a le même rang que student — retourne celui passé en premier", () => {
    const result = getPrimaryRole(["student", "ancien_eleve"]);
    expect(rolePrecedence[result]).toBe(8);
  });

  it("bdl_member bat vie_scolaire", () => {
    expect(getPrimaryRole(["vie_scolaire", "bdl_member"])).toBe("bdl_member");
  });

  it("consultant bat bdl_member", () => {
    expect(getPrimaryRole(["bdl_member", "consultant"])).toBe("consultant");
  });

  it("consultante bat consultant", () => {
    expect(getPrimaryRole(["consultant", "consultante"])).toBe("consultante");
  });

  it("cas réel — membre avec plusieurs rôles dont le plus haut est secretary_general", () => {
    expect(getPrimaryRole(["student", "bdl_member", "secretary_general"])).toBe("secretary_general");
  });
});

// ─── Cohérence globale ────────────────────────────────────────────────────────

describe("Cohérence ROLE_KEYS / rolePrecedence / roleLabel", () => {
  it("tous les rôles ROLE_KEYS ont un label non-vide", () => {
    for (const r of ROLE_KEYS) {
      expect(roleLabel(r).length).toBeGreaterThan(0);
    }
  });

  it("getPrimaryRole([r]) === r pour chaque rôle connu", () => {
    for (const r of ROLE_KEYS) {
      expect(getPrimaryRole([r])).toBe(r);
    }
  });
});
