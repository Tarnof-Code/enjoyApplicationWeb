import { dateVersChaineISO, normaliserDateRepasISO } from "./dateIsoLocal";
import type { MenuRepasDto, ReferenceAlimentaireDto, SaveMenuRepasRequest, TypeRepas } from "../types/api";
import { trierReferencesAlimentaires } from "../services/references-alimentaires.service";

export const TYPES_REPAS: TypeRepas[] = ["PETIT_DEJEUNER", "DEJEUNER", "GOUTER", "DINER"];

export const TYPES_REPAS_SET = new Set<TypeRepas>(TYPES_REPAS);

export const LABELS_TYPE_REPAS: Record<TypeRepas, string> = {
    PETIT_DEJEUNER: "Petit-déjeuner",
    DEJEUNER: "Déjeuner",
    GOUTER: "Goûter",
    DINER: "Dîner",
};

/** Fond des cartes menus en vue calendrier (bouton principal). */
export const COULEUR_FOND_CARTE_MENU: Record<TypeRepas, string> = {
    PETIT_DEJEUNER: "#fff0cc",
    DEJEUNER: "#d4f0e4",
    GOUTER: "#ffe4d4",
    DINER: "#dde4f7",
};

export function couleurFondCarteMenuPourTypeRepas(type: TypeRepas): string {
    return COULEUR_FOND_CARTE_MENU[type] ?? "#ffffff";
}

/** Jour `YYYY-MM-DD` pour indexer les cartes (chaîne ISO, timestamp, tableau type Jackson LocalDate `[année, mois, jour]`, etc.). */
export function jourISOdepuisDateRepasApi(v: unknown): string {
    if (v == null) return "";
    if (typeof v === "string") return normaliserDateRepasISO(v);
    if (typeof v === "number" && Number.isFinite(v)) return dateVersChaineISO(new Date(v));
    if (Array.isArray(v) && v.length >= 3) {
        const y = Number(v[0]);
        const mo = Number(v[1]);
        const d = Number(v[2]);
        if ([y, mo, d].every((n) => Number.isFinite(n))) {
            return dateVersChaineISO(new Date(y, mo - 1, d));
        }
    }
    return "";
}

/** Même clés que `TYPES_REPAS` (enum JSON `{ name }`, libellés, casse). */
export function typeRepasNormalisePourCarte(v: unknown): TypeRepas | null {
    let brut: unknown = v;
    if (brut && typeof brut === "object" && "name" in (brut as object)) {
        brut = (brut as { name?: unknown }).name;
    }
    if (typeof brut !== "string") return null;
    let s = brut
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
    if (s === "PETITDEJEUNER") s = "PETIT_DEJEUNER";
    if (TYPES_REPAS_SET.has(s as TypeRepas)) return s as TypeRepas;
    return null;
}

export function indexerMenusParJourEtType(menus: MenuRepasDto[]): Map<string, Map<TypeRepas, MenuRepasDto>> {
    const outer = new Map<string, Map<TypeRepas, MenuRepasDto>>();
    menus.forEach((m) => {
        const d = jourISOdepuisDateRepasApi(m.dateRepas as unknown);
        if (!d) return;
        const type = typeRepasNormalisePourCarte(m.typeRepas as unknown);
        if (!type) return;
        if (!outer.has(d)) outer.set(d, new Map());
        outer.get(d)!.set(type, { ...m, dateRepas: d, typeRepas: type });
    });
    return outer;
}

export function estPetitDejeunerOuGouter(t: TypeRepas): boolean {
    return t === "PETIT_DEJEUNER" || t === "GOUTER";
}

export function chaineOuNull(v: string): string | null {
    const t = v.trim();
    return t === "" ? null : t;
}

/** Agrégation dossiers enfants du séjour + références déjà sur le menu édité (références hors périmètre dossiers mais encore sur le plat). */
export function fusionnerRefsPourFormulaire(
    base: ReferenceAlimentaireDto[],
    supplementaires?: ReferenceAlimentaireDto[] | undefined,
): ReferenceAlimentaireDto[] {
    const map = new Map<number, ReferenceAlimentaireDto>();
    for (const r of base) {
        map.set(r.id, r);
    }
    for (const r of supplementaires ?? []) {
        if (!map.has(r.id)) {
            map.set(r.id, r);
        }
    }
    return trierReferencesAlimentaires([...map.values()]);
}

export type ChampsPourSaveMenuRepas = {
    dateRepas: string;
    typeRepas: TypeRepas;
    fDetail: string;
    fEntree: string;
    fPlat: string;
    fFromage: string;
    fDessert: string;
    fAllergeneIds: number[];
    fRegimePreferenceIds: number[];
};

