import type { ChambreDto, ChambreOccupantDto, EnfantDto, GenreChambre, GroupeDto, SaveChambreRequest, TypeChambre } from "../types/api";
import { libelleChambre } from "./libelleChambre";
import { trierParPrenomPuisNom } from "./trierUtilisateurs";

/** Compatibilité genre personne (enfant ou membre d'équipe) ↔ chambre (aligné API). */
export function genrePersonneCompatibleAvecChambre(
  genrePersonne: string | null | undefined,
  genreChambre: GenreChambre
): boolean {
  if (!genrePersonne?.trim()) return false;
  const g = genrePersonne.trim().toLowerCase();
  switch (genreChambre) {
    case "MIXTE":
      return true;
    case "MASCULIN":
      return g === "masculin";
    case "FEMININ":
      return g === "féminin" || g === "feminin";
    default:
      return false;
  }
}

/** @deprecated Alias — utiliser genrePersonneCompatibleAvecChambre */
export function enfantCompatibleAvecGenreChambre(
  genreEnfant: string | null | undefined,
  genreChambre: GenreChambre
): boolean {
  return genrePersonneCompatibleAvecChambre(genreEnfant, genreChambre);
}

export type MembreEquipePourChambre = {
  tokenId: string;
  nom: string;
  prenom: string;
  genre: string;
};

export function libelleNumeroLit(numeroLit: number | null | undefined): string {
  if (numeroLit == null) return "";
  return ` — lit ${numeroLit}`;
}

export function libelleOccupant(occupant: ChambreOccupantDto): string {
  return `${occupant.prenom} ${occupant.nom}${libelleNumeroLit(occupant.numeroLit)}`;
}

export type AffectationOccupantIndex = {
  enfantIdVersChambre: Map<number, ChambreDto>;
  membreTokenIdVersChambre: Map<string, ChambreDto>;
};

export function indexerAffectationsOccupants(chambres: ChambreDto[]): AffectationOccupantIndex {
  const enfantIdVersChambre = new Map<number, ChambreDto>();
  const membreTokenIdVersChambre = new Map<string, ChambreDto>();

  for (const chambre of chambres) {
    for (const o of chambre.occupants ?? []) {
      if (o.enfantId != null) {
        enfantIdVersChambre.set(o.enfantId, chambre);
      }
      if (o.membreTokenId?.trim()) {
        membreTokenIdVersChambre.set(o.membreTokenId.trim(), chambre);
      }
    }
  }

  return { enfantIdVersChambre, membreTokenIdVersChambre };
}

export function libelleChambreAffectation(chambre: ChambreDto): string {
  return libelleChambre(chambre);
}

function libelleCibleEnfantsChambre(genreAutorise: GenreChambre): string {
  switch (genreAutorise) {
    case "MASCULIN":
      return "les garçons";
    case "FEMININ":
      return "les filles";
    default:
      return "les enfants";
  }
}

function libelleCibleEquipeChambre(genreAutorise: GenreChambre): string {
  switch (genreAutorise) {
    case "MASCULIN":
      return "les hommes";
    case "FEMININ":
      return "les femmes";
    default:
      return "les membres d'équipe";
  }
}

function libelleCibleOccupantsChambre(typeChambre: TypeChambre, genreAutorise: GenreChambre): string {
  return typeChambre === "EQUIPE"
    ? libelleCibleEquipeChambre(genreAutorise)
    : libelleCibleEnfantsChambre(genreAutorise);
}

/** Parties du libellé recherche picker (genre + groupe en gras côté UI). */
export type PartiesLibelleRechercheOccupants =
  | { kind: "equipe"; cible: string }
  | { kind: "enfants"; cible: string; groupe?: string };

export function partiesLibelleRechercheOccupantsChambre(chambre: ChambreDto): PartiesLibelleRechercheOccupants {
  const cible = libelleCibleOccupantsChambre(chambre.typeChambre, chambre.genreAutorise);
  if (chambre.typeChambre === "EQUIPE") {
    return { kind: "equipe", cible };
  }
  const libelleGroupe = chambre.groupe?.libelle?.trim();
  if (libelleGroupe) {
    return { kind: "enfants", cible, groupe: libelleGroupe };
  }
  return { kind: "enfants", cible };
}

