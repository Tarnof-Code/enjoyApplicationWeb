import { LoaderFunctionArgs, json } from "react-router-dom";
import { enumererJoursDuSejour } from "../../../components/Liste/listeActivitesUtils";
import { throwRouteLoaderError } from "../../../helpers/routeError";
import { sejourMenuService } from "../../../services/sejour-menu.service";
import { sejourService } from "../../../services/sejour.service";
import type { MenuRepasDto, ReferenceAlimentaireDto } from "../../../types/api";

export interface MenusLoaderData {
  menus: MenuRepasDto[];
  refsAllergenes: ReferenceAlimentaireDto[];
  refsRegimes: ReferenceAlimentaireDto[];
}

function normaliserMenus(list: MenuRepasDto[]): MenuRepasDto[] {
  return list.map((m) => ({
    ...m,
    allergenes: m.allergenes ?? [],
    regimesEtPreferences: m.regimesEtPreferences ?? [],
  }));
}

export async function menusLoader({ params }: LoaderFunctionArgs): Promise<MenusLoaderData> {
  if (!params.id) {
    throw json(
      { kind: "not-found", message: "La ressource demandée est introuvable." },
      { status: 404 }
    );
  }

  try {
    const sejour = await sejourService.getSejourById(params.id);
    const jours = enumererJoursDuSejour(sejour);
    const rangeStartStr = jours[0]?.ymd ?? "";
    const rangeEndStr = jours[jours.length - 1]?.ymd ?? "";
    const menuParams =
      rangeStartStr && rangeEndStr
        ? rangeStartStr === rangeEndStr
          ? { date: rangeStartStr }
          : { dateDebut: rangeStartStr, dateFin: rangeEndStr }
        : null;

    const [refs, menus] = await Promise.all([
      sejourMenuService.getReferencesAlimentairesAgregeesEnfants(sejour.id),
      menuParams ? sejourMenuService.listerMenus(sejour.id, menuParams) : Promise.resolve([]),
    ]);

    return {
      menus: normaliserMenus(menus),
      refsAllergenes: refs.allergenes,
      refsRegimes: refs.regimesEtPreferences,
    };
  } catch (error) {
    throwRouteLoaderError(error);
  }
}
