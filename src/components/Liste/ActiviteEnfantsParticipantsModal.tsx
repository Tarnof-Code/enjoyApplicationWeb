import { useEffect, useMemo, useState } from "react";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalHeader } from "reactstrap";
import type { ActiviteDto, GroupeDto, MomentDto } from "../../types/api";
import { trierEnfantsParPrenom } from "../../helpers/trierUtilisateurs";
import { PlanningModalFooterFormulaire } from "../PlanningCalendrier/PlanningModalFooterFormulaire";
import {
    activiteDateToInputDate,
    enfantsEligiblesPourGroupesActivite,
    idsEnfantsDejaAffectesAutreActivite,
} from "./listeActivitesUtils";
import styles from "./ListeActivites.module.scss";

function enfantCorrespondRecherche(
    recherche: string,
    enfant: { prenom: string; nom: string },
): boolean {
    const r = recherche.trim().toLowerCase();
    if (!r) return true;
    const haystacks = [
        `${enfant.prenom} ${enfant.nom}`,
        `${enfant.nom} ${enfant.prenom}`,
        enfant.prenom,
        enfant.nom,
    ].map((s) => s.toLowerCase());
    return haystacks.some((h) => h.includes(r));
}

export type ActiviteEnfantsParticipantsModalProps = {
    isOpen: boolean;
    activite: ActiviteDto | null;
    groupes: GroupeDto[];
    activites: ActiviteDto[];
    moments: MomentDto[];
    selectedEnfantIds: Set<number>;
    chargement?: boolean;
    submitting: boolean;
    errorMessage: string | null;
    onToggleEnfant: (enfantId: number) => void;
    onClose: () => void;
    onSubmit: () => void;
};

