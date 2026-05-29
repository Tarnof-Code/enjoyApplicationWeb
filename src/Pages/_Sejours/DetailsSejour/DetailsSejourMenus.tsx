import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLoaderData, useRouteLoaderData, useNavigate } from "react-router-dom";
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
import type { MenuRepasDto, SaveMenuRepasRequest, SejourDTO, TypeRepas } from "../../../types/api";
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
    lignesCompositionMenuPourAffichage,
    type ResumeMenuCourtChampsVisibles,
} from "../../../helpers/menuRepas";
import {
    cleLocalStorageAffichageMenus,
    lirePreferencesAffichageMenusSejour,
} from "../../../helpers/menuRepasAffichageSejour";
import { optionsCheckboxReferencesAlimentaires } from "../../../helpers/optionsReferencesAlimentaires";
import { peutGererMembresEquipeSejour } from "../../../helpers/peutGererMembresEquipeSejour";
import { sejourMenuService } from "../../../services/sejour-menu.service";
import { accountService } from "../../../services/account.service";
import { navigateToRouteError } from "../../../helpers/routeError";
import type { MenusLoaderData } from "./detailsSejourMenusLoader";
import { normaliserMenusRepas, paramsListerMenusPourSejour } from "./menusSejourUtils";

type LoaderOk = { sejour: SejourDTO };

