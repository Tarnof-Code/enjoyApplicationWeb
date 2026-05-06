import { useCallback, useEffect, useState } from "react";
import { FormGroup, Label, Input } from "reactstrap";
import {
    TYPES_REPAS,
    LABELS_TYPE_REPAS,
    AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT,
} from "../../../helpers/menuRepas";
import type { TypeRepas } from "../../../types/api";
import {
    lirePreferencesAffichageMenusSejour,
    enregistrerPreferencesAffichageMenusSejour,
    type PreferencesAffichageMenusSejour,
    type ChampsComposeMenuVisibilite,
} from "../../../helpers/menuRepasAffichageSejour";
import styles from "./DetailsSejour.module.scss";

type Props = {
    sejourId: number;
    /** Faux hors directeur / adjoint : préférences en lecture seule. */
    modifiable?: boolean;
};

const CHAMPS_COMPOSE_OPTIONS: { cle: keyof ChampsComposeMenuVisibilite; legende: string }[] = [
    { cle: "entree", legende: "Entrée" },
    { cle: "plat", legende: "Plat" },
    { cle: "fromageOuEntremet", legende: "Fromage ou entremet" },
    { cle: "dessert", legende: "Dessert" },
];

/** Préférences locales d’affichage de la page Menus (repas visibles + lignes de composition). */
const ParametrageAffichageMenus: React.FC<Props> = ({ sejourId, modifiable = true }) => {
    const [prefs, setPrefs] = useState<PreferencesAffichageMenusSejour>(() =>
        lirePreferencesAffichageMenusSejour(sejourId),
    );

    useEffect(() => {
        setPrefs(lirePreferencesAffichageMenusSejour(sejourId));
    }, [sejourId]);

    const persist = useCallback(
        (next: PreferencesAffichageMenusSejour) => {
            if (!modifiable) return;
            setPrefs(next);
            enregistrerPreferencesAffichageMenusSejour(sejourId, next);
            window.dispatchEvent(
                new CustomEvent("enjoy-menu-affichage-changed", { detail: { sejourId } }),
            );
        },
        [sejourId, modifiable],
    );

    const toggleTypeRepas = (t: TypeRepas, checked: boolean) => {
        const set = new Set(prefs.typesRepasVisibles);
        if (checked) set.add(t);
        else set.delete(t);
        const arr = TYPES_REPAS.filter((x) => set.has(x));
        if (arr.length === 0) return;
        persist({ ...prefs, typesRepasVisibles: arr });
    };

    const toggleChamp = (cle: keyof ChampsComposeMenuVisibilite, checked: boolean) => {
        persist({
            ...prefs,
            champsComposeVisibles: { ...prefs.champsComposeVisibles, [cle]: checked },
        });
    };

    const toutTypesCoches = prefs.typesRepasVisibles.length === TYPES_REPAS.length;
    const reinitialiserTypes = () =>
        persist({
            ...prefs,
            typesRepasVisibles: [...TYPES_REPAS],
        });

    const toutChampsIdentiqueDefaut =
        (Object.keys(AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT) as (keyof ChampsComposeMenuVisibilite)[]).every(
            (k) => prefs.champsComposeVisibles[k] === AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT[k],
        );
    const reinitialiserChamps = () =>
        persist({
            ...prefs,
            champsComposeVisibles: { ...AFFICHAGE_CHAMPS_COMPOSE_MENU_DEFAUT },
        });

    return (
        <div className={styles.paramRepasBloc}>
            <fieldset className={styles.paramRepasFieldset} disabled={!modifiable}>
                <legend className={styles.paramRepasLegend}>Repas affichés dans les menus</legend>
                <FormGroup>
                    {TYPES_REPAS.map((t) => (
                        <label key={t} className={styles.paramRepasCheckboxRow}>
                            <Input
                                type="checkbox"
                                checked={prefs.typesRepasVisibles.includes(t)}
                                onChange={(e) => toggleTypeRepas(t, e.target.checked)}
                            />
                            <span>{LABELS_TYPE_REPAS[t]}</span>
                        </label>
                    ))}
                </FormGroup>
                {!toutTypesCoches ? (
                    <button type="button" className={styles.paramRepasResetLink} onClick={reinitialiserTypes}>
                        Tout afficher
                    </button>
                ) : null}
            </fieldset>

            <fieldset className={styles.paramRepasFieldset} disabled={!modifiable}>
                <legend className={styles.paramRepasLegend}>Contenu affiché pour chaque menu</legend>
                {CHAMPS_COMPOSE_OPTIONS.map(({ cle, legende }) => (
                    <FormGroup key={cle}>
                        <Label className={styles.paramRepasCheckboxRow}>
                            <Input
                                type="checkbox"
                                checked={prefs.champsComposeVisibles[cle]}
                                onChange={(e) => toggleChamp(cle, e.target.checked)}
                            />
                            <span>{legende}</span>
                        </Label>
                    </FormGroup>
                ))}
                {!toutChampsIdentiqueDefaut ? (
                    <button type="button" className={`${styles.paramRepasResetLink} ${styles.paramRepasResetLinkTrailing}`} onClick={reinitialiserChamps}>
                        Réinitialiser
                    </button>
                ) : null}
            </fieldset>
        </div>
    );
};

export default ParametrageAffichageMenus;
