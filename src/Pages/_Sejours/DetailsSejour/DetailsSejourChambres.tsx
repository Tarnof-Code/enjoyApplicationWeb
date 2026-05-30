import { useMemo } from "react";
import { useLoaderData, useNavigate, useRouteLoaderData } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import ListeChambres from "../../../components/Liste/ListeChambres";
import type { EnfantDto, GroupeDto, SejourDTO } from "../../../types/api";
import type { MembreEquipePourChambre } from "../../../helpers/chambreOccupantsUtils";
import { trierParPrenomPuisNom } from "../../../helpers/trierUtilisateurs";
import type { ChambresLoaderData } from "./detailsSejourChambresLoader";

type SejourDetailLoaderSuccess = {
    sejour: SejourDTO;
    enfants: EnfantDto[];
    groupes: GroupeDto[];
};

const DetailsSejourChambres = () => {
    const { chambres } = useLoaderData() as ChambresLoaderData;
    const navigate = useNavigate();
    const loaderData = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | undefined;

    const membresEquipe = useMemo((): MembreEquipePourChambre[] => {
        if (!loaderData?.sejour) return [];
        const { sejour } = loaderData;
        const seen = new Set<string>();
        const result: MembreEquipePourChambre[] = [];
        const genreParToken = new Map(
            (sejour.equipe ?? []).map((m) => [m.tokenId, m.genre ?? ""])
        );
        if (sejour.directeur && !seen.has(sejour.directeur.tokenId)) {
            seen.add(sejour.directeur.tokenId);
            result.push({
                tokenId: sejour.directeur.tokenId,
                nom: sejour.directeur.nom,
                prenom: sejour.directeur.prenom,
                genre: genreParToken.get(sejour.directeur.tokenId) ?? "",
            });
        }
        for (const m of sejour.equipe || []) {
            if (!seen.has(m.tokenId)) {
                seen.add(m.tokenId);
                result.push({
                    tokenId: m.tokenId,
                    nom: m.nom,
                    prenom: m.prenom,
                    genre: m.genre ?? "",
                });
            }
        }
        return trierParPrenomPuisNom(result);
    }, [loaderData]);

    if (loaderData === undefined) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/mes-sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Chargement du séjour…</p>
            </div>
        );
    }

    const sejour = loaderData.sejour;
    const enfantsSejour = loaderData.enfants ?? [];
    const groupesSejour = loaderData.groupes ?? [];

    if (!sejour) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/mes-sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Séjour introuvable</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <ListeChambres
                chambres={chambres}
                sejourId={sejour.id}
                enfants={enfantsSejour}
                groupes={groupesSejour}
                equipe={membresEquipe}
            />
        </div>
    );
};

export default DetailsSejourChambres;
