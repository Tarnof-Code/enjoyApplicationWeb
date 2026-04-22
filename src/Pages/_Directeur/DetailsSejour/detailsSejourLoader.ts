import { LoaderFunctionArgs } from "react-router-dom";
import { sejourService } from "../../../services/sejour.service";
import { sejourEnfantService } from "../../../services/sejour-enfant.service";
import { sejourGroupeService } from "../../../services/sejour-groupe.service";
import { sejourActiviteService } from "../../../services/sejour-activite.service";
import { sejourLieuService } from "../../../services/sejour-lieu.service";
import { sejourMomentService } from "../../../services/sejour-moment.service";
import { sejourTypeActiviteService } from "../../../services/sejour-type-activite.service";
import { sejourHoraireService } from "../../../services/sejour-horaire.service";

export async function detailsSejourLoader({ params }: LoaderFunctionArgs) {
    if (!params.id) throw new Error("ID du séjour manquant");
    try {
        const sejourId = parseInt(params.id, 10);
        const [sejour, enfants, groupes, lieux, moments, horaires, activites, typesActivite] = await Promise.all([
            sejourService.getSejourById(params.id),
            sejourEnfantService.getEnfantsDuSejour(sejourId),
            sejourGroupeService.getGroupesDuSejour(sejourId),
            sejourLieuService.getLieuxDuSejour(sejourId),
            sejourMomentService.getMomentsDuSejour(sejourId),
            sejourHoraireService.getHorairesDuSejour(sejourId),
            sejourActiviteService.getActivitesDuSejour(sejourId),
            sejourTypeActiviteService.getTypesActiviteDuSejour(sejourId),
        ]);
        return { sejour, enfants, groupes, lieux, moments, horaires, activites, typesActivite };
    } catch (error) {
        console.error("Erreur chargement séjour", error);
        return error;
    }
}
