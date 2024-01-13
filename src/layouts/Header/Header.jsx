import styles from "./Header.module.scss";
import "@fontsource/dancing-script";
import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { accountService } from "../../services/account.service";
import { useSelector } from "react-redux";
import { Collapse, Navbar, NavbarToggler, Nav, NavItem } from "reactstrap";
import { FaUsers, FaUser, FaPowerOff, FaSuitcaseRolling } from "react-icons/fa"; // Importez l'icône que vous souhaitez utiliser
import { utilisateurService } from "../../services/utilisateur.service";

function Admin_header() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);
  const prenom = useSelector((state) => state.auth.prenom);
  let role = useSelector((state) => state.auth.role);
  let genre = useSelector((state) => state.auth.genre);
  let roleByGenre = utilisateurService.getRoleByGenre(role, genre);

  return (
    <header className={styles.main}>
      <Navbar expand="md" dark className={styles.navbar}>
        <NavLink to={"/"} className={`${styles.brand} ${styles.link}`}>
          Enjoy
        </NavLink>
        <NavbarToggler onClick={toggle} />
        <Collapse isOpen={isOpen} navbar>
          {role === "ADMIN" && (
            <Nav className="me-auto" navbar>
              <NavItem className={styles.navItemMargin}>
                <NavLink to={"/liste_utilisateurs"} className={styles.link}>
                  <div className={styles.iconWithText}>
                    <FaUsers size={20} />
                    <span>Les utilisateurs</span>
                  </div>
                </NavLink>
              </NavItem>
              <NavItem className={styles.navItemMargin}>
                <NavLink to={"/"} className={styles.link}>
                  <div className={styles.iconWithText}>
                    <FaSuitcaseRolling size={20} />
                    <span>Les séjours</span>
                  </div>
                </NavLink>
              </NavItem>
            </Nav>
          )}
          {role !== "ADMIN" && (
            <Nav className="me-auto" navbar>
              <NavItem className={styles.navItemMargin}>
                <NavLink to={"/"} className={styles.link}>
                  <div className={styles.iconWithText}>
                    <FaSuitcaseRolling size={20} />
                    <span>Mes séjours</span>
                  </div>
                </NavLink>
              </NavItem>
            </Nav>
          )}
          <Nav navbar>
            <NavItem className={styles.navItemMargin}>
              <NavLink to={"/profil"} className={styles.link}>
                <div className={styles.iconWithText}>
                  <FaUser size={20} />
                  <span>
                    {prenom} ({roleByGenre})
                  </span>
                </div>
              </NavLink>
            </NavItem>
            <NavLink onClick={accountService.logout} className={styles.link}>
              <div className={styles.iconWithText}>
                <FaPowerOff size={20} />
                <span>Se déconnecter</span>
              </div>
            </NavLink>
          </Nav>
        </Collapse>
      </Navbar>
    </header>
  );
}

export default Admin_header;
