import type { FC } from "react";
import { Outlet, useNavigate, useRouteLoaderData } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import type {
    EnfantDto,
    GroupeDto,
    HoraireDto,
    LieuDto,
    MomentDto,
    PlanningGrilleSummaryDto,
    SejourDTO,
} from "../../../types/api";

type SejourDetailLoaderSuccess = {
    sejour: SejourDTO;
    enfants: EnfantDto[];
    groupes: GroupeDto[];
    lieux: LieuDto[];
    moments: MomentDto[];
    horaires: HoraireDto[];
    planningGrilles: PlanningGrilleSummaryDto[];
};

/** Conteneur pleine page pour la liste et l’éditeur (`organisation`, `organisation/:grilleId`). */
const DetailsSejourOrganisationLayout: FC = () => {
    const loaderData = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | Error | undefined;
    const navigate = useNavigate();

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

    const { sejour } = loaderData;

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
            <Outlet />
        </div>
    );
};

export default DetailsSejourOrganisationLayout;
