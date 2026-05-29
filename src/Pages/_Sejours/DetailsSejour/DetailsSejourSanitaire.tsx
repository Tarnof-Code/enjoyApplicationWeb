import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoaderData, useParams, useRouteLoaderData, useNavigate } from "react-router-dom";
import { Button, Input } from "reactstrap";
import styles from "./DetailsSejour.module.scss";
import sanStyles from "./DetailsSejourSanitaire.module.scss";
import type { CahierInfirmerieEntreeDto, SejourDTO } from "../../../types/api";
import { cahierInfirmerieService } from "../../../services/cahier-infirmerie.service";
import { navigateToRouteError } from "../../../helpers/routeError";
import type { SanitaireLoaderData } from "./detailsSejourSanitaireLoader";
import ListeSanitaireDossiers, {
  type SanitaireColonnesOptionnelles,
} from "../../../components/Liste/ListeSanitaireDossiers";
import ListeCahierInfirmerie from "../../../components/Liste/ListeCahierInfirmerie";
import type { EnfantOptionCahier } from "../../../components/Forms/CahierInfirmerieForm";

type LoaderOk = { sejour: SejourDTO };

const OPTS_STORAGE_PREFIX = "enjoy.sanitaire.opts.";
const VUE_STORAGE_PREFIX = "enjoy.sanitaire.vue.";

type VueSanitaire = "dossiers" | "cahier";

const CLES_OPTS = [
  "allergies",
  "traitements",
  "contactsParents",
  "medical",
  "alimentation",
  "complements",
] as const satisfies readonly (keyof SanitaireColonnesOptionnelles)[];

const OPTS_DEFAUT: SanitaireColonnesOptionnelles = {
  allergies: false,
  traitements: false,
  contactsParents: false,
  medical: false,
  alimentation: false,
  complements: false,
};

function lireOptsColonnes(sejourId: number): SanitaireColonnesOptionnelles {
  try {
    const raw = localStorage.getItem(`${OPTS_STORAGE_PREFIX}${sejourId}`);
    if (!raw) return { ...OPTS_DEFAUT };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next = { ...OPTS_DEFAUT };
    for (const k of CLES_OPTS) {
      if (typeof parsed[k] === "boolean") next[k] = parsed[k];
    }
    return next;
  } catch {
    return { ...OPTS_DEFAUT };
  }
}

