import { RoleSysteme } from "../enums/RoleSysteme";
import { lireDernierSejourVisite } from "./headerSejourContext";
import store from "../redux/store";
import { accountService } from "../services/account.service";
import { utilisateurService } from "../services/utilisateur.service";

/** Charge le profil (Redux), puis renvoie l’URL d’accueil : dernier séjour visité ou /profil. */
export async function chargerProfilEtCheminAccueil(): Promise<string> {
  try {
    await utilisateurService.getUser();
  } catch {
    return "/profil";
  }
  return cheminAccueilDepuisEtatActuel();
}

/** À utiliser lorsque le profil Redux est déjà à jour (ex. Navigate client). */
export function cheminAccueilDepuisEtatActuel(): string {
  const sub = accountService.getTokenInfo()?.payload?.sub;
  const role = store.getState().auth.role;
  const dernierId = sub != null ? lireDernierSejourVisite(String(sub)) : null;
  const peutMesSejours = role === RoleSysteme.DIRECTION || role === RoleSysteme.BASIC_USER;
  if (dernierId !== null && peutMesSejours) {
    return `/mes-sejours/${dernierId}`;
  }
  return "/profil";
}
