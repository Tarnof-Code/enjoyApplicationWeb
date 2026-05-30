import { LoaderFunctionArgs, json } from "react-router-dom";
import { throwRouteLoaderError } from "../../../helpers/routeError";
import { sejourChambreService } from "../../../services/sejour-chambre.service";
import type { ChambreDto } from "../../../types/api";

export interface ChambresLoaderData {
  chambres: ChambreDto[];
}

export async function chambresLoader({ params }: LoaderFunctionArgs): Promise<ChambresLoaderData> {
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
    const chambres = await sejourChambreService.getChambresDuSejour(sejourId);
    return {
      chambres: Array.isArray(chambres) ? chambres : [],
    };
  } catch (error) {
    throwRouteLoaderError(error);
  }
}
