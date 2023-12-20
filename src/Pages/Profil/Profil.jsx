import styles from "./Profil.module.scss";
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody, Button } from "reactstrap";
import formaterDate from "../../helpers/formaterDate";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { Navigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";

function Profil() {
  const [loading, setLoading] = useState(true);
  const [utilisateur, setUtilisateur] = useState(null);
  const propertyMappings = [
    { display: "Nom", property: "nom" },
    { display: "Prénom", property: "prenom" },
    { display: "Genre", property: "genre" },
    { display: "Email", property: "email" },
    { display: "N° de téléphone", property: "telephone" },
    { display: "Date de naissance", property: "dateNaissance", isDate: true },
    {
      display: "Compte valide jusqu'au",
      property: "dateExpirationCompte",
      isDate: true,
    },
  ];

  useEffect(() => {
    async function getProfil() {
      try {
        const response = await utilisateurService.getUser();
        setUtilisateur(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur s'est produite :", error);
        setLoading(false);
      }
    }
    getProfil();
  }, []);

  if (!accountService.isLogged()) return <Navigate to="/" />;

  return (
    <Container fluid className={styles.container}>
      {loading ? (
        <p>Chargement en cours...</p>
      ) : (
        <Container>
          <Row className={styles.title}>
            <Col>
              <h1>Mon profil</h1>
            </Col>
          </Row>
          <Row>
            <Col md={2}>
              <Card className={`${styles.card} mt-4`}>
                <CardBody className={styles.photo_card}>
                  <img
                    src="https://bootdey.com/img/Content/avatar/avatar1.png"
                    alt=""
                    className={styles.profile_img}
                  ></img>
                  <Button className={styles.button} target="__blank" href="">
                    Modifier
                  </Button>
                </CardBody>
              </Card>
            </Col>
            <Col md={5}>
              <Card className={`${styles.card} mt-4`}>
                <CardBody>
                  {propertyMappings.map((mapping) => (
                    <div key={mapping.display}>
                      <Row>
                        <Col sm={5}>
                          <h6 className="mb-0">{mapping.display}</h6>
                        </Col>
                        <Col sm={6} className="text-secondary">
                          {mapping.isDate
                            ? formaterDate(utilisateur[mapping.property])
                            : utilisateur[mapping.property]}
                        </Col>
                      </Row>
                      <hr className={styles.separation_line} />
                    </div>
                  ))}
                  <Row>
                    <Col sm={12} className="text-center">
                      <Button
                        className={styles.button}
                        target="__blank"
                        href="https://www.bootdey.com/snippets/view/profile-edit-data-and-skills"
                      >
                        Modifier
                      </Button>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      )}
    </Container>
  );
}

export default Profil;
