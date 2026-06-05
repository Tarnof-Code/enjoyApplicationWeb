import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button, FormGroup, Input, InputGroup, InputGroupText, Label } from "reactstrap";
import type {
  CahierInfirmerieEntreeDto,
  SaveCahierInfirmerieEntreeRequest,
  TypeAppelInfirmerie,
  TypeSoinInfirmerie,
} from "../../types/api";
import { cahierInfirmerieService } from "../../services/cahier-infirmerie.service";
import { getApiErrorMessage } from "../../helpers/axiosError";
import { parseDate } from "../../helpers/formaterDate";
import {
  LIBELLE_APPEL,
  LIBELLE_SOIN,
  ORDRE_APPELS,
  ORDRE_SOINS,
} from "../../constants/cahierInfirmerieLabels";
import { trierEnfantsParPrenom, trierParPrenomPuisNom } from "../../helpers/trierUtilisateurs";
import styles from "./CahierInfirmerieForm.module.scss";

export type EnfantOptionCahier = { id: number; prenom: string; nom: string };

/** Candidats soigneur : directeur + équipe du séjour. */
export type MembreSoigneurOption = { tokenId: string; nom: string; prenom: string };

function AstChampObligatoire() {
  return (
    <abbr className="text-danger text-decoration-none" title="Obligatoire">
      *
    </abbr>
  );
}

