import styles from "./Header.module.scss";
import "@fontsource/dancing-script";
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useMatch, useRouteLoaderData, useLocation } from "react-router-dom";
import { accountService } from "../../services/account.service";
import { peutGererMembresEquipeSejour } from "../../helpers/peutGererMembresEquipeSejour";
import {
  enregistrerHeaderSejourContext,
  lireHeaderSejourContext,
  toHeaderSejourSnapshot,
  type HeaderSejourContextSnapshot,
} from "../../helpers/headerSejourContext";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { Collapse, Navbar, NavbarToggler, Nav, NavItem } from "reactstrap";
import {
  FaUsers,
  FaUser,
  FaPowerOff,
  FaSuitcaseRolling,
  FaThLarge,
  FaClipboardList,
  FaChevronRight,
  FaSlidersH,
  FaTable,
  FaUtensils,
} from "react-icons/fa";
import { utilisateurService } from "../../services/utilisateur.service";
import { RoleSysteme } from "../../enums/RoleSysteme";
import {
  SejourDTO,
  EnfantDto,
  GroupeDto,
  LieuDto,
  MomentDto,
  HoraireDto,
  ActiviteDto,
  TypeActiviteDto,
} from "../../types/api";

type SejourDetailLoaderData = {
  sejour: SejourDTO;
  enfants: EnfantDto[];
  groupes: GroupeDto[];
  lieux: LieuDto[];
  moments: MomentDto[];
  horaires: HoraireDto[];
  activites: ActiviteDto[];
  typesActivite: TypeActiviteDto[];
};

