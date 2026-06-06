import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Button, Col, Input, Modal, ModalBody, ModalFooter, ModalHeader, Row } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft, faPencilAlt, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import type { RootState } from "../../redux/store";
import type { CahierInfirmerieEntreeDto, SejourDTO } from "../../types/api";
import { accountService } from "../../services/account.service";
import { cahierInfirmerieService } from "../../services/cahier-infirmerie.service";
import {
  peutModifierEntreeCahierInfirmerie,
  peutSupprimerEntreeCahierInfirmerie,
} from "../../helpers/droitsCahierInfirmerie";
import { getApiErrorMessage } from "../../helpers/axiosError";
import formaterDate, { parseDate } from "../../helpers/formaterDate";
import { trierParPrenomPuisNom } from "../../helpers/trierUtilisateurs";
import {
  formatDateHeureHistorique,
  formatNomModificateurHistorique,
  libelleActionHistorique,
} from "../../helpers/libelleHistoriqueModification";
import { LIBELLE_APPEL, LIBELLE_SOIN } from "../../constants/cahierInfirmerieLabels";
import CahierInfirmerieForm, { type EnfantOptionCahier, type MembreSoigneurOption } from "../Forms/CahierInfirmerieForm";
import {
  HistoriqueModificationListeModal,
  type HistoriqueModificationListeModalLigne,
} from "../common/HistoriqueModificationListeModal";
import {
  buildListePrintExtraStyle,
  buildPrintDocumentContext,
  PRINT_GLOBAL_CLASS,
  PrintContentRoot,
  PrintDocumentHeader,
  PrintTrigger,
  usePrintContent,
} from "../../print";
import type { ColumnConfig } from "./Liste";
import { ListePrintTable } from "./ListePrintTable";
import listeStyles from "./Liste.module.scss";

const CAHIER_PRINT_CELL_CENTER = "enjoy-cahier-print-cell-center";

function libelleTitreImpressionCahier(sejour: SejourDTO): string {
  const debut = formaterDate(sejour.dateDebut);
  const fin = formaterDate(sejour.dateFin);
  const periode = debut && fin ? ` (${debut} – ${fin})` : "";
  return `Cahier d'infirmerie — ${sejour.nom}${periode}`;
}

const CAHIER_PRINT_EXTRA_STYLE = `${buildListePrintExtraStyle(7)}
        .enjoy-liste-print-table thead th {
            text-align: center !important;
            vertical-align: middle !important;
        }
        .${CAHIER_PRINT_CELL_CENTER} {
            text-align: center !important;
            vertical-align: middle !important;
        }
        .enjoy-liste-print-table th:last-child,
        .enjoy-liste-print-table td:last-child {
            width: 9rem;
            min-width: 9rem;
        }
        .enjoy-liste-print-table tbody tr > td:last-child,
        .enjoy-liste-print-table tbody tr > td:last-child:empty {
            display: table-cell !important;
            width: 9rem !important;
            min-width: 9rem !important;
            height: 3rem;
            padding: 0.35rem 0.5rem !important;
            border: 1px solid #e2e8ef !important;
        }`;

function formaterTemperatureListe(celsius: number): string {
  return `${celsius.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} °C`;
}

function libelleSoins(e: CahierInfirmerieEntreeDto): string {
  const precisionAutre = e.soinsAutrePrecision?.trim();
  const parts = [...(e.soins ?? [])]
    .sort()
    .map((s) => {
      if (s === "AUTRE") {
        return precisionAutre || LIBELLE_SOIN.AUTRE;
      }
      const lib = LIBELLE_SOIN[s] ?? s;
      if (s === "PRISE_TEMPERATURE" && e.temperatureCelsius != null) {
        return `${lib} (${formaterTemperatureListe(e.temperatureCelsius)})`;
      }
      return lib;
    });
  return parts.length ? parts.join(", ") : "—";
}

function libelleAppels(e: CahierInfirmerieEntreeDto): string {
  const precisionAutre = e.appelAutrePrecision?.trim();
  const parts = [...(e.appels ?? [])]
    .sort()
    .map((a) => {
      if (a === "AUTRE") {
        return precisionAutre || LIBELLE_APPEL.AUTRE;
      }
      return LIBELLE_APPEL[a] ?? a;
    });
  return parts.length ? parts.join(", ") : "—";
}

function libelleSoigneurEntree(e: CahierInfirmerieEntreeDto): string {
  const s = [e.soigneurPrenom, e.soigneurNom].filter(Boolean).join(" ").trim();
  return s || "—";
}

