import React, { useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import Liste, { ColumnConfig } from "./Liste";
import UserForm from "../Forms/UserForm";
import { GroupeDto, ProfilUtilisateurDTO, TypeGroupe } from "../../types/api";
import calculerAge from "../../helpers/calculerAge";
import formaterDate from "../../helpers/formaterDate";
import { utilisateurService } from "../../services/utilisateur.service";
import { sejourGroupeService } from "../../services/sejour-groupe.service";
import { RoleSejour, RoleSejourLabels } from "../../enums/RoleSejour";
import { RoleSysteme, RoleSystemeLabels } from "../../enums/RoleSysteme";
import styles from "./TableauUtilisateurs.module.scss";
import listeStyles from "./Liste.module.scss";

const SECTIONS_TYPE_GROUPE: { type: TypeGroupe; label: string }[] = [
    { type: "THEMATIQUE", label: "Thématique" },
    { type: "AGE", label: "Par âge" },
    { type: "NIVEAU_SCOLAIRE", label: "Par niveau scolaire" },
];

interface TableauUtilisateursProps {
  users: ProfilUtilisateurDTO[];
  title?: string;
  excludedRoles?: string[];
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  sejourId?: number;
  groupes?: GroupeDto[];
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
  onDelete: customOnDelete,
  deleteConfirmationMessage
}) => {
  const revalidator = useRevalidator();
  const [groupeModalMembre, setGroupeModalMembre] = useState<ProfilUtilisateurDTO | null>(null);
  const [selectedGroupeIds, setSelectedGroupeIds] = useState<Set<number>>(new Set());
  const [isSavingGroupes, setIsSavingGroupes] = useState(false);
  const [groupeModalError, setGroupeModalError] = useState<string | null>(null);

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

  const getNomsGroupesPourReferent = (tokenId: string): string[] => {
    return getGroupesPourReferent(tokenId).map((g) => g.nom);
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

  const roleSejourColumn: ColumnConfig = createColumn('roleSejour', 'Rôle de séjour', 'custom', {
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'Tous' },
      ...Object.values(RoleSejour).map(role => ({
        value: role,
        label: RoleSejourLabels[role]
      }))
    ],
    render: (value, item) => {
      if (value) {
        return utilisateurService.getRoleSejourByGenre(value as string, item.genre);
      }
      return '-';
    }
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

  const groupesReferentColumn: ColumnConfig = createColumn('groupesReferent', 'Groupe(s)', 'text', {
    filterable: true,
    render: (_, item) => {
      const tokenId = item.tokenId as string | undefined;
      const noms = tokenId ? getNomsGroupesPourReferent(tokenId) : [];
      const label = noms.length > 0 ? noms.join(", ") : "—";
      if (!canEdit || !tokenId) {
        return label;
      }
      return (
        <span className={styles.groupeCell}>
          <span>{label}</span>
          <FontAwesomeIcon
            className={`icone_crayon_edit ${styles.groupeEditIcon}`}
            icon={faPencilAlt}
            onClick={() => openGroupeModal(item)}
            title="Gérer les groupes référents"
          />
        </span>
      );
    },
  });

  const baseColumns: ColumnConfig[] = [
    createColumn('nom', 'Nom'),
    createColumn('prenom', 'Prénom'),
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
    createColumn('email', 'Email', 'email'),
    createColumn('telephone', 'Téléphone', 'tel')
  ];

  const afficherColonneGroupes = sejourId != null && groupes.length > 0;

  const columns: ColumnConfig[] = sejourId
    ? [
        ...baseColumns.slice(0, 3),
        roleSejourColumn,
        ...baseColumns.slice(3),
        ...(afficherColonneGroupes ? [groupesReferentColumn] : []),
      ]
    : [...baseColumns.slice(0, 3), roleSystemeColumn, ...baseColumns.slice(3), validiteColumn];

  const dataListe = users.map((user) => {
    if (!afficherColonneGroupes || !user.tokenId) return user;
    return {
      ...user,
      groupesReferent: getNomsGroupesPourReferent(user.tokenId).join(", ") || "—",
    };
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
      />

      {canEdit && afficherColonneGroupes && groupeModalMembre && (
        <Modal isOpen toggle={closeGroupeModal} size="md">
          <ModalHeader toggle={closeGroupeModal}>
            Groupes référents de {groupeModalMembre.prenom} {groupeModalMembre.nom}
          </ModalHeader>
          <ModalBody>
            <p className={styles.groupeModalIntro}>
              Cochez les groupes dont ce membre est référent.
            </p>
            <div className={styles.groupePickerSections}>
              {SECTIONS_TYPE_GROUPE.map((section) => {
                const groupesSection = groupes
                  .filter((g) => g.typeGroupe === section.type)
                  .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
                if (groupesSection.length === 0) return null;
                return (
                  <section key={section.type} className={styles.groupePickerSection}>
                    <h3 className={styles.groupePickerSectionTitle}>{section.label}</h3>
                    <ul className={styles.groupePickerList}>
                      {groupesSection.map((groupe) => (
                        <li key={groupe.id} className={styles.groupePickerRow}>
                          <label className={styles.groupePickerLabel}>
                            <input
                              type="checkbox"
                              className={styles.groupePickerCheckbox}
                              checked={selectedGroupeIds.has(groupe.id)}
                              onChange={() => toggleGroupeSelection(groupe.id)}
                              disabled={isSavingGroupes}
                            />
                            <span>{groupe.nom}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
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
