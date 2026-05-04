import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouteLoaderData, useNavigate } from "react-router-dom";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import styles from "./DetailsSejour.module.scss";
import menuStyles from "./DetailsSejourMenus.module.scss";
import { CalendrierNavigationPeriode } from "../../../components/Liste/ListeActivitesCalendrier";
import { enumererJoursDuSejour } from "../../../components/Liste/listeActivitesUtils";
import { useCalendrierFenetreJours } from "../../../components/Liste/useCalendrierFenetreJours";
import { MenuRepasDto, ReferenceAlimentaireDto, SaveMenuRepasRequest, SejourDTO, TypeRepas } from "../../../types/api";
import { dateVersChaineISO, normaliserDateRepasISO } from "../../../helpers/dateIsoLocal";
import formaterDate from "../../../helpers/formaterDate";
import { optionsCheckboxReferencesAlimentaires } from "../../../helpers/optionsReferencesAlimentaires";
import { trierReferencesAlimentaires } from "../../../services/references-alimentaires.service";
import { sejourMenuService } from "../../../services/sejour-menu.service";

const TYPES_REPAS: TypeRepas[] = ["PETIT_DEJEUNER", "DEJEUNER", "GOUTER", "DINER"];

const TYPES_REPAS_SET = new Set<TypeRepas>(TYPES_REPAS);

/** Jour `YYYY-MM-DD` pour indexer les cartes (chaîne ISO, timestamp, tableau type Jackson LocalDate `[année, mois, jour]`, etc.). */
function jourISOdepuisDateRepasApi(v: unknown): string {
    if (v == null) return "";
    if (typeof v === "string") return normaliserDateRepasISO(v);
    if (typeof v === "number" && Number.isFinite(v)) return dateVersChaineISO(new Date(v));
    if (Array.isArray(v) && v.length >= 3) {
        const y = Number(v[0]);
        const mo = Number(v[1]);
        const d = Number(v[2]);
        if ([y, mo, d].every((n) => Number.isFinite(n))) {
            return dateVersChaineISO(new Date(y, mo - 1, d));
        }
    }
    return "";
}

/** Même clés que `TYPES_REPAS` (enum JSON `{ name }`, libellés, casse). */
function typeRepasNormalisePourCarte(v: unknown): TypeRepas | null {
    let brut: unknown = v;
    if (brut && typeof brut === "object" && "name" in (brut as object)) {
        brut = (brut as { name?: unknown }).name;
    }
    if (typeof brut !== "string") return null;
    let s = brut
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
    if (s === "PETITDEJEUNER") s = "PETIT_DEJEUNER";
    if (TYPES_REPAS_SET.has(s as TypeRepas)) return s as TypeRepas;
    return null;
}

const LABELS_TYPE_REPAS: Record<TypeRepas, string> = {
    PETIT_DEJEUNER: "Petit-déjeuner",
    DEJEUNER: "Déjeuner",
    GOUTER: "Goûter",
    DINER: "Dîner",
};

function estPetitDejeunerOuGouter(t: TypeRepas): boolean {
    return t === "PETIT_DEJEUNER" || t === "GOUTER";
}

function chaineOuNull(v: string): string | null {
    const t = v.trim();
    return t === "" ? null : t;
}

function ligneLibellesRefs(refs: ReferenceAlimentaireDto[] | undefined): string {
    const list = refs ?? [];
    if (!list.length) return "";
    return trierReferencesAlimentaires(list)
        .map((r) => r.libelle)
        .join(", ");
}

const SUFFIX_LIBELLE_INACTIF = " (inactif)";

/** Libellés « Sans porc », « Sans viande » → « Porc », « Viande » pour la lecture menus (ce que le plat évoque). */
function libelleCompositionPlatPourAffichage(libelle: string): string {
    const t = libelle.trim();
    const m = /^Sans\s+/i.exec(t);
    if (m) {
        const rest = t.slice(m[0].length).trim();
        if (!rest) return t;
        return rest.charAt(0).toUpperCase() + rest.slice(1);
    }
    return t;
}

