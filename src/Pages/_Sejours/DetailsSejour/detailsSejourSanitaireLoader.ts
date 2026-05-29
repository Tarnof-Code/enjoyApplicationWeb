import { LoaderFunctionArgs, json } from "react-router-dom";
import { throwRouteLoaderError } from "../../../helpers/routeError";
import { cahierInfirmerieService } from "../../../services/cahier-infirmerie.service";
import { sejourEnfantService } from "../../../services/sejour-enfant.service";
import type { CahierInfirmerieEntreeDto, EnfantDossierSanitaireLigneDto } from "../../../types/api";

export interface SanitaireLoaderData {
  lignes: EnfantDossierSanitaireLigneDto[];
  entreesCahier: CahierInfirmerieEntreeDto[];
}

export async function sanitaireLoader({ params }: LoaderFunctionArgs): Promise<SanitaireLoaderData> {
  if (!params.id) {
    throw json(
      { kind: "not-found", message: "La ressource demandée est introuvable." },
      { status: 404 }
    );
  }

  const sejourId = parseInt(params.id, 10);
  if (!Number.isFinite(sejourId)) {
    throw json(
      { kind: "not-found", message: "La ressource demandée est introuvable." },
      { status: 404 }
    );
  }

  try {
    const [lignes, entreesCahier] = await Promise.all([
      sejourEnfantService.listerDossiersEnfantsSanitaire(sejourId),
      cahierInfirmerieService.listerEntrees(sejourId),
    ]);

    return {
      lignes: Array.isArray(lignes) ? lignes : [],
      entreesCahier: Array.isArray(entreesCahier) ? entreesCahier : [],
    };
  } catch (error) {
    throwRouteLoaderError(error);
  }
}
