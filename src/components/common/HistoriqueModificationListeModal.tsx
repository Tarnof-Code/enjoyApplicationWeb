import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import {
    formaterComparaisonHistoriqueSnapshots,
    type HistoriqueSnapshotDomaine,
} from "../../helpers/libelleHistoriqueModification";

export type HistoriqueModificationListeModalLigne = {
    id: number;
    quand: string;
    qui: string;
    action: string;
    /**
     * Valeurs brutes `ancienneValeur` / `nouvelleValeur` de l’API
     * (snapshots compacts pipe-separated ou ancien JSON).
     */
    ancienneValeur?: string | null;
    nouvelleValeur?: string | null;
};

export type HistoriqueModificationListeModalProps = {
    isOpen: boolean;
    onFermer: () => void;
    titre: string;
    sousTitre?: string;
    chargement: boolean;
    erreur?: string | null;
    lignes: HistoriqueModificationListeModalLigne[] | null;
    messageListeVide?: string;
    /** Activité (`date|nom|…`), cellule planning, ou cahier d’infirmerie (`Enfant: … | …`). */
    formatSnapshots?: HistoriqueSnapshotDomaine;
};

export function HistoriqueModificationListeModal({
    isOpen,
    onFermer,
    titre,
    sousTitre,
    chargement,
    erreur,
    lignes,
    messageListeVide = "Aucun enregistrement dans l'historique pour le moment.",
    formatSnapshots = "activite",
}: HistoriqueModificationListeModalProps) {
    return (
        <Modal isOpen={isOpen} toggle={onFermer} size="lg" scrollable>
            <ModalHeader toggle={onFermer}>{titre}</ModalHeader>
            <ModalBody>
                {sousTitre ? <p className="text-muted mb-3 small">{sousTitre}</p> : null}
                {chargement ? (
                    <p className="mb-0">Chargement…</p>
                ) : erreur ? (
                    <p className="text-danger mb-0">{erreur}</p>
                ) : !lignes || lignes.length === 0 ? (
                    <p className="text-muted mb-0">{messageListeVide}</p>
                ) : (
                    <ul className="list-unstyled mb-0">
                        {lignes.map((l) => {
                            const comparaison = formaterComparaisonHistoriqueSnapshots(
                                l.ancienneValeur ?? null,
                                l.nouvelleValeur ?? null,
                                formatSnapshots
                            );
                            return (
                                <li
                                    key={l.id}
                                    className="border-bottom pb-2 mb-2"
                                    style={{ borderColor: "#e9ecef" }}
                                >
                                    <div className="fw-semibold">{l.quand}</div>
                                    <div className="small">
                                        <span className="text-muted">Par </span>
                                        {l.qui}
                                        <span className="text-muted"> — </span>
                                        <span>{l.action}</span>
                                    </div>
                                    {comparaison ? (
                                        <div className="mt-2 small">
                                    
                                            <pre
                                                className="mb-0 p-2 rounded bg-light border"
                                                style={{
                                                    maxHeight: "18rem",
                                                    overflow: "auto",
                                                    fontSize: "0.8rem",
                                                    lineHeight: 1.45,
                                                    whiteSpace: "pre-wrap",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {comparaison}
                                            </pre>
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={onFermer} disabled={chargement}>
                    Fermer
                </Button>
            </ModalFooter>
        </Modal>
    );
}
