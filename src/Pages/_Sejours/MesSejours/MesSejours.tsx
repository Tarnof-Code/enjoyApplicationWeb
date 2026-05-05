import Liste, { ColumnConfig } from "../../../components/Liste/Liste";
import { sejourService } from "../../../services/sejour.service";
import { useLoaderData, useNavigate } from "react-router-dom";
import formaterDate from "../../../helpers/formaterDate";
import { SejourDTO } from "../../../types/api";

export async function mesSejoursLoader() {
    try {
        const response = await sejourService.getAllSejoursByUtilisateur();
        return response;
    } catch (error) {
        console.error("Erreur chargement de mes séjours", error);
        return [];
    }
}

const MesSejours: React.FC = () => {
    const sejours = useLoaderData() as SejourDTO[];
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
    const handleView = (sejour: SejourDTO) => {
        navigate(`/mes-sejours/${sejour.id}`, { state: { sejour } });
    };
    return (
        <Liste
            columns={columns}
            data={sejours}
            loading={false}
            title="Mes Séjours"
            canEdit={false}
            canDelete={false}
            canAdd={false}
            canView={true}
            onView={handleView}
        />       
    )
}

export default MesSejours;