function ecrireOptsColonnes(sejourId: number, next: SanitaireColonnesOptionnelles) {
  try {
    localStorage.setItem(`${OPTS_STORAGE_PREFIX}${sejourId}`, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function lireVueSanitaire(sejourId: number): VueSanitaire {
  try {
    const raw = localStorage.getItem(`${VUE_STORAGE_PREFIX}${sejourId}`);
    if (raw === "cahier" || raw === "dossiers") return raw;
  } catch {
    /* ignore */
  }
  return "cahier";
}

function ecrireVueSanitaire(sejourId: number, vue: VueSanitaire) {
  try {
    localStorage.setItem(`${VUE_STORAGE_PREFIX}${sejourId}`, vue);
  } catch {
    /* ignore */
  }
}

function cleListeSanitaire(sejourId: number, o: SanitaireColonnesOptionnelles): string {
  const bits = CLES_OPTS.map((k) => (o[k] ? "1" : "0")).join("");
  return `sanitaire-${sejourId}-${bits}`;
}

const DetailsSejourSanitaire = () => {
  const sanitaireLoaderData = useLoaderData() as SanitaireLoaderData;
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const sejourId = idParam ? parseInt(idParam, 10) : NaN;

  const loaderData = useRouteLoaderData("sejour-detail") as LoaderOk | undefined;
  const sejour = loaderData?.sejour;

  const [vue, setVue] = useState<VueSanitaire>(() =>
    Number.isFinite(sejourId) ? lireVueSanitaire(sejourId) : "cahier",
  );

  const lignes = sanitaireLoaderData.lignes;
  const chargement = false;
  const erreur = null as string | null;

  const [entreesCahier, setEntreesCahier] = useState<CahierInfirmerieEntreeDto[]>(
    sanitaireLoaderData.entreesCahier
  );
  const [chargementCahier, setChargementCahier] = useState(false);
  const [erreurCahier, setErreurCahier] = useState<string | null>(null);

  const [optsColonnes, setOptsColonnes] = useState<SanitaireColonnesOptionnelles>(() =>
    Number.isFinite(sejourId) ? lireOptsColonnes(sejourId) : { ...OPTS_DEFAUT },
  );

  useEffect(() => {
    if (Number.isFinite(sejourId)) {
      setOptsColonnes(lireOptsColonnes(sejourId));
      setVue(lireVueSanitaire(sejourId));
    }
  }, [sejourId]);

  const changerVue = useCallback(
    (v: VueSanitaire) => {
      if (!Number.isFinite(sejourId)) return;
      setVue(v);
      ecrireVueSanitaire(sejourId, v);
    },
    [sejourId],
  );

  const changerOpts = useCallback(
    (patch: Partial<SanitaireColonnesOptionnelles>) => {
      if (!Number.isFinite(sejourId)) return;
      setOptsColonnes((prev) => {
        const next = { ...prev, ...patch };
        ecrireOptsColonnes(sejourId, next);
        return next;
      });
    },
    [sejourId],
  );

  const chargerCahier = useCallback(async () => {
    if (!Number.isFinite(sejourId)) return;
    setChargementCahier(true);
    setErreurCahier(null);
    try {
      const data = await cahierInfirmerieService.listerEntrees(sejourId);
      setEntreesCahier(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      if (navigateToRouteError(navigate, e)) return;
      setEntreesCahier([]);
      setErreurCahier(e instanceof Error ? e.message : "Impossible de charger le cahier d'infirmerie.");
    } finally {
      setChargementCahier(false);
    }
  }, [sejourId, navigate]);

  const listeKey = useMemo(() => {
    if (!Number.isFinite(sejourId)) return "sanitaire";
    return cleListeSanitaire(sejourId, optsColonnes);
  }, [sejourId, optsColonnes]);

  const enfantsPourCahier: EnfantOptionCahier[] = useMemo(
    () =>
      lignes.map((l) => ({
        id: l.enfantId,
        prenom: l.prenom,
        nom: l.nom,
      })),
    [lignes],
  );

  if (!sejour || !Number.isFinite(sejourId)) {
    return (
      <main className={`${styles.pageContainer} ${sanStyles.pageSanitaire}`}>
        <p className={sanStyles.emptyState}>Séjour introuvable ou accès incomplet.</p>
      </main>
    );
  }

  return (
    <main className={`${styles.pageContainer} ${sanStyles.pageSanitaire}`}>
      <nav className={sanStyles.sanitaireTopBar} aria-label="Vue sanitaire">
        <div className={sanStyles.vueSwitchButtons}>
          <Button
            type="button"
            color={vue === "cahier" ? "primary" : "secondary"}
            outline={vue !== "cahier"}
            onClick={() => changerVue("cahier")}
            className={sanStyles.vueSwitchBtn}
          >
            Cahier d'infirmerie
          </Button>
          <Button
            type="button"
            color={vue === "dossiers" ? "primary" : "secondary"}
            outline={vue !== "dossiers"}
            onClick={() => changerVue("dossiers")}
            className={sanStyles.vueSwitchBtn}
          >
            Dossiers sanitaires
          </Button>
        </div>
        {vue === "dossiers" ? (
          <section className={sanStyles.optionsBar} aria-label="Colonnes affichées">
            <label className={sanStyles.optionToggle}>
              <Input
                type="checkbox"
                checked={optsColonnes.allergies}
                onChange={(e) => changerOpts({ allergies: e.target.checked })}
              />
              Allergies
            </label>
            <label className={sanStyles.optionToggle}>
              <Input
                type="checkbox"
                checked={optsColonnes.traitements}
                onChange={(e) => changerOpts({ traitements: e.target.checked })}
              />
              Traitements
            </label>
            <label className={sanStyles.optionToggle}>
              <Input
                type="checkbox"
                checked={optsColonnes.contactsParents}
                onChange={(e) => changerOpts({ contactsParents: e.target.checked })}
              />
              Contacts parents
            </label>
            <label className={sanStyles.optionToggle}>
              <Input
                type="checkbox"
                checked={optsColonnes.medical}
                onChange={(e) => changerOpts({ medical: e.target.checked })}
              />
              Infos médicales &amp; PAI
            </label>
            <label className={sanStyles.optionToggle}>
              <Input
                type="checkbox"
                checked={optsColonnes.alimentation}
                onChange={(e) => changerOpts({ alimentation: e.target.checked })}
              />
              Alimentation
            </label>
            <label className={sanStyles.optionToggle}>
              <Input
                type="checkbox"
                checked={optsColonnes.complements}
                onChange={(e) => changerOpts({ complements: e.target.checked })}
              />
              Autres infos
            </label>
          </section>
        ) : null}
      </nav>

      {vue === "dossiers" ? (
        <>
          {erreur ? <div className={sanStyles.erreurBanner}>{erreur}</div> : null}

          <div className={sanStyles.listeWrap}>
            <ListeSanitaireDossiers
              listeKey={listeKey}
              sejourId={sejourId}
              lignes={lignes}
              loading={chargement}
              colonnesOptionnelles={optsColonnes}
              errorMessage={null}
            />
          </div>
        </>
      ) : (
        <div className={sanStyles.listeWrap}>
          <ListeCahierInfirmerie
            sejourId={sejourId}
            sejour={sejour}
            entrees={entreesCahier}
            chargement={chargementCahier}
            enfantsOptions={enfantsPourCahier}
            onRafraichir={() => void chargerCahier()}
            messageErreur={erreurCahier}
          />
        </div>
      )}
    </main>
  );
};

export default DetailsSejourSanitaire;
