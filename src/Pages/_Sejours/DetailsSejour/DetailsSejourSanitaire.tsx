import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouteLoaderData } from "react-router-dom";
import { Input } from "reactstrap";
import styles from "./DetailsSejour.module.scss";
import sanStyles from "./DetailsSejourSanitaire.module.scss";
import type { EnfantDossierSanitaireLigneDto, SejourDTO } from "../../../types/api";
import { sejourEnfantService } from "../../../services/sejour-enfant.service";
import ListeSanitaireDossiers, {
  type SanitaireColonnesOptionnelles,
} from "../../../components/Liste/ListeSanitaireDossiers";

type LoaderOk = { sejour: SejourDTO };

const OPTS_STORAGE_PREFIX = "enjoy.sanitaire.opts.";

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

function cleListeSanitaire(sejourId: number, o: SanitaireColonnesOptionnelles): string {
  const bits = CLES_OPTS.map((k) => (o[k] ? "1" : "0")).join("");
  return `sanitaire-${sejourId}-${bits}`;
}

const DetailsSejourSanitaire = () => {
  const { id: idParam } = useParams<{ id: string }>();
  const sejourId = idParam ? parseInt(idParam, 10) : NaN;

  const loaderData = useRouteLoaderData("sejour-detail") as LoaderOk | Error | undefined;
  const sejour = loaderData && !(loaderData instanceof Error) ? loaderData.sejour : undefined;

  const [lignes, setLignes] = useState<EnfantDossierSanitaireLigneDto[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [optsColonnes, setOptsColonnes] = useState<SanitaireColonnesOptionnelles>(() =>
    Number.isFinite(sejourId) ? lireOptsColonnes(sejourId) : { ...OPTS_DEFAUT },
  );

  useEffect(() => {
    if (Number.isFinite(sejourId)) {
      setOptsColonnes(lireOptsColonnes(sejourId));
    }
  }, [sejourId]);

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

  const charger = useCallback(async () => {
    if (!Number.isFinite(sejourId)) return;
    setChargement(true);
    setErreur(null);
    try {
      const data = await sejourEnfantService.listerDossiersEnfantsSanitaire(sejourId);
      setLignes(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setLignes([]);
      setErreur(e instanceof Error ? e.message : "Impossible de charger les dossiers.");
    } finally {
      setChargement(false);
    }
  }, [sejourId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const listeKey = useMemo(() => {
    if (!Number.isFinite(sejourId)) return "sanitaire";
    return cleListeSanitaire(sejourId, optsColonnes);
  }, [sejourId, optsColonnes]);

  if (!sejour || !Number.isFinite(sejourId)) {
    return (
      <main className={`${styles.pageContainer} ${sanStyles.pageSanitaire}`}>
        <p className={sanStyles.emptyState}>Séjour introuvable ou accès incomplet.</p>
      </main>
    );
  }

  return (
    <main className={`${styles.pageContainer} ${sanStyles.pageSanitaire}`}>
      {erreur ? <div className={sanStyles.erreurBanner}>{erreur}</div> : null}

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
          <Input type="checkbox" checked={optsColonnes.medical} onChange={(e) => changerOpts({ medical: e.target.checked })} />
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
    </main>
  );
};

export default DetailsSejourSanitaire;
