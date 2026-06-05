import type { FC } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
    Alert,
    Button,
    Input,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Spinner,
} from "reactstrap";
import formaterDate from "../../helpers/formaterDate";
import type { AdaptedError } from "../../helpers/axiosError";
import { extraireTexteBrutDepuisTipTapJson } from "../../helpers/reunionTipTapTextePourRecherche";
import { aDroitGestionCompleteSurSejour } from "../../helpers/droitsCahierInfirmerie";
import type { DirecteurInfos, ProfilUtilisateurDTO, ReunionDto } from "../../types/api";
import type { RootState } from "../../redux/store";
import { useSelector } from "react-redux";
import { accountService } from "../../services/account.service";
import { sejourReunionService } from "../../services/sejour-reunion.service";
import { ReunionCompteRenduAccordionItem } from "./ReunionCompteRenduAccordionItem";
import { ReunionFormulaireModal } from "./ReunionFormulaireModal";
import styles from "./SectionReunionsSejour.module.scss";

function formaterDateReunionCourte(ymd: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return ymd;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    return formaterDate(d);
}

function statutHttp(err: unknown): number | undefined {
    const ae = err as AdaptedError;
    return ae.response?.status;
}

/** Date la plus récente en premier ; à date égale : id décroissant. */
function trierReunionsPlusRecentVersAncien(liste: ReunionDto[]): ReunionDto[] {
    return [...liste].sort((a, b) => {
        const cmp = b.date.trim().localeCompare(a.date.trim());
        if (cmp !== 0) return cmp;
        return b.id - a.id;
    });
}

export type SectionReunionsSejourProps = {
    sejourId: number;
    sejourDirecteur?: DirecteurInfos | null;
    equipe?: ProfilUtilisateurDTO[];
    /** Données préchargées par le loader séjour (évite le skeleton au montage). */
    initialReunions?: ReunionDto[];
};

/**
 * Accordéons imbriqués — tri local : dates décroissantes (plus récent en haut).
 * Écriture : aligné gestion séjour (`aDroitGestionCompleteSurSejour` ⇔ backend GESTION_SEJOURS).
 */