/** Jours calendaires inclus entre début et fin de séjour (fuseau local). */
function enumererJoursSejourPourSelect(
  dateDebut: string | number,
  dateFin: string | number,
): { ymd: string; label: string }[] {
  const d0 = parseDate(dateDebut);
  const d1 = parseDate(dateFin);
  if (!d0 || !d1) return [];
  const start = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const end = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  if (start.getTime() > end.getTime()) return [];
  const pad = (n: number) => String(n).padStart(2, "0");
  const out: { ymd: string; label: string }[] = [];
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    let label = d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (label.length > 0) label = label.charAt(0).toUpperCase() + label.slice(1);
    out.push({ ymd, label });
  }
  return out;
}

/** `jourYmd` = `YYYY-MM-DD` (option liste déroulante). */
function entreeCorrespondAuJourLocal(dateHeure: string | number, jourYmd: string): boolean {
  const t = jourYmd.trim();
  if (t === "") return true;
  const d = parseDate(dateHeure);
  if (!d) return false;
  const [yy, mm, dd] = t.split("-").map((n) => parseInt(n, 10));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return true;
  return d.getFullYear() === yy && d.getMonth() + 1 === mm && d.getDate() === dd;
}

function membresEligiblesCommeSoigneur(sejour: SejourDTO): MembreSoigneurOption[] {
  const seen = new Set<string>();
  const out: MembreSoigneurOption[] = [];
  const add = (tokenId: string | undefined, nom: string | undefined, prenom: string | undefined) => {
    const t = tokenId?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push({ tokenId: t, nom: nom ?? "", prenom: prenom ?? "" });
  };
  add(sejour.directeur?.tokenId, sejour.directeur?.nom, sejour.directeur?.prenom);
  for (const m of sejour.equipe ?? []) add(m.tokenId, m.nom, m.prenom);
  return trierParPrenomPuisNom(out);
}

export type ListeCahierInfirmerieProps = {
  sejourId: number;
  sejour: SejourDTO;
  entrees: CahierInfirmerieEntreeDto[];
  chargement: boolean;
  enfantsOptions: EnfantOptionCahier[];
  onRafraichir: () => void;
  messageErreur?: string | null;
};

