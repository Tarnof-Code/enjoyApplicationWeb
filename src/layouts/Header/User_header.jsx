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

function User_header() {
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
                Mon profil
              </Link>
            </NavItem>
            <NavItem>
              <Link to={"/"} className={styles.link}>
                Mes séjours
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

export default User_header;
