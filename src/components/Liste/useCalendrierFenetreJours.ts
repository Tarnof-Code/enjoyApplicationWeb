import { useEffect, useMemo, useState } from "react";
import formaterDate from "../../helpers/formaterDate";
import {
    NB_JOURS_VUE_CALENDRIER_DEFAUT,
    type CalendrierNombreJoursVue,
    addDaysToYmd,
    bornesDebutFenetreCalendrier,
    clampYmdEntre,
    libelleJourCourtPourBouton,
    parseYmdVersDateLocale,
} from "./listeActivitesUtils";

export type JourFenetreCalendrier = { ymd: string; label: string; dansSejour: boolean };

/**
 * Fenêtre glissante 1 / 3 / 7 jours dans une liste de jours du séjour,
 * avec navigation jour par jour (aligné sur la vue calendrier des activités).
 */
export function useCalendrierFenetreJours(joursDuSejour: { ymd: string }[]) {
    const [nombreJoursVue, setNombreJoursVue] = useState<CalendrierNombreJoursVue>(
        NB_JOURS_VUE_CALENDRIER_DEFAUT
    );
    const [debutYmd, setDebutYmd] = useState("");

    useEffect(() => {
        const bornes = bornesDebutFenetreCalendrier(joursDuSejour, nombreJoursVue);
        if (!bornes) {
            setDebutYmd("");
            return;
        }
        setDebutYmd((prev) => {
            if (!prev) return bornes.minStartYmd;
            return clampYmdEntre(prev, bornes.minStartYmd, bornes.maxStartYmd);
        });
    }, [joursDuSejour, nombreJoursVue]);

    const bornesFenetre = useMemo(
        () => bornesDebutFenetreCalendrier(joursDuSejour, nombreJoursVue),
        [joursDuSejour, nombreJoursVue]
    );

    const debutEffectif = useMemo(() => {
        const b = bornesFenetre;
        if (!b) return "";
        if (!debutYmd) return b.minStartYmd;
        return clampYmdEntre(debutYmd, b.minStartYmd, b.maxStartYmd);
    }, [bornesFenetre, debutYmd]);

    const joursFenetre = useMemo((): JourFenetreCalendrier[] => {
        if (!debutEffectif) return [];
        const sejourSet = new Set(joursDuSejour.map((j) => j.ymd));
        const out: JourFenetreCalendrier[] = [];
        let ymd: string | null = debutEffectif;
        for (let i = 0; i < nombreJoursVue; i++) {
            if (!ymd) break;
            const d = parseYmdVersDateLocale(ymd);
            if (!d) break;
            out.push({
                ymd,
                label: libelleJourCourtPourBouton(d),
                dansSejour: sejourSet.has(ymd),
            });
            ymd = addDaysToYmd(ymd, 1);
        }
        return out;
    }, [debutEffectif, joursDuSejour, nombreJoursVue]);

    const peutReculer = bornesFenetre != null && debutEffectif > bornesFenetre.minStartYmd;
    const peutAvancer = bornesFenetre != null && debutEffectif < bornesFenetre.maxStartYmd;

    const libellePlage = useMemo(() => {
        if (joursFenetre.length === 0) return "";
        const debut = parseYmdVersDateLocale(joursFenetre[0].ymd);
        const fin = parseYmdVersDateLocale(joursFenetre[joursFenetre.length - 1].ymd);
        if (!debut || !fin) return "";
        return `${formaterDate(debut)} — ${formaterDate(fin)}`;
    }, [joursFenetre]);

    const decalage = (delta: number) => {
        if (!bornesFenetre) return;
        const b = bornesFenetre;
        setDebutYmd((prev) => {
            const base = prev ? clampYmdEntre(prev, b.minStartYmd, b.maxStartYmd) : b.minStartYmd;
            const next = addDaysToYmd(base, delta);
            if (!next) return base;
            return clampYmdEntre(next, b.minStartYmd, b.maxStartYmd);
        });
    };

    return {
        nombreJoursVue,
        setNombreJoursVue,
        joursFenetre,
        libellePlage,
        peutReculer,
        peutAvancer,
        decalage,
    };
}