const DetailsSejourMenus: React.FC = () => {
    const menusLoaderData = useLoaderData() as MenusLoaderData;
    const loaderData = useRouteLoaderData("sejour-detail") as LoaderOk | undefined;
    const navigate = useNavigate();
    const sejour = loaderData?.sejour;

    const [modalDateRepasStr, setModalDateRepasStr] = useState<string>("");
    const [refsAllergenes, setRefsAllergenes] = useState(menusLoaderData.refsAllergenes);
    const [refsRegimes, setRefsRegimes] = useState(menusLoaderData.refsRegimes);
    const [menus, setMenus] = useState<MenuRepasDto[]>(menusLoaderData.menus);
    const [loading, setLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    useEffect(() => {
        setRefsAllergenes(menusLoaderData.refsAllergenes);
        setRefsRegimes(menusLoaderData.refsRegimes);
        setMenus(menusLoaderData.menus);
    }, [menusLoaderData]);

    const refsChargeTerminee = !loading;
    const refsErreur = pageError;

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

    /** Relecture préférences depuis le stockage après changements (paramétrage, autre onglet). */
    const [preferencesMenusNonce, setPreferencesMenusNonce] = useState(0);

    const peutGererMenus = useMemo(() => {
        if (!sejour) return false;
        const sub = accountService.getTokenInfo()?.payload?.sub;
        return peutGererMembresEquipeSejour(
            typeof sub === "string" ? sub : undefined,
            sejour.directeur,
            sejour.equipe,
        );
    }, [sejour]);

    const prefsAffichageMenus = useMemo(
        () => (sejour ? lirePreferencesAffichageMenusSejour(sejour.id) : null),
        [sejour?.id, preferencesMenusNonce],
    );

    useEffect(() => {
        const id = sejour?.id;
        const onPersoMenus = (ev: Event) => {
            const d = (ev as CustomEvent<{ sejourId?: number }>).detail;
            if (d?.sejourId === id) setPreferencesMenusNonce((n) => n + 1);
        };
        window.addEventListener("enjoy-menu-affichage-changed", onPersoMenus);
        const onStorage = (e: StorageEvent) => {
            if (id !== undefined && e.key === cleLocalStorageAffichageMenus(id))
                setPreferencesMenusNonce((n) => n + 1);
        };
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("enjoy-menu-affichage-changed", onPersoMenus);
            window.removeEventListener("storage", onStorage);
        };
    }, [sejour?.id]);

    const typesRepasPourAffichageMenus = prefsAffichageMenus?.typesRepasVisibles ?? TYPES_REPAS;
    const champsComposeMenusVisibles =
        prefsAffichageMenus?.champsComposeVisibles ?? null;

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

    const rafraichirMenus = useCallback(async () => {
        if (!sejour) return;
        const params = paramsListerMenusPourSejour(sejour);
        if (!params) return;
        setLoading(true);
        setPageError(null);
        try {
            const list = await sejourMenuService.listerMenus(sejour.id, params);
            setMenus(normaliserMenusRepas(list));
        } catch (e: unknown) {
            if (navigateToRouteError(navigate, e)) return;
            setPageError(e instanceof Error ? e.message : "Impossible de charger les menus");
            setMenus([]);
        } finally {
            setLoading(false);
        }
    }, [sejour, navigate]);

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
        if (!peutGererMenus) return;
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
        if (!peutGererMenus) return;
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
            await rafraichirMenus();
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
            await rafraichirMenus();
        } catch (e: unknown) {
            setModalError(e instanceof Error ? e.message : "Suppression impossible");
        } finally {
            setDeleting(false);
        }
    };

    const renduBlocInfosCarte = (menu: MenuRepasDto, cv: ResumeMenuCourtChampsVisibles | null) => {
        const metaAllergRegimes = ligneMetaAllergenesRegimesCalendrier(menu);
        const lignes = lignesCompositionMenuPourAffichage(menu, cv);
        const lignesMenu: ReactNode[] = lignes.map(({ key, label, valeur }) => (
            <div key={key}>
                <span className={menuStyles.refLabel}>{label}</span>
                <span>{valeur}</span>
            </div>
        ));

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
        if (!peutGererMenus) return;
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

    if (!sejour) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/mes-sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Séjour introuvable</p>
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
                                {typesRepasPourAffichageMenus.map((type) => (
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
                                                if (!peutGererMenus) {
                                                    return (
                                                        <td
                                                            key={`${col.ymd}-${type}`}
                                                            className={`${planningCal.cellShell} ${planningCal.cellToneEmpty} ${menuStyles.calMenusTdSizing}`}
                                                        >
                                                            <span className={menuStyles.calTdMuted}>—</span>
                                                        </td>
                                                    );
                                                }
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
                                            const lignesMenuCal = lignesCompositionMenuPourAffichage(
                                                menu,
                                                champsComposeMenusVisibles,
                                            );
                                            const partiesCal = lignesMenuCal.filter(
                                                (l) => l.valeur.trim().length > 0 && l.valeur !== "—",
                                            );
                                            const meta = ligneMetaAllergenesRegimesCalendrier(menu);
                                            const editionDesactivee = deleting && pendingDelete?.id === menu.id;
                                            return (
                                                <td
                                                    key={`${col.ymd}-${type}`}
                                                    className={`${planningCal.cellShell} ${planningCal.cellToneFilled} ${menuStyles.calMenusTdSizing}`}
                                                >
                                                    <CalendrierCarteEditionAvecSuppression
                                                        lectureSeule={!peutGererMenus}
                                                        onEdit={() => ouvrirEdition(menu)}
                                                        editDisabled={editionDesactivee}
                                                        editAriaLabel={
                                                            peutGererMenus
                                                                ? `Modifier le menu « ${LABELS_TYPE_REPAS[type]} » du ${datePourAria}`
                                                                : `Menu « ${LABELS_TYPE_REPAS[type]} » du ${datePourAria}`
                                                        }
                                                        mainButtonStyle={
                                                            {
                                                                "--plan-cal-carte-bg": couleurFondCarteMenuPourTypeRepas(type),
                                                            } as CSSProperties
                                                        }
                                                        onDeleteClick={() => demanderSuppressionMenu(menu)}
                                                        deleteAriaLabel={`Supprimer le menu « ${LABELS_TYPE_REPAS[type]} » du ${datePourAria}`}
                                                        deleteDisabled={editionDesactivee}
                                                    >
                                                        <div className={menuStyles.calMenusCarteCorps}>
                                                            <div className={menuStyles.calMenusCarteResume}>
                                                                {partiesCal.length === 0 ? (
                                                                    <div className={menuStyles.calMenusCarteLigne}>—</div>
                                                                ) : (
                                                                    partiesCal.map((l) => (
                                                                        <div key={l.key} className={menuStyles.calMenusCarteLigne}>
                                                                            {l.valeur}
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                            {meta ? (
                                                                <span className={menuStyles.calMenusCarteMeta}>{meta}</span>
                                                            ) : null}
                                                        </div>
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
                            {peutGererMenus
                                ? "Aucun menu renseigné sur cette plage — cliquez dans une case (jour et type de repas) pour en ajouter un."
                                : "Aucun menu renseigné sur cette plage."}
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
                                  {typesRepasPourAffichageMenus.map((type) => {
                                      const menu = menuParType.get(type);
                                      return (
                                          <article key={`${dayISO}-${type}`} className={menuStyles.card}>
                                              <h2 className={menuStyles.cardTitle}>{LABELS_TYPE_REPAS[type]}</h2>
                                              {menu ? (
                                                  <>
                                                      {renduBlocInfosCarte(menu, champsComposeMenusVisibles)}
                                                      {peutGererMenus ? (
                                                          <div className={menuStyles.cardActions}>
                                                              <Button
                                                                  color="primary"
                                                                  size="sm"
                                                                  onClick={() => ouvrirEdition(menu)}
                                                              >
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
                                                      ) : null}
                                                  </>
                                              ) : (
                                                  <>
                                                      <p className={menuStyles.empty}>Aucun menu renseigné.</p>
                                                      {peutGererMenus ? (
                                                          <Button
                                                              color="success"
                                                              size="sm"
                                                              onClick={() => ouvrirCreation(type, dayISO)}
                                                          >
                                                              Ajouter
                                                          </Button>
                                                      ) : null}
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
                        champsComposeVisibles={champsComposeMenusVisibles}
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
                    {pendingDelete
                        ? `Confirmer la suppression du ${LABELS_TYPE_REPAS[pendingDelete.typeRepas].toLocaleLowerCase("fr-FR")} ?`
                        : null}
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
