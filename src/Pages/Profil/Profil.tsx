import styles from "./Profil.module.scss";
import { useEffect, useState, useCallback } from "react";
import { Container, Row, Col, Card, CardBody, Button } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import formaterDate from "../../helpers/formaterDate";
import dateToISO from "../../helpers/dateToISO";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { Navigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { fr } from "date-fns/locale/fr";

registerLocale("fr", fr);
setDefaultLocale("fr");

interface Utilisateur {
  prenom?: string;
  nom?: string;
  genre?: string;
  email?: string;
  telephone?: string;
  dateNaissance?: Date;
  dateExpirationCompte?: Date;
  [key: string]: any;
}

const Profil: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [initialUtilisateur, setInitialUtilisateur] = useState<Utilisateur | null>(null);
  const propertyMappings = [
    { display: "Prénom", property: "prenom" },
    { display: "Nom", property: "nom" },
    { display: "Genre", property: "genre" },
    { display: "Email", property: "email" },
    { display: "N° de téléphone", property: "telephone" },
    { display: "Date de naissance", property: "dateNaissance", isDate: true },
    {
      display: "Valide jusqu'au",
      property: "dateExpirationCompte",
      isDate: true,
    },
  ];
  const [editingField, setEditingField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function getProfil() {
      try {
        const response = await utilisateurService.getUser();
        setUtilisateur(response?.data);
        setInitialUtilisateur(response?.data);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur s'est produite :", error);
        setLoading(false);
      }
    }
    getProfil();
  }, []);

  const handleInputChange = useCallback((property: string, value: any) => {
    const updatedUser = { ...utilisateur, [property]: value };
    setUtilisateur(updatedUser);
    setErrorMessage(null);
  }, [utilisateur]);

  const handleCancel = useCallback(() => {
    setUtilisateur(initialUtilisateur);
    setEditingField(null);
    setErrorMessage(null);
  }, [initialUtilisateur]);

  const handleValidate = useCallback(async () => {
    try {
      if (utilisateur) {
        const dateExpiration = utilisateur.dateExpirationCompte || new Date();
        utilisateur.dateExpirationCompte = new Date(dateToISO(dateExpiration));
        const response = await utilisateurService.updateUser(utilisateur);
        console.log("Utilisateur mis à jour :", response.data);
        setEditingField(null);
        setInitialUtilisateur(utilisateur);
      }
    } catch (error: any) {
        if (error.response?.data?.status === 400) {
          let messageTransmis = error.response.data.message;
          setErrorMessage(messageTransmis);
          console.error(
            "Erreur lors de la mise à jour de l'utilisateur :",
            messageTransmis
          );
        } else {
          let messageTransmis = Object.values(error.response?.data || {})[0];
          setErrorMessage(String(messageTransmis));
          console.log(messageTransmis);
          console.error(
            "Erreur lors de la mise à jour de l'utilisateur :",
            messageTransmis
          );
        }
    }
  }, [utilisateur]);

  if (!accountService.isLogged()) return <Navigate to="/" />;

  return (
    <Container fluid className={styles.main}>
      {loading ? (
        <p className="loading-message">Chargement en cours...</p>
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
                  <Button className="button" target="__blank" href="#" onClick={(e) => e.preventDefault()}>
                    Modifier
                  </Button>
                </CardBody>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className={styles.card}>
                <CardBody>
                  {propertyMappings.map((mapping) => (
                    <div key={mapping.display}>
                      <Row>
                        <Col xs={12} md={12} lg={4}>
                          <h6 className="mb-0">{mapping.display}</h6>
                        </Col>
                        <Col
                          xs={10}
                          md={10}
                          lg={7}
                          className={styles.infos_value}
                        >
                          {mapping.property === "dateExpirationCompte" ? (
                            utilisateur && utilisateur[mapping.property] && formaterDate(utilisateur[mapping.property] as string | Date)
                          ) : editingField === mapping.property ? (
                            mapping.isDate ? (
                              <DatePicker
                                className={`${styles.input}`}
                                selected={utilisateur?.[mapping.property]}
                                onChange={(date) =>
                                  handleInputChange(mapping.property, date)
                                }
                                locale="fr"
                                dateFormat="dd/MM/yyyy"
                                showYearDropdown
                                scrollableYearDropdown
                              />
                            ) : mapping.property === "genre" ? (
                              <select
                                className={`${styles.input}`}
                                value={utilisateur?.[mapping.property] || ''}
                                onChange={(e) =>
                                  handleInputChange(
                                    mapping.property,
                                    e.target.value
                                  )
                                }
                              >
                                <option value="Féminin">Féminin</option>
                                <option value="Masculin">Masculin</option>
                              </select>
                            ) : (
                              <input
                                className={`${styles.input}`}
                                type="text"
                                value={utilisateur?.[mapping.property] || ''}
                                onChange={(e) =>
                                  handleInputChange(
                                    mapping.property,
                                    e.target.value
                                  )
                                }
                              />
                            )
                          ) : mapping.isDate ? (
                            utilisateur && utilisateur[mapping.property] && formaterDate(utilisateur[mapping.property] as string | Date)
                          ) : (
                            utilisateur?.[mapping.property]
                          )}
                        </Col>

                        {mapping.property !== "dateExpirationCompte" && (
                          <Col
                            xs={1}
                            md={1}
                            className="icone_crayon_edit"
                            onClick={() => setEditingField(mapping.property)}
                          >
                            <FontAwesomeIcon icon={faPencilAlt} />
                          </Col>
                        )}
                      </Row>
                      <hr className={styles.separation_line} />
                    </div>
                  ))}
                  {errorMessage !== null && (
                    <p className={`errorMessage ${styles.error_box}`}>
                      {errorMessage}
                    </p>
                  )}
                  <Row>
                    {editingField !== null && (
                      <Col sm={12} className={styles.btn_box}>
                        <Button target="__blank" onClick={handleCancel}>
                          Annuler
                        </Button>
                        <Button
                          className={styles.btn_valider}
                          target="__blank"
                          onClick={handleValidate}
                        >
                          Valider
                        </Button>
                      </Col>
                    )}
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      )}
    </Container>
  );
};

export default Profil;