export function ActiviteEnfantsParticipantsModal({
    isOpen,
    activite,
    groupes,
    activites,
    moments,
    selectedEnfantIds,
    chargement = false,
    submitting,
    errorMessage,
    onToggleEnfant,
    onClose,
    onSubmit,
}: ActiviteEnfantsParticipantsModalProps) {
    const [editionSelectionOuverte, setEditionSelectionOuverte] = useState(false);
    const [rechercheEnfant, setRechercheEnfant] = useState("");

    useEffect(() => {
        if (isOpen) {
            setEditionSelectionOuverte(false);
            setRechercheEnfant("");
        }
    }, [isOpen, activite?.id]);

    const enfantsEligibles = useMemo(() => {
        if (!activite) return [];
        return enfantsEligiblesPourGroupesActivite(groupes, activite.groupeIds ?? []);
    }, [activite, groupes]);

    const enfantsEligiblesFiltres = useMemo(
        () => enfantsEligibles.filter((e) => enfantCorrespondRecherche(rechercheEnfant, e)),
        [enfantsEligibles, rechercheEnfant],
    );

    const participantsSelectionnes = useMemo(() => {
        if (!activite) return [];
        const byId = new Map<number, { prenom: string; nom: string }>();
        for (const e of activite.enfants ?? []) {
            byId.set(e.id, { prenom: e.prenom, nom: e.nom });
        }
        for (const e of enfantsEligibles) {
            if (!byId.has(e.id)) {
                byId.set(e.id, { prenom: e.prenom, nom: e.nom });
            }
        }
        const liste = [...selectedEnfantIds]
            .map((id) => {
                const e = byId.get(id);
                return e ? { id, prenom: e.prenom, nom: e.nom } : null;
            })
            .filter((e): e is { id: number; prenom: string; nom: string } => e != null);
        return trierEnfantsParPrenom(liste);
    }, [activite, enfantsEligibles, selectedEnfantIds]);

    const enfantsDejaAffectes = useMemo(() => {
        if (!activite?.moment?.id) return new Map<number, { activiteNom: string; momentNom: string }>();
        return idsEnfantsDejaAffectesAutreActivite(
            activites,
            activiteDateToInputDate(activite.date),
            activite.moment.id,
            moments,
            activite.id,
        );
    }, [activite, activites, moments]);

    const libellesGroupes =
        activite?.groupeIds
            ?.map((id) => groupes.find((g) => g.id === id)?.nom)
            .filter(Boolean)
            .join(", ") ?? "";

    const formulaireDesactive = submitting || chargement;

    return (
        <Modal isOpen={isOpen} toggle={onClose} size="md">
            <ModalHeader toggle={onClose}>
                Enfants participants
                {activite ? ` — ${activite.nom}` : ""}
            </ModalHeader>
            <ModalBody>
                {activite ? (
                    chargement ? (
                        <p className={styles.enfantsModalIntro}>Chargement des participants…</p>
                    ) : (
                        <>
                            <p className={styles.enfantsModalIntro}>
                                Enfants des groupes concernés par cette activité
                                {libellesGroupes ? (
                                    <>
                                        {" "}
                                        (<strong>{libellesGroupes}</strong>)
                                    </>
                                ) : null}
                                .
                            </p>
                            <FormGroup className={styles.modalField}>
                                <Label className="mb-0">
                                    Participants actuels ({participantsSelectionnes.length})
                                </Label>
                                {participantsSelectionnes.length === 0 ? (
                                    <p className={styles.noGroupes}>Aucun enfant participant pour le moment.</p>
                                ) : (
                                    <ul className={styles.enfantsModalListeActuelle}>
                                        {participantsSelectionnes.map((e) => (
                                            <li key={e.id}>
                                                {e.prenom} {e.nom}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </FormGroup>
                            <div className={styles.enfantsModalActionsEdition}>
                                {!editionSelectionOuverte ? (
                                    <Button
                                        color="link"
                                        className={styles.enfantsModalModifierBtn}
                                        onClick={() => setEditionSelectionOuverte(true)}
                                        disabled={formulaireDesactive}
                                    >
                                        Modifier la sélection
                                    </Button>
                                ) : null}
                            </div>
                            {editionSelectionOuverte ? (
                                <FormGroup className={styles.modalField}>
                                    <div className={styles.enfantsModalSelectionHeader}>
                                        <Label className={styles.enfantsModalSelectionLabel}>Sélection</Label>
                                        <Input
                                            type="search"
                                            className={styles.enfantsModalRechercheInput}
                                            placeholder="Rechercher un enfant…"
                                            value={rechercheEnfant}
                                            onChange={(e) => setRechercheEnfant(e.target.value)}
                                            disabled={formulaireDesactive}
                                            aria-label="Rechercher un enfant"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className={styles.checkboxGroup}>
                                        {enfantsEligibles.length === 0 ? (
                                            <p className={styles.noGroupes}>
                                                Aucun enfant dans les groupes de cette activité.
                                            </p>
                                        ) : enfantsEligiblesFiltres.length === 0 ? (
                                            <p className={styles.noGroupes}>
                                                Aucun enfant ne correspond à la recherche.
                                            </p>
                                        ) : (
                                            enfantsEligiblesFiltres.map((enfant) => {
                                                const conflit = enfantsDejaAffectes.get(enfant.id);
                                                const selected = selectedEnfantIds.has(enfant.id);
                                                const indisponible = conflit != null && !selected;
                                                return (
                                                    <div
                                                        key={enfant.id}
                                                        className={
                                                            indisponible
                                                                ? `${styles.checkboxRow} ${styles.checkboxRowIndisponible}`
                                                                : styles.checkboxRow
                                                        }
                                                    >
                                                        <Input
                                                            type="checkbox"
                                                            id={`enfant-act-modal-${enfant.id}`}
                                                            checked={selected}
                                                            onChange={() => onToggleEnfant(enfant.id)}
                                                            disabled={formulaireDesactive || indisponible}
                                                        />
                                                        <Label
                                                            for={`enfant-act-modal-${enfant.id}`}
                                                            aria-disabled={indisponible ? "true" : undefined}
                                                            className={
                                                                indisponible
                                                                    ? `mb-0 ${styles.enfantIndisponible}`
                                                                    : "mb-0"
                                                            }
                                                        >
                                                            {enfant.prenom} {enfant.nom}
                                                            {indisponible ? (
                                                                <>
                                                                    {" — "}
                                                                    <span className={styles.enfantConflitHint}>
                                                                        Déjà sur « {conflit.activiteNom} » (
                                                                        {conflit.momentNom})
                                                                    </span>
                                                                </>
                                                            ) : null}
                                                        </Label>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {enfantsEligibles.length > 0 && enfantsDejaAffectes.size > 0 ? (
                                        <p className={styles.lieuHint}>
                                            Les enfants grisés participent déjà à une autre activité sur ce
                                            créneau (ou un moment qui se chevauche).
                                        </p>
                                    ) : null}
                                </FormGroup>
                            ) : null}
                        </>
                    )
                ) : null}
            </ModalBody>
            <PlanningModalFooterFormulaire
                messageErreur={errorMessage ?? undefined}
                actions={
                    <>
                        <Button color="secondary" onClick={onClose} disabled={submitting}>
                            {editionSelectionOuverte ? "Annuler" : "Fermer"}
                        </Button>
                        {editionSelectionOuverte ? (
                            <Button
                                color="primary"
                                onClick={onSubmit}
                                disabled={formulaireDesactive || !activite}
                            >
                                {submitting ? "Enregistrement…" : "Enregistrer"}
                            </Button>
                        ) : null}
                    </>
                }
            />
        </Modal>
    );
}
