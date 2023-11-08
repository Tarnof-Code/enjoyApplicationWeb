import styles from "./Header.module.scss";
import "@fontsource/dancing-script";
import React, { useState } from "react";
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

function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);

  return (
    <header className={styles.main}>
      <Navbar expand="md" dark className={styles.navbar}>
        <NavbarBrand href="/" className={`${styles.brand} ${styles.link}`}>
          Enjoy
        </NavbarBrand>
        <NavbarToggler onClick={toggle} />
        <Collapse isOpen={isOpen} navbar>
          <Nav className="me-auto" navbar>
            <NavItem>
              <NavLink href="/" className={styles.link}>
                Mon profil
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="/" className={styles.link}>
                Les séjours
              </NavLink>
            </NavItem>
            <UncontrolledDropdown nav inNavbar>
              <DropdownToggle nav caret className={styles.link}>
                Utilisateurs
              </DropdownToggle>
              <DropdownMenu right>
                <DropdownItem>Directeurs</DropdownItem>
                <DropdownItem>Animateurs</DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
          </Nav>
          <NavLink onClick={accountService.logout} className={styles.link}>
            Se déconnecter
          </NavLink>
        </Collapse>
      </Navbar>
    </header>
  );
}

export default Header;
