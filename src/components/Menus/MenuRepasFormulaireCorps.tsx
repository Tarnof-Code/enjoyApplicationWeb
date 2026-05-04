import { FormGroup, Input, Label } from "reactstrap";
import type { TypeRepas } from "../../types/api";
import { estPetitDejeunerOuGouter, libelleCompositionCheckboxPourAffichage } from "../../helpers/menuRepas";
import type { ReferenceCheckboxOption } from "../../helpers/optionsReferencesAlimentaires";

export type MenuRepasFormulaireCorpsClasses = {
    checkboxSection: string;
    checkboxScroll: string;
    checkboxRow: string;
    fieldHint: string;
    modalError: string;
};

export type MenuRepasFormulaireCorpsProps = {
    typeRepasCourant: TypeRepas | null;
    menuFormCompact: boolean;
    fDetail: string;
    onChangeDetail: (v: string) => void;
    fEntree: string;
    onChangeEntree: (v: string) => void;
    fPlat: string;
    onChangePlat: (v: string) => void;
    fFromage: string;
    onChangeFromage: (v: string) => void;
    fDessert: string;
    onChangeDessert: (v: string) => void;
    fAllergeneIds: number[];
    onToggleAllergene: (id: number, checked: boolean) => void;
    fRegimePreferenceIds: number[];
    onToggleRegime: (id: number, checked: boolean) => void;
    allergCheckboxOptions: ReferenceCheckboxOption[];
    regimeCheckboxOptions: ReferenceCheckboxOption[];
    refsErreur: string | null;
    refsChargeTerminee: boolean;
    submitting: boolean;
    css: MenuRepasFormulaireCorpsClasses;
};

/** Champs corps du modal menu (réutilisable), sans pied ni titre. */
export function MenuRepasFormulaireCorps({
    typeRepasCourant,
    menuFormCompact,
    fDetail,
    onChangeDetail,
    fEntree,
    onChangeEntree,
    fPlat,
    onChangePlat,
    fFromage,
    onChangeFromage,
    fDessert,
    onChangeDessert,
    fAllergeneIds,
    onToggleAllergene,
    fRegimePreferenceIds,
    onToggleRegime,
    allergCheckboxOptions,
    regimeCheckboxOptions,
    refsErreur,
    refsChargeTerminee,
    submitting,
    css,
}: MenuRepasFormulaireCorpsProps) {
    return (
        <>
            {typeRepasCourant && estPetitDejeunerOuGouter(typeRepasCourant) ? (
                <FormGroup>
                    <Input
                        id="menu-detail"
                        type="textarea"
                        rows={menuFormCompact ? 1 : 6}
                        value={fDetail}
                        onChange={(e) => onChangeDetail(e.target.value)}
                        disabled={submitting}
                        placeholder="Contenu"
                    />
                </FormGroup>
            ) : (
                <>
                    <FormGroup>
                        <Label for="menu-entree">Entrée</Label>
                        <Input
                            id="menu-entree"
                            type="textarea"
                            rows={menuFormCompact ? 1 : 2}
                            value={fEntree}
                            onChange={(e) => onChangeEntree(e.target.value)}
                            disabled={submitting}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="menu-plat">Plat</Label>
                        <Input
                            id="menu-plat"
                            type="textarea"
                            rows={menuFormCompact ? 1 : 2}
                            value={fPlat}
                            onChange={(e) => onChangePlat(e.target.value)}
                            disabled={submitting}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="menu-fromage">Fromage ou entremet</Label>
                        <Input
                            id="menu-fromage"
                            type="textarea"
                            rows={menuFormCompact ? 1 : 2}
                            value={fFromage}
                            onChange={(e) => onChangeFromage(e.target.value)}
                            disabled={submitting}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="menu-dessert">Dessert</Label>
                        <Input
                            id="menu-dessert"
                            type="textarea"
                            rows={menuFormCompact ? 1 : 2}
                            value={fDessert}
                            onChange={(e) => onChangeDessert(e.target.value)}
                            disabled={submitting}
                        />
                    </FormGroup>
                </>
            )}
            {refsErreur ? (
                <p className={css.modalError}>
                    {refsErreur} Les menus peuvent être enregistrés sans ces sélections.
                </p>
            ) : null}
            <FormGroup className={css.checkboxSection}>
                <Label>Allergènes</Label>
                <div className={css.checkboxScroll} role="group" aria-label="Allergènes du menu">
                    {allergCheckboxOptions.length === 0 ? (
                        refsErreur ? null : !refsChargeTerminee ? (
                            <span className={css.fieldHint}>Chargement…</span>
                        ) : (
                            <span className={css.fieldHint}>
                                Aucune allergène relevée sur les dossiers des enfants inscrits à ce séjour.
                            </span>
                        )
                    ) : (
                        allergCheckboxOptions.map((opt) => (
                            <label key={opt.value} className={css.checkboxRow}>
                                <Input
                                    type="checkbox"
                                    checked={fAllergeneIds.includes(opt.value)}
                                    disabled={submitting}
                                    onChange={(e) =>
                                        onToggleAllergene(opt.value, e.target.checked)
                                    }
                                />
                                <span>{opt.label}</span>
                            </label>
                        ))
                    )}
                </div>
            </FormGroup>
            <FormGroup className={css.checkboxSection}>
                <Label>Régimes</Label>
                <div className={css.checkboxScroll} role="group" aria-label="Régimes et préférences">
                    {regimeCheckboxOptions.length === 0 ? (
                        refsErreur ? null : !refsChargeTerminee ? (
                            <span className={css.fieldHint}>Chargement…</span>
                        ) : (
                            <span className={css.fieldHint}>
                                Aucun régime ou préférence relevé sur les dossiers des enfants inscrits à ce séjour.
                            </span>
                        )
                    ) : (
                        regimeCheckboxOptions.map((opt) => (
                            <label key={opt.value} className={css.checkboxRow}>
                                <Input
                                    type="checkbox"
                                    checked={fRegimePreferenceIds.includes(opt.value)}
                                    disabled={submitting}
                                    onChange={(e) =>
                                        onToggleRegime(opt.value, e.target.checked)
                                    }
                                />
                                <span>{libelleCompositionCheckboxPourAffichage(opt.label)}</span>
                            </label>
                        ))
                    )}
                </div>
            </FormGroup>
        </>
    );
}