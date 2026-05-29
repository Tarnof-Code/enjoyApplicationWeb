import { LoaderFunctionArgs, json } from "react-router-dom";
import { throwRouteLoaderError } from "../../../helpers/routeError";
import { sejourMenuService } from "../../../services/sejour-menu.service";
import type { MenuRepasDto, ReferenceAlimentaireDto, SejourDTO } from "../../../types/api";
import { lireSejourDepuisCacheRoute } from "./sejourDetailRouteCache";
import { normaliserMenusRepas, paramsListerMenusPourSejour } from "./menusSejourUtils";

export type MenusLoaderData = {
  menus: MenuRepasDto[];
  refsAllergenes: ReferenceAlimentaireDto[];
  refsRegimes: ReferenceAlimentaireDto[];
};

/** Charge refs + menus pour la page Menus (2 appels API, séjour lu depuis le cache du loader parent). */
export async function chargerDonneesMenusSejour(sejour: SejourDTO): Promise<MenusLoaderData> {
  const menuParams = paramsListerMenusPourSejour(sejour);

  const [refs, menus] = await Promise.all([
    sejourMenuService.getReferencesAlimentairesAgregeesEnfants(sejour.id),
    menuParams ? sejourMenuService.listerMenus(sejour.id, menuParams) : Promise.resolve([]),
  ]);

  return {
    menus: normaliserMenusRepas(menus),
    refsAllergenes: refs.allergenes,
    refsRegimes: refs.regimesEtPreferences,
  };
}

export async function menusLoader({ params }: LoaderFunctionArgs): Promise<MenusLoaderData> {
  if (!params.id) {
    throw json(
      { kind: "not-found", message: "La ressource demandée est introuvable." },
      { status: 404 }
    );
  }

  try {
    const sejour = lireSejourDepuisCacheRoute(params.id);
    if (!sejour) {
      throw json(
        { kind: "not-found", message: "La ressource demandée est introuvable." },
        { status: 404 }
      );
    }
    return await chargerDonneesMenusSejour(sejour);
  } catch (error) {
    throwRouteLoaderError(error);
  }
}
