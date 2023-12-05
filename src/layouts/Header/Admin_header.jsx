import styles from "./Header.module.scss";
import "@fontsource/dancing-script";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { accountService } from "../../services/account.service";
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  NavbarText,
} from "reactstrap";

function Admin_header() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);

  return (
    <header className={styles.main}>
      <Navbar expand="md" dark className={styles.navbar}>
        <Link to={"/"} className={`${styles.brand} ${styles.link}`}>
          Enjoy
        </Link>
        <NavbarToggler onClick={toggle} />
        <Collapse isOpen={isOpen} navbar>
          <Nav className="me-auto" navbar>
            <NavItem>
              <Link to={"/"} className={styles.link}>
                Dashboard
              </Link>
            </NavItem>
            <NavItem>
              <Link to={"/liste_utilisateurs"} className={styles.link}>
                Les utilisateurs
              </Link>
            </NavItem>
            {/* <UncontrolledDropdown nav inNavbar>
              <DropdownToggle nav caret className={styles.link}>
                Utilisateurs
              </DropdownToggle>
              <DropdownMenu end>
                <DropdownItem>
                  <Link to={"/liste_utilisateurs"} className={styles.sous_menu}>
                    Tous les utilisateurs
                  </Link>
                </DropdownItem>
                <DropdownItem>Les directeurs</DropdownItem>
                <DropdownItem>Les animateurs</DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown> */}
            <NavItem>
              <Link to={"/"} className={styles.link}>
                Les séjours
              </Link>
            </NavItem>
          </Nav>
          <NavLink onClick={accountService.logout} className={styles.link}>
            Se déconnecter
          </NavLink>
        </Collapse>
      </Navbar>
    </header>
  );
}

export default Admin_header;