/** Libellé plain-text (accessibilité, tests). */
export function libelleRechercheOccupantsChambre(chambre: ChambreDto): string {
  const parties = partiesLibelleRechercheOccupantsChambre(chambre);
  if (parties.kind === "equipe") {
    return `Rechercher ${parties.cible}`;
  }
  if (parties.groupe) {
    return `Rechercher ${parties.cible} du groupe ${parties.groupe}`;
  }
  return `Rechercher ${parties.cible}`;
}

export function idsEnfantsDuGroupeChambre(
  chambre: ChambreDto,
  groupes: GroupeDto[]
): Set<number> | null {
  const groupeId = chambre.groupe?.id;
  if (groupeId == null) return null;
  const groupe = groupes.find((g) => g.id === groupeId);
  if (!groupe) return new Set<number>();
  return new Set(groupe.enfants.map((e) => e.id));
}

export function enfantsEligiblesPourChambre(
  chambre: ChambreDto,
  enfants: EnfantDto[],
  idsDejaDansChambre: Set<number>,
  groupes: GroupeDto[] = []
): EnfantDto[] {
  const idsGroupe = idsEnfantsDuGroupeChambre(chambre, groupes);
  return enfants.filter(
    (e) =>
      !idsDejaDansChambre.has(e.id) &&
      enfantCompatibleAvecGenreChambre(e.genre, chambre.genreAutorise) &&
      (idsGroupe == null || idsGroupe.has(e.id))
  );
}

export function membresEligiblesPourChambre(
  chambre: ChambreDto,
  equipe: MembreEquipePourChambre[],
  idsDejaDansChambre: Set<string>
): MembreEquipePourChambre[] {
  return trierParPrenomPuisNom(
    equipe.filter(
      (m) =>
        !idsDejaDansChambre.has(m.tokenId.trim()) &&
        genrePersonneCompatibleAvecChambre(m.genre, chambre.genreAutorise)
    ),
  );
}

function nomsOccupants(occupants: ChambreOccupantDto[]): string {
  return occupants.map((o) => `${o.prenom} ${o.nom}`).join(", ");
}

function occupantsMembresIncompatiblesGenre(
  chambre: ChambreDto,
  nouveauGenre: GenreChambre,
  equipe: MembreEquipePourChambre[]
): ChambreOccupantDto[] {
  const membreParToken = new Map(equipe.map((m) => [m.tokenId.trim(), m]));
  return (chambre.occupants ?? []).filter((o) => {
    const tid = o.membreTokenId?.trim();
    if (!tid) return false;
    const membre = membreParToken.get(tid);
    if (!membre) return false;
    return !genrePersonneCompatibleAvecChambre(membre.genre, nouveauGenre);
  });
}

function occupantsIncompatiblesGenre(
  chambre: ChambreDto,
  nouveauGenre: GenreChambre,
  enfants: EnfantDto[],
  equipe: MembreEquipePourChambre[]
): ChambreOccupantDto[] {
  const incompatiblesEnfants = occupantsEnfantsIncompatiblesGenre(chambre, nouveauGenre, enfants);
  const incompatiblesMembres = occupantsMembresIncompatiblesGenre(chambre, nouveauGenre, equipe);
  return [...incompatiblesEnfants, ...incompatiblesMembres];
}

function occupantsEnfantsIncompatiblesGenre(
  chambre: ChambreDto,
  nouveauGenre: GenreChambre,
  enfants: EnfantDto[]
): ChambreOccupantDto[] {
  const enfantParId = new Map(enfants.map((e) => [e.id, e]));
  return (chambre.occupants ?? []).filter((o) => {
    if (o.enfantId == null) return false;
    const enfant = enfantParId.get(o.enfantId);
    if (!enfant) return false;
    return !enfantCompatibleAvecGenreChambre(enfant.genre, nouveauGenre);
  });
}

function occupantsEnfantsHorsGroupe(
  chambre: ChambreDto,
  nouveauGroupeId: number | null,
  groupes: GroupeDto[]
): ChambreOccupantDto[] {
  if (nouveauGroupeId == null) return [];
  const groupe = groupes.find((g) => g.id === nouveauGroupeId);
  const idsGroupe = new Set(groupe?.enfants.map((e) => e.id) ?? []);
  return (chambre.occupants ?? []).filter(
    (o) => o.enfantId != null && !idsGroupe.has(o.enfantId)
  );
}

