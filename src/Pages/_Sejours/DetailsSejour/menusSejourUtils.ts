import { enumererJoursDuSejour } from "../../../components/Liste/listeActivitesUtils";
import type { ListerMenusParams } from "../../../services/sejour-menu.service";
import type { MenuRepasDto, SejourDTO } from "../../../types/api";

export function paramsListerMenusPourSejour(sejour: SejourDTO): ListerMenusParams | null {
  const jours = enumererJoursDuSejour(sejour);
  const rangeStartStr = jours[0]?.ymd ?? "";
  const rangeEndStr = jours[jours.length - 1]?.ymd ?? "";
  if (!rangeStartStr || !rangeEndStr) return null;
  return rangeStartStr === rangeEndStr
    ? { date: rangeStartStr }
    : { dateDebut: rangeStartStr, dateFin: rangeEndStr };
}

export function normaliserMenusRepas(list: MenuRepasDto[]): MenuRepasDto[] {
  return list.map((m) => ({
    ...m,
    allergenes: m.allergenes ?? [],
    regimesEtPreferences: m.regimesEtPreferences ?? [],
  }));
}
