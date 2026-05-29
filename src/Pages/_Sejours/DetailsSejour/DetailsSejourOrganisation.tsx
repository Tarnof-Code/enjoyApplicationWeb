import { useMemo } from "react";
import { useNavigate, useParams, useRouteLoaderData } from "react-router-dom";
import ListePlanningsOrganisation from "../../../components/Liste/ListePlanningsOrganisation";
import { accountService } from "../../../services/account.service";
import { peutGererMembresEquipeSejour } from "../../../helpers/peutGererMembresEquipeSejour";
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
    const loaderData = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | undefined;
    const navigate = useNavigate();
    const { grilleId } = useParams();

    const parsedGrille =
        grilleId != null && grilleId !== "" ? Number.parseInt(grilleId, 10) : Number.NaN;
    const embeddedEditorGrilleId =
        Number.isFinite(parsedGrille) && parsedGrille > 0 ? parsedGrille : null;

    if (loaderData === undefined || !loaderData.sejour) {
        return null;
    }

    const { sejour, groupes, lieux, moments, horaires, planningGrilles } = loaderData;

    const baseOrganisation = `/mes-sejours/${sejour.id}/organisation`;

    const peutGererPlanningStructure = useMemo(() => {
        const sub = accountService.getTokenInfo()?.payload?.sub;
        return peutGererMembresEquipeSejour(
            typeof sub === "string" ? sub : undefined,
            sejour.directeur,
            sejour.equipe
        );
    }, [sejour.directeur, sejour.equipe]);

    const tokenConnecteSub = accountService.getTokenInfo()?.payload?.sub;

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
            peutGererPlanningStructure={peutGererPlanningStructure}
            tokenUtilisateurConnecte={typeof tokenConnecteSub === "string" ? tokenConnecteSub : null}
        />
    );
};

export default DetailsSejourOrganisation;