/** Accepte ISO, instant numérique (s ou ms) — aligné sur `parseDate` pour cohérence avec l’API. */
function dateVersChampLocal(valeur: string | number): string {
  const d = parseDate(valeur);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function champLocalVersIso(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

function libelleEnfant(e: EnfantOptionCahier): string {
  return `${e.prenom} ${e.nom}`.trim();
}

function temperatureInitialeVersChamp(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "";
  const arrondi = Math.round(v * 10) / 10;
  return String(arrondi);
}

function nombreDecimalesAuPlus(t: string, max: number): boolean {
  const i = t.indexOf(".");
  if (i === -1) return true;
  return t.length - i - 1 <= max;
}

function parserTemperatureCelsius(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim().replace(",", ".");
  if (t === "") return { ok: false, message: "Indiquez la température en °C (nombre décimal)." };
  if (!nombreDecimalesAuPlus(t, 1)) return { ok: false, message: "Au plus une décimale pour la température." };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, message: "Température invalide." };
  if (n < 30 || n > 45) return { ok: false, message: "La température doit être comprise entre 30 et 45 °C." };
  const arrondi = Math.round(n * 10) / 10;
  return { ok: true, value: arrondi };
}

function enfantCorrespondRecherche(recherche: string, e: EnfantOptionCahier): boolean {
  const r = recherche.trim().toLowerCase();
  if (!r) return true;
  const haystacks = [
    libelleEnfant(e),
    `${e.nom} ${e.prenom}`,
    e.prenom,
    e.nom,
  ].map((s) => s.toLowerCase());
  return haystacks.some((h) => h.includes(r));
}

export type CahierInfirmerieFormProps = {
  sejourId: number;
  enfants: EnfantOptionCahier[];
  entreeInitiale?: CahierInfirmerieEntreeDto | null;
  /** JWT sub — valeur par défaut du soigneur à la création. */
  utilisateurConnecteTokenId: string;
  soigneursEligibles: MembreSoigneurOption[];
  onSucces: () => void;
  onAnnuler: () => void;
};

const CahierInfirmerieForm: React.FC<CahierInfirmerieFormProps> = ({
  sejourId,
  enfants,
  entreeInitiale,
  utilisateurConnecteTokenId,
  soigneursEligibles,
  onSucces,
  onAnnuler,
}) => {
  const estEdition = !!entreeInitiale;

  const [dateHeureLocal, setDateHeureLocal] = useState(() =>
    entreeInitiale ? dateVersChampLocal(entreeInitiale.dateHeure) : dateVersChampLocal(new Date().toISOString()),
  );
  const [enfantId, setEnfantId] = useState(() => String(entreeInitiale?.enfantId ?? ""));
  const [rechercheEnfant, setRechercheEnfant] = useState(() =>
    entreeInitiale
      ? libelleEnfant({
          id: entreeInitiale.enfantId,
          prenom: entreeInitiale.enfantPrenom,
          nom: entreeInitiale.enfantNom,
        })
      : "",
  );
  const [listeEnfantOuverte, setListeEnfantOuverte] = useState(false);
  const [indexActifEnfant, setIndexActifEnfant] = useState(-1);
  const comboEnfantRef = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState(() => entreeInitiale?.description ?? "");
  const [localisationCorps, setLocalisationCorps] = useState(() => entreeInitiale?.localisationCorps ?? "");
  const [soins, setSoins] = useState<Set<TypeSoinInfirmerie>>(
    () => new Set(entreeInitiale?.soins ?? []),
  );
  const [soinsAutrePrecision, setSoinsAutrePrecision] = useState(() => entreeInitiale?.soinsAutrePrecision ?? "");
  const [temperatureCelsiusStr, setTemperatureCelsiusStr] = useState(() =>
    temperatureInitialeVersChamp(entreeInitiale?.temperatureCelsius),
  );
  const [appels, setAppels] = useState<Set<TypeAppelInfirmerie>>(
    () => new Set(entreeInitiale?.appels ?? []),
  );
  const [appelAutrePrecision, setAppelAutrePrecision] = useState(() => entreeInitiale?.appelAutrePrecision ?? "");
  const [soigneurTokenId, setSoigneurTokenId] = useState(
    () => entreeInitiale?.soigneurTokenId?.trim() || utilisateurConnecteTokenId,
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const enfantsTries = useMemo(() => trierEnfantsParPrenom(enfants), [enfants]);

  const optionsSoigneur = useMemo(() => {
    const base = [...soigneursEligibles];
    const entree = entreeInitiale;
    const tidOrphelin = entree?.soigneurTokenId?.trim();
    if (tidOrphelin && !base.some((m) => m.tokenId === tidOrphelin)) {
      base.push({
        tokenId: tidOrphelin,
        prenom: entree?.soigneurPrenom ?? "",
        nom: entree?.soigneurNom ?? "",
      });
    }
    return trierParPrenomPuisNom(base);
  }, [soigneursEligibles, entreeInitiale]);

  useEffect(() => {
    if (optionsSoigneur.length === 0) return;
    if (!optionsSoigneur.some((m) => m.tokenId === soigneurTokenId)) {
      setSoigneurTokenId(optionsSoigneur[0].tokenId);
    }
  }, [optionsSoigneur, soigneurTokenId]);

  useEffect(() => {
    if (!soins.has("PRISE_TEMPERATURE")) setTemperatureCelsiusStr("");
  }, [soins]);

  useEffect(() => {
    if (entreeInitiale) {
      setEnfantId(String(entreeInitiale.enfantId));
      setRechercheEnfant(
        libelleEnfant({
          id: entreeInitiale.enfantId,
          prenom: entreeInitiale.enfantPrenom,
          nom: entreeInitiale.enfantNom,
        }),
      );
      setTemperatureCelsiusStr(temperatureInitialeVersChamp(entreeInitiale.temperatureCelsius));
    } else {
      setEnfantId("");
      setRechercheEnfant("");
      setTemperatureCelsiusStr("");
    }
  }, [entreeInitiale]);

  const enfantsFiltres = useMemo(
    () => enfantsTries.filter((e) => enfantCorrespondRecherche(rechercheEnfant, e)),
    [enfantsTries, rechercheEnfant],
  );

  useEffect(() => {
    if (enfantsFiltres.length === 0) {
      setIndexActifEnfant(-1);
      return;
    }
    setIndexActifEnfant((prev) => {
      if (prev < 0) return prev;
      if (prev >= enfantsFiltres.length) return enfantsFiltres.length - 1;
      return prev;
    });
  }, [enfantsFiltres]);

  useEffect(() => {
    if (!listeEnfantOuverte || indexActifEnfant < 0 || indexActifEnfant >= enfantsFiltres.length) return;
    document.getElementById(`cahier-enfant-opt-${indexActifEnfant}`)?.scrollIntoView({ block: "nearest" });
  }, [indexActifEnfant, listeEnfantOuverte, enfantsFiltres.length]);

  useEffect(() => {
    if (!listeEnfantOuverte) return;
    const fermerSiExterieur = (ev: MouseEvent) => {
      if (comboEnfantRef.current && !comboEnfantRef.current.contains(ev.target as Node)) {
        setListeEnfantOuverte(false);
        setIndexActifEnfant(-1);
      }
    };
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, [listeEnfantOuverte]);

  const choisirEnfant = useCallback((e: EnfantOptionCahier) => {
    setEnfantId(String(e.id));
    setRechercheEnfant(libelleEnfant(e));
    setListeEnfantOuverte(false);
    setIndexActifEnfant(-1);
  }, []);

  const onEnfantComboKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (envoi) return;

      if (ev.key === "Escape" && listeEnfantOuverte) {
        ev.preventDefault();
        setListeEnfantOuverte(false);
        setIndexActifEnfant(-1);
        return;
      }

      if (!listeEnfantOuverte) {
        if (ev.key === "ArrowDown" && enfantsFiltres.length > 0) {
          ev.preventDefault();
          setListeEnfantOuverte(true);
          setIndexActifEnfant(0);
        } else if (ev.key === "ArrowUp" && enfantsFiltres.length > 0) {
          ev.preventDefault();
          setListeEnfantOuverte(true);
          setIndexActifEnfant(enfantsFiltres.length - 1);
        }
        return;
      }

      if (enfantsFiltres.length === 0) return;

      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setIndexActifEnfant((prev) => (prev < 0 ? 0 : Math.min(prev + 1, enfantsFiltres.length - 1)));
        return;
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setIndexActifEnfant((prev) =>
          prev < 0 ? enfantsFiltres.length - 1 : Math.max(prev - 1, 0),
        );
        return;
      }
      if (ev.key === "Home") {
        ev.preventDefault();
        setIndexActifEnfant(0);
        return;
      }
      if (ev.key === "End") {
        ev.preventDefault();
        setIndexActifEnfant(enfantsFiltres.length - 1);
        return;
      }
      if (ev.key === "Enter" && indexActifEnfant >= 0 && indexActifEnfant < enfantsFiltres.length) {
        ev.preventDefault();
        choisirEnfant(enfantsFiltres[indexActifEnfant]);
      }
    },
    [choisirEnfant, enfantsFiltres, envoi, indexActifEnfant, listeEnfantOuverte],
  );

  const basculerSoin = useCallback((s: TypeSoinInfirmerie) => {
    setSoins((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  const basculerAppel = useCallback((a: TypeAppelInfirmerie) => {
    setAppels((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }, []);

  const validerEtContruire = useCallback((): SaveCahierInfirmerieEntreeRequest | null => {
    setErreur(null);
    if (!dateHeureLocal.trim()) {
      setErreur("La date et l'heure sont obligatoires.");
      return null;
    }
    const eid = parseInt(enfantId, 10);
    if (!Number.isFinite(eid)) {
      setErreur("Veuillez sélectionner un enfant.");
      return null;
    }
    if (!description.trim()) {
      setErreur("La description est obligatoire.");
      return null;
    }
    if (soins.size === 0) {
      setErreur("Sélectionnez au moins un type de soin.");
      return null;
    }
    if (soins.has("AUTRE") && !soinsAutrePrecision.trim()) {
      setErreur("Précisez le soin lorsque « Autre soin » est coché.");
      return null;
    }
    if (appels.has("AUTRE") && !appelAutrePrecision.trim()) {
      setErreur("Précisez l'appel lorsque « Autre appel » est coché.");
      return null;
    }
    let temperaturePayload: number | undefined;
    if (soins.has("PRISE_TEMPERATURE")) {
      const parsed = parserTemperatureCelsius(temperatureCelsiusStr);
      if (!parsed.ok) {
        setErreur(parsed.message);
        return null;
      }
      temperaturePayload = parsed.value;
    }
    const tidSoumission = soigneurTokenId.trim() || utilisateurConnecteTokenId.trim();

    if (!tidSoumission) {
      setErreur("Le soigneur est obligatoire.");
      return null;
    }
    return {
      dateHeure: champLocalVersIso(dateHeureLocal),
      enfantId: eid,
      description: description.trim(),
      localisationCorps: localisationCorps.trim() || null,
      soins: Array.from(soins),
      soinsAutrePrecision: soinsAutrePrecision.trim() || null,
      ...(temperaturePayload !== undefined ? { temperatureCelsius: temperaturePayload } : {}),
      appels: Array.from(appels),
      appelAutrePrecision: appelAutrePrecision.trim() || null,
      soigneurTokenId: tidSoumission,
    };
  }, [
    dateHeureLocal,
    enfantId,
    description,
    localisationCorps,
    soins,
    soinsAutrePrecision,
    temperatureCelsiusStr,
    appels,
    appelAutrePrecision,
    soigneurTokenId,
    utilisateurConnecteTokenId,
  ]);

  const soumettre = async () => {
    const body = validerEtContruire();
    if (!body) return;
    setEnvoi(true);
    setErreur(null);
    try {
      if (estEdition && entreeInitiale) {
        await cahierInfirmerieService.modifierEntree(sejourId, entreeInitiale.id, body);
      } else {
        await cahierInfirmerieService.creerEntree(sejourId, body);
      }
      onSucces();
    } catch (e: unknown) {
      setErreur(getApiErrorMessage(e, "Une erreur est survenue."));
    } finally {
      setEnvoi(false);
    }
  };

  const classTitreChamp = estEdition ? undefined : "fw-bold";

  return (
    <div>
      <FormGroup>
        <Label for="cahier-date" className={classTitreChamp}>
          Date et heure <AstChampObligatoire />
        </Label>
        <Input
          id="cahier-date"
          type="datetime-local"
          value={dateHeureLocal}
          onChange={(e) => setDateHeureLocal(e.target.value)}
          disabled={envoi}
          required
        />
      </FormGroup>

      <FormGroup>
        <Label for="cahier-enfant-search" className={classTitreChamp}>
          Enfant <AstChampObligatoire />
        </Label>
        <div className={styles.enfantCombobox} ref={comboEnfantRef}>
          <Input
            id="cahier-enfant-search"
            type="text"
            autoComplete="off"
            placeholder="Tapez un prénom ou un nom…"
            value={rechercheEnfant}
            onChange={(e) => {
              setRechercheEnfant(e.target.value);
              setEnfantId("");
              setIndexActifEnfant(-1);
              setListeEnfantOuverte(true);
            }}
            onFocus={() => {
              setIndexActifEnfant(-1);
              setListeEnfantOuverte(true);
            }}
            onKeyDown={onEnfantComboKeyDown}
            disabled={envoi}
            aria-required
            aria-autocomplete="list"
            aria-expanded={listeEnfantOuverte}
            aria-controls="cahier-enfant-listbox"
            aria-activedescendant={
              listeEnfantOuverte && indexActifEnfant >= 0 && indexActifEnfant < enfantsFiltres.length
                ? `cahier-enfant-opt-${indexActifEnfant}`
                : undefined
            }
          />
          {listeEnfantOuverte ? (
            <ul id="cahier-enfant-listbox" className={styles.enfantListe} role="listbox">
              {enfantsFiltres.length === 0 ? (
                <li className={styles.enfantListeVide} role="presentation">
                  Aucun enfant ne correspond.
                </li>
              ) : (
                enfantsFiltres.map((e, idx) => (
                  <li
                    key={e.id}
                    id={`cahier-enfant-opt-${idx}`}
                    role="option"
                    aria-selected={enfantId === String(e.id)}
                    className={`${styles.enfantOption}${idx === indexActifEnfant ? ` ${styles.enfantOptionActif}` : ""}`}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      choisirEnfant(e);
                    }}
                    onMouseEnter={() => setIndexActifEnfant(idx)}
                  >
                    {libelleEnfant(e)}
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </FormGroup>

      <FormGroup>
        <Label for="cahier-desc" className={classTitreChamp}>
          Description <AstChampObligatoire />
        </Label>
        <Input
          id="cahier-desc"
          type="textarea"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={envoi}
          required
        />
      </FormGroup>

      <FormGroup>
        <Label for="cahier-loc" className={classTitreChamp}>
          Localisation sur le corps (optionnel)
        </Label>
        <Input
          id="cahier-loc"
          type="text"
          value={localisationCorps}
          onChange={(e) => setLocalisationCorps(e.target.value)}
          disabled={envoi}
        />
      </FormGroup>

      <FormGroup>
        <Label className={classTitreChamp}>
          Soins prodigués (au moins un) <AstChampObligatoire />
        </Label>
        <div className="d-flex flex-column gap-1">
          {ORDRE_SOINS.map((s) => (
            <Label
              key={s}
              check
              className={`d-flex align-items-center gap-2 fw-normal ${
                s === "PRISE_TEMPERATURE" ? styles.soinLigneTemperature : ""
              }`}
            >
              <Input
                type="checkbox"
                checked={soins.has(s)}
                onChange={() => basculerSoin(s)}
                disabled={envoi}
              />
              <span className={s === "PRISE_TEMPERATURE" ? "text-nowrap" : undefined}>{LIBELLE_SOIN[s]}</span>
              {s === "PRISE_TEMPERATURE" && soins.has("PRISE_TEMPERATURE") ? <AstChampObligatoire /> : null}
              {s === "PRISE_TEMPERATURE" && soins.has("PRISE_TEMPERATURE") ? (
                <div className={styles.mesureTemperature}>
                  <InputGroup size="sm" className={styles.mesureTemperatureInputGroup}>
                    <Input
                      id="cahier-temperature"
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      min={30}
                      max={45}
                      value={temperatureCelsiusStr}
                      onChange={(e) => setTemperatureCelsiusStr(e.target.value)}
                      disabled={envoi}
                      required
                      placeholder="ex. 37,5"
                      aria-label="Mesure de température en °C (obligatoire)"
                    />
                    <InputGroupText>°C</InputGroupText>
                  </InputGroup>
                </div>
              ) : null}
            </Label>
          ))}
        </div>
      </FormGroup>

      {soins.has("AUTRE") ? (
        <FormGroup>
          <Label for="cahier-soin-autre" className={classTitreChamp}>
            Précision « autre » soin <AstChampObligatoire />
          </Label>
          <Input
            id="cahier-soin-autre"
            type="text"
            value={soinsAutrePrecision}
            onChange={(e) => setSoinsAutrePrecision(e.target.value)}
            disabled={envoi}
            required
          />
        </FormGroup>
      ) : null}

      <FormGroup>
        <Label className={classTitreChamp}>Appels éventuels</Label>
        <div className="d-flex flex-column gap-1">
          {ORDRE_APPELS.map((a) => (
            <Label key={a} check className="d-flex align-items-center gap-2 fw-normal">
              <Input type="checkbox" checked={appels.has(a)} onChange={() => basculerAppel(a)} disabled={envoi} />
              {LIBELLE_APPEL[a]}
            </Label>
          ))}
        </div>
      </FormGroup>

      {appels.has("AUTRE") ? (
        <FormGroup>
          <Label for="cahier-appel-autre" className={classTitreChamp}>
            Précision « autre » appel <AstChampObligatoire />
          </Label>
          <Input
            id="cahier-appel-autre"
            type="text"
            value={appelAutrePrecision}
            onChange={(e) => setAppelAutrePrecision(e.target.value)}
            disabled={envoi}
            required
          />
        </FormGroup>
      ) : null}

      <FormGroup>
        <Label for="cahier-soigneur" className={classTitreChamp}>
          Soigneur <AstChampObligatoire />
        </Label>
        <Input
          id="cahier-soigneur"
          type="select"
          value={soigneurTokenId}
          onChange={(e) => setSoigneurTokenId(e.target.value)}
          disabled={envoi || optionsSoigneur.length === 0}
          required
        >
          {optionsSoigneur.map((m) => (
            <option key={m.tokenId} value={m.tokenId}>
              {`${m.prenom} ${m.nom}`.trim()}
            </option>
          ))}
        </Input>
      </FormGroup>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
        <div
          className="text-danger small pe-2"
          style={{ flex: "1 1 12rem", minWidth: 0 }}
          role={erreur ? "alert" : undefined}
          aria-live={erreur ? "polite" : undefined}
        >
          {erreur}
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          <Button type="button" color="secondary" outline onClick={onAnnuler} disabled={envoi}>
            Annuler
          </Button>
          <Button type="button" color="primary" onClick={() => void soumettre()} disabled={envoi}>
            {envoi ? "Enregistrement…" : estEdition ? "Enregistrer" : "Créer l'entrée"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CahierInfirmerieForm;
