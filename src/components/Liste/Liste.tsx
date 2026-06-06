import React, { useEffect, useMemo, useState } from "react";
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
  faSearch,
  faTimes,
  faTrashAlt,
  faEye,
  faFolder,
} from "@fortawesome/free-solid-svg-icons";
import { useRevalidator } from "react-router-dom";
import styles from "./Liste.module.scss";
import calculerAge from "../../helpers/calculerAge";
import formaterDate, { parseDate } from "../../helpers/formaterDate";
import {
  libelleFiltresListeActifs,
  PRINT_GLOBAL_CLASS,
  PrintContentRoot,
  PrintDocumentHeader,
  buildListePrintExtraStyle,
  usePrintContent,
  type PrintDocumentContext,
} from "../../print";
import { ListePrintActions } from "./ListePrintActions";
import { ListePrintTable } from "./ListePrintTable";
import { CheckboxFilterDropdown } from "./CheckboxFilterDropdown";
import {
  parseMultiselectFilterValue,
  stringifyMultiselectFilterValue,
} from "../../helpers/multiselectFilter";

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'email' | 'tel' | 'custom';
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'number' | 'date' | 'multiselect';
  filterOptions?: { value: string; label: string }[];
  render?: (value: any, item: any, index: number) => React.ReactNode;
  colSpan?: number;
  className?: string;
  filterPlaceholder?: string;
  /** Valeur texte pour l'impression (sans icônes ni composants interactifs) */
  printValue?: (item: any) => string;
  /** Colonne masquable via case à cocher dans l'en-tête */
  toggleable?: boolean;
  /** À l'impression : garder le contenu sur une seule ligne (ex. email) */
  printNoWrap?: boolean;
}

export interface FilterState {
  [key: string]: string;
}

export interface ListeProps<T = any> {
  columns: ColumnConfig[];
  data: T[];
  loading?: boolean;
  onDelete?: (item: T, index: number) => Promise<void>;
  title: string;
  addButtonText?: string;
  formComponent?: React.ComponentType<any>;
  errorMessage?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  canAdd?: boolean;
  canView?: boolean;
  onView?: (item: T) => void;
  canDossier?: boolean;
  onDossier?: (item: T) => void;
  deleteConfirmationMessage?: (item: T) => string;
  /**
   * Clé unique pour persister les filtres du tableau dans sessionStorage (ex. liste sanitaire après navigation dossier puis retour).
   */
  persistFiltersStorageKey?: string;
  /** Active le bouton d'impression (contenu filtré, sans colonne actions ni filtres) */
  canPrint?: boolean;
  printDocumentTitle?: string;
  /** En-tête séjour / titre document (complété par effectifs et filtres actifs) */
  printHeaderContext?: PrintDocumentContext;
  /** Marge au-dessus du tableau (listes séjour : enfants, équipe) */
  tableTopMargin?: boolean;
  /** Classe CSS additionnelle sur le tableau écran (hors impression) */
  tableClassName?: string;
  /** Impression avec sélection manuelle des lignes et titre personnalisé */
  canPrintCustomSelection?: boolean;
  /** Libellé affiché dans la modale de sélection (défaut : prénom + nom si disponibles) */
  printRowLabel?: (item: T) => string;
  /** Clé stable pour identifier une ligne dans la sélection (défaut : item.id) */
  printRowKey?: (item: T) => string | number;
}

