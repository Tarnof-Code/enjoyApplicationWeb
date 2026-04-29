import { useNavigate, useParams, useRouteLoaderData } from "react-router-dom";
import ListePlanningsOrganisation from "../../../components/Liste/ListePlanningsOrganisation";
import {
    SejourDTO,
    EnfantDto,
    GroupeDto,
    LieuDto,
    MomentDto,
    HoraireDto,
    PlanningGrilleSummaryDto,
} from "../../../types/api";
import { trierMomentsChronologiquement } from "../../../helpers/trierMomentsChronologiquement";
import { trierHorairesChronologiquement } from "../../../helpers/trierHorairesChronologiquement";

type SejourDetailLoaderSuccess = {
    sejour: SejourDTO;
    enfants: EnfantDto[];
    groupes: GroupeDto[];
    lieux: LieuDto[];
    moments: MomentDto[];
    horaires: HoraireDto[];
    planningGrilles: PlanningGrilleSummaryDto[];
};

/** Liste ou éditeur pleine page selon la sous-route (`organisation` vs `organisation/:grilleId`). */
const DetailsSejourOrganisation: React.FC = () => {
    const loaderData = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | Error | undefined;
    const navigate = useNavigate();
    const { grilleId } = useParams();

    const parsedGrille =
        grilleId != null && grilleId !== "" ? Number.parseInt(grilleId, 10) : Number.NaN;
    const embeddedEditorGrilleId =
        Number.isFinite(parsedGrille) && parsedGrille > 0 ? parsedGrille : null;

    if (loaderData === undefined || loaderData instanceof Error || !loaderData.sejour) {
        return null;
    }

    const { sejour, groupes, lieux, moments, horaires, planningGrilles } = loaderData;

    const baseOrganisation = `/directeur/sejours/${sejour.id}/organisation`;

    return (
        <ListePlanningsOrganisation
            sejourId={sejour.id}
            dateDebut={sejour.dateDebut}
            dateFin={sejour.dateFin}
            grilles={planningGrilles}
            moments={trierMomentsChronologiquement(moments)}
            horaires={trierHorairesChronologiquement(horaires)}
            groupes={groupes ?? []}
            lieux={lieux ?? []}
            membresEquipe={sejour.equipe ?? []}
            directeur={sejour.directeur}
            embeddedEditorGrilleId={embeddedEditorGrilleId}
            onCloseEmbeddedEditor={() => navigate(baseOrganisation)}
            onNavigateToPlanning={(id) => navigate(`${baseOrganisation}/${id}`)}
        />
    );
};

export default DetailsSejourOrganisation;
