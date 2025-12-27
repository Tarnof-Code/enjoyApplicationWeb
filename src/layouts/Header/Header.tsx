import styles from "./Header.module.scss";
import "@fontsource/dancing-script";
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { accountService } from "../../services/account.service";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { Collapse, Navbar, NavbarToggler, Nav, NavItem } from "reactstrap";
import { FaUsers, FaUser, FaPowerOff, FaSuitcaseRolling } from "react-icons/fa"; // Importez l'icône que vous souhaitez utiliser
import { utilisateurService } from "../../services/utilisateur.service";
import { RoleSysteme } from "../../enums/RoleSysteme";

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
            <Nav className="me-auto" navbar>
              <NavItem className={styles.navItemMargin}>
                <NavLink to={"/directeur/sejours"} className={styles.link}>
                  <div className={styles.iconWithText}>
                    <FaSuitcaseRolling size={20} />
                    <span>Mes séjours</span>
                  </div>
                </NavLink>
              </NavItem>
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
