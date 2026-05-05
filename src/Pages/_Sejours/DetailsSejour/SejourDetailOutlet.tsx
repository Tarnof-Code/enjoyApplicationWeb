import type { FC } from "react";
import { Outlet } from "react-router-dom";

/** Conteneur minimal pour les routes imbriquées du détail séjour (loader sur la route parent). */
const SejourDetailOutlet: FC = () => {
    return <Outlet />;
};

export default SejourDetailOutlet;
