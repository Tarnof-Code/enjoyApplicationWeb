import React, { useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import Liste, { ColumnConfig } from "./Liste";
import UserForm from "../Forms/UserForm";
import { ChambreDto, GroupeDto, ProfilUtilisateurDTO } from "../../types/api";
import AffichageGroupesListe, { texteFiltreGroupes } from "./AffichageGroupesListe";
import { SelectionGroupesParType } from "./SelectionGroupesParType";
import calculerAge from "../../helpers/calculerAge";
import formaterDate from "../../helpers/formaterDate";
import { utilisateurService } from "../../services/utilisateur.service";
import { sejourGroupeService } from "../../services/sejour-groupe.service";
import { sejourChambreService } from "../../services/sejour-chambre.service";
import {
  genrePersonneCompatibleAvecChambre,
  indexerAffectationsOccupants,
} from "../../helpers/chambreOccupantsUtils";
import { RoleSejour } from "../../enums/RoleSejour";
import { RoleSysteme, RoleSystemeLabels } from "../../enums/RoleSysteme";
import {
    buildPrintDocumentContext,
    PRINT_GLOBAL_CLASS,
} from "../../print";
import styles from "./TableauUtilisateurs.module.scss";
import listeStyles from "./Liste.module.scss";

function libelleRoleSejourCourt(role: string | null | undefined): string {
    if (!role) return "—";
    switch (role) {
        case RoleSejour.AS:
            return "AS";
        case RoleSejour.SB:
            return "SB";
        case RoleSejour.ANIM:
            return "Anim";
        case RoleSejour.ADJOINT:
            return "Adj";
        case RoleSejour.AUTRE:
            return "Autre";
        default:
            return role;
    }
}

interface TableauUtilisateursProps {
  users: ProfilUtilisateurDTO[];
  title?: string;
  excludedRoles?: string[];
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  sejourId?: number;
  groupes?: GroupeDto[];
  chambres?: ChambreDto[];
  onDelete?: (user: ProfilUtilisateurDTO) => Promise<void>;
  deleteConfirmationMessage?: (user: ProfilUtilisateurDTO) => string;
}

const TableauUtilisateurs: React.FC<TableauUtilisateursProps> = ({
  users,
  title = "Liste des Utilisateurs",
  excludedRoles = [],
  canAdd = true,
  canEdit = true,
  canDelete = true,
  sejourId,
  groupes = [],
  chambres = [],
  onDelete: customOnDelete,
  deleteConfirmationMessage
}) => {
  const revalidator = useRevalidator();
  const [groupeModalMembre, setGroupeModalMembre] = useState<ProfilUtilisateurDTO | null>(null);
  const [selectedGroupeIds, setSelectedGroupeIds] = useState<Set<number>>(new Set());
  const [isSavingGroupes, setIsSavingGroupes] = useState(false);
  const [groupeModalError, setGroupeModalError] = useState<string | null>(null);
  const [chambreModalMembre, setChambreModalMembre] = useState<ProfilUtilisateurDTO | null>(null);
  const [selectedChambreId, setSelectedChambreId] = useState<number | null>(null);
  const [isSavingChambre, setIsSavingChambre] = useState(false);
  const [chambreModalError, setChambreModalError] = useState<string | null>(null);

  const chambresEquipe = chambres.filter((c) => c.typeChambre === "EQUIPE");
  const affectationIndex = indexerAffectationsOccupants(chambresEquipe);

  const handleDefaultDelete = async (user: ProfilUtilisateurDTO) => {
      if (!user.tokenId) return;
      await utilisateurService.deleteUser(String(user.tokenId));
      revalidator.revalidate();
  };

  const createColumn = (key: string, label: string, type: ColumnConfig['type'] = 'text', options?: Partial<ColumnConfig>): ColumnConfig => ({
    key, label, type, filterable: true, filterType: type === 'select' ? 'select' : 'text', ...options
  });

  const getGroupesPourReferent = (tokenId: string): GroupeDto[] => {
    return groupes.filter((g) => g.referents?.some((r) => r.tokenId === tokenId));
  };

  const openGroupeModal = (membre: ProfilUtilisateurDTO) => {
    if (!membre.tokenId) return;
    const ids = new Set(getGroupesPourReferent(membre.tokenId).map((g) => g.id));
    setSelectedGroupeIds(ids);
    setGroupeModalError(null);
    setGroupeModalMembre(membre);
  };

  const closeGroupeModal = () => {
    if (isSavingGroupes) return;
    setGroupeModalMembre(null);
    setGroupeModalError(null);
    setSelectedGroupeIds(new Set());
  };

  const toggleGroupeSelection = (groupeId: number) => {
    setSelectedGroupeIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupeId)) next.delete(groupeId);
      else next.add(groupeId);
      return next;
    });
  };

  const getChambrePourMembre = (tokenId: string): ChambreDto | null => {
    return affectationIndex.membreTokenIdVersChambre.get(tokenId.trim()) ?? null;
  };

  const getIdentifiantChambrePourMembre = (tokenId: string): string => {
    const chambre = getChambrePourMembre(tokenId);
    if (!chambre) return "—";
    return chambre.identifiant.trim() || "—";
  };

  const placesRestantesChambre = (chambre: ChambreDto) =>
    Math.max(0, chambre.capaciteMax - (chambre.occupants?.length ?? 0));

  const chambreEligiblePourMembre = (
    membre: ProfilUtilisateurDTO,
    chambre: ChambreDto,
    chambreActuelleId: number | null
  ) => {
    if (!genrePersonneCompatibleAvecChambre(membre.genre, chambre.genreAutorise)) return false;
    const estActuelle = chambre.id === chambreActuelleId;
    return estActuelle || placesRestantesChambre(chambre) > 0;
  };

  const chambresProposablesPourMembre = (membre: ProfilUtilisateurDTO): ChambreDto[] => {
    if (!membre.tokenId) return [];
    const chambreActuelleId = getChambrePourMembre(membre.tokenId)?.id ?? null;
    return chambresEquipe
      .filter((c) => chambreEligiblePourMembre(membre, c, chambreActuelleId))
      .sort((a, b) =>
        a.identifiant.localeCompare(b.identifiant, "fr", { sensitivity: "base" })
      );
  };

  const openChambreModal = (membre: ProfilUtilisateurDTO) => {
    if (!membre.tokenId) return;
    const chambre = getChambrePourMembre(membre.tokenId);
    setSelectedChambreId(chambre?.id ?? null);
    setChambreModalError(null);
    setChambreModalMembre(membre);
  };

  const closeChambreModal = () => {
    if (isSavingChambre) return;
    setChambreModalMembre(null);
    setChambreModalError(null);
    setSelectedChambreId(null);
  };

  const handleSaveChambre = async () => {
    if (!chambreModalMembre?.tokenId || sejourId == null) return;
    const tokenId = chambreModalMembre.tokenId.trim();
    const chambreActuelle = getChambrePourMembre(tokenId);
    const ancienneChambreId = chambreActuelle?.id ?? null;

    if (selectedChambreId === ancienneChambreId) {
      closeChambreModal();
      return;
    }

    setIsSavingChambre(true);
    setChambreModalError(null);
    try {
      if (selectedChambreId == null && ancienneChambreId != null) {
        await sejourChambreService.retirerMembreEquipe(sejourId, ancienneChambreId, tokenId);
      } else if (selectedChambreId != null) {
        await sejourChambreService.affecterMembreEquipe(sejourId, selectedChambreId, tokenId);
      }
      closeChambreModal();
      revalidator.revalidate();
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la chambre", error);
      setChambreModalError(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour de la chambre"
      );
    } finally {
      setIsSavingChambre(false);
    }
  };

  const handleSaveGroupesReferent = async () => {
    if (!groupeModalMembre?.tokenId || sejourId == null) return;
    const tokenId = groupeModalMembre.tokenId;
    const anciensIds = new Set(getGroupesPourReferent(tokenId).map((g) => g.id));
    const aAjouter = [...selectedGroupeIds].filter((id) => !anciensIds.has(id));
    const aRetirer = [...anciensIds].filter((id) => !selectedGroupeIds.has(id));

    if (aAjouter.length === 0 && aRetirer.length === 0) {
      closeGroupeModal();
      return;
    }

    setIsSavingGroupes(true);
    setGroupeModalError(null);
    try {
      for (const groupeId of aRetirer) {
        await sejourGroupeService.retirerReferent(sejourId, groupeId, tokenId);
      }
      for (const groupeId of aAjouter) {
        await sejourGroupeService.ajouterReferent(sejourId, groupeId, { referentTokenId: tokenId });
      }
      closeGroupeModal();
      revalidator.revalidate();
    } catch (error) {
      console.error("Erreur lors de la mise à jour des groupes référents", error);
      setGroupeModalError(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour des groupes référents"
      );
    } finally {
      setIsSavingGroupes(false);
    }
  };

  const roleSystemeColumn: ColumnConfig = createColumn('role', 'Rôle système', 'select', {
    filterOptions: [
      { value: '', label: 'Tous' },
      ...Object.values(RoleSysteme).map(role => ({
        value: role,
        label: RoleSystemeLabels[role]
      }))
    ],
    render: (value) => {
      if (!value) return '-';
      return RoleSystemeLabels[value as RoleSysteme] || value;
    }
  });

  const roleSejourColumn: ColumnConfig = createColumn('roleSejour', 'Rôle', 'custom', {
    toggleable: true,
    filterType: 'select',
    className: styles.colRole,
    filterOptions: [
      { value: '', label: 'Tous' },
      { value: RoleSejour.AS, label: 'AS' },
      { value: RoleSejour.SB, label: 'SB' },
      { value: RoleSejour.ANIM, label: 'Anim' },
      { value: RoleSejour.ADJOINT, label: 'Adj' },
      { value: RoleSejour.AUTRE, label: 'Autre' },
    ],
    render: (value) => libelleRoleSejourCourt(value as string),
    printValue: (item) => libelleRoleSejourCourt(item.roleSejour as string),
  });

  const validiteColumn: ColumnConfig = createColumn('dateExpirationCompte', 'Validité', 'date', {
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'Toutes' },
      { value: 'Valide', label: 'Valides' },
      { value: 'Expiré', label: 'Expirés' }
    ],
    render: (_value, item) => {
      return formaterDate(item.dateExpirationCompte);
    }
  });

  const chambreColumn: ColumnConfig = createColumn("chambre", "Chambre", "text", {
    toggleable: true,
    filterable: true,
    className: styles.colChambre,
    render: (_, item) => {
      const tokenId = item.tokenId as string | undefined;
      const label = tokenId ? getIdentifiantChambrePourMembre(tokenId) : "—";
      if (!canEdit || !tokenId) {
        return label;
      }
      return (
        <span className={styles.groupeCell}>
          <span>{label}</span>
          <FontAwesomeIcon
            className={`icone_crayon_edit ${styles.groupeEditIcon} ${PRINT_GLOBAL_CLASS.noPrint}`}
            icon={faPencilAlt}
            onClick={() => openChambreModal(item)}
            title="Gérer la chambre"
          />
        </span>
      );
    },
    printValue: (item) => {
      const tokenId = item.tokenId as string | undefined;
      return tokenId ? getIdentifiantChambrePourMembre(tokenId) : "—";
    },
  });

  const groupesReferentColumn: ColumnConfig = createColumn('groupesReferent', 'Groupe(s)', 'text', {
    toggleable: true,
    filterable: true,
    className: styles.colGroupes,
    render: (_, item) => {
      const tokenId = item.tokenId as string | undefined;
      const contenu = (
        <AffichageGroupesListe groupes={tokenId ? getGroupesPourReferent(tokenId) : []} />
      );
      if (!canEdit || !tokenId) {
        return contenu;
      }
      return (
        <span className={styles.groupeCell}>
          <span className={styles.groupeCellContent}>{contenu}</span>
          <FontAwesomeIcon
            className={`icone_crayon_edit ${styles.groupeEditIcon} ${PRINT_GLOBAL_CLASS.noPrint}`}
            icon={faPencilAlt}
            onClick={() => openGroupeModal(item)}
            title="Gérer les groupes référents"
          />
        </span>
      );
    },
    printValue: (item) => {
      const tokenId = item.tokenId as string | undefined;
      return tokenId ? texteFiltreGroupes(getGroupesPourReferent(tokenId)) : "—";
    },
  });

  const baseColumns: ColumnConfig[] = [
    createColumn('nom', 'Nom', 'text', sejourId != null ? { className: styles.colNom } : undefined),
    createColumn('prenom', 'Prénom', 'text', sejourId != null ? { className: styles.colPrenom } : undefined),
    createColumn('age', 'Age', 'custom', {
      filterType: 'number',
      filterPlaceholder: 'Min.',
      className: listeStyles.colAge,
      render: (_, item) => `${calculerAge(item.dateNaissance)} ans`
    }),
    createColumn('genre', 'Genre', 'select', {
      filterOptions: [
        { value: '', label: 'Tous' },
        { value: 'Masculin', label: 'Masculin' },
        { value: 'Féminin', label: 'Féminin' }
      ]
    }),
    createColumn('email', 'Email', 'email', { printNoWrap: true }),
    createColumn('telephone', 'Téléphone', 'tel', { printNoWrap: true })
  ];

  const afficherColonneGroupes = sejourId != null && groupes.length > 0;
  const afficherColonneChambres = sejourId != null && chambresEquipe.length > 0;

  const columns: ColumnConfig[] = sejourId
    ? [
        createColumn('nom', 'Nom', 'text', { className: styles.colNom }),
        createColumn('prenom', 'Prénom', 'text', { className: styles.colPrenom }),
        createColumn('age', 'Age', 'custom', {
          toggleable: true,
          filterType: 'number',
          filterPlaceholder: 'Min.',
          className: listeStyles.colAge,
          render: (_, item) => `${calculerAge(item.dateNaissance)} ans`,
          printValue: (item) => `${calculerAge(item.dateNaissance)} ans`,
        }),
        roleSejourColumn,
        createColumn('genre', 'Genre', 'select', {
          toggleable: true,
          className: styles.colGenre,
          filterOptions: [
            { value: '', label: 'Tous' },
            { value: 'Masculin', label: 'Masculin' },
            { value: 'Féminin', label: 'Féminin' },
          ],
        }),
        createColumn('email', 'Email', 'email', { toggleable: true, className: styles.colEmail, printNoWrap: true }),
        createColumn('telephone', 'Téléphone', 'tel', { toggleable: true, className: styles.colTelephone, printNoWrap: true }),
        ...(afficherColonneGroupes ? [groupesReferentColumn] : []),
        ...(afficherColonneChambres ? [chambreColumn] : []),
      ]
    : [...baseColumns.slice(0, 3), roleSystemeColumn, ...baseColumns.slice(3), validiteColumn];

  const dataListe = users.map((user) => {
    if (sejourId == null || !user.tokenId) return user;
    const extra: Record<string, string> = {};
    if (afficherColonneGroupes) {
      extra.groupesReferent = texteFiltreGroupes(getGroupesPourReferent(user.tokenId));
    }
    if (afficherColonneChambres) {
      extra.chambre = getIdentifiantChambrePourMembre(user.tokenId);
    }
    return Object.keys(extra).length > 0 ? { ...user, ...extra } : user;
  });

  const FormWithProps = (props: any) => (
    <UserForm
        {...props}
        excludedRoles={excludedRoles}
        sejourId={sejourId}
    />
  );

  return (
    <>
      <Liste
        title={title}
        columns={columns}
        data={dataListe}
        loading={false}
        onDelete={customOnDelete || handleDefaultDelete}
        canAdd={canAdd}
        canEdit={canEdit}
        canDelete={canDelete}
        formComponent={FormWithProps}
        addButtonText="Ajouter un membre"
        deleteConfirmationMessage={deleteConfirmationMessage}
        canPrint={sejourId != null}
        printDocumentTitle="Membres de l'équipe"
        printHeaderContext={
          sejourId != null ? buildPrintDocumentContext("Membres de l'équipe") : undefined
        }
        tableTopMargin={sejourId != null}
      />

      {canEdit && afficherColonneChambres && chambreModalMembre && (
        <Modal isOpen toggle={closeChambreModal} size="md">
          <ModalHeader toggle={closeChambreModal}>
            Chambre de {chambreModalMembre.prenom} {chambreModalMembre.nom}
          </ModalHeader>
          <ModalBody>
            <p className={styles.groupeModalIntro}>
              Choisissez la chambre d&apos;affectation de ce membre.
            </p>
            <ul className={styles.groupePickerList}>
              <li className={styles.groupePickerRow}>
                <label className={styles.groupePickerLabel}>
                  <input
                    type="radio"
                    className={styles.groupePickerCheckbox}
                    name="chambre-membre"
                    checked={selectedChambreId === null}
                    onChange={() => setSelectedChambreId(null)}
                    disabled={isSavingChambre}
                  />
                  <span>Aucune chambre</span>
                </label>
              </li>
              {chambresProposablesPourMembre(chambreModalMembre).map((chambre) => (
                <li key={chambre.id} className={styles.groupePickerRow}>
                  <label className={styles.groupePickerLabel}>
                    <input
                      type="radio"
                      className={styles.groupePickerCheckbox}
                      name="chambre-membre"
                      checked={selectedChambreId === chambre.id}
                      onChange={() => setSelectedChambreId(chambre.id)}
                      disabled={isSavingChambre}
                    />
                    <span>{chambre.identifiant.trim()}</span>
                  </label>
                </li>
              ))}
            </ul>
            {chambreModalError && (
              <div className={styles.errorMessage}>{chambreModalError}</div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={closeChambreModal} disabled={isSavingChambre}>
              Annuler
            </Button>
            <Button color="success" onClick={handleSaveChambre} disabled={isSavingChambre}>
              {isSavingChambre ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {canEdit && afficherColonneGroupes && groupeModalMembre && (
        <Modal isOpen toggle={closeGroupeModal} size="md">
          <ModalHeader toggle={closeGroupeModal}>
            Groupes référents de {groupeModalMembre.prenom} {groupeModalMembre.nom}
          </ModalHeader>
          <ModalBody>
            <p className={styles.groupeModalIntro}>
              Cochez les groupes dont ce membre est référent.
            </p>
            <SelectionGroupesParType
              groupes={groupes}
              isSelected={(id) => selectedGroupeIds.has(id)}
              onToggle={toggleGroupeSelection}
              disabled={isSavingGroupes}
            />
            {groupeModalError && (
              <div className={styles.errorMessage}>{groupeModalError}</div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={closeGroupeModal} disabled={isSavingGroupes}>
              Annuler
            </Button>
            <Button color="success" onClick={handleSaveGroupesReferent} disabled={isSavingGroupes}>
              {isSavingGroupes ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export default TableauUtilisateurs;
