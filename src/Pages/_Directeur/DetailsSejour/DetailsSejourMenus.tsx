import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouteLoaderData, useNavigate } from "react-router-dom";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import styles from "./DetailsSejour.module.scss";
import menuStyles from "./DetailsSejourMenus.module.scss";
import { MenuRepasFormulaireCorps } from "../../../components/Menus/MenuRepasFormulaireCorps";
import { CalendrierCarteEditionAvecSuppression } from "../../../components/PlanningCalendrier/CalendrierCarteEditionAvecSuppression";
import { CalendrierCelluleAjoutHint } from "../../../components/PlanningCalendrier/CalendrierCelluleAjoutHint";
import { proprietesTdAjoutPlanning } from "../../../components/PlanningCalendrier/calendrierCelluleClavier";
import planningCal from "../../../components/PlanningCalendrier/PlanningCalendrier.module.scss";
import { PlanningModalFooterFormulaire } from "../../../components/PlanningCalendrier/PlanningModalFooterFormulaire";
import { CalendrierNavigationPeriode } from "../../../components/Liste/ListeActivitesCalendrier";
import { enumererJoursDuSejour, libelleJourCourtPourBouton, parseYmdVersDateLocale } from "../../../components/Liste/listeActivitesUtils";
import { useCalendrierFenetreJours } from "../../../components/Liste/useCalendrierFenetreJours";
import type { MenuRepasDto, ReferenceAlimentaireDto, SaveMenuRepasRequest, SejourDTO, TypeRepas } from "../../../types/api";
import { normaliserDateRepasISO } from "../../../helpers/dateIsoLocal";
import formaterDate from "../../../helpers/formaterDate";
import {
    TYPES_REPAS,
    LABELS_TYPE_REPAS,
    couleurFondCarteMenuPourTypeRepas,
    indexerMenusParJourEtType,
    jourISOdepuisDateRepasApi,
    fusionnerRefsPourFormulaire,
    construireSaveMenuRepasRequest,
    estPetitDejeunerOuGouter,
    ligneMetaAllergenesRegimesCalendrier,
    resumeMenuCourt,
} from "../../../helpers/menuRepas";
import { optionsCheckboxReferencesAlimentaires } from "../../../helpers/optionsReferencesAlimentaires";
import { sejourMenuService } from "../../../services/sejour-menu.service";

type LoaderOk = { sejour: SejourDTO };