const ListeCahierInfirmerie: React.FC<ListeCahierInfirmerieProps> = ({
  sejourId,
  sejour,
  entrees,
  chargement,
  enfantsOptions,
  onRafraichir,
  messageErreur,
}) => {
  const roleGlobal = useSelector((s: RootState) => s.auth.role);
  const prenomConnecte = useSelector((s: RootState) => s.auth.prenom);
  const tokenId = accountService.getTokenInfo()?.payload?.sub;
  const tokenStr = typeof tokenId === "string" ? tokenId : undefined;

  const soigneursEligibles = useMemo(() => {
    const base = membresEligiblesCommeSoigneur(sejour);
    if (tokenStr && !base.some((m) => m.tokenId === tokenStr)) {
      return trierParPrenomPuisNom([
        ...base,
        { tokenId: tokenStr, nom: "", prenom: (prenomConnecte ?? "").trim() || "—" },
      ]);
    }
    return base;
  }, [sejour, tokenStr, prenomConnecte]);

  const [filtre, setFiltre] = useState("");
  /** `YYYY-MM-DD` ou chaîne vide = tous les jours. */
  const [jourFiltre, setJourFiltre] = useState("");
  const [modalFormOuvert, setModalFormOuvert] = useState(false);
  const [entreeEdition, setEntreeEdition] = useState<CahierInfirmerieEntreeDto | null>(null);

  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const [historiqueChargement, setHistoriqueChargement] = useState(false);
  const [historiqueErreur, setHistoriqueErreur] = useState<string | null>(null);
  const [historiqueLignes, setHistoriqueLignes] = useState<HistoriqueModificationListeModalLigne[] | null>(null);

  const [effacement, setEffacement] = useState<CahierInfirmerieEntreeDto | null>(null);
  const [effacementEnCours, setEffacementEnCours] = useState(false);

  const joursSejourOptions = useMemo(
    () => enumererJoursSejourPourSelect(sejour.dateDebut, sejour.dateFin),
    [sejour.dateDebut, sejour.dateFin],
  );

  useEffect(() => {
    if (jourFiltre === "") return;
    if (!joursSejourOptions.some((j) => j.ymd === jourFiltre)) setJourFiltre("");
  }, [jourFiltre, joursSejourOptions]);

  const filtreNorm = filtre.trim().toLowerCase();

  const lignesFiltrees = useMemo(() => {
    return entrees.filter((e) => {
      if (!entreeCorrespondAuJourLocal(e.dateHeure, jourFiltre)) return false;
      if (!filtreNorm) return true;
      const parts = [
        e.description,
        e.enfantPrenom,
        e.enfantNom,
        libelleSoigneurEntree(e),
        e.localisationCorps ?? "",
        libelleSoins(e),
        libelleAppels(e),
        e.createurPrenom ?? "",
        e.createurNom ?? "",
        formatDateHeureHistorique(e.dateHeure),
      ]
        .join(" ")
        .toLowerCase();
      return parts.includes(filtreNorm);
    });
  }, [entrees, filtreNorm, jourFiltre]);

  const printColumns = useMemo((): ColumnConfig[] => {
    return [
      {
        key: "dateHeure",
        label: "Date / heure",
        type: "text",
        className: CAHIER_PRINT_CELL_CENTER,
        printValue: (e: CahierInfirmerieEntreeDto) => formatDateHeureHistorique(e.dateHeure),
      },
      {
        key: "enfant",
        label: "Enfant",
        type: "text",
        className: CAHIER_PRINT_CELL_CENTER,
        printValue: (e: CahierInfirmerieEntreeDto) => `${e.enfantPrenom} ${e.enfantNom}`.trim(),
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        printValue: (e: CahierInfirmerieEntreeDto) => e.description ?? "",
      },
      {
        key: "soins",
        label: "Soins",
        type: "text",
        printValue: libelleSoins,
      },
      {
        key: "appels",
        label: "Appels",
        type: "text",
        className: CAHIER_PRINT_CELL_CENTER,
        printValue: libelleAppels,
      },
      {
        key: "soigneur",
        label: "Soigneur",
        type: "text",
        className: CAHIER_PRINT_CELL_CENTER,
        printValue: libelleSoigneurEntree,
      },
      {
        key: "signatureDirection",
        label: "Signature de la direction",
        type: "text",
        printValue: () => "",
      },
    ];
  }, []);

  const printTitre = useMemo(
    () => libelleTitreImpressionCahier(sejour),
    [sejour],
  );

  const printHeaderContext = useMemo(() => {
    const meta: { label: string; value: string }[] = [
      {
        label: "Résultats affichés",
        value: `${lignesFiltrees.length} sur ${entrees.length}`,
      },
    ];
    if (jourFiltre) {
      const jour = joursSejourOptions.find((j) => j.ymd === jourFiltre);
      meta.push({ label: "Jour du séjour", value: jour?.label ?? jourFiltre });
    }
    if (filtreNorm) {
      meta.push({ label: "Recherche", value: filtre.trim() });
    }
    return buildPrintDocumentContext(printTitre, meta);
  }, [printTitre, lignesFiltrees.length, entrees.length, jourFiltre, joursSejourOptions, filtreNorm, filtre]);

  const { contentRef, print, fixedRunningHeaderLabel } = usePrintContent({
    documentTitle: printTitre,
    extraPageStyle: CAHIER_PRINT_EXTRA_STYLE,
    ignoreGlobalStyles: true,
    runningHeaderLabel: printTitre,
  });

  const renderPrintCell = (column: ColumnConfig, item: CahierInfirmerieEntreeDto): string => {
    if (column.printValue) {
      return column.printValue(item);
    }
    return "";
  };

  const ouvrirCreation = () => {
    setEntreeEdition(null);
    setModalFormOuvert(true);
  };

  const ouvrirEdition = (e: CahierInfirmerieEntreeDto) => {
    setEntreeEdition(e);
    setModalFormOuvert(true);
  };

  const fermerForm = () => {
    setModalFormOuvert(false);
    setEntreeEdition(null);
  };

  const ouvrirHistorique = (entreeId: number) => {
    setHistoriqueOuvert(true);
    setHistoriqueLignes(null);
    setHistoriqueErreur(null);
    setHistoriqueChargement(true);
    void (async () => {
      try {
        const rows = await cahierInfirmerieService.getHistorique(sejourId, entreeId);
        setHistoriqueLignes(
          rows.map((r) => ({
            id: r.id,
            quand: formatDateHeureHistorique(r.dateModification),
            qui: formatNomModificateurHistorique(r.modificateurPrenom, r.modificateurNom),
            action: libelleActionHistorique(r.action),
            ancienneValeur: r.ancienneValeur,
            nouvelleValeur: r.nouvelleValeur,
          })),
        );
      } catch (err: unknown) {
        setHistoriqueErreur(getApiErrorMessage(err, "Impossible de charger l'historique."));
        setHistoriqueLignes([]);
      } finally {
        setHistoriqueChargement(false);
      }
    })();
  };

  const confirmerEffacement = async () => {
    if (!effacement) return;
    setEffacementEnCours(true);
    try {
      await cahierInfirmerieService.supprimerEntree(sejourId, effacement.id);
      setEffacement(null);
      onRafraichir();
    } catch (e: unknown) {
      alert(getApiErrorMessage(e, "Suppression impossible."));
    } finally {
      setEffacementEnCours(false);
    }
  };

  if (chargement) {
    return <p className="loading-message">Chargement du cahier d'infirmerie…</p>;
  }

  return (
    <div className="page-main">
      {messageErreur ? <p className="errorMessage">{messageErreur}</p> : null}

      <Row className={`mb-3 align-items-end gy-2 ${PRINT_GLOBAL_CLASS.noPrint}`}>
        <Col xs="12" lg="3">
          <h1 className="page-title mb-0">Cahier d'infirmerie</h1>
        </Col>
        <Col xs="12" sm="6" lg="3">
          <label htmlFor="cahier-filtre-jour" className="form-label small text-muted mb-1">
            Jour du séjour
          </label>
          <Input
            id="cahier-filtre-jour"
            type="select"
            value={jourFiltre}
            onChange={(e) => setJourFiltre(e.target.value)}
            aria-label="Filtrer les entrées par jour du séjour"
          >
            <option value="">Tous les jours</option>
            {joursSejourOptions.map((j) => (
              <option key={j.ymd} value={j.ymd}>
                {j.label}
              </option>
            ))}
          </Input>
        </Col>
        <Col xs="12" sm="6" lg="3">
          <label htmlFor="cahier-filtre-texte" className="form-label small text-muted mb-1 d-none d-sm-block">
            Recherche
          </label>
          <Input
            id="cahier-filtre-texte"
            type="search"
            placeholder="Filtrer (enfant, description, soigneur…)"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            aria-label="Filtrer les entrées"
            className="w-100"
          />
        </Col>
        <Col
          xs="12"
          lg="3"
          className="d-flex flex-column flex-sm-row justify-content-lg-end align-items-stretch align-items-sm-end gap-2"
        >
          <PrintTrigger
            variant="button"
            onPrint={print}
            label="Imprimer le cahier d'infirmerie"
            buttonText="Imprimer"
            className="text-nowrap flex-shrink-0"
          />
          <Button color="success" onClick={ouvrirCreation} className="text-nowrap flex-shrink-0">
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Nouvelle entrée
          </Button>
        </Col>
      </Row>

      <PrintContentRoot contentRef={contentRef} fixedRunningHeaderLabel={fixedRunningHeaderLabel}>
        <PrintDocumentHeader context={printHeaderContext} />
        <ListePrintTable
          visibleColumns={printColumns}
          rows={lignesFiltrees}
          getRowKey={(item) => item.id}
          renderPrintCell={renderPrintCell}
          emptyMessage={
            entrees.length === 0
              ? "Aucune entrée pour ce séjour."
              : "Aucune entrée ne correspond à ce jour ou à cette recherche."
          }
        />
      </PrintContentRoot>

      <div className={`${listeStyles.table_container} ${PRINT_GLOBAL_CLASS.noPrint}`}>
        <table className="table align-middle">
          <thead className={listeStyles.enTete}>
            <tr className="align-middle">
              <th className={listeStyles.actions_cell} aria-label="Actions" />
              <th className="text-center">Date / heure</th>
              <th className="text-center">Enfant</th>
              <th>Description</th>
              <th className="text-center">Soins</th>
              <th className="text-center">Appels</th>
              <th className="text-center">Soigneur</th>
              <th className="text-center">Auteur</th>
            </tr>
          </thead>
          <tbody>
            {lignesFiltrees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted">
                  {entrees.length === 0
                    ? "Aucune entrée pour ce séjour."
                    : "Aucune entrée ne correspond à ce jour ou à cette recherche."}
                </td>
              </tr>
            ) : (
              lignesFiltrees.map((e) => {
                const modifiable = peutModifierEntreeCahierInfirmerie(
                  e,
                  tokenStr,
                  roleGlobal,
                  sejour.directeur,
                  sejour.equipe,
                );
                const supprimable = peutSupprimerEntreeCahierInfirmerie(
                  e,
                  tokenStr,
                  roleGlobal,
                  sejour.directeur,
                  sejour.equipe,
                );
                return (
                  <tr key={e.id} className="align-middle">
                    <td className={listeStyles.actions_cell}>
                      <div className={listeStyles.icones_box}>
                        <span className={listeStyles.icone_emplacement}>
                          <FontAwesomeIcon
                            icon={faClockRotateLeft}
                            title="Historique"
                            style={{ cursor: "pointer" }}
                            onClick={() => ouvrirHistorique(e.id)}
                          />
                        </span>
                        <span className={listeStyles.icone_emplacement}>
                          {modifiable ? (
                            <FontAwesomeIcon
                              className="icone_crayon_edit"
                              icon={faPencilAlt}
                              title="Modifier"
                              style={{ cursor: "pointer" }}
                              onClick={() => ouvrirEdition(e)}
                            />
                          ) : null}
                        </span>
                        <span className={listeStyles.icone_emplacement}>
                          {supprimable ? (
                            <FontAwesomeIcon
                              className="icone_trash_delete"
                              icon={faTrashAlt}
                              title="Supprimer"
                              style={{ cursor: "pointer" }}
                              onClick={() => setEffacement(e)}
                            />
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="text-center">{formatDateHeureHistorique(e.dateHeure)}</td>
                    <td className="text-center">
                      {e.enfantPrenom} {e.enfantNom}
                    </td>
                    <td
                      className="text-start"
                      style={{ maxWidth: "280px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {e.description}
                    </td>
                    <td className="text-center" style={{ maxWidth: "200px", fontSize: "0.9rem" }}>
                      {libelleSoins(e)}
                    </td>
                    <td className="text-center" style={{ maxWidth: "160px", fontSize: "0.9rem" }}>
                      {libelleAppels(e)}
                    </td>
                    <td className="text-center">{libelleSoigneurEntree(e)}</td>
                    <td className="text-center" style={{ fontSize: "0.9rem" }}>
                      {e.createurPrenom || e.createurNom
                        ? `${e.createurPrenom ?? ""} ${e.createurNom ?? ""}`.trim()
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalFormOuvert} toggle={fermerForm} size="lg" scrollable>
        <ModalHeader toggle={fermerForm}>{entreeEdition ? "Modifier l'entrée" : "Nouvelle entrée"}</ModalHeader>
        <ModalBody>
          <CahierInfirmerieForm
            key={entreeEdition ? `edit-${entreeEdition.id}` : "nouveau"}
            sejourId={sejourId}
            enfants={enfantsOptions}
            entreeInitiale={entreeEdition}
            utilisateurConnecteTokenId={tokenStr ?? ""}
            soigneursEligibles={soigneursEligibles}
            onSucces={() => {
              fermerForm();
              onRafraichir();
            }}
            onAnnuler={fermerForm}
          />
        </ModalBody>
      </Modal>

      <HistoriqueModificationListeModal
        isOpen={historiqueOuvert}
        onFermer={() => {
          setHistoriqueOuvert(false);
          setHistoriqueLignes(null);
        }}
        titre="Historique — cahier d'infirmerie"
        chargement={historiqueChargement}
        erreur={historiqueErreur}
        lignes={historiqueLignes}
        formatSnapshots="cahier_infi"
      />

      <Modal isOpen={!!effacement} toggle={() => !effacementEnCours && setEffacement(null)}>
        <ModalHeader toggle={() => !effacementEnCours && setEffacement(null)}>Confirmer la suppression</ModalHeader>
        <ModalBody>
          {effacement ? (
            <p className="mb-0">
              Supprimer l'entrée du{" "}
              <strong>{formatDateHeureHistorique(effacement.dateHeure)}</strong> pour{" "}
              <strong>
                {effacement.enfantPrenom} {effacement.enfantNom}
              </strong>{" "}
              ? Cette action est définitive.
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setEffacement(null)} disabled={effacementEnCours}>
            Annuler
          </Button>
          <Button color="danger" onClick={() => void confirmerEffacement()} disabled={effacementEnCours}>
            {effacementEnCours ? "Suppression…" : "Supprimer"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ListeCahierInfirmerie;
