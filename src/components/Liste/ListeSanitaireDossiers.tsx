import type { FC } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Liste, { type ColumnConfig } from "./Liste";
import type { EnfantDossierSanitaireLigneDto } from "../../types/api";
import { buildPrintDocumentContext } from "../../print";
import styles from "./ListeSanitaireDossiers.module.scss";

const SANITAIRE_COL_GROUPES = "enjoy-sanitaire-col-groupes";

/** Colonnes optionnelles affichables (hors prénom, nom, groupes). */
export type SanitaireColonnesOptionnelles = {
  allergies: boolean;
  traitements: boolean;
  contactsParents: boolean;
  medical: boolean;
  alimentation: boolean;
  autresInformations: boolean;
  aPrendreEnSortie: boolean;
};

export interface ListeSanitaireDossiersProps {
  sejourId: number;
  lignes: EnfantDossierSanitaireLigneDto[];
  loading?: boolean;
  colonnesOptionnelles: SanitaireColonnesOptionnelles;
  errorMessage?: string | null;
  /** Réinitialiser les filtres internes lorsque les colonnes affichées changent */
  listeKey?: string;
}

/** Ligne aplati pour filtres Liste (valeurs brutes pour filtre texte). */
export type SanitaireListeRow = {
  id: number;
  enfantId: number;
  prenom: string;
  nom: string;
  groupes: string;
  allergenes: string;
  traitementMatin: string;
  traitementMidi: string;
  traitementSoir: string;
  traitementSiBesoin: string;
  emailParent1: string;
  telephoneParent1: string;
  emailParent2: string;
  telephoneParent2: string;
  informationsMedicales: string;
  pai: string;
  regimesEtPreferences: string;
  informationsAlimentaires: string;
  autresInformations: string;
  aPrendreEnSortie: string;
};

function afficherOuTiret(value: string): string {
  const t = value?.trim();
  return t ? t : "—";
}

