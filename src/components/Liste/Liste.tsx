import React, { useMemo, useCallback, useReducer } from "react";
import {
  Button,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
} from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencilAlt,
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

export interface FilterAction {
  type: 'SET_FILTER' | 'RESET_FILTERS';
  field?: string;
  value?: string;
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

// Reducer pour les filtres
const createFiltersReducer = (initialFilters: FilterState) => 
  (state: FilterState, action: FilterAction): FilterState => {
    switch (action.type) {
      case 'SET_FILTER':
        if (action.field && action.value !== undefined) {
          return { ...state, [action.field]: action.value };
        }
        return state;
      case 'RESET_FILTERS':
        return { ...initialFilters };
      default:
        return state;
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
  showEditModal = false,
  onCloseEditModal,
  editingItem = null,
  onOpenEditModal,
}: ListeProps<T>) => {

  // Initialisation des filtres
  const initialFilters = useMemo(() => {
    const filters: FilterState = {};
    columns.forEach(col => {
      if (col.filterable) {
        filters[`${col.key}Filter`] = "";
      }
    });
    return filters;
  }, [columns]);

  const [filters, dispatchFilter] = useReducer(
    createFiltersReducer(initialFilters),
    initialFilters
  );

  // Gestion de l'édition - maintenant on ouvre le modal de modification
  const startEditing = useCallback((item: T) => {
    if (onOpenEditModal) {
      onOpenEditModal(item);
    }
  }, [onOpenEditModal]);


  // Filtrage des données
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      return columns.every(column => {
        if (!column.filterable) return true;
        
        const filterValue = filters[`${column.key}Filter`];
        if (!filterValue) return true;
        
        const itemValue = item[column.key];
        
        switch (column.filterType) {
          case 'select':
            // Logique spéciale pour la colonne validité
            if (column.key === 'dateExpirationCompte') {
              const expirationDate = new Date(itemValue);
              const today = new Date();
              const isValide = filterValue === "Valide" && expirationDate > today;
              const isExpire = filterValue === "Expiré" && expirationDate <= today;                         
              return isValide || isExpire;
            }
            return itemValue === filterValue;
          case 'number':
            // Pour l'âge, on utilise le calcul d'âge basé sur la date de naissance
            if (column.key === 'age' && item.dateNaissance) {
              const age = calculerAge(item.dateNaissance);
              return age >= parseInt(filterValue);
            }
            return itemValue >= parseInt(filterValue);
          case 'date':
            // Filtrage par date - recherche dans la date formatée
            if (column.key === 'dateNaissance' && item.dateNaissance) {
              const formattedDate = formaterDate(item.dateNaissance);
              return formattedDate.toLowerCase().includes(filterValue.toLowerCase());
            }
            return true;
          case 'text':
          default:
            return itemValue?.toString().toLowerCase().includes(filterValue.toLowerCase());
        }
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
  const dataRows = filteredData.map((item, filteredIndex) => (
    <tr key={filteredIndex}>
      <td className={styles.icones_box}>
        {canEdit && (
          <FontAwesomeIcon
            className="icone_crayon_edit"
            icon={faPencilAlt}
            onClick={() => startEditing(item)}
          />
        )}
      </td>

      {columns.map(column => (
        <td key={column.key} colSpan={column.colSpan || 1}>
          {renderCell(column, item, filteredIndex)}
        </td>
      ))}
    </tr>
  ));

  if (loading) {
    return <p className="loading-message">Chargement en cours...</p>;
  }

  return (
    <div className="page-main">
      {errorMessage && <p className="errorMessage">{errorMessage}</p>}
      
      <Row className="page-head">
        <Col xs={8} lg={3}>
          <h1 className="page-title">{title}</h1>
        </Col>
        {canAdd && onAdd && (
          <Col xs={2} lg={2}>
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
                    <>
                      {column.filterType === 'select' ? (
                        <select
                          value={filters[`${column.key}Filter`] || ""}
                          onChange={(e) => dispatchFilter({ 
                            type: 'SET_FILTER', 
                            field: `${column.key}Filter`, 
                            value: e.target.value 
                          })}
                        >
                          {column.filterOptions?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        ) : column.filterType === 'number' ? (
                          <input
                            placeholder={`${column.label} minimum`}
                            type="number"
                            value={filters[`${column.key}Filter`] || ""}
                            onChange={(e) => dispatchFilter({ 
                              type: 'SET_FILTER', 
                              field: `${column.key}Filter`, 
                              value: e.target.value 
                            })}
                          />
                        ) : column.filterType === 'date' ? (
                          <input
                            placeholder="Rechercher une date"
                            type="text"
                            value={filters[`${column.key}Filter`] || ""}
                            onChange={(e) => dispatchFilter({ 
                              type: 'SET_FILTER', 
                              field: `${column.key}Filter`, 
                              value: e.target.value 
                            })}
                            autoComplete="off"
                          />
                        ) : (
                        <input
                          placeholder={`Rechercher ${column.label.toLowerCase()}`}
                          type="text"
                          value={filters[`${column.key}Filter`] || ""}
                          onChange={(e) => dispatchFilter({ 
                            type: 'SET_FILTER', 
                            field: `${column.key}Filter`, 
                            value: e.target.value 
                          })}
                          autoComplete="off"
                        />
                      )}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>{dataRows}</tbody>
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
            Modifier un Utilisateur
          </ModalHeader>
          <ModalBody>
            <FormComponent
              handleCloseModal={onCloseEditModal}
              refreshList={refreshList || (() => window.location.reload())}
              userData={editingItem}
              isEditMode={true}
            />
          </ModalBody>
        </Modal>
      )}
    </div>
  );
};

export default Liste;
