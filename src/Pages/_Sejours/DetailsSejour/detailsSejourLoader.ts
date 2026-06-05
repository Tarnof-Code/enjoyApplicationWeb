import { LoaderFunctionArgs, json } from "react-router-dom";
import { sejourService } from "../../../services/sejour.service";
import { throwRouteLoaderError } from "../../../helpers/routeError";
import { sejourEnfantService } from "../../../services/sejour-enfant.service";
import { sejourGroupeService } from "../../../services/sejour-groupe.service";
import { sejourActiviteService } from "../../../services/sejour-activite.service";
import { sejourLieuService } from "../../../services/sejour-lieu.service";
import { sejourMomentService } from "../../../services/sejour-moment.service";
import { sejourTypeActiviteService } from "../../../services/sejour-type-activite.service";
import { sejourHoraireService } from "../../../services/sejour-horaire.service";
import { sejourPlanningGrilleService } from "../../../services/sejour-planning-grille.service";
import { sejourReunionService } from "../../../services/sejour-reunion.service";
import { sejourActivitePrestataireService } from "../../../services/sejour-activite-prestataire.service";
import { sejourChambreService } from "../../../services/sejour-chambre.service";
import { mettreEnCacheSejourRoute } from "./sejourDetailRouteCache";

export async function detailsSejourLoader({ params }: LoaderFunctionArgs) {
    if (!params.id) {
        throw json(
            { kind: "not-found", message: "La ressource demandée est introuvable." },
            { status: 404 }
        );
    }
    try {
        const sejourId = parseInt(params.id, 10);
        const [
            sejour,
            enfants,
            groupes,
            lieux,
            moments,
            horaires,
            activites,
            typesActivite,
            planningGrilles,
            reunions,
            activitesPrestataires,
            chambres,
        ] = await Promise.all([
            sejourService.getSejourById(params.id),
            sejourEnfantService.getEnfantsDuSejour(sejourId),
            sejourGroupeService.getGroupesDuSejour(sejourId),
            sejourLieuService.getLieuxDuSejour(sejourId),
            sejourMomentService.getMomentsDuSejour(sejourId),
            sejourHoraireService.getHorairesDuSejour(sejourId),
            sejourActiviteService.getActivitesDuSejour(sejourId),
            sejourTypeActiviteService.getTypesActiviteDuSejour(sejourId),
            sejourPlanningGrilleService.listerGrilles(sejourId),
            sejourReunionService.listerReunions(sejourId),
            sejourActivitePrestataireService.listerActivitesPrestataires(sejourId),
            sejourChambreService.getChambresDuSejour(sejourId),
        ]);
        if (params.id) {
            mettreEnCacheSejourRoute(params.id, sejour);
        }
        return {
            sejour,
            enfants,
            groupes,
            lieux,
            moments,
            horaires,
            activites,
            typesActivite,
            planningGrilles,
            reunions,
            activitesPrestataires,
            chambres: Array.isArray(chambres) ? chambres : [],
        };
    } catch (error) {
        throwRouteLoaderError(error);
    }
}
