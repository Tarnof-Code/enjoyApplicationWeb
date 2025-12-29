import React from 'react';
import Liste, { ColumnConfig } from '../../../components/Liste/Liste';
import { sejourService } from '../../../services/sejour.service';
import SejourForm from '../../../components/Forms/SejourForm';
import formaterDate from '../../../helpers/formaterDate';
import calculerDureeEnJours from '../../../helpers/calculerDureeEnJours';
import { useLoaderData } from 'react-router-dom';
import { SejourDTO } from '../../../types/api';

export async function sejoursAdminLoader() {
  try {
    const response = await sejourService.getAllSejours();
    return response;
  } catch (error) {
    console.error("Erreur chargement sejours admin", error);
    return [];
  }
}

const ListeSejoursAdmin: React.FC = () => {

  const sejours = useLoaderData() as SejourDTO[];

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
    createColumn('dateDebut', 'Date de début', 'date', {
      filterable: true,
      filterType: 'date',
      render: (value: string) => {
        return formaterDate(value);
      }
    }),
    createColumn('dateFin', 'Date de fin', 'date', {
      filterable: true,
      filterType: 'date',
      render: (value: string) => {
        return formaterDate(value);
      }
    }),
    {
      key: 'duree',
      label: 'Durée',
      type: 'number',
      filterable: true,
      filterType: 'number',
      render: (_value: any, item: SejourDTO) => {
        return calculerDureeEnJours(item.dateDebut, item.dateFin) + " jours";
      }
    },
  ];

  const handleDelete = async (sejour: SejourDTO, _index: number) => {
    try {
      await sejourService.deleteSejour(sejour.id);
    } catch (error) {
      console.error("Erreur lors de la suppression du séjour:", error);
      throw error;
    }
  };

  return (
    <Liste
      columns={columns}
      data={sejours}
      loading={false}
      title="Tous les séjours"
      addButtonText="Ajouter un Séjour"
      formComponent={SejourForm}
      canEdit={true}
      canAdd={true}
      canDelete={true}
      onDelete={handleDelete}
    />
  );
};

export default ListeSejoursAdmin;

