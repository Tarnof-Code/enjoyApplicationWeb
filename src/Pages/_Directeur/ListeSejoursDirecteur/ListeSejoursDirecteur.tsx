import Liste, { ColumnConfig } from "../../../components/Liste/Liste";
import { sejourService } from "../../../services/sejour.service";
import { useCallback } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import formaterDate from "../../../helpers/formaterDate";

interface Sejour {
    id: number;
    nom: string;
    description: string;
    lieuDuSejour: string;
    dateDebut: string;
    dateFin: string;
}

export async function listeSejoursDirecteurLoader() {
    try {
        const response = await sejourService.getAllSejoursByDirecteur();
        return response;
    } catch (error) {
        console.error("Erreur chargement liste sejours directeur", error);
        return [];
    }
}

const ListeSejoursDirecteur: React.FC = () => {

    const sejours = useLoaderData() as Sejour[];
    const navigate = useNavigate();

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
        createColumn('dateDebut', 'Date de début', 'date', {
            filterable: true,
            filterType: 'date',
            render: (value: Date) => {
                return formaterDate(value);
            }
        }),
        createColumn('dateFin', 'Date de fin', 'date', {
            filterable: true,
            filterType: 'date',
            render: (value: Date) => {
                return formaterDate(value);
            }
        }),
    ];
    
    const refreshList = useCallback(() => {
        navigate(".", { replace: true });
    }, [navigate]);

    const handleView = (sejour: Sejour) => {
        navigate(`/directeur/sejours/${sejour.id}`, { state: { sejour } });
    };

    return (
        <Liste
            columns={columns}
            data={sejours}
            loading={false}
            title="Mes Séjours"
            canEdit={false}
            refreshList={refreshList}
            canDelete={false}
            canAdd={false}
            canView={true}
            onView={handleView}
        />       
    )
}

export default ListeSejoursDirecteur;

