import styles from "./Header.module.scss";
import "@fontsource/dancing-script";
import React, { useState } from "react";
import { NavLink, useNavigate, useMatch, useRouteLoaderData } from "react-router-dom";
import { accountService } from "../../services/account.service";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { Collapse, Navbar, NavbarToggler, Nav, NavItem } from "reactstrap";
import { FaUsers, FaUser, FaPowerOff, FaSuitcaseRolling, FaThLarge, FaClipboardList, FaChevronRight } from "react-icons/fa";
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

  const sejourMatch = useMatch({ path: "/directeur/sejours/:id", end: false });
  const sejourLoaderRaw = useRouteLoaderData("sejour-detail") as SejourDetailLoaderData | Error | undefined;
  const sejourDetailData =
    sejourLoaderRaw && !(sejourLoaderRaw instanceof Error) ? sejourLoaderRaw : undefined;
  const isSejourContext = role === RoleSysteme.DIRECTION && Boolean(sejourMatch && sejourDetailData);
  const sejourIdParam = sejourMatch?.params.id;

  return (
    <header className={styles.main}>
      <Navbar expand="md" dark className={styles.navbar}>
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
          {role === RoleSysteme.DIRECTION && (
            <Nav className={`me-auto ${styles.directorNav}`} navbar>
              <NavItem className={styles.directorNavItem}>
                <NavLink
                  to={"/directeur/sejours"}
                  end
                  className={({ isActive }) =>
                    `${styles.directorRootLink} ${isActive ? styles.directorRootLinkActive : ""}`
                  }
                >
                  <FaSuitcaseRolling size={16} aria-hidden />
                  <span>Mes séjours</span>
                </NavLink>
              </NavItem>
              {isSejourContext && sejourIdParam && sejourDetailData && (
                <NavItem className={`${styles.directorNavItem} ${styles.directorContextItem}`}>
                  <div className={styles.directorContextRow}>
                    <FaChevronRight className={styles.directorBreadcrumbChevron} aria-hidden />
                    <span className={styles.directorSejourPill} title={sejourDetailData.sejour.nom}>
                      {sejourDetailData.sejour.nom}
                    </span>
                    <div className={styles.directorSegmented} role="tablist" aria-label="Sections du séjour">
                      <NavLink
                        to={`/directeur/sejours/${sejourIdParam}`}
                        end
                        className={({ isActive }) =>
                          `${styles.directorSegment} ${isActive ? styles.directorSegmentActive : ""}`
                        }
                      >
                        <FaThLarge size={14} aria-hidden />
                        Vue générale
                      </NavLink>
                      <NavLink
                        to={`/directeur/sejours/${sejourIdParam}/activites`}
                        className={({ isActive }) =>
                          `${styles.directorSegment} ${isActive ? styles.directorSegmentActive : ""}`
                        }
                      >
                        <FaClipboardList size={14} aria-hidden />
                        Activités
                      </NavLink>
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