export function construireSaveMenuRepasRequest(fields: ChampsPourSaveMenuRepas): SaveMenuRepasRequest | null {
    const {
        dateRepas,
        typeRepas,
        fDetail,
        fEntree,
        fPlat,
        fFromage,
        fDessert,
        fAllergeneIds,
        fRegimePreferenceIds,
    } = fields;
    if (!dateRepas || !typeRepas) return null;
    const idsAllerg = [...fAllergeneIds];
    const idsRegimes = [...fRegimePreferenceIds];

    if (estPetitDejeunerOuGouter(typeRepas)) {
        return {
            dateRepas,
            typeRepas,
            detailPetitDejeunerOuGouter: chaineOuNull(fDetail),
            entree: null,
            plat: null,
            fromageOuEntremet: null,
            dessert: null,
            allergeneIds: idsAllerg,
            regimePreferenceIds: idsRegimes,
        };
    }
    return {
        dateRepas,
        typeRepas,
        detailPetitDejeunerOuGouter: null,
        entree: chaineOuNull(fEntree),
        plat: chaineOuNull(fPlat),
        fromageOuEntremet: chaineOuNull(fFromage),
        dessert: chaineOuNull(fDessert),
        allergeneIds: idsAllerg,
        regimePreferenceIds: idsRegimes,
    };
}

const SUFFIX_LIBELLE_INACTIF = " (inactif)";

/** Libellés « Sans porc », « Sans viande » → « Porc », « Viande » pour la lecture menus (ce que le plat évoque). */
export function libelleCompositionPlatPourAffichage(libelle: string): string {
    const t = libelle.trim();
    const m = /^Sans\s+/i.exec(t);
    if (m) {
        const rest = t.slice(m[0].length).trim();
        if (!rest) return t;
        return rest.charAt(0).toUpperCase() + rest.slice(1);
    }
    return t;
}

export function libelleCompositionCheckboxPourAffichage(texteOption: string): string {
    if (texteOption.endsWith(SUFFIX_LIBELLE_INACTIF)) {
        const base = texteOption.slice(0, -SUFFIX_LIBELLE_INACTIF.length);
        return `${libelleCompositionPlatPourAffichage(base)}${SUFFIX_LIBELLE_INACTIF}`;
    }
    return libelleCompositionPlatPourAffichage(texteOption);
}

export function ligneLibellesRefs(refs: ReferenceAlimentaireDto[] | undefined): string {
    const list = refs ?? [];
    if (!list.length) return "";
    return trierReferencesAlimentaires(list)
        .map((r) => r.libelle)
        .join(", ");
}

export function ligneLibellesCompositionMenu(refs: ReferenceAlimentaireDto[] | undefined): string {
    const list = refs ?? [];
    if (!list.length) return "";
    return trierReferencesAlimentaires(list)
        .map((r) => libelleCompositionPlatPourAffichage(r.libelle))
        .join(", ");
}

/** Champs de composition pour déjeuner / dîner (petit-déj. et goûter : détail toujours affiché). */
export type ResumeMenuCourtChampsVisibles = {
    entree: boolean;
    plat: boolean;
    fromageOuEntremet: boolean;
    dessert: boolean;
};

const RESUME_MENU_TOUS_CHAMPS_VISIBLES: ResumeMenuCourtChampsVisibles = {
    entree: true,
    plat: true,
    fromageOuEntremet: true,
    dessert: true,
};

/** Valeurs par défaut : afficher tous les champs de composition (paramétrage Repas). */
export const AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT: ResumeMenuCourtChampsVisibles = RESUME_MENU_TOUS_CHAMPS_VISIBLES;

export type LigneCompositionMenuAffichage = {
    key: string;
    label: string;
    valeur: string;
};

/** Lignes de composition du menu (liste, calendrier), selon le paramétrage d’affichage. */
export function lignesCompositionMenuPourAffichage(
    menu: MenuRepasDto,
    champsVisibles?: ResumeMenuCourtChampsVisibles | null,
): LigneCompositionMenuAffichage[] {
    const montre = (cle: keyof ResumeMenuCourtChampsVisibles) =>
        champsVisibles == null || champsVisibles[cle];

    if (estPetitDejeunerOuGouter(menu.typeRepas)) {
        const d = menu.detailPetitDejeunerOuGouter?.trim();
        return [
            {
                key: "detail",
                label: "Détail du repas",
                valeur: d || "—",
            },
        ];
    }

    const lignesPossibles = [
        { cle: "entree" as const, label: "Entrée :", val: menu.entree },
        { cle: "plat" as const, label: "Plat :", val: menu.plat },
        { cle: "fromageOuEntremet" as const, label: "Fromage ou entremet :", val: menu.fromageOuEntremet },
        { cle: "dessert" as const, label: "Dessert :", val: menu.dessert },
    ] as const;

    const out: LigneCompositionMenuAffichage[] = [];
    for (const { cle, label, val } of lignesPossibles) {
        if (!montre(cle)) continue;
        out.push({
            key: cle,
            label,
            valeur: val?.trim() || "—",
        });
    }
    return out;
}

/** Ligne secondaire sous le résumé du menu dans la grille calendrier (libellés uniquement, ex. « Oeufs - Porc »). */
export function ligneMetaAllergenesRegimesCalendrier(menu: MenuRepasDto, max = 72): string {
    const libsAllerg = trierReferencesAlimentaires(menu.allergenes ?? [])
        .map((x) => x.libelle.trim())
        .filter(Boolean);
    const libsRegimes = trierReferencesAlimentaires(menu.regimesEtPreferences ?? [])
        .map((x) => libelleCompositionPlatPourAffichage(x.libelle.trim()))
        .filter(Boolean);
    const tous = [...libsAllerg, ...libsRegimes];
    if (!tous.length) return "";
    const separateur = " - ";
    const s = tous.join(separateur);
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}