import { useMemo } from "react";
import { useRouteLoaderData, useNavigate, Link } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import ListeActivitesPrestataires from "../../../components/Liste/ListeActivitesPrestataires";
import { accountService } from "../../../services/account.service";
import { aDroitGestionCompleteSurSejour } from "../../../helpers/droitsCahierInfirmerie";
import type {
    ActiviteDto,
    ActivitePrestataireDto,
    GroupeDto,
    MomentDto,
    SejourDTO,
} from "../../../types/api";
import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";

type SejourDetailLoaderSuccess = {
    sejour: SejourDTO;
    groupes: GroupeDto[];
    moments: MomentDto[];
    activites: ActiviteDto[];
    activitesPrestataires: ActivitePrestataireDto[];
};

const DetailsSejourActivitesPrestataires: React.FC = () => {
    const loaderData = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | undefined;
    const navigate = useNavigate();
    const roleGlobal = useSelector((state: RootState) => state.auth.role);

    const peutGererEcritures = useMemo(() => {
        if (!loaderData?.sejour) return false;
        const sub = accountService.getTokenInfo()?.payload?.sub;
        return aDroitGestionCompleteSurSejour(
            typeof sub === "string" ? sub : undefined,
            roleGlobal ?? undefined,
            loaderData.sejour.directeur,
            loaderData.sejour.equipe,
        );
    }, [loaderData, roleGlobal]);

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

    const { sejour, groupes, moments, activites, activitesPrestataires } = loaderData;

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
            <header className={styles.pageHeader}>
                <Link to={`/mes-sejours/${sejour.id}/activites`} className={styles.backButton}>
                    ← Activités
                </Link>
                <h1 className={styles.pageTitle}>Sorties / prestataires</h1>
            </header>
            <ListeActivitesPrestataires
                sejour={sejour}
                groupes={groupes || []}
                moments={moments}
                activitesInternes={activites ?? []}
                activitesPrestataires={activitesPrestataires ?? []}
                peutGererEcritures={peutGererEcritures}
            />
        </div>
    );
};

export default DetailsSejourActivitesPrestataires;