const Admin_header: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    accountService.logout();
    navigate("/");
  };

  const prenom = useSelector((state: RootState) => state.auth.prenom);
  let role = useSelector((state: RootState) => state.auth.role);
  let genre = useSelector((state: RootState) => state.auth.genre);

  const roleLabel = utilisateurService.getRoleSystemeByGenre(role, genre);

  const sejourMatch = useMatch({ path: "/mes-sejours/:id", end: false });
  const sejourLoaderRaw = useRouteLoaderData("sejour-detail") as SejourDetailLoaderData | Error | undefined;
  const sejourDetailData =
    sejourLoaderRaw && !(sejourLoaderRaw instanceof Error) ? sejourLoaderRaw : undefined;
  const routeIdStr = sejourMatch?.params.id;
  const loaderSejour = sejourDetailData?.sejour;

  const [headerSejourCache, setHeaderSejourCache] = useState<HeaderSejourContextSnapshot | null>(() =>
    lireHeaderSejourContext(),
  );

  useEffect(() => {
    if (sejourDetailData?.sejour) {
      enregistrerHeaderSejourContext(sejourDetailData.sejour);
      setHeaderSejourCache(toHeaderSejourSnapshot(sejourDetailData.sejour));
    }
  }, [sejourDetailData]);

  const resolvedForHeader = useMemo((): HeaderSejourContextSnapshot | null => {
    if (loaderSejour) return toHeaderSejourSnapshot(loaderSejour);
    if (routeIdStr) {
      const n = Number(routeIdStr);
      return Number.isFinite(n) && headerSejourCache?.id === n ? headerSejourCache : null;
    }
    return headerSejourCache;
  }, [loaderSejour, routeIdStr, headerSejourCache]);

  const effectiveNavId =
    resolvedForHeader && (routeIdStr ?? String(resolvedForHeader.id));

  const peutAfficherNavParametrage = useMemo(() => {
    if (!resolvedForHeader) return false;
    const sub = accountService.getTokenInfo()?.payload?.sub;
    return peutGererMembresEquipeSejour(
      typeof sub === "string" ? sub : undefined,
      resolvedForHeader.directeur,
      resolvedForHeader.equipe,
    );
  }, [resolvedForHeader]);

  const isParticipantSejour = role === RoleSysteme.DIRECTION || role === RoleSysteme.BASIC_USER;
  const showSejourSegments =
    isParticipantSejour &&
    Boolean(
      resolvedForHeader &&
        effectiveNavId &&
        Number(effectiveNavId) === resolvedForHeader.id,
    );
  const { pathname } = useLocation();
  const dossierEnfantCommeVueGenerale =
    Boolean(effectiveNavId) &&
    pathname.startsWith(`/mes-sejours/${effectiveNavId}/enfants/`) &&
    pathname.endsWith("/dossier");

  return (
    <header className={styles.main}>
      <Navbar expand="xl" dark className={styles.navbar}>
        <NavLink to={"/"} className={`${styles.brand} ${styles.link}`}>
          {import.meta.env.VITE_APP_NAME || "Enjoy"}
        </NavLink>
        <NavbarToggler onClick={toggle} />
        <Collapse isOpen={isOpen} navbar>
          {role === RoleSysteme.ADMIN && (
            <Nav className="me-auto" navbar>
              <NavItem className={styles.navItemMargin}>
                <NavLink to={"/utilisateurs"} className={styles.link}>
                  <div className={styles.iconWithText}>
                    <FaUsers size={20} />
                    <span>Les utilisateurs</span>
                  </div>
                </NavLink>
              </NavItem>
              <NavItem className={styles.navItemMargin}>
                <NavLink to={"/sejours"} className={styles.link}>
                  <div className={styles.iconWithText}>
                    <FaSuitcaseRolling size={20} />
                    <span>Les séjours</span>
                  </div>
                </NavLink>
              </NavItem>
            </Nav>
          )}
          {isParticipantSejour && (
            <Nav className={`me-auto ${styles.directorNav}`} navbar>
              <NavItem className={styles.directorNavItem}>
                <NavLink
                  to={"/mes-sejours"}
                  end
                  className={({ isActive }) =>
                    `${styles.directorRootLink} ${isActive ? styles.directorRootLinkActive : ""}`
                  }
                >
                  <FaSuitcaseRolling size={16} aria-hidden />
                  <span>Mes séjours</span>
                </NavLink>
              </NavItem>
              {showSejourSegments && effectiveNavId && resolvedForHeader && (
                <NavItem className={`${styles.directorNavItem} ${styles.directorContextItem}`}>
                  <div className={styles.directorContextRow}>
                    <FaChevronRight className={styles.directorBreadcrumbChevron} aria-hidden />
                    <span className={styles.directorSejourPill} title={resolvedForHeader.nom}>
                      {resolvedForHeader.nom}
                    </span>
                    <div className={styles.directorSegmented} role="tablist" aria-label="Sections du séjour">
                      <NavLink
                        to={`/mes-sejours/${effectiveNavId}`}
                        end
                        className={({ isActive }) =>
                          `${styles.directorSegment} ${isActive || dossierEnfantCommeVueGenerale ? styles.directorSegmentActive : ""}`
                        }
                      >
                        <FaThLarge size={14} aria-hidden />
                        Vue générale
                      </NavLink>
                      <NavLink
                        to={`/mes-sejours/${effectiveNavId}/organisation`}
                        className={({ isActive }) =>
                          `${styles.directorSegment} ${isActive ? styles.directorSegmentActive : ""}`
                        }
                      >
                        <FaTable size={14} aria-hidden />
                        Organisation
                      </NavLink>
                      <NavLink
                        to={`/mes-sejours/${effectiveNavId}/activites`}
                        className={({ isActive }) =>
                          `${styles.directorSegment} ${isActive ? styles.directorSegmentActive : ""}`
                        }
                      >
                        <FaClipboardList size={14} aria-hidden />
                        Activités
                      </NavLink>
                      <NavLink
                        to={`/mes-sejours/${effectiveNavId}/menus`}
                        className={({ isActive }) =>
                          `${styles.directorSegment} ${isActive ? styles.directorSegmentActive : ""}`
                        }
                      >
                        <FaUtensils size={14} aria-hidden />
                        Menus
                      </NavLink>
                      {peutAfficherNavParametrage ? (
                        <NavLink
                          to={`/mes-sejours/${effectiveNavId}/parametrage`}
                          className={({ isActive }) =>
                            `${styles.directorSegment} ${isActive ? styles.directorSegmentActive : ""}`
                          }
                        >
                          <FaSlidersH size={14} aria-hidden />
                          Paramétrage
                        </NavLink>
                      ) : null}
                    </div>
                  </div>
                </NavItem>
              )}
            </Nav>
          )}
          <Nav navbar className="ms-auto">
            <NavItem className={styles.navItemMargin}>
              <NavLink to={"/profil"} className={styles.link}>
                <div className={styles.iconWithText}>
                  <FaUser size={20} />
                  <span>
                    {prenom} ({roleLabel})
                  </span>
                </div>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to={"/"} onClick={handleLogout} className={styles.link}>
                <div className={styles.iconWithText}>
                  <FaPowerOff size={20} />
                  <span>Se déconnecter</span>
                </div>
              </NavLink>
            </NavItem>
          </Nav>
        </Collapse>
      </Navbar>
    </header>
  );
}

export default Admin_header;