function texteNonVide(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Si un groupe de colonnes optionnel est coché : ne garder que les lignes avec au moins un champ renseigné dans ce groupe. Si plusieurs groupes cochés, au moins un groupe doit correspondre (OU). Sans groupe coché : toutes les lignes. */
function ligneGardeePourGroupesColonnes(
  ligne: EnfantDossierSanitaireLigneDto,
  o: SanitaireColonnesOptionnelles,
): boolean {
  const d = ligne.dossier;

  const exigences: boolean[] = [];

  if (o.allergies) {
    exigences.push((d?.allergenes?.length ?? 0) > 0);
  }

  if (o.traitements) {
    exigences.push(
      texteNonVide(d?.traitementMatin) ||
        texteNonVide(d?.traitementMidi) ||
        texteNonVide(d?.traitementSoir) ||
        texteNonVide(d?.traitementSiBesoin),
    );
  }

  if (o.contactsParents) {
    exigences.push(
      texteNonVide(d?.emailParent1) ||
        texteNonVide(d?.telephoneParent1) ||
        texteNonVide(d?.emailParent2) ||
        texteNonVide(d?.telephoneParent2),
    );
  }

  if (o.medical) {
    exigences.push(texteNonVide(d?.informationsMedicales) || texteNonVide(d?.pai));
  }

  if (o.alimentation) {
    exigences.push((d?.regimesEtPreferences?.length ?? 0) > 0 || texteNonVide(d?.informationsAlimentaires));
  }

  if (o.autresInformations) {
    exigences.push(texteNonVide(d?.autresInformations));
  }

  if (o.aPrendreEnSortie) {
    exigences.push(texteNonVide(d?.aPrendreEnSortie));
  }

  if (exigences.length === 0) return true;
  return exigences.some(Boolean);
}

function lignesVersDonneesListe(lignes: EnfantDossierSanitaireLigneDto[]): SanitaireListeRow[] {
  return lignes.map((ligne) => {
    const d = ligne.dossier;
    const groupesTxt =
      ligne.groupes.length > 0 ? ligne.groupes.map((g) => g.libelle).join(", ") : "—";
    const allergenesTxt = d?.allergenes?.map((r) => r.libelle).join(", ") ?? "";
    const regimesTxt = d?.regimesEtPreferences?.map((r) => r.libelle).join(", ") ?? "";
    return {
      id: ligne.enfantId,
      enfantId: ligne.enfantId,
      prenom: ligne.prenom,
      nom: ligne.nom,
      groupes: groupesTxt,
      allergenes: allergenesTxt,
      traitementMatin: (d?.traitementMatin ?? "").trim(),
      traitementMidi: (d?.traitementMidi ?? "").trim(),
      traitementSoir: (d?.traitementSoir ?? "").trim(),
      traitementSiBesoin: (d?.traitementSiBesoin ?? "").trim(),
      emailParent1: (d?.emailParent1 ?? "").trim(),
      telephoneParent1: (d?.telephoneParent1 ?? "").trim(),
      emailParent2: (d?.emailParent2 ?? "").trim(),
      telephoneParent2: (d?.telephoneParent2 ?? "").trim(),
      informationsMedicales: (d?.informationsMedicales ?? "").trim(),
      pai: (d?.pai ?? "").trim(),
      regimesEtPreferences: regimesTxt,
      informationsAlimentaires: (d?.informationsAlimentaires ?? "").trim(),
      autresInformations: (d?.autresInformations ?? "").trim(),
      aPrendreEnSortie: (d?.aPrendreEnSortie ?? "").trim(),
    };
  });
}

const ListeSanitaireDossiers: FC<ListeSanitaireDossiersProps> = ({
  sejourId,
  lignes,
  loading = false,
  colonnesOptionnelles: o,
  errorMessage,
  listeKey,
}) => {
  const navigate = useNavigate();

  const data = useMemo(() => {
    const garde = lignes.filter((ligne) => ligneGardeePourGroupesColonnes(ligne, o));
    return lignesVersDonneesListe(garde);
  }, [lignes, o]);

  const columns = useMemo((): ColumnConfig[] => {
    const createColumn = (
      key: string,
      label: string,
      type: ColumnConfig["type"] = "text",
      options?: Partial<ColumnConfig>,
    ): ColumnConfig => ({
      key,
      label,
      type,
      filterable: true,
      filterType: type === "select" ? "select" : "text",
      ...options,
    });

    const texteCol = (key: keyof SanitaireListeRow, label: string, extra?: Partial<ColumnConfig>) =>
      createColumn(key, label, "text", {
        render: (_v, item: SanitaireListeRow) => afficherOuTiret(item[key] as string),
        printValue: (item: SanitaireListeRow) => afficherOuTiret(item[key] as string),
        ...extra,
      });

    const cols: ColumnConfig[] = [
      createColumn("prenom", "Prénom", "text", {
        className: styles.colPrenom,
        printNoWrap: true,
        printValue: (item: SanitaireListeRow) => afficherOuTiret(item.prenom),
      }),
      createColumn("nom", "Nom", "text", {
        printValue: (item: SanitaireListeRow) => afficherOuTiret(item.nom),
      }),
      createColumn("groupes", "Groupe(s)", "text", {
        className: SANITAIRE_COL_GROUPES,
        printValue: (item: SanitaireListeRow) => afficherOuTiret(item.groupes),
      }),
    ];

    if (o.allergies) {
      cols.push(
        createColumn("allergenes", "Allergies", "text", {
          render: (_v, item: SanitaireListeRow) => afficherOuTiret(item.allergenes),
          printValue: (item: SanitaireListeRow) => afficherOuTiret(item.allergenes),
        }),
      );
    }

    if (o.traitements) {
      cols.push(
        texteCol("traitementMatin", "Traitement matin"),
        texteCol("traitementMidi", "Traitement midi"),
        texteCol("traitementSoir", "Traitement soir"),
        texteCol("traitementSiBesoin", "Si besoin"),
      );
    }

    if (o.contactsParents) {
      cols.push(
        texteCol("emailParent1", "E-mail parent 1", { printNoWrap: true }),
        texteCol("telephoneParent1", "Tél. parent 1", { printNoWrap: true }),
        texteCol("emailParent2", "E-mail parent 2", { printNoWrap: true }),
        texteCol("telephoneParent2", "Tél. parent 2", { printNoWrap: true }),
      );
    }

    if (o.medical) {
      cols.push(texteCol("informationsMedicales", "Infos médicales"), texteCol("pai", "PAI"));
    }

    if (o.alimentation) {
      cols.push(
        createColumn("regimesEtPreferences", "Régimes & préférences", "text", {
          render: (_v, item: SanitaireListeRow) => afficherOuTiret(item.regimesEtPreferences),
          printValue: (item: SanitaireListeRow) => afficherOuTiret(item.regimesEtPreferences),
        }),
        texteCol("informationsAlimentaires", "Infos alimentaires"),
      );
    }

    if (o.autresInformations) {
      cols.push(texteCol("autresInformations", "Autres informations"));
    }

    if (o.aPrendreEnSortie) {
      cols.push(texteCol("aPrendreEnSortie", "À prendre en sortie"));
    }

    return cols;
  }, [o]);

  const ouvrirDossier = (item: SanitaireListeRow) => {
    navigate(`/mes-sejours/${sejourId}/enfants/${item.enfantId}/dossier`, {
      state: { from: "sanitaire" as const },
    });
  };

  const titreListe = `Dossiers sanitaires (${data.length})`;

  const printHeaderContext = useMemo(
    () =>
      buildPrintDocumentContext("Dossiers sanitaires", [
        {
          label: "Effectif séjour",
          value: String(lignes.length),
        },
      ]),
    [lignes.length],
  );

  return (
    <Liste<SanitaireListeRow>
      key={listeKey}
      persistFiltersStorageKey={listeKey ?? `sanitaire-${sejourId}-cols`}
      title={titreListe}
      columns={columns}
      data={data}
      loading={loading}
      canAdd={false}
      canEdit={false}
      canDelete={false}
      canDossier
      onDossier={ouvrirDossier}
      errorMessage={errorMessage ?? null}
      canPrint
      printDocumentTitle="Dossiers sanitaires"
      printHeaderContext={printHeaderContext}
      tableTopMargin
    />
  );
};

export default ListeSanitaireDossiers;