export const SectionReunionsSejour: FC<SectionReunionsSejourProps> = ({
    sejourId,
    sejourDirecteur,
    equipe,
    initialReunions,
}) => {
    const roleGlobal = useSelector((state: RootState) => state.auth.role);
    const tokenIdConnecte = accountService.getTokenInfo()?.payload?.sub;
    const peutGererEcritures = useMemo(
        () =>
            aDroitGestionCompleteSurSejour(
                typeof tokenIdConnecte === "string" ? tokenIdConnecte : undefined,
                roleGlobal ?? undefined,
                sejourDirecteur,
                equipe,
            ),
        [tokenIdConnecte, roleGlobal, sejourDirecteur, equipe],
    );

    const [reunions, setReunions] = useState<ReunionDto[]>(() =>
        initialReunions ? trierReunionsPlusRecentVersAncien(initialReunions) : [],
    );
    const [chargement, setChargement] = useState(initialReunions === undefined);
    const [erreurListe, setErreurListe] = useState<string | null>(null);

    const [reunionDeployeeId, setReunionDeployeeId] = useState<number | null>(null);

    const [formulaireOuvert, setFormulaireOuvert] = useState(false);
    const [reunionEnEdition, setReunionEnEdition] = useState<ReunionDto | null>(null);
    const [formulaireCle, setFormulaireCle] = useState(0);

    const [suppressionOuverte, setSuppressionOuverte] = useState(false);
    const [reunionASupprimer, setReunionASupprimer] = useState<ReunionDto | null>(null);
    const [suppressionEnCours, setSuppressionEnCours] = useState(false);
    const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);

    const idFiltres = useId();
    const idFiltDate = `${idFiltres}-date`;
    const idFiltRecherche = `${idFiltres}-texte`;

    const [filtreDate, setFiltreDate] = useState("");
    const [filtreTexteOdJEtCr, setFiltreTexteOdJEtCr] = useState("");

    const texteCherchableParId = useMemo(() => {
        const map = new Map<number, string>();
        for (const r of reunions) {
            const odj = (r.ordreDuJour ?? "").trim();
            const duCr = extraireTexteBrutDepuisTipTapJson(r.contenu);
            map.set(r.id, `${odj} ${duCr}`.replace(/\s+/g, " ").trim());
        }
        return map;
    }, [reunions]);

    const reunionsAffichees = useMemo(() => {
        const iso = filtreDate.trim();
        const q = filtreTexteOdJEtCr.trim().toLowerCase();
        return reunions.filter((r) => {
            if (iso !== "" && /^(\d{4}-\d{2}-\d{2})$/.test(iso)) {
                if (r.date.trim() !== iso) return false;
            }
            if (q) {
                const bloc = texteCherchableParId.get(r.id) ?? "";
                if (!bloc.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [reunions, filtreDate, filtreTexteOdJEtCr, texteCherchableParId]);

    const filtresActifs = Boolean(filtreDate.trim()) || Boolean(filtreTexteOdJEtCr.trim());

    const reinitialiserFiltres = useCallback(() => {
        setFiltreDate("");
        setFiltreTexteOdJEtCr("");
    }, []);

    const recharger = useCallback(async () => {
        setErreurListe(null);
        setChargement(true);
        try {
            const liste = await sejourReunionService.listerReunions(sejourId);
            setReunions(trierReunionsPlusRecentVersAncien(liste));
        } catch (e: unknown) {
            const st = statutHttp(e);
            let msg =
                e instanceof Error
                    ? e.message
                    : "Impossible de charger les comptes rendus de réunion.";
            if (st === 401) {
                msg = "Session expirée ou non authentifié. Reconnectez-vous.";
            } else if (st === 403) {
                msg = "Vous n’avez pas l’accès à cette liste (accès séjour refusé).";
            } else if (st === 404) {
                msg = "Séjour introuvable.";
            }
            setErreurListe(msg);
        } finally {
            setChargement(false);
        }
    }, [sejourId]);

    useEffect(() => {
        if (initialReunions !== undefined) {
            return;
        }
        void recharger();
    }, [recharger, initialReunions]);

    const ouvrirCreation = () => {
        setReunionEnEdition(null);
        setFormulaireCle((c) => c + 1);
        setFormulaireOuvert(true);
    };

    const ouvrirEdition = (r: ReunionDto) => {
        setReunionEnEdition(r);
        setFormulaireCle((c) => c + 1);
        setFormulaireOuvert(true);
    };

    const fermerFormulaire = () => {
        setFormulaireOuvert(false);
        setReunionEnEdition(null);
    };

    const demanderSuppression = (r: ReunionDto) => {
        setErreurSuppression(null);
        setReunionASupprimer(r);
        setSuppressionOuverte(true);
    };

    const fermerSuppression = () => {
        if (!suppressionEnCours) {
            setSuppressionOuverte(false);
            setErreurSuppression(null);
        }
    };

    const confirmerSuppression = async () => {
        if (!reunionASupprimer) return;
        setSuppressionEnCours(true);
        try {
            await sejourReunionService.supprimerReunion(sejourId, reunionASupprimer.id);
            setSuppressionOuverte(false);
            setReunionASupprimer(null);
            setErreurSuppression(null);
            if (reunionDeployeeId === reunionASupprimer.id) setReunionDeployeeId(null);
            await recharger();
        } catch (e: unknown) {
            const st = statutHttp(e);
            setErreurSuppression(
                st === 403
                    ? "Suppression impossible : vous n’avez pas les droits nécessaires."
                    : st === 404
                      ? "Cette réunion n’existe plus."
                      : e instanceof Error
                        ? e.message
                        : "Erreur lors de la suppression.",
            );
        } finally {
            setSuppressionEnCours(false);
        }
    };

    const basculerPanneau = (id: number) => {
        setReunionDeployeeId((prev) => (prev === id ? null : id));
    };

    /** Si l’élément ouvert tombe hors filtre, replier sans laisser le corps orphelin. */
    useEffect(() => {
        if (reunionDeployeeId == null) return;
        const toujoursVisible = reunionsAffichees.some((r) => r.id === reunionDeployeeId);
        if (!toujoursVisible) setReunionDeployeeId(null);
    }, [reunionDeployeeId, reunionsAffichees]);

    return (
        <div className={styles.reunionsBloc}>
            {/* Bouton (+ chargement) à gauche ; filtres compacts une ligne à droite. */}
            {!erreurListe && reunions.length > 0 ? (
                <div className={styles.toolbarActions}>
                    <div className={styles.toolbarActionsGauche}>
                        {peutGererEcritures ? (
                            <Button color="primary" size="sm" onClick={ouvrirCreation} disabled={chargement}>
                                + Nouveau compte rendu
                            </Button>
                        ) : null}
                        {chargement ? (
                            <span className="text-muted d-inline-flex align-items-center gap-2">
                                <Spinner size="sm" /> Actualisation…
                            </span>
                        ) : null}
                    </div>
                    <div className={styles.toolbarActionsFiltres}>
                        <Input
                            id={idFiltDate}
                            type="date"
                            bsSize="sm"
                            className={styles.toolbarFiltreDate}
                            value={filtreDate}
                            onChange={(e) => setFiltreDate(e.target.value)}
                            disabled={chargement}
                            aria-label="Filtrer par date du compte rendu"
                            title="Date"
                        />
                        <Input
                            id={idFiltRecherche}
                            type="search"
                            bsSize="sm"
                            placeholder="Ordre du jour ou compte rendu…"
                            autoComplete="off"
                            value={filtreTexteOdJEtCr}
                            className={styles.toolbarFiltreTexte}
                            onChange={(e) => setFiltreTexteOdJEtCr(e.target.value)}
                            disabled={chargement}
                            aria-label="Rechercher dans l’ordre du jour ou le contenu du compte rendu"
                        />
                        {filtresActifs ? (
                            <Button
                                color="secondary"
                                size="sm"
                                outline
                                type="button"
                                className={styles.toolbarFiltreReset}
                                onClick={reinitialiserFiltres}
                                disabled={chargement}
                            >
                                Réinitialiser
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {chargement && reunions.length === 0 ? (
                <div className={styles.skeletonBloc}>
                    <div className={`${styles.skeletonLine} ${styles.skeletonLine_short}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLine_medium}`} />
                </div>
            ) : null}

            {erreurListe ? (
                <Alert color="danger">{erreurListe}</Alert>
            ) : !chargement && reunions.length === 0 ? (
                <div className={peutGererEcritures ? "d-flex flex-column align-items-start gap-2" : undefined}>
                    {peutGererEcritures ? (
                        <Button color="primary" size="sm" onClick={ouvrirCreation}>
                            + Nouveau compte rendu
                        </Button>
                    ) : null}
                    <p className="text-muted mb-0">Aucune réunion enregistrée pour ce séjour.</p>
                </div>
            ) : null}

            {!erreurListe && reunions.length > 0 ? (
                <div className={styles.reunionList}>
                    {reunionsAffichees.length === 0 ? (
                        <p className="text-muted mb-0" role="status">
                            Aucun compte rendu ne correspond aux filtres.
                        </p>
                    ) : null}
                    {reunionsAffichees.map((r) => (
                        <ReunionCompteRenduAccordionItem
                            key={r.id}
                            reunion={r}
                            ouvert={reunionDeployeeId === r.id}
                            dateFormatee={formaterDateReunionCourte(r.date)}
                            peutGererEcritures={peutGererEcritures}
                            onToggle={() => basculerPanneau(r.id)}
                            onModifier={() => ouvrirEdition(r)}
                            onSupprimer={() => demanderSuppression(r)}
                        />
                    ))}
                </div>
            ) : null}

            <ReunionFormulaireModal
                isOpen={formulaireOuvert}
                toggle={fermerFormulaire}
                sejourId={sejourId}
                reunion={reunionEnEdition}
                onSaved={recharger}
                modalKey={formulaireCle}
            />

            <Modal isOpen={suppressionOuverte} toggle={fermerSuppression}>
                <ModalHeader toggle={fermerSuppression}>Supprimer cette réunion ?</ModalHeader>
                <ModalBody>
                    {erreurSuppression ? (
                        <Alert color="danger" className="mb-3">
                            {erreurSuppression}
                        </Alert>
                    ) : null}
                    {reunionASupprimer ? (
                        <p className="mb-0">
                            Le compte rendu du{" "}
                            <strong>{formaterDateReunionCourte(reunionASupprimer.date)}</strong> sera
                            définitivement effacé.
                        </p>
                    ) : null}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" outline onClick={fermerSuppression} disabled={suppressionEnCours}>
                        Annuler
                    </Button>
                    <Button color="danger" onClick={confirmerSuppression} disabled={suppressionEnCours}>
                        {suppressionEnCours ? <>Suppression…</> : "Supprimer"}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};