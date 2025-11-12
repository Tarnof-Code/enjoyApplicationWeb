import React, { useMemo, useCallback, useState } from "react";
import {
  Button,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencilAlt,
  faTimes,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./Liste.module.scss";
import calculerAge from "../../helpers/calculerAge";
import formaterDate from "../../helpers/formaterDate";

// Types pour la configuration des colonnes
export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'email' | 'tel' | 'custom';
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'number' | 'date';
  filterOptions?: { value: string; label: string }[];
  render?: (value: any, item: any, index: number) => React.ReactNode;
  colSpan?: number;
}

// Types pour les filtres
export interface FilterState {
  [key: string]: string;
}

// Props du composant Liste
export interface ListeProps<T = any> {
  // Configuration des colonnes
  columns: ColumnConfig[];
  
  // Données
  data: T[];
  loading?: boolean;
  
  // Actions
  onAdd?: () => void;
  onEdit?: (item: T, index: number) => Promise<void>;
  onDelete?: (item: T, index: number) => Promise<void>;
  refreshList?: () => void;
  
  // Configuration
  title: string;
  addButtonText?: string;
  
  // Composants personnalisés
  formComponent?: React.ComponentType<any>;
  showModal?: boolean;
  onCloseModal?: () => void;
  
  // Gestion des erreurs
  errorMessage?: string | null;
  
  // Permissions
  canEdit?: boolean;
  canDelete?: boolean;
  canAdd?: boolean;
  
  // État pour le formulaire de modification
  showEditModal?: boolean;
  onCloseEditModal?: () => void;
  editingItem?: T | null;
  onOpenEditModal?: (item: T) => void;
  
}

// Fonction helper pour vérifier la validité
const checkValidityFilter = (itemValue: number, filterValue: string): boolean => {
  const expirationDate = new Date(itemValue);
  const today = new Date();
  return filterValue === "Valide" ? expirationDate > today : expirationDate <= today;
};

// Fonction helper pour appliquer les filtres
const applyFilters = <T extends Record<string, any>>(
  item: T, 
  column: ColumnConfig, 
  filterValue: string
): boolean => {
  if (!filterValue) return true;
  
  const itemValue = item[column.key];
  
  switch (column.filterType) {
    case 'select':
      return column.key === 'dateExpirationCompte' 
        ? checkValidityFilter(itemValue, filterValue)
        : itemValue === filterValue;
    case 'number':
      if (column.key === 'age' && item.dateNaissance) {
        return calculerAge(item.dateNaissance) >= parseInt(filterValue);
      } else if (column.key === 'duree' && item.dateDebut && item.dateFin) {
        // Calculer la durée pour le filtrage
        const debut = new Date(item.dateDebut);
        const fin = new Date(item.dateFin);
        const diffTime = Math.abs(fin.getTime() - debut.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === parseInt(filterValue);
      }
      return itemValue >= parseInt(filterValue);
    case 'date':
      // Filtrage spécial pour les dates de séjour
      if (column.key === 'dateDebut') {
        // Pour dateDebut : afficher les séjours avec date >= date saisie
        const itemDate = new Date(itemValue);
        const filterDate = new Date(filterValue);
        return itemDate >= filterDate;
      } else if (column.key === 'dateFin') {
        // Pour dateFin : afficher les séjours avec date <= date saisie
        const itemDate = new Date(itemValue);
        const filterDate = new Date(filterValue);
        return itemDate <= filterDate;
      } else if (column.key === 'dateNaissance' && item.dateNaissance) {
        return formaterDate(item.dateNaissance).toLowerCase().includes(filterValue.toLowerCase());
      }
      return true;
    default:
      // Gestion spéciale pour les objets directeur
      if (column.key === 'directeur' && itemValue && typeof itemValue === 'object') {
        const directeurName = `${itemValue.prenom || ''} ${itemValue.nom || ''}`.trim();
        return directeurName.toLowerCase().includes(filterValue.toLowerCase());
      }
      return itemValue?.toString().toLowerCase().includes(filterValue.toLowerCase());
  }
};

const Liste = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  onAdd,
  refreshList,
  title,
  addButtonText = "Ajouter",
  formComponent: FormComponent,
  showModal = false,
  onCloseModal,
  errorMessage,
  canEdit = true,
  canAdd = true,
  canDelete = true,
  onDelete,
  showEditModal = false,
  onCloseEditModal,
  editingItem = null,
  onOpenEditModal,
}: ListeProps<T>) => {

  // Initialisation des filtres avec useState
  const [filters, setFilters] = useState<FilterState>(() => {
    const initialFilters: FilterState = {};
    columns.forEach(col => {
      if (col.filterable) {
        initialFilters[`${col.key}Filter`] = "";
      }
    });
    return initialFilters;
  });

  // État pour la modale de suppression
  const [deleteModalState, setDeleteModalState] = useState<{
    show: boolean;
    item: T | null;
    itemIndex: number;
    itemName?: string;
  }>({
    show: false,
    item: null,
    itemIndex: -1,
  });

  // État pour la modale de succès
  const [successModalState, setSuccessModalState] = useState<{
    show: boolean;
    itemName?: string;
  }>({
    show: false,
  });

  // Fonction pour mettre à jour un filtre
  const updateFilter = useCallback((field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  // Fonction pour effacer un filtre spécifique
  const clearFilter = useCallback((field: string) => {
    setFilters(prev => ({ ...prev, [field]: "" }));
  }, []);

  // Fonction pour effacer tous les filtres
  const clearAllFilters = useCallback(() => {
    const clearedFilters: FilterState = {};
    columns.forEach(col => {
      if (col.filterable) {
        clearedFilters[`${col.key}Filter`] = "";
      }
    });
    setFilters(clearedFilters);
  }, [columns]);

  // Gestion de l'édition - maintenant on ouvre le modal de modification
  const startEditing = useCallback((item: T) => {
    if (onOpenEditModal) {
      onOpenEditModal(item);
    }
  }, [onOpenEditModal]);

  // Gestion de la suppression - ouvre la modale de confirmation
  const startDeleting = useCallback((item: T, index: number) => {
    // Construire le nom de l'item pour l'affichage (nom + prénom si disponible)
    let itemName = "";
    if (item.nom && item.prenom) {
      itemName = `${item.prenom} ${item.nom}`;
    } else if (item.nom) {
      itemName = item.nom;
    } else if (item.prenom) {
      itemName = item.prenom;
    } else {
      itemName = "cet élément";
    }
    
    setDeleteModalState({
      show: true,
      item,
      itemIndex: index,
      itemName,
    });
  }, []);

  // Confirmation de la suppression
  const confirmDelete = useCallback(async () => {
    if (deleteModalState.item && onDelete) {
      try {
        await onDelete(deleteModalState.item, deleteModalState.itemIndex);
        const itemName = deleteModalState.itemName;
        setDeleteModalState({ show: false, item: null, itemIndex: -1 });
        // Afficher la modale de succès
        setSuccessModalState({ show: true, itemName });
        if (refreshList) {
          refreshList();
        }
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        // La modale reste ouverte en cas d'erreur
      }
    }
  }, [deleteModalState, onDelete, refreshList]);

  // Fermer la modale de succès
  const closeSuccessModal = useCallback(() => {
    setSuccessModalState({ show: false });
  }, []);

  // Annulation de la suppression
  const cancelDelete = useCallback(() => {
    setDeleteModalState({ show: false, item: null, itemIndex: -1 });
  }, []);


  // Filtrage des données simplifié
  const filteredData = useMemo(() => {
    // Vérifier si data est undefined ou null
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    return data.filter((item) => {
      return columns.every(column => {
        if (!column.filterable) return true;
        const filterValue = filters[`${column.key}Filter`];
        return applyFilters(item, column, filterValue);
      });
    });
  }, [data, filters, columns]);

  // Rendu des cellules
  const renderCell = (column: ColumnConfig, item: T, index: number) => {
    const value = item[column.key];

    if (column.render) {
      return column.render(value, item, index);
    }

    return value;
  };

  // Rendu des lignes de données
  const dataRows = filteredData.map((item, filteredIndex) => {
    // Trouver l'index réel dans data pour onDelete
    const realIndex = data.findIndex(d => d === item);
    const indexToUse = realIndex >= 0 ? realIndex : filteredIndex;
    
    return (
      <tr key={filteredIndex}>
        <td className={styles.icones_box}>
          {canEdit && (
            <FontAwesomeIcon
              className="icone_crayon_edit"
              icon={faPencilAlt}
              onClick={() => startEditing(item)}
              style={{ cursor: 'pointer' }}
            />
          )}
          {canDelete && onDelete && (
            <FontAwesomeIcon
              className="icone_trash_delete"
              icon={faTrashAlt}
              onClick={() => startDeleting(item, indexToUse)}
              style={{ cursor: 'pointer' }}
            />
          )}
        </td>

        {columns.map(column => (
          <td key={column.key} colSpan={column.colSpan || 1}>
            {renderCell(column, item, filteredIndex)}
          </td>
        ))}
      </tr>
    );
  });

  if (loading) {
    return <p className="loading-message">Chargement en cours...</p>;
  }

  return (
    <div className="page-main">
      {errorMessage && <p className="errorMessage">{errorMessage}</p>}
      
      <Row className={styles.page_head}>
        <Col xs={6} lg={3}>
          <h1 className="page-title">{title}</h1>
        </Col>
        <Col xs={3} lg={2}>
          <Button 
            color="secondary" 
          
            onClick={clearAllFilters}
            disabled={Object.values(filters).every(value => !value)}
          >
            Effacer filtres
          </Button>
        </Col>
        {canAdd && onAdd && (
          <Col xs={3} lg={2}>
            <Button onClick={onAdd}>
              {addButtonText}
            </Button>
          </Col>
        )}
      </Row>

      <div className={styles.table_container}>
        <table className="table">
          <thead className={styles.enTete}>
            <tr>
              <th></th>
              {columns.map(column => (
                <th key={column.key} colSpan={column.colSpan || 1}>
                  {column.label}
                </th>
              ))}
            </tr>
            
            {/* Ligne des filtres */}
            <tr>
              <th></th>
              {columns.map(column => (
                <th key={`filter-${column.key}`} colSpan={column.colSpan || 1}>
                  {column.filterable && (
                    <div className={styles.filterContainer}>
                      {column.filterType === 'select' ? (
                        <select
                          value={filters[`${column.key}Filter`] || ""}
                          onChange={(e) => updateFilter(`${column.key}Filter`, e.target.value)}
                        >
                          {column.filterOptions?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        ) : column.filterType === 'number' ? (
                          <input
                            placeholder={column.key === 'duree' ? 'Durée exacte' : `${column.label} minimum`}
                            type="number"
                            value={filters[`${column.key}Filter`] || ""}
                            onChange={(e) => updateFilter(`${column.key}Filter`, e.target.value)}
                          />
                        ) : column.filterType === 'date' ? (
                          <input
                            placeholder="Rechercher une date"
                            type="date"
                            value={filters[`${column.key}Filter`] || ""}
                            onChange={(e) => updateFilter(`${column.key}Filter`, e.target.value)}
                            autoComplete="off"
                          />
                        ) : (
                        <input
                          placeholder={`Rechercher ${column.label.toLowerCase()}`}
                          type="text"
                          value={filters[`${column.key}Filter`] || ""}
                          onChange={(e) => updateFilter(`${column.key}Filter`, e.target.value)}
                          autoComplete="off"
                        />
                      )}
                      {filters[`${column.key}Filter`] && column.filterType !== 'select' && (
                        <button
                          type="button"
                          className={styles.clearFilterButton}
                          onClick={() => clearFilter(`${column.key}Filter`)}
                          title="Effacer le filtre"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-4">
                  <p className="mb-0 text-muted">
                    {!data || data.length === 0 
                      ? "Aucune donnée disponible" 
                      : "Aucun résultat trouvé pour les filtres appliqués"
                    }
                  </p>
                </td>
              </tr>
            ) : (
              dataRows
            )}
          </tbody>
        </table>
      </div>

      {/* Modal pour l'ajout */}
      {FormComponent && (
        <Modal isOpen={showModal} toggle={onCloseModal}>
          <ModalHeader toggle={onCloseModal}>
            {addButtonText}
          </ModalHeader>
          <ModalBody>
            <FormComponent
              handleCloseModal={onCloseModal}
              refreshList={refreshList || (() => window.location.reload())}
            />
          </ModalBody>
        </Modal>
      )}

      {/* Modal pour la modification */}
      {FormComponent && (
        <Modal isOpen={showEditModal} toggle={onCloseEditModal}>
          <ModalHeader toggle={onCloseEditModal}>
            Modifier
          </ModalHeader>
          <ModalBody>
            <FormComponent
              handleCloseModal={onCloseEditModal}
              refreshList={refreshList || (() => window.location.reload())}
              data={editingItem}
              isEditMode={true}
            />
          </ModalBody>
        </Modal>
      )}

      {/* Modal de confirmation de suppression */}
      <Modal isOpen={deleteModalState.show} toggle={cancelDelete}>
        <ModalHeader toggle={cancelDelete}>
          Confirmation de suppression
        </ModalHeader>
        <ModalBody>
          <p>Vous allez supprimer {deleteModalState.itemName || "cet élément"}. Cette action est irréversible.</p>
          <p>Êtes-vous sûr de vouloir continuer ?</p>
        </ModalBody>
        <ModalFooter>
          <Button 
            color="secondary" 
            onClick={cancelDelete}
            className={styles.btnAnnuler}
          >
            Annuler
          </Button>
          <Button color="danger" onClick={confirmDelete}>
            Confirmer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de confirmation de succès */}
      <Modal isOpen={successModalState.show} toggle={closeSuccessModal}>
        <ModalHeader toggle={closeSuccessModal}>
          Suppression réussie
        </ModalHeader>
        <ModalBody>
          <p>{successModalState.itemName || "L'élément"} a bien été supprimé.</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={closeSuccessModal}>
            OK
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default Liste;
