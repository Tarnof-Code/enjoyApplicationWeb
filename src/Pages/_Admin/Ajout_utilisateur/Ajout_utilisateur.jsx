import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  FormGroup,
  Input,
  Button,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import styles from "./Ajout_utilisateur.module.scss";
import { accountService } from "../../../services/account.service";
import { regexService } from "../../../services/regex.service";
import { useNavigate, Link } from "react-router-dom";

function Ajout_utilisateur() {
  let navigate = useNavigate();

  const [userInfos, setUserInfos] = useState({
    email: "",
    prenom: "",
    nom: "",
    genre: "",
    dateNaissance: "",
    telephone: "",
    role: "",
    motDePasse: "",
  });

  const [errorMessage, setErrorMessage] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const onChange = (e) => {
    setUserInfos({
      ...userInfos,
      [e.target.name]: e.target.value,
    });
    setErrorMessage(null);
  };

  const ajouterUtilisateur = async () => {
    try {
      if (userInfos.role === "") {
        setErrorMessage("Veuillez choisir un rôle");
        return;
      }
      if (
        userInfos.email === "" ||
        !regexService.validateEmail(userInfos.email)
      ) {
        setErrorMessage("Veuillez entrer une adresse e-mail valide");
        return;
      }
      if (userInfos.prenom === "") {
        setErrorMessage("Veuillez saisir un prénom");
        return;
      }
      if (userInfos.nom === "") {
        setErrorMessage("Veuillez saisir un nom");
        return;
      }
      if (userInfos.genre === "") {
        setErrorMessage("Veuillez choisir un genre");
        return;
      }
      if (userInfos.dateNaissance === "") {
        setErrorMessage("Veuillez entrer une date de naissance");
        return;
      }
      if (
        userInfos.telephone === "" ||
        !regexService.validatePhone(userInfos.telephone)
      ) {
        setErrorMessage("Veuillez entrer un numéro de téléphone valide");
        return;
      }
      if (
        userInfos.motDePasse === "" ||
        !regexService.validatePassword(userInfos.motDePasse)
      ) {
        setErrorMessage("Veuillez entrer un mot de passe valide");
        return;
      }

      const response = await accountService.addUser(userInfos);
      if (userInfos.genre === "Féminin") {
        setModalMessage(
          `${userInfos.prenom} ${userInfos.nom} a bien été ajoutée.`
        );
      } else {
        setModalMessage(
          `${userInfos.prenom} ${userInfos.nom} a bien été ajouté.`
        );
      }

      setModalIsOpen(true);
    } catch (error) {
      console.error("Erreur lors de l'ajout'", error);
    }
  };

  return (
    <div className={styles.main}>
      <Container className={styles.addUserForm}>
        <Row className={styles.titre}>
          <p>Ajouter un utilisateur</p>
        </Row>
        <p className="errorMessage">{errorMessage}</p>
        <Form className={styles.form}>
          <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>Rôle</Label>
            </Col>
            <Input
              id="roleNewUser"
              name="role"
              type="select"
              onChange={onChange}
            >
              <option value="">Choisir un rôle</option>
              <option value="DIRECTION">Direction</option>
              <option value="ADJ_DIRECTION">Adjoint</option>
              <option value="ANIM">Anim</option>
              <option value="ANIM_AS">Anim_AS</option>
              <option value="ADMIN">Admin</option>
            </Input>
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>Email</Label>
            </Col>
            <Input
              id="emailNewUser"
              name="email"
              type="email"
              onChange={onChange}
            />
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>Prénom</Label>
            </Col>
            <Input
              id="prenomNewUser"
              name="prenom"
              type="text"
              onChange={onChange}
            />
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>Nom</Label>
            </Col>
            <Input id="nomNewUser" name="nom" type="text" onChange={onChange} />
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>Genre</Label>
            </Col>
            <Input
              id="genreNewUser"
              name="genre"
              type="select"
              onChange={onChange}
            >
              <option value="">Choisir un genre</option>
              <option value="Masculin">Masculin</option>
              <option value="Féminin">Féminin</option>
            </Input>
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>Date de naissance</Label>
            </Col>
            <Input
              id="dateNaissanceNewUser"
              name="dateNaissance"
              type="date"
              onChange={onChange}
            />
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>N° de téléphone</Label>
            </Col>
            <Input
              id="telephoneNewUser"
              name="telephone"
              type="phone"
              onChange={onChange}
            />
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>Mot de passe</Label>
            </Col>
            <Input
              id="motDePasseNewUser"
              name="motDePasse"
              type="text"
              onChange={onChange}
            />
          </FormGroup>
          {/* <FormGroup className={styles.form_group}>
            <Col lg={4}>
              <Label className={styles.label}>Validité du compte</Label>
            </Col>
            <Input
              id="dateNaissanceNewUser"
              name="dateNaissance"
              type="date"
              onChange={onChange}
            />
          </FormGroup> */}
          <div className={styles.boutonBox}>
            <Link to="/liste_utilisateurs">
              <Button className={styles.bouton}>Annuler</Button>
            </Link>
            <Button className={styles.btn_valider} onClick={ajouterUtilisateur}>
              Ajouter
            </Button>
          </div>
        </Form>
        <Modal isOpen={modalIsOpen} toggle={() => setModalIsOpen(!modalIsOpen)}>
          <ModalHeader toggle={() => setModalIsOpen(!modalIsOpen)}>
            Confirmation
          </ModalHeader>
          <ModalBody>
            <p>{modalMessage}</p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              onClick={() => {
                setModalIsOpen(!modalIsOpen);
                navigate("/liste_utilisateurs", { replace: true });
              }}
            >
              Fermer
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
}

export default Ajout_utilisateur;