const DetailsSejourMenus: React.FC = () => {
    const loaderData = useRouteLoaderData("sejour-detail") as LoaderOk | Error | undefined;
    const navigate = useNavigate();

    const [modalDateRepasStr, setModalDateRepasStr] = useState<string>("");
    const [menus, setMenus] = useState<MenuRepasDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    const [refsAllergenes, setRefsAllergenes] = useState<ReferenceAlimentaireDto[]>([]);
    const [refsRegimes, setRefsRegimes] = useState<ReferenceAlimentaireDto[]>([]);
    /** Après la première réponse de `references-alimentaires-agregees-enfants` (succès ou échec). */
    const [refsChargeTerminee, setRefsChargeTerminee] = useState(false);
    const [refsErreur, setRefsErreur] = useState<string | null>(null);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuRepasDto | null>(null);
    const [creatingType, setCreatingType] = useState<TypeRepas | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const [fDetail, setFDetail] = useState("");
    const [fEntree, setFEntree] = useState("");
    const [fPlat, setFPlat] = useState("");
    const [fFromage, setFFromage] = useState("");
    const [fDessert, setFDessert] = useState("");
    const [fAllergeneIds, setFAllergeneIds] = useState<number[]>([]);
    const [fRegimePreferenceIds, setFRegimePreferenceIds] = useState<number[]>([]);
    /** Pour afficher les références inactives déjà liées au menu à l’ouverture du formulaire */
    const [basisAllergIds, setBasisAllergIds] = useState<number[]>([]);
    const [basisRegimeIds, setBasisRegimeIds] = useState<number[]>([]);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<MenuRepasDto | null>(null);
    const [deleting, setDeleting] = useState(false);

    /** Affichage liste (cartes par jour) ou grille type planning (repas × jours). */
    const [vueMenus, setVueMenus] = useState<"liste" | "calendrier">("calendrier");

    const sejour = loaderData && !(loaderData instanceof Error) ? loaderData.sejour : undefined;

    const joursDuSejourMenus = useMemo(
        () => (sejour ? enumererJoursDuSejour(sejour) : []),
        [sejour?.dateDebut, sejour?.dateFin],
    );

    const {
        nombreJoursVue: menusNombreJoursVue,
        setNombreJoursVue: setMenusNombreJoursVue,
        joursFenetre: joursFenetreMenus,
        libellePlage: libellePlageMenus,
        peutReculer: peutReculerMenus,
        peutAvancer: peutAvancerMenus,
        decalage: decalageFenetreMenus,
        debutFenetreYmd: menusDebutFenetreYmd,
        minDebutFenetreYmd: menusMinDebutFenetreYmd,
        maxDebutFenetreYmd: menusMaxDebutFenetreYmd,
        definirDebutFenetre: definirDebutFenetreMenus,
    } = useCalendrierFenetreJours(joursDuSejourMenus);

    /** Jours du séjour visibles dans la fenêtre (exclut les cases hors séjour si vue 7 j. sur une courte période). */
    const datesListe = useMemo(
        () => joursFenetreMenus.filter((j) => j.dansSejour).map((j) => j.ymd),
        [joursFenetreMenus],
    );

    const rangeStartStr = datesListe[0] ?? "";
    const rangeEndStr = datesListe[datesListe.length - 1] ?? "";

    useEffect(() => {
        if (!sejour) return;
        let cancelled = false;
        setRefsErreur(null);
        setRefsChargeTerminee(false);
        (async () => {
            try {
                const agg = await sejourMenuService.getReferencesAlimentairesAgregeesEnfants(sejour.id);
                if (!cancelled) {
                    setRefsAllergenes(agg.allergenes);
                    setRefsRegimes(agg.regimesEtPreferences);
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    setRefsErreur(
                        e instanceof Error ? e.message : "Impossible de charger les références des dossiers enfants",
                    );
                    setRefsAllergenes([]);
                    setRefsRegimes([]);
                }
            } finally {
                if (!cancelled) {
                    setRefsChargeTerminee(true);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sejour]);

    const chargerMenus = useCallback(async () => {
        if (!sejour || !rangeStartStr || !rangeEndStr) return;
        setLoading(true);
        setPageError(null);
        try {
            const params =
                rangeStartStr === rangeEndStr
                    ? { date: rangeStartStr }
                    : { dateDebut: rangeStartStr, dateFin: rangeEndStr };
            const list = await sejourMenuService.listerMenus(sejour.id, params);
            setMenus(
                list.map((m) => ({
                    ...m,
                    allergenes: m.allergenes ?? [],
                    regimesEtPreferences: m.regimesEtPreferences ?? [],
                })),
            );
        } catch (e: unknown) {
            setPageError(e instanceof Error ? e.message : "Impossible de charger les menus");
            setMenus([]);
        } finally {
            setLoading(false);
        }
    }, [sejour, rangeStartStr, rangeEndStr]);

    useEffect(() => {
        void chargerMenus();
    }, [chargerMenus]);

    const menusParJourEtType = useMemo(() => indexerMenusParJourEtType(menus), [menus]);

    const typeRepasCourant = editingMenu?.typeRepas ?? creatingType;
    /** À la création, champs compacts sur une ligne ; à l’édition, hauteur plus confortable. */
    const menuFormCompact = editingMenu == null;

    const refsAllergenesPourFormulaire = useMemo(
        () => fusionnerRefsPourFormulaire(refsAllergenes, editingMenu?.allergenes),
        [refsAllergenes, editingMenu],
    );

    const refsRegimesPourFormulaire = useMemo(
        () => fusionnerRefsPourFormulaire(refsRegimes, editingMenu?.regimesEtPreferences),
        [refsRegimes, editingMenu],
    );

    const allergCheckboxOptions = useMemo(
        () => optionsCheckboxReferencesAlimentaires(refsAllergenesPourFormulaire, basisAllergIds),
        [refsAllergenesPourFormulaire, basisAllergIds],
    );

    const regimeCheckboxOptions = useMemo(
        () => optionsCheckboxReferencesAlimentaires(refsRegimesPourFormulaire, basisRegimeIds),
        [refsRegimesPourFormulaire, basisRegimeIds],
    );

    const ouvrirCreation = (type: TypeRepas, dateISO: string) => {
        setModalError(null);
        setModalDateRepasStr(dateISO);
        setEditingMenu(null);
        setCreatingType(type);
        setFDetail("");
        setFEntree("");
        setFPlat("");
        setFFromage("");
        setFDessert("");
        setBasisAllergIds([]);
        setBasisRegimeIds([]);
        setFAllergeneIds([]);
        setFRegimePreferenceIds([]);
        setEditorOpen(true);
    };

    const ouvrirEdition = (menu: MenuRepasDto) => {
        setModalError(null);
        setModalDateRepasStr(jourISOdepuisDateRepasApi(menu.dateRepas as unknown) || normaliserDateRepasISO(String(menu.dateRepas ?? "")));
        setEditingMenu(menu);
        setCreatingType(null);
        setFDetail(
            estPetitDejeunerOuGouter(menu.typeRepas) ? (menu.detailPetitDejeunerOuGouter ?? "") : "",
        );
        setFEntree(menu.entree ?? "");
        setFPlat(menu.plat ?? "");
        setFFromage(menu.fromageOuEntremet ?? "");
        setFDessert(menu.dessert ?? "");
        const idsA = menu.allergenes?.map((x) => x.id) ?? [];
        const idsR = menu.regimesEtPreferences?.map((x) => x.id) ?? [];
        setBasisAllergIds(idsA);
        setBasisRegimeIds(idsR);
        setFAllergeneIds([...idsA]);
        setFRegimePreferenceIds([...idsR]);
        setEditorOpen(true);
    };

    const construirePayload = (): SaveMenuRepasRequest | null => {
        if (!typeRepasCourant || !modalDateRepasStr) return null;
        return construireSaveMenuRepasRequest({
            dateRepas: modalDateRepasStr,
            typeRepas: typeRepasCourant,
            fDetail,
            fEntree,
            fPlat,
            fFromage,
            fDessert,
            fAllergeneIds,
            fRegimePreferenceIds,
        });
    };

    const toggleSel = (ids: number[], id: number, checked: boolean): number[] => {
        if (checked) return ids.includes(id) ? ids : [...ids, id];
        return ids.filter((x) => x !== id);
    };

    const enregistrer = async () => {
        if (!sejour) return;
        const body = construirePayload();
        if (!body) {
            setModalError("Données invalides.");
            return;
        }
        setSubmitting(true);
        setModalError(null);
        try {
            if (editingMenu) {
                await sejourMenuService.modifierMenu(sejour.id, editingMenu.id, body);
            } else {
                await sejourMenuService.creerMenu(sejour.id, body);
            }
            setEditorOpen(false);
            setEditingMenu(null);
            setCreatingType(null);
            setModalDateRepasStr("");
            await chargerMenus();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Enregistrement impossible";
            setModalError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const confirmerSuppression = async () => {
        if (!sejour || !pendingDelete) return;
        setDeleting(true);
        setModalError(null);
        try {
            await sejourMenuService.supprimerMenu(sejour.id, pendingDelete.id);
            setDeleteOpen(false);
            setPendingDelete(null);
            await chargerMenus();
        } catch (e: unknown) {
            setModalError(e instanceof Error ? e.message : "Suppression impossible");
        } finally {
            setDeleting(false);
        }
    };

    const renduBlocInfosCarte = (menu: MenuRepasDto) => {
        const metaAllergRegimes = ligneMetaAllergenesRegimesCalendrier(menu);

        const lignesMenu: ReactNode[] = [];
        if (estPetitDejeunerOuGouter(menu.typeRepas)) {
            lignesMenu.push(
                <div key="detail">
                    <span className={menuStyles.refLabel}>Détail du repas</span>
                    <span>{menu.detailPetitDejeunerOuGouter?.trim() || "—"}</span>
                </div>,
            );
        } else {
            (
                [
                    { label: "Entrée :", val: menu.entree },
                    { label: "Plat :", val: menu.plat },
                    { label: "Fromage ou entremet :", val: menu.fromageOuEntremet },
                    { label: "Dessert :", val: menu.dessert },
                ] as const
            ).forEach(({ label, val }) => {
                lignesMenu.push(
                    <div key={label}>
                        <span className={menuStyles.refLabel}>{label}</span>
                        <span>{val?.trim() || "—"}</span>
                    </div>,
                );
            });
        }

        if (!lignesMenu.length && !metaAllergRegimes) return null;

        return (
            <div className={menuStyles.refBlock}>
                {lignesMenu}
                {metaAllergRegimes ? (
                    <span className={menuStyles.calMenusCarteMeta}>{metaAllergRegimes}</span>
                ) : null}
            </div>
        );
    };

    const demanderSuppressionMenu = (m: MenuRepasDto) => {
        setModalError(null);
        setPendingDelete(m);
        setDeleteOpen(true);
    };

    if (loaderData === undefined) {
        return (
            <div className={styles.pageContainer}>
                <p className={styles.error}>Chargement du séjour…</p>
            </div>
        );
    }

    if (loaderData instanceof Error || !sejour) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/directeur/sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Séjour introuvable ou erreur de chargement</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <header className={menuStyles.menusPageHeader}>
                <h1 className={`${styles.overviewSectionTitle} ${menuStyles.menusPageTitle}`}>Menus du séjour</h1>
                {joursDuSejourMenus.length > 0 && joursFenetreMenus.length > 0 ? (
                    <div className={menuStyles.menusHeaderActions}>
                        <div className={menuStyles.menusToolbar}>
                            <div
                                className={menuStyles.vueMenusToggle}
                                role="group"
                                aria-label="Mode d’affichage des menus"
                            >
                                <button
                                    type="button"
                                    className={`${menuStyles.vueMenusBtn} ${vueMenus === "calendrier" ? menuStyles.vueMenusBtnActive : ""}`}
                                    aria-pressed={vueMenus === "calendrier"}
                                    onClick={() => setVueMenus("calendrier")}
                                >
                                    Calendrier
                                </button>
                                <button
                                    type="button"
                                    className={`${menuStyles.vueMenusBtn} ${vueMenus === "liste" ? menuStyles.vueMenusBtnActive : ""}`}
                                    aria-pressed={vueMenus === "liste"}
                                    onClick={() => setVueMenus("liste")}
                                >
                                    Liste
                                </button>
                            </div>
                            <div className={menuStyles.menusPeriodeWrap} role="region" aria-label="Période des menus affichés">
                                <div className={menuStyles.menusNavBloc}>
                                    <CalendrierNavigationPeriode
                                        libellePlage={libellePlageMenus}
                                        peutReculer={peutReculerMenus}
                                        peutAvancer={peutAvancerMenus}
                                        onReculer={() => decalageFenetreMenus(-1)}
                                        onAvancer={() => decalageFenetreMenus(1)}
                                        nombreJoursVue={menusNombreJoursVue}
                                        onNombreJoursVueChange={setMenusNombreJoursVue}
                                        debutFenetreYmd={menusDebutFenetreYmd}
                                        minDebutFenetreYmd={menusMinDebutFenetreYmd}
                                        maxDebutFenetreYmd={menusMaxDebutFenetreYmd}
                                        onChangerDebutFenetre={definirDebutFenetreMenus}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </header>

            {pageError && <div className={menuStyles.pageError}>{pageError}</div>}
            {refsErreur && !pageError && (
                <div className={menuStyles.pageError} role="status">
                    Références dossiers enfants (menus) : {refsErreur}
                </div>
            )}

            <div className={menuStyles.menusMain} aria-busy={loading}>
            {vueMenus === "calendrier" && joursFenetreMenus.length > 0 ? (
                <div className={menuStyles.calWrap}>
                    <div className={menuStyles.calScroll}>
                        <table
                            className={menuStyles.calTable}
                            style={
                                {
                                    "--cal-menus-nb-jours": String(Math.max(1, joursFenetreMenus.length)),
                                } as CSSProperties
                            }
                        >
                            <colgroup>
                                <col className={menuStyles.calColCorner} />
                                {joursFenetreMenus.map((col) => (
                                    <col key={col.ymd} className={menuStyles.calColJour} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th scope="col" className={menuStyles.calCorner} />
                                    {joursFenetreMenus.map((col) => {
                                        const d = parseYmdVersDateLocale(col.ymd);
                                        const libelle = d ? libelleJourCourtPourBouton(d) : col.ymd;
                                        return (
                                            <th
                                                key={col.ymd}
                                                scope="col"
                                                className={`${menuStyles.calThJour} ${!col.dansSejour ? menuStyles.calThHorsSejour : ""}`}
                                            >
                                                {libelle}
                                                {!col.dansSejour ? (
                                                    <span className={menuStyles.calHorsSejourHint}>Hors séjour</span>
                                                ) : null}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {TYPES_REPAS.map((type) => (
                                    <tr key={type}>
                                        <th scope="row" className={menuStyles.calThRepas}>
                                            {LABELS_TYPE_REPAS[type]}
                                        </th>
                                        {joursFenetreMenus.map((col) => {
                                            if (!col.dansSejour) {
                                                return (
                                                    <td
                                                        key={`${col.ymd}-${type}`}
                                                        className={`${planningCal.cellShell} ${planningCal.cellToneEmpty} ${planningCal.cellToneHorsSejour} ${menuStyles.calMenusTdSizing}`}
                                                    >
                                                        <span className={menuStyles.calTdMuted}>—</span>
                                                    </td>
                                                );
                                            }
                                            const datePourAria = formaterDate(`${col.ymd}T12:00:00`);
                                            const menu = menusParJourEtType.get(col.ymd)?.get(type);
                                            if (!menu) {
                                                const ouvrirCellule = () => ouvrirCreation(type, col.ymd);
                                                return (
                                                    <td
                                                        key={`${col.ymd}-${type}`}
                                                        className={`${planningCal.cellShell} ${planningCal.cellToneEmpty} ${planningCal.cellAjoutClic} ${menuStyles.calMenusTdSizing}`}
                                                        {...proprietesTdAjoutPlanning(
                                                            true,
                                                            `Ajouter le menu « ${LABELS_TYPE_REPAS[type]} » du ${datePourAria}`,
                                                            ouvrirCellule,
                                                        )}
                                                    >
                                                        <CalendrierCelluleAjoutHint />
                                                    </td>
                                                );
                                            }
                                            const resume = resumeMenuCourt(menu);
                                            const meta = ligneMetaAllergenesRegimesCalendrier(menu);
                                            const editionDesactivee = deleting && pendingDelete?.id === menu.id;
                                            return (
                                                <td
                                                    key={`${col.ymd}-${type}`}
                                                    className={`${planningCal.cellShell} ${planningCal.cellToneFilled} ${menuStyles.calMenusTdSizing}`}
                                                >
                                                    <CalendrierCarteEditionAvecSuppression
                                                        onEdit={() => ouvrirEdition(menu)}
                                                        editDisabled={editionDesactivee}
                                                        editAriaLabel={`Modifier le menu « ${LABELS_TYPE_REPAS[type]} » du ${datePourAria}`}
                                                        mainButtonStyle={
                                                            {
                                                                "--plan-cal-carte-bg": couleurFondCarteMenuPourTypeRepas(type),
                                                            } as CSSProperties
                                                        }
                                                        onDeleteClick={() => demanderSuppressionMenu(menu)}
                                                        deleteAriaLabel={`Supprimer le menu « ${LABELS_TYPE_REPAS[type]} » du ${datePourAria}`}
                                                        deleteDisabled={editionDesactivee}
                                                    >
                                                        <span className={menuStyles.calMenusCarteResume}>{resume}</span>
                                                        {meta ? (
                                                            <span className={menuStyles.calMenusCarteMeta}>{meta}</span>
                                                        ) : null}
                                                    </CalendrierCarteEditionAvecSuppression>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {menus.length === 0 && !loading && !pageError ? (
                        <p className={planningCal.footnote}>
                            Aucun menu renseigné sur cette plage — cliquez dans une case (jour et type de repas) pour en
                            ajouter un.
                        </p>
                    ) : null}
                </div>
            ) : null}

            {vueMenus === "liste"
                ? datesListe.map((dayISO) => {
                      const menuParType = menusParJourEtType.get(dayISO) ?? new Map<TypeRepas, MenuRepasDto>();
                      const afficherTitreJour = datesListe.length > 1;
                      return (
                          <section key={dayISO} className={menuStyles.daySection}>
                              {afficherTitreJour ? (
                                  <h2 className={menuStyles.dayTitle}>{formaterDate(`${dayISO}T12:00:00`)}</h2>
                              ) : null}
                              <div className={menuStyles.grid}>
                                  {TYPES_REPAS.map((type) => {
                                      const menu = menuParType.get(type);
                                      return (
                                          <article key={`${dayISO}-${type}`} className={menuStyles.card}>
                                              <h2 className={menuStyles.cardTitle}>{LABELS_TYPE_REPAS[type]}</h2>
                                              {menu ? (
                                                  <>
                                                      {renduBlocInfosCarte(menu)}
                                                      <div className={menuStyles.cardActions}>
                                                          <Button color="primary" size="sm" onClick={() => ouvrirEdition(menu)}>
                                                              Modifier
                                                          </Button>
                                                          <Button
                                                              color="danger"
                                                              size="sm"
                                                              outline
                                                              onClick={() => demanderSuppressionMenu(menu)}
                                                          >
                                                              Supprimer
                                                          </Button>
                                                      </div>
                                                  </>
                                              ) : (
                                                  <>
                                                      <p className={menuStyles.empty}>Aucun menu renseigné.</p>
                                                      <Button color="success" size="sm" onClick={() => ouvrirCreation(type, dayISO)}>
                                                          Ajouter
                                                      </Button>
                                                  </>
                                              )}
                                          </article>
                                      );
                                  })}
                              </div>
                          </section>
                      );
                  })
                : null}
            </div>

            <Modal isOpen={editorOpen} toggle={() => !submitting && setEditorOpen(false)} size="lg">
                <ModalHeader toggle={() => !submitting && setEditorOpen(false)}>
                    {editingMenu
                        ? `Modifier — ${LABELS_TYPE_REPAS[editingMenu.typeRepas]}`
                        : creatingType
                          ? `Nouveau menu — ${LABELS_TYPE_REPAS[creatingType]}`
                          : "Menu"}
                    <span className={menuStyles.modalDateMuted}> ({modalDateRepasStr})</span>
                </ModalHeader>
                <ModalBody>
                    <MenuRepasFormulaireCorps
                        typeRepasCourant={typeRepasCourant}
                        menuFormCompact={menuFormCompact}
                        fDetail={fDetail}
                        onChangeDetail={setFDetail}
                        fEntree={fEntree}
                        onChangeEntree={setFEntree}
                        fPlat={fPlat}
                        onChangePlat={setFPlat}
                        fFromage={fFromage}
                        onChangeFromage={setFFromage}
                        fDessert={fDessert}
                        onChangeDessert={setFDessert}
                        fAllergeneIds={fAllergeneIds}
                        onToggleAllergene={(id, checked) =>
                            setFAllergeneIds((prev) => toggleSel(prev, id, checked))
                        }
                        fRegimePreferenceIds={fRegimePreferenceIds}
                        onToggleRegime={(id, checked) =>
                            setFRegimePreferenceIds((prev) => toggleSel(prev, id, checked))
                        }
                        allergCheckboxOptions={allergCheckboxOptions}
                        regimeCheckboxOptions={regimeCheckboxOptions}
                        refsErreur={refsErreur}
                        refsChargeTerminee={refsChargeTerminee}
                        submitting={submitting}
                        css={{
                            checkboxSection: menuStyles.checkboxSection,
                            checkboxScroll: menuStyles.checkboxScroll,
                            checkboxRow: menuStyles.checkboxRow,
                            fieldHint: menuStyles.fieldHint,
                            modalError: menuStyles.modalError,
                        }}
                    />
                </ModalBody>
                <PlanningModalFooterFormulaire
                    messageErreur={modalError ?? undefined}
                    actions={
                        <>
                            <Button color="secondary" onClick={() => setEditorOpen(false)} disabled={submitting}>
                                Annuler
                            </Button>
                            <Button
                                color={editingMenu == null ? "success" : "primary"}
                                onClick={() => void enregistrer()}
                                disabled={submitting}
                            >
                                {submitting
                                    ? "Enregistrement…"
                                    : editingMenu == null
                                      ? "Créer"
                                      : "Enregistrer"}
                            </Button>
                        </>
                    }
                />
            </Modal>

            <Modal isOpen={deleteOpen} toggle={() => !deleting && setDeleteOpen(false)}>
                <ModalHeader toggle={() => !deleting && setDeleteOpen(false)}>Supprimer le menu</ModalHeader>
                <ModalBody>
                    Confirmer la suppression du menu « {pendingDelete ? LABELS_TYPE_REPAS[pendingDelete.typeRepas] : ""} » du{" "}
                    {pendingDelete ? normaliserDateRepasISO(pendingDelete.dateRepas) : ""} ?
                    {modalError && <p className={menuStyles.modalError}>{modalError}</p>}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                        Annuler
                    </Button>
                    <Button color="danger" onClick={() => void confirmerSuppression()} disabled={deleting}>
                        {deleting ? "Suppression…" : "Supprimer"}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default DetailsSejourMenus;