const checkValidityFilter = (itemValue: string | number | undefined, filterValue: string): boolean => {
  const expirationDate = parseDate(itemValue);
  if (!expirationDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expirationDate.setHours(0, 0, 0, 0);
  return filterValue === "Valide" 
    ? expirationDate >= today 
    : expirationDate < today;
};

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
    case 'multiselect': {
      const selected = parseMultiselectFilterValue(filterValue);
      if (selected.size === 0) return true;
      return selected.has(String(itemValue ?? ""));
    }
    case 'number':
      if (column.key === 'age' && item.dateNaissance) {
        return calculerAge(item.dateNaissance) >= parseInt(filterValue);
      } else if (column.key === 'duree' && item.dateDebut && item.dateFin) {
        const debut = new Date(item.dateDebut);
        const fin = new Date(item.dateFin);
        const diffTime = Math.abs(fin.getTime() - debut.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === parseInt(filterValue);
      }
      return itemValue >= parseInt(filterValue);
    case 'date':
      if (column.key === 'dateDebut') {
        const itemDate = new Date(itemValue);
        const filterDate = new Date(filterValue);
        return itemDate >= filterDate;
      } else if (column.key === 'dateFin') {
        const itemDate = new Date(itemValue);
        const filterDate = new Date(filterValue);
        return itemDate <= filterDate;
      } else if (column.key === 'dateNaissance' && item.dateNaissance) {
        return formaterDate(item.dateNaissance).toLowerCase().includes(filterValue.toLowerCase());
      }
      return true;
    default:
      if (column.key === 'directeur' && itemValue && typeof itemValue === 'object') {
        const directeurName = `${itemValue.prenom || ''} ${itemValue.nom || ''}`.trim();
        return directeurName.toLowerCase().includes(filterValue.toLowerCase());
      }
      return itemValue?.toString().toLowerCase().includes(filterValue.toLowerCase());
  }
};

const LISTE_FILTERS_STORAGE_PREFIX = "enjoy.liste.filters.";

function buildInitialFilters(columnsArg: ColumnConfig[], persistKey: string | undefined): FilterState {
  const initial: FilterState = {};
  columnsArg.forEach((col) => {
    if (col.filterable) {
      initial[`${col.key}Filter`] = "";
    }
  });

  if (!persistKey) {
    return initial;
  }

  try {
    const raw = sessionStorage.getItem(`${LISTE_FILTERS_STORAGE_PREFIX}${persistKey}`);
    if (!raw) return initial;
    const saved = JSON.parse(raw) as FilterState;
    if (!saved || typeof saved !== "object") return initial;
    for (const col of columnsArg) {
      if (!col.filterable) continue;
      const fk = `${col.key}Filter`;
      if (typeof saved[fk] === "string") {
        initial[fk] = saved[fk];
      }
    }
  } catch {
    /* ignore parse / quota */
  }
  return initial;
}

