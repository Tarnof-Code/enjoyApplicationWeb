import type { TypeRepas } from "../types/api";
import {
    TYPES_REPAS,
    TYPES_REPAS_SET,
    AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT,
    type ResumeMenuCourtChampsVisibles,
} from "./menuRepas";

const STORAGE_PREFIX = "enjoy.detailsSejour.menuAffichage.";

export type ChampsComposeMenuVisibilite = ResumeMenuCourtChampsVisibles;

export type PreferencesAffichageMenusSejour = {
    typesRepasVisibles: TypeRepas[];
    champsComposeVisibles: ChampsComposeMenuVisibilite;
};

export function cleLocalStorageAffichageMenus(sejourId: number): string {
    return `${STORAGE_PREFIX}${sejourId}`;
}

function estTypeRepas(v: unknown): v is TypeRepas {
    return typeof v === "string" && TYPES_REPAS_SET.has(v as TypeRepas);
}

function normaliserTypesRepasVisibles(raw: unknown): TypeRepas[] {
    if (!Array.isArray(raw)) return [...TYPES_REPAS];
    const out: TypeRepas[] = [];
    const vu = new Set<TypeRepas>();
    for (const x of raw) {
        if (estTypeRepas(x) && !vu.has(x)) {
            vu.add(x);
            out.push(x);
        }
    }
    return out.length > 0 ? out : [...TYPES_REPAS];
}

function normaliserChampsComposeVisibles(raw: unknown): ChampsComposeMenuVisibilite {
    if (!raw || typeof raw !== "object") return { ...AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT };
    const o = raw as Record<string, unknown>;
    const merged: ChampsComposeMenuVisibilite = { ...AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT };
    (Object.keys(AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT) as (keyof ChampsComposeMenuVisibilite)[]).forEach((k) => {
        if (typeof o[k] === "boolean") merged[k] = o[k];
    });
    return merged;
}

export function lirePreferencesAffichageMenusSejour(sejourId: number): PreferencesAffichageMenusSejour {
    try {
        const raw = localStorage.getItem(cleLocalStorageAffichageMenus(sejourId));
        if (!raw) {
            return {
                typesRepasVisibles: [...TYPES_REPAS],
                champsComposeVisibles: { ...AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT },
            };
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object") {
            return {
                typesRepasVisibles: [...TYPES_REPAS],
                champsComposeVisibles: { ...AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT },
            };
        }
        const p = parsed as { typesRepasVisibles?: unknown; champsComposeVisibles?: unknown };
        return {
            typesRepasVisibles: normaliserTypesRepasVisibles(p.typesRepasVisibles),
            champsComposeVisibles: normaliserChampsComposeVisibles(p.champsComposeVisibles),
        };
    } catch {
        return {
            typesRepasVisibles: [...TYPES_REPAS],
            champsComposeVisibles: { ...AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT },
        };
    }
}

export function enregistrerPreferencesAffichageMenusSejour(
    sejourId: number,
    prefs: PreferencesAffichageMenusSejour,
): void {
    const typesRepasVisibles = normaliserTypesRepasVisibles(prefs.typesRepasVisibles);
    const champsComposeVisibles = normaliserChampsComposeVisibles(prefs.champsComposeVisibles);
    localStorage.setItem(
        cleLocalStorageAffichageMenus(sejourId),
        JSON.stringify({ typesRepasVisibles, champsComposeVisibles }),
    );
}
