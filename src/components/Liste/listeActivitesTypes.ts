import type {
    ActiviteDto,
    GroupeDto,
    LieuDto,
    MomentDto,
    SejourDTO,
    TypeActiviteDto,
} from "../../types/api";

export interface MembreEquipeSejour {
    tokenId: string;
    nom: string;
    prenom: string;
}

/** Filtre calendrier « aucun animateur » : ensemble non vide sans id réel d’équipe. */
export const CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN = "__calendrier_filtre_aucun_anim__";

/** Filtre calendrier « aucun groupe » : id réservé, absent des groupes API. */
export const CALENDRIER_FILTRE_AUCUN_GROUPE_ID = -9_999_999_001;

export interface ListeActivitesProps {
    activites: ActiviteDto[];
    sejour: SejourDTO;
    groupes: GroupeDto[];
    equipe: MembreEquipeSejour[];
    lieux: LieuDto[];
    moments: MomentDto[];
    typesActivite: TypeActiviteDto[];
}
