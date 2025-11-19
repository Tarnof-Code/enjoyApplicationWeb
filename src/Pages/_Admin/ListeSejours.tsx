import React, { useCallback, useEffect, useState } from 'react';
import Liste, { ColumnConfig } from '../../components/Liste/Liste';
import { useSelector } from 'react-redux';
import { sejourService } from '../../services/sejour.service';
import Acces_non_autorise from '../Erreurs/Acces_non_autorise';
import Sejour_form from '../../components/Forms/Sejour_form';
import formaterDate from '../../helpers/formaterDate';

const calculerDureeSejour = (dateDebut: string, dateFin: string): number => {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const diffTime = Math.abs(fin.getTime() - debut.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

interface Sejour {
  id: number;
  nom: string;
  description: string;
  lieuDuSejour: string;
  directeur: {
    tokenId: string;
    nom: string;
    prenom: string;
  };
  dateDebut: string;
  dateFin: string;
}


const Liste_sejours: React.FC = () => {
  const [listSejours, setListSejours] = useState<Sejour[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalState, setModalState] = useState<{
    show: boolean;
    editingSejour: Sejour | null;
  }>({ show: false, editingSejour: null });
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);

  const role = useSelector((state: any) => state.auth.role);

  const createColumn = (
    key: string, 
    label: string, 
    type: ColumnConfig['type'] = 'text',
    options?: Partial<ColumnConfig>
  ): ColumnConfig => ({
    key,
    label,
    type,
    filterable: true,
    filterType: type === 'select' ? 'select' : type === 'date' ? 'date' : 'text',
    ...options
  });

  const columns: ColumnConfig[] = [
    createColumn('nom', 'Nom'),
    createColumn('description', 'Description'),
    createColumn('lieuDuSejour', 'Lieu'),
    {
      key: 'directeur',
      label: 'Directeur',
      type: 'text',
      filterable: true,
      filterType: 'text',
      render: (value: any) => {
        return value ? `${value.prenom} ${value.nom}` : 'Non assigné';
      }
    },
    createColumn('dateDebut', 'Date de début', 'date',{
      filterable: true,
      filterType: 'date',
      render: (value: Date) => {
        return formaterDate(value);
      }
    }),
    createColumn('dateFin', 'Date de fin', 'date',{
      filterable: true,
      filterType: 'date',
      render: (value: Date) => {
        return formaterDate(value);
      }
    }),
    {
      key: 'duree',
      label: 'Durée',
      type: 'number',
      filterable: true,
      filterType: 'number',
      render: (_value: any, item: Sejour) => {
        return calculerDureeSejour(item.dateDebut, item.dateFin) + " jours";
      }
    },
  ];

  useEffect(() => {
    async function getSejours() {
      try {
        const response = await sejourService.getAllSejours();
        setListSejours(response);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur s'est produite :", error);
        setLoading(false);
      }
    }

    if (role === "ADMIN") {
      getSejours();
    }
  }, [refreshTrigger, role]);

  const openModal = useCallback((sejour?: Sejour) => {
    setModalState({ show: true, editingSejour: sejour || null });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ show: false, editingSejour: null });
  }, []);

  const refreshList = useCallback(() => {
    setRefreshTrigger(prev => !prev);
  }, []);

  const handleDelete = useCallback(async (sejour: Sejour, _index: number) => {
    try {
      await sejourService.deleteSejour(sejour.id);
    } catch (error) {
      console.error("Erreur lors de la suppression du séjour:", error);
      throw error;
    }
  }, []);

  if (role !== "ADMIN") {
    return <Acces_non_autorise />;
  }

  return (
    <Liste
      columns={columns}
      data={listSejours}
      loading={loading}
      title="Liste des Séjours"
      addButtonText="Ajouter un Séjour"
      onAdd={() => openModal()}
      refreshList={refreshList}
      showModal={modalState.show && !modalState.editingSejour}
      onCloseModal={closeModal}
      formComponent={Sejour_form}
      canEdit={true}
      canAdd={true}
      canDelete={true}
      onDelete={handleDelete}
      showEditModal={modalState.show && !!modalState.editingSejour}
      onCloseEditModal={closeModal}
      editingItem={modalState.editingSejour}
      onOpenEditModal={(sejour) => openModal(sejour)}
    />
  );
};

  

export default Liste_sejours;