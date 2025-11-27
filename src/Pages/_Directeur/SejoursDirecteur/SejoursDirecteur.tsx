import Liste, { ColumnConfig } from "../../../components/Liste/Liste";
import { sejourService } from "../../../services/sejour.service";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import formaterDate from "../../../helpers/formaterDate";

interface Sejour {
    id: number;
    nom: string;
    description: string;
    lieuDuSejour: string;
    dateDebut: string;
    dateFin: string;
}

const SejoursDirecteur: React.FC = () => {
    const role = useSelector((state: any) => state.auth.role);
    const [listeSejours, setListSejours] = useState<Sejour[]>([]);
    const [loading, setLoading] = useState(true);
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
    
    useEffect(() => {
        async function getSejoursDirecteur() {
            try {
                const response = await sejourService.getAllSejoursByDirecteur();
                setListSejours(response);
                setLoading(false);
            } catch (error) {
                console.error("Une erreur s'est produite :", error);
                setLoading(false);
            }
        }
        if (role === "DIRECTION") {
            getSejoursDirecteur();
        }
    }, []);

    const handleView = (sejour: Sejour) => {
        navigate(`/directeur/sejours/${sejour.id}`, { state: { sejour } });
    };

    return (
        <Liste
            columns={columns}
            data={listeSejours}
            loading={loading}
            title="Mes Séjours"
            canEdit={false}
            canDelete={false}
            canAdd={false}
            canView={true}
            onView={handleView}
        />       
    )
}


export default SejoursDirecteur;
