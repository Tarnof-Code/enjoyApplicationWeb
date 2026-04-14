import { useMemo } from "react";
import { useRouteLoaderData, useNavigate } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import ListeActivites from "../../../components/Liste/ListeActivites";
import { SejourDTO, EnfantDto, GroupeDto, ActiviteDto, LieuDto, MomentDto, TypeActiviteDto } from "../../../types/api";

type SejourDetailLoaderSuccess = {
    sejour: SejourDTO;
    enfants: EnfantDto[];
    groupes: GroupeDto[];
    lieux: LieuDto[];
    moments: MomentDto[];
    activites: ActiviteDto[];
    typesActivite: TypeActiviteDto[];
};

const DetailsSejourActivites: React.FC = () => {
    const loaderData = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | Error | undefined;
    const navigate = useNavigate();

    const membresEquipePourActivites = useMemo(() => {
        if (!loaderData || loaderData instanceof Error) return [];
        const { sejour } = loaderData;
        const seen = new Set<string>();
        const result: { tokenId: string; nom: string; prenom: string }[] = [];
        if (sejour.directeur && !seen.has(sejour.directeur.tokenId)) {
            seen.add(sejour.directeur.tokenId);
            result.push({
                tokenId: sejour.directeur.tokenId,
                nom: sejour.directeur.nom,
                prenom: sejour.directeur.prenom,
            });
        }
        for (const m of sejour.equipe || []) {
            if (!seen.has(m.tokenId)) {
                seen.add(m.tokenId);
                result.push({ tokenId: m.tokenId, nom: m.nom, prenom: m.prenom });
            }
        }
        return result.sort((a, b) => {
            const c = a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" });
            return c !== 0 ? c : a.prenom.localeCompare(b.prenom, undefined, { sensitivity: "base" });
        });
    }, [loaderData]);

    if (loaderData === undefined) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/directeur/sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Chargement du séjour…</p>
            </div>
        );
    }

    if (loaderData instanceof Error) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/directeur/sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Erreur lors du chargement du séjour</p>
            </div>
        );
    }

    const { sejour, groupes, lieux, moments, activites, typesActivite } = loaderData;

    if (!sejour) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/directeur/sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Séjour introuvable</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <ListeActivites
                activites={activites}
                sejour={sejour}
                groupes={groupes || []}
                equipe={membresEquipePourActivites}
                lieux={lieux ?? []}
                moments={moments}
                typesActivite={typesActivite}
            />
        </div>
    );
};

export default DetailsSejourActivites;