function libelleCompositionCheckboxPourAffichage(texteOption: string): string {
    if (texteOption.endsWith(SUFFIX_LIBELLE_INACTIF)) {
        const base = texteOption.slice(0, -SUFFIX_LIBELLE_INACTIF.length);
        return `${libelleCompositionPlatPourAffichage(base)}${SUFFIX_LIBELLE_INACTIF}`;
    }
    return libelleCompositionPlatPourAffichage(texteOption);
}

function ligneLibellesCompositionMenu(refs: ReferenceAlimentaireDto[] | undefined): string {
    const list = refs ?? [];
    if (!list.length) return "";
    return trierReferencesAlimentaires(list)
        .map((r) => libelleCompositionPlatPourAffichage(r.libelle))
        .join(", ");
}

/** Agrégation dossiers enfants du séjour + références déjà sur le menu édité (références hors périmètre dossiers mais encore sur le plat). */
function fusionnerRefsPourFormulaire(
    base: ReferenceAlimentaireDto[],
    supplementaires?: ReferenceAlimentaireDto[] | undefined,
): ReferenceAlimentaireDto[] {
    const map = new Map<number, ReferenceAlimentaireDto>();
    for (const r of base) {
        map.set(r.id, r);
    }
    for (const r of supplementaires ?? []) {
        if (!map.has(r.id)) {
            map.set(r.id, r);
        }
    }
    return trierReferencesAlimentaires([...map.values()]);
}

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

    const menusParJourEtType = useMemo(() => {
        const outer = new Map<string, Map<TypeRepas, MenuRepasDto>>();
        menus.forEach((m) => {
            const d = jourISOdepuisDateRepasApi(m.dateRepas as unknown);
            if (!d) return;
            const type = typeRepasNormalisePourCarte(m.typeRepas as unknown);
            if (!type) return;
            if (!outer.has(d)) outer.set(d, new Map());
            outer.get(d)!.set(type, { ...m, dateRepas: d, typeRepas: type });
        });
        return outer;
    }, [menus]);

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
        const idsAllerg = [...fAllergeneIds];
        const idsRegimes = [...fRegimePreferenceIds];

        if (estPetitDejeunerOuGouter(typeRepasCourant)) {
            return {
                dateRepas: modalDateRepasStr,
                typeRepas: typeRepasCourant,
                detailPetitDejeunerOuGouter: chaineOuNull(fDetail),
                entree: null,
                plat: null,
                fromageOuEntremet: null,
                dessert: null,
                allergeneIds: idsAllerg,
                regimePreferenceIds: idsRegimes,
            };
        }
        return {
            dateRepas: modalDateRepasStr,
            typeRepas: typeRepasCourant,
            detailPetitDejeunerOuGouter: null,
            entree: chaineOuNull(fEntree),
            plat: chaineOuNull(fPlat),
            fromageOuEntremet: chaineOuNull(fFromage),
            dessert: chaineOuNull(fDessert),
            allergeneIds: idsAllerg,
            regimePreferenceIds: idsRegimes,
        };
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
        const ligneA = ligneLibellesRefs(menu.allergenes);
        const ligneR = ligneLibellesCompositionMenu(menu.regimesEtPreferences);

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

        if (!lignesMenu.length && !ligneA && !ligneR) return null;

        return (
            <div className={menuStyles.refBlock}>
                {lignesMenu}
                {ligneA ? (
                    <div>
                        <span className={menuStyles.refLabel}>Allergènes</span>
                        <span>{ligneA}</span>
                    </div>
                ) : null}
                {ligneR ? (
                    <div>
                        <span className={menuStyles.refLabel}>Régimes et préférences :</span>
                        <span>{ligneR}</span>
                    </div>
                ) : null}
            </div>
        );
    };

    const renduCasesRefsModal = () => (
        <>
            {refsErreur ? (
                <p className={menuStyles.modalError}>{refsErreur} Les menus peuvent être enregistrés sans ces sélections.</p>
            ) : null}
            <FormGroup className={menuStyles.checkboxSection}>
                <Label>Allergènes</Label>
                <div className={menuStyles.checkboxScroll} role="group" aria-label="Allergènes du menu">
                    {allergCheckboxOptions.length === 0 ? (
                        refsErreur ? null : !refsChargeTerminee ? (
                            <span className={menuStyles.fieldHint}>Chargement…</span>
                        ) : (
                            <span className={menuStyles.fieldHint}>
                                Aucune allergène relevée sur les dossiers des enfants inscrits à ce séjour.
                            </span>
                        )
                    ) : (
                        allergCheckboxOptions.map((opt) => (
                            <label key={opt.value} className={menuStyles.checkboxRow}>
                                <Input
                                    type="checkbox"
                                    checked={fAllergeneIds.includes(opt.value)}
                                    disabled={submitting}
                                    onChange={(e) =>
                                        setFAllergeneIds((prev) => toggleSel(prev, opt.value, e.target.checked))
                                    }
                                />
                                <span>{opt.label}</span>
                            </label>
                        ))
                    )}
                </div>
            </FormGroup>
            <FormGroup className={menuStyles.checkboxSection}>
                <Label>Régimes</Label>
                <div className={menuStyles.checkboxScroll} role="group" aria-label="Régimes et préférences">
                    {regimeCheckboxOptions.length === 0 ? (
                        refsErreur ? null : !refsChargeTerminee ? (
                            <span className={menuStyles.fieldHint}>Chargement…</span>
                        ) : (
                            <span className={menuStyles.fieldHint}>
                                Aucun régime ou préférence relevé sur les dossiers des enfants inscrits à ce séjour.
                            </span>
                        )
                    ) : (
                        regimeCheckboxOptions.map((opt) => (
                            <label key={opt.value} className={menuStyles.checkboxRow}>
                                <Input
                                    type="checkbox"
                                    checked={fRegimePreferenceIds.includes(opt.value)}
                                    disabled={submitting}
                                    onChange={(e) =>
                                        setFRegimePreferenceIds((prev) => toggleSel(prev, opt.value, e.target.checked))
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
                    <div className={menuStyles.menusPeriodeWrap} role="region" aria-label="Période des menus affichés">
                        <CalendrierNavigationPeriode
                            libellePlage={libellePlageMenus}
                            peutReculer={peutReculerMenus}
                            peutAvancer={peutAvancerMenus}
                            onReculer={() => decalageFenetreMenus(-1)}
                            onAvancer={() => decalageFenetreMenus(1)}
                            nombreJoursVue={menusNombreJoursVue}
                            onNombreJoursVueChange={setMenusNombreJoursVue}
                        />
                        {loading ? <span className={menuStyles.loadingHint}>Chargement…</span> : null}
                    </div>
                ) : null}
            </header>

            {pageError && <div className={menuStyles.pageError}>{pageError}</div>}
            {refsErreur && !pageError && (
                <div className={menuStyles.pageError} role="status">
                    Références dossiers enfants (menus) : {refsErreur}
                </div>
            )}

            {datesListe.map((dayISO) => {
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
                                                        onClick={() => {
                                                            setModalError(null);
                                                            setPendingDelete(menu);
                                                            setDeleteOpen(true);
                                                        }}
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
            })}

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
                    {typeRepasCourant && estPetitDejeunerOuGouter(typeRepasCourant) ? (
                        <FormGroup>
                            <Input
                                id="menu-detail"
                                type="textarea"
                                rows={menuFormCompact ? 1 : 6}
                                value={fDetail}
                                onChange={(e) => setFDetail(e.target.value)}
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
                                    onChange={(e) => setFEntree(e.target.value)}
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
                                    onChange={(e) => setFPlat(e.target.value)}
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
                                    onChange={(e) => setFFromage(e.target.value)}
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
                                    onChange={(e) => setFDessert(e.target.value)}
                                    disabled={submitting}
                                />
                            </FormGroup>
                        </>
                    )}
                    {renduCasesRefsModal()}
                    {modalError && <p className={menuStyles.modalError}>{modalError}</p>}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setEditorOpen(false)} disabled={submitting}>
                        Annuler
                    </Button>
                    <Button color="success" onClick={() => void enregistrer()} disabled={submitting}>
                        {submitting ? "Enregistrement…" : "Enregistrer"}
                    </Button>
                </ModalFooter>
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
