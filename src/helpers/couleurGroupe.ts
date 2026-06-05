/** Angle d'or en degrés : répartit les teintes de façon homogène sur la roue chromatique. */
const ANGLE_DORE = 137.508;

export interface PastilleGroupeCouleurs {
    texte: string;
    fond: string;
    bordure: string;
}

/**
 * Couleurs pastille stables pour un groupe (même id → même rendu partout dans l'app).
 */
export function pastilleCouleursPourGroupe(groupeId: number): PastilleGroupeCouleurs {
    const hue = (groupeId * ANGLE_DORE) % 360;
    return {
        texte: `hsl(${hue.toFixed(1)}, 52%, 26%)`,
        fond: `hsl(${hue.toFixed(1)}, 58%, 93%)`,
        bordure: `hsl(${hue.toFixed(1)}, 42%, 78%)`,
    };
}
