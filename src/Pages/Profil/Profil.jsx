import styles from "./Profil.module.scss";
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody, Button } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import formaterDate from "../../helpers/formaterDate";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { Navigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import fr from "date-fns/locale/fr";

registerLocale("fr", fr);
setDefaultLocale("fr");

function Profil() {
  const [loading, setLoading] = useState(true);
  const [utilisateur, setUtilisateur] = useState(null);
  const [initialUtilisateur, setInitialUtilisateur] = useState(null);
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
        setInitialUtilisateur(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur s'est produite :", error);
        setLoading(false);
      }
    }
    getProfil();
  }, []);

  const [editingField, setEditingField] = useState(null);

  const handleInputChange = (property, value) => {
    const updatedUser = { ...utilisateur, [property]: value };
    setUtilisateur(updatedUser);
  };

  const handleCancel = () => {
    setUtilisateur(initialUtilisateur);
    setEditingField(null);
  };

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
          <Row className={styles.infos_box}>
            <Col sm={10} md={7} lg={3}>
              <Card className={styles.card}>
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
            <Col lg={7}>
              <Card className={styles.card}>
                <CardBody>
                  {propertyMappings.map((mapping) => (
                    <div key={mapping.display}>
                      <Row>
                        <Col xs={12} md={12} lg={5}>
                          <h6 className="mb-0">{mapping.display}</h6>
                        </Col>
                        <Col
                          xs={10}
                          md={10}
                          lg={5}
                          className={styles.infos_value}
                        >
                          {mapping.property === "dateExpirationCompte" ? (
                            formaterDate(utilisateur[mapping.property])
                          ) : editingField === mapping.property ? (
                            mapping.isDate ? (
                              <DatePicker
                                className={`${styles.input}`}
                                selected={utilisateur[mapping.property]}
                                onChange={(date) =>
                                  handleInputChange(mapping.property, date)
                                }
                                locale="fr"
                                dateFormat="dd/MM/yyyy"
                                showYearDropdown
                                scrollableYearDropdown
                              />
                            ) : (
                              <input
                                className={`${styles.input}`}
                                type="text"
                                value={utilisateur[mapping.property]}
                                onChange={(e) =>
                                  handleInputChange(
                                    mapping.property,
                                    e.target.value
                                  )
                                }
                              />
                            )
                          ) : mapping.isDate ? (
                            formaterDate(utilisateur[mapping.property])
                          ) : (
                            utilisateur[mapping.property]
                          )}
                        </Col>

                        {mapping.property !== "dateExpirationCompte" && (
                          <Col
                            xs={2}
                            md={2}
                            className={styles.infos_edit}
                            onClick={() => setEditingField(mapping.property)}
                          >
                            <FontAwesomeIcon icon={faPencilAlt} />
                          </Col>
                        )}
                      </Row>
                      <hr className={styles.separation_line} />
                    </div>
                  ))}
                  <Row>
                    <Col sm={12} className="text-center">
                      <Button
                        className={styles.button}
                        target="__blank"
                        onClick={handleCancel}
                      >
                        Annuler
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