/**
 * Erreurs de cohérence PUT par champ (capacité, genre, groupe).
 */
export type ErreursModificationChambre = {
  capaciteMax?: string;
  genreAutorise?: string;
  groupeId?: string;
};

export function analyserModificationChambreIncompatible(
  chambre: ChambreDto,
  payload: Pick<SaveChambreRequest, "typeChambre" | "capaciteMax" | "genreAutorise" | "groupeId">,
  groupes: GroupeDto[],
  enfants: EnfantDto[],
  equipe: MembreEquipePourChambre[] = []
): ErreursModificationChambre {
  const erreurs: ErreursModificationChambre = {};
  const occupants = chambre.occupants ?? [];
  const nbOccupants = occupants.length;
  if (nbOccupants === 0) return erreurs;

  if (payload.capaciteMax < nbOccupants) {
    erreurs.capaciteMax = `${nbOccupants} occupant(s) présents. Retirez des occupants ou augmentez la capacité.`;
  }

  if (payload.genreAutorise !== chambre.genreAutorise) {
    const incompatibles = occupantsIncompatiblesGenre(chambre, payload.genreAutorise, enfants, equipe);
    if (incompatibles.length > 0) {
      erreurs.genreAutorise = `${nomsOccupants(incompatibles)} ${incompatibles.length > 1 ? "ne sont" : "n'est"} pas compatible${incompatibles.length > 1 ? "s" : ""} avec ce genre. Retirez ces occupants d'abord.`;
    }
  }

  if (payload.typeChambre === "ENFANT") {
    const ancienGroupeId = chambre.groupe?.id ?? null;
    const nouveauGroupeId = payload.groupeId ?? null;
    if (nouveauGroupeId !== ancienGroupeId) {
      const horsGroupe = occupantsEnfantsHorsGroupe(chambre, nouveauGroupeId, groupes);
      if (horsGroupe.length > 0) {
        const libelleGroupe =
          nouveauGroupeId != null
            ? groupes.find((g) => g.id === nouveauGroupeId)?.nom ?? "ce groupe"
            : "ce groupe";
        erreurs.groupeId = `${nomsOccupants(horsGroupe)} ${horsGroupe.length > 1 ? "n'appartiennent" : "n'appartient"} pas au groupe « ${libelleGroupe} ». Retirez ces occupants d'abord.`;
      }
    }
  }

  return erreurs;
}

export function modificationChambreBloquee(erreurs: ErreursModificationChambre): boolean {
  return !!(erreurs.capaciteMax || erreurs.genreAutorise || erreurs.groupeId);
}

/**
 * Fusionne la chambre retournée par l'API (POST affectation, PUT…) dans la liste locale.
 * Retire les mêmes occupants des autres chambres (réaffectation = déplacement côté API).
 */
export function fusionnerChambreRetourneeDansListe(
  chambres: ChambreDto[],
  chambreMiseAJour: ChambreDto
): ChambreDto[] {
  const enfantIds = new Set(
    chambreMiseAJour.occupants.filter((o) => o.enfantId != null).map((o) => o.enfantId as number)
  );
  const membreIds = new Set(
    chambreMiseAJour.occupants
      .filter((o) => o.membreTokenId?.trim())
      .map((o) => o.membreTokenId!.trim())
  );

  const existe = chambres.some((c) => c.id === chambreMiseAJour.id);

  return chambres.map((c) => {
    if (c.id === chambreMiseAJour.id) return chambreMiseAJour;
    if (enfantIds.size === 0 && membreIds.size === 0) return c;
    const occupants = (c.occupants ?? []).filter((o) => {
      if (o.enfantId != null && enfantIds.has(o.enfantId)) return false;
      const tid = o.membreTokenId?.trim();
      if (tid && membreIds.has(tid)) return false;
      return true;
    });
    if (occupants.length === (c.occupants?.length ?? 0)) return c;
    return { ...c, occupants };
  }).concat(existe ? [] : [chambreMiseAJour]);
}