const Liste = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  title,
  addButtonText = "Ajouter",
  formComponent: FormComponent,
  errorMessage,
  canEdit = true,
  canAdd = true,
  canDelete = true,
  canView = false,
  canDossier = false,
  onDelete,
  onView,
  onDossier,
  deleteConfirmationMessage,
  persistFiltersStorageKey,
  canPrint = false,
  printDocumentTitle,
  printHeaderContext,
  tableTopMargin = false,
  tableClassName,
  canPrintCustomSelection = false,
  printRowLabel,
  printRowKey,
}: ListeProps<T>) => {

  const revalidator = useRevalidator();

  // Gestion de l'état modal directement dans Liste
  const [modalState, setModalState] = useState<{
    show: boolean;
    editingItem: T | null;
  }>({ show: false, editingItem: null });

  const openAddModal = () => {
    setModalState({ show: true, editingItem: null });
  };

  const openEditModal = (item: T) => {
    setModalState({ show: true, editingItem: item });
  };

  const closeModal = () => {
    setModalState({ show: false, editingItem: null });
  };

  // Initialisation des filtres (+ relecture sessionStorage si clé persistée — ex. retour depuis dossier enfant).
  const [filters, setFilters] = useState<FilterState>(() =>
    buildInitialFilters(columns, persistFiltersStorageKey),
  );

  useEffect(() => {
    if (!persistFiltersStorageKey) return;
    try {
      sessionStorage.setItem(
        `${LISTE_FILTERS_STORAGE_PREFIX}${persistFiltersStorageKey}`,
        JSON.stringify(filters),
      );
    } catch {
      /* ignore quota */
    }
  }, [persistFiltersStorageKey, filters]);

  // État pour la modale de suppression
  const [deleteModalState, setDeleteModalState] = useState<{
    show: boolean;
    item: T | null;
    itemIndex: number;
    itemName?: string;
    errorMessage: string | null;
    isDeleting: boolean;
  }>({
    show: false,
    item: null,
    itemIndex: -1,
    errorMessage: null,
    isDeleting: false,
  });

  // État pour la modale de succès
  const [successModalState, setSuccessModalState] = useState<{
    show: boolean;
    itemName?: string;
  }>({
    show: false,
  });

  // Fonction pour mettre à jour un filtre
  const updateFilter = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Fonction pour effacer un filtre spécifique
  const clearFilter = (field: string) => {
    setFilters(prev => ({ ...prev, [field]: "" }));
  };

  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(() => new Set());

  const toggleableColumns = useMemo(
    () => columns.filter((column) => column.toggleable),
    [columns],
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenColumnKeys.has(column.key)),
    [columns, hiddenColumnKeys],
  );

  const { contentRef, print, fixedRunningHeaderLabel } = usePrintContent({
    documentTitle: printDocumentTitle ?? title,
    extraPageStyle: canPrint ? buildListePrintExtraStyle(visibleColumns.length) : undefined,
    ignoreGlobalStyles: canPrint,
    runningHeaderLabel: canPrint ? (printHeaderContext?.documentLabel ?? title) : undefined,
  });

  const toggleColumnVisibility = (columnKey: string, visible: boolean) => {
    setHiddenColumnKeys((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
    if (!visible) {
      const filterKey = `${columnKey}Filter`;
      if (filters[filterKey]) {
        updateFilter(filterKey, "");
      }
    }
  };

  // Fonction pour effacer tous les filtres
  const clearAllFilters = () => {
    const clearedFilters: FilterState = {};
    columns.forEach(col => {
      if (col.filterable) {
        clearedFilters[`${col.key}Filter`] = "";
      }
    });
    setFilters(clearedFilters);
  };

  // Gestion de l'édition - maintenant on ouvre le modal de modification
  const startEditing = (item: T) => {
    openEditModal(item);
  };

  // Gestion de la suppression - ouvre la modale de confirmation
  const startDeleting = (item: T, index: number) => {
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
      errorMessage: null,
      isDeleting: false,
    });
  };

  // Confirmation de la suppression
  const confirmDelete = async () => {
    if (!deleteModalState.item || !onDelete) return;
    setDeleteModalState(prev => ({ ...prev, errorMessage: null, isDeleting: true }));
    try {
      await onDelete(deleteModalState.item, deleteModalState.itemIndex);
      const itemName = deleteModalState.itemName;
      setDeleteModalState({
        show: false,
        item: null,
        itemIndex: -1,
        errorMessage: null,
        isDeleting: false,
      });
      // Afficher la modale de succès
      setSuccessModalState({ show: true, itemName });
      revalidator.revalidate();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      // Récupérer le message d'erreur (provenant de l'API si disponible, sinon message générique)
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Une erreur s'est produite lors de la suppression";
      setDeleteModalState(prev => ({ ...prev, errorMessage: message, isDeleting: false }));
    }
  };

  // Fermer la modale de succès
  const closeSuccessModal = () => {
    setSuccessModalState({ show: false });
  };

  // Annulation de la suppression
  const cancelDelete = () => {
    setDeleteModalState({
      show: false,
      item: null,
      itemIndex: -1,
      errorMessage: null,
      isDeleting: false,
    });
  };


  // Filtrage des données simplifié
  const filteredData = (() => {
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
  })();

  const filtresActifsLibelle = libelleFiltresListeActifs(filters, visibleColumns);

  const printHeaderComplet = useMemo((): PrintDocumentContext => {
    const meta: { label: string; value: string }[] = [
      {
        label: "Résultats affichés",
        value: `${filteredData.length} sur ${data?.length ?? 0}`,
      },
    ];
    if (filtresActifsLibelle) {
      meta.push({ label: "Filtres", value: filtresActifsLibelle });
    }
    if (printHeaderContext?.meta) {
      meta.push(...printHeaderContext.meta);
    }
    return {
      ...printHeaderContext,
      documentLabel: printHeaderContext?.documentLabel ?? title,
      meta,
    };
  }, [filteredData.length, data?.length, filtresActifsLibelle, printHeaderContext, title]);

  // Rendu des cellules
  const renderCell = (column: ColumnConfig, item: T, index: number) => {
    const value = item[column.key];

    if (column.render) {
      return column.render(value, item, index);
    }

    return value;
  };

  const renderPrintCell = (column: ColumnConfig, item: T): string => {
    if (column.printValue) {
      return column.printValue(item);
    }
    const value = item[column.key];
    if (value == null) return "";
    return String(value);
  };

  const resolvePrintRowLabel = (item: T): string => {
    if (printRowLabel) return printRowLabel(item);
    if (item.prenom && item.nom) return `${item.prenom} ${item.nom}`;
    if (item.nom) return String(item.nom);
    if (item.prenom) return String(item.prenom);
    return "Ligne";
  };

  // Rendu des lignes de données
  const dataRows = filteredData.map((item, filteredIndex) => {
    // Trouver l'index réel dans data pour onDelete
    const realIndex = data.findIndex(d => d === item);
    const indexToUse = realIndex >= 0 ? realIndex : filteredIndex;
    return (
      <tr key={filteredIndex}>
        <td className={`${styles.actions_cell} ${PRINT_GLOBAL_CLASS.noPrint}`}>
          <div className={styles.icones_box}>
            {canView && (
              <FontAwesomeIcon
                className="icone_oeil_view"
                icon={faEye}
                onClick={() => onView && onView(item)}
                style={{ cursor: 'pointer' }}
                title="Voir"
              />
            )}
            {canDossier && onDossier && (
              <FontAwesomeIcon
                className="icone_dossier"
                icon={faFolder}
                onClick={() => onDossier(item)}
                style={{ cursor: 'pointer' }}
                title="Voir le dossier"
              />
            )}
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
          </div>
        </td>

        {visibleColumns.map(column => (
          <td key={column.key} colSpan={column.colSpan || 1} className={column.className}>
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
      
      <Row className={`${styles.page_head} ${PRINT_GLOBAL_CLASS.noPrint} align-items-center`}>
        <Col xs={12} sm={6} lg={3}>
          <h1 className="page-title">{title}</h1>
        </Col>
        <Col xs={12} lg={9} className={styles.page_headToolbarCol}>
          <div className={styles.page_headToolbar}>
            <div className={styles.page_headButtons}>
              <Button
                color="secondary"
                onClick={clearAllFilters}
                disabled={Object.values(filters).every(value => !value)}
              >
                Effacer filtres
              </Button>
              {canAdd && FormComponent ? (
                <Button color="success" onClick={openAddModal}>
                  {addButtonText}
                </Button>
              ) : null}
            </div>
            {toggleableColumns.length > 0 || canPrint || canPrintCustomSelection ? (
              <div className={styles.page_headToolbarRight}>
                {toggleableColumns.length > 0 ? (
                  <div className={styles.columnToggles} aria-label="Colonnes affichées">
                    {toggleableColumns.map((column) => (
                      <label key={column.key} className={styles.columnToggle}>
                        <input
                          type="checkbox"
                          checked={!hiddenColumnKeys.has(column.key)}
                          onChange={(e) => toggleColumnVisibility(column.key, e.target.checked)}
                        />
                        {column.label}
                      </label>
                    ))}
                  </div>
                ) : null}
                {canPrint || canPrintCustomSelection ? (
                  <ListePrintActions
                    canPrintFiltered={canPrint}
                    canPrintCustom={canPrintCustomSelection}
                    onPrintFiltered={print}
                    filteredCount={filteredData.length}
                    data={filteredData}
                    visibleColumns={visibleColumns}
                    defaultTitle={printDocumentTitle ?? title}
                    printRowLabel={resolvePrintRowLabel}
                    printRowKey={printRowKey}
                    renderPrintCell={renderPrintCell}
                    printTriggerClassName={
                      toggleableColumns.length > 0 ? styles.printTrigger : undefined
                    }
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </Col>
      </Row>

      <PrintContentRoot
        contentRef={contentRef}
        fixedRunningHeaderLabel={fixedRunningHeaderLabel}
      >
        {canPrint ? (
          <PrintDocumentHeader context={{ meta: printHeaderComplet.meta }} />
        ) : null}

        {canPrint ? (
          <ListePrintTable
            visibleColumns={visibleColumns}
            rows={filteredData}
            getRowKey={(item, index) => item.id ?? `print-row-${index}`}
            renderPrintCell={renderPrintCell}
            emptyMessage={
              !data || data.length === 0
                ? "Aucune donnée disponible"
                : "Aucun résultat trouvé pour les filtres appliqués"
            }
          />
        ) : null}
      </PrintContentRoot>

      <div
        className={[
          styles.table_container,
          tableTopMargin ? styles.table_containerTopMargin : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <table
          className={[
            "table",
            "align-middle",
            tableClassName,
            canPrint ? PRINT_GLOBAL_CLASS.noPrint : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <thead className={styles.enTete}>
            <tr>
              <th className={`${styles.actions_cell} ${PRINT_GLOBAL_CLASS.noPrint}`}></th>
              {visibleColumns.map(column => (
                <th key={column.key} colSpan={column.colSpan || 1} className={column.className}>
                  {column.label}
                </th>
              ))}
            </tr>
            
            {/* Ligne des filtres */}
            <tr
              className={[
                "enjoy-liste-filter-row",
                canPrint ? PRINT_GLOBAL_CLASS.noPrint : undefined,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <th className={`${styles.actions_cell} ${PRINT_GLOBAL_CLASS.noPrint}`}></th>
              {visibleColumns.map(column => (
                <th key={`filter-${column.key}`} colSpan={column.colSpan || 1} className={column.className}>
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
                        ) : column.filterType === 'multiselect' ? (
                          <CheckboxFilterDropdown
                            compact
                            options={column.filterOptions ?? []}
                            selectedValues={parseMultiselectFilterValue(
                              filters[`${column.key}Filter`] || "",
                            )}
                            onSelectedValuesChange={(next) =>
                              updateFilter(
                                `${column.key}Filter`,
                                stringifyMultiselectFilterValue(next),
                              )
                            }
                            ariaLabel={`Filtrer ${column.label.toLowerCase()}`}
                            summaryWhenEmpty="Tous"
                          />
                        ) : column.filterType === 'number' ? (
                          <input
                            placeholder={
                              column.filterPlaceholder ??
                              (column.key === 'duree' ? 'Durée exacte' : `${column.label} minimum`)
                            }
                            type="number"
                            value={filters[`${column.key}Filter`] || ""}
                            onChange={(e) => updateFilter(`${column.key}Filter`, e.target.value)}
                          />
                        ) : column.filterType === 'date' ? (
                          <input
                            placeholder="Date"
                            type="date"
                            value={filters[`${column.key}Filter`] || ""}
                            onChange={(e) => updateFilter(`${column.key}Filter`, e.target.value)}
                            autoComplete="off"
                          />
                        ) : (
                        <div className={styles.filterInputWithIcon}>
                          <FontAwesomeIcon icon={faSearch} className={styles.filterIcon} />
                          <input
                            type="text"
                            placeholder={column.filterPlaceholder ?? column.label}
                            value={filters[`${column.key}Filter`] || ""}
                            onChange={(e) => updateFilter(`${column.key}Filter`, e.target.value)}
                            autoComplete="off"
                            aria-label={`Filtrer ${column.label.toLowerCase()}`}
                          />
                        </div>
                      )}
                      {filters[`${column.key}Filter`] &&
                        column.filterType !== 'select' &&
                        column.filterType !== 'multiselect' && (
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
                <td colSpan={visibleColumns.length + 1} className="text-center py-4">
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

      {/* Modal unifié pour ajout et modification */}
      {FormComponent && (
        <Modal isOpen={modalState.show} toggle={closeModal}>
          <ModalHeader toggle={closeModal}>
            {modalState.editingItem ? "Modifier" : addButtonText}
          </ModalHeader>
          <ModalBody>
            <FormComponent
              handleCloseModal={closeModal}
              data={modalState.editingItem}
              isEditMode={!!modalState.editingItem}
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
          {deleteConfirmationMessage && deleteModalState.item ? (
            <p>{deleteConfirmationMessage(deleteModalState.item)}</p>
          ) : (
            <p>Vous allez supprimer {deleteModalState.itemName || "cet élément"}. Cette action est irréversible.</p>
          )}
          <p>Êtes-vous sûr de vouloir continuer ?</p>
          {deleteModalState.errorMessage && (
            <div className={styles.deleteErrorMessage} role="alert">
              {deleteModalState.errorMessage}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={cancelDelete}
            className={styles.btnAnnuler}
            disabled={deleteModalState.isDeleting}
          >
            {deleteModalState.errorMessage ? "Fermer" : "Annuler"}
          </Button>
          <Button
            color="danger"
            onClick={confirmDelete}
            disabled={deleteModalState.isDeleting}
          >
            {deleteModalState.isDeleting ? "Suppression..." : "Confirmer"}
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
          <Button color="secondary" onClick={closeSuccessModal}>
            OK
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default Liste;
