import styles from "./Liste_utilisateurs.module.scss";
import "@fontsource/dancing-script";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { utilisateurService } from "../../../services/utilisateur.service";
import formaterDate from "../../../helpers/formaterDate";
import calculerAge from "../../../helpers/calculerAge";
import Acces_non_autorise from "../../Erreurs/Acces_non_autorise";
import {
  Button,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import Formulaire_ajout_modif_utilisateur from "../../../components/Formulaire_ajout_modif_utilisateur/Formulaire_ajout_modif_utilisateur";

function Liste_utilisateurs() {
  const [listUtilisateurs, setListUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  let role = useSelector((state) => state.auth.role);

  const [nomFilter, setNomFilter] = useState("");
  const [prenomFilter, setPrenomFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [telephoneFilter, setTelephoneFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [expirationFilter, setExpirationFilter] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  if (role === "ADMIN") {
    useEffect(() => {
      async function getUtilisateurs() {
        try {
          const response = await utilisateurService.getAllUsers();
          setListUtilisateurs(response.data);
          console.log(response.data);
          setLoading(false);
        } catch (error) {
          console.error("Une erreur s'est produite :", error);
          setLoading(false);
        }
      }

      getUtilisateurs();
    }, [refreshTrigger]);

    const handleOpenModal = () => {
      setShowModal(true);
    };

    const handleCloseModal = () => {
      setShowModal(false);
    };

    const refreshList = () => {
      setRefreshTrigger((prevValue) => !prevValue);
    };

    const filteredUtilisateurs = listUtilisateurs.filter((utilisateur) => {
      const isValide =
        expirationFilter === "Valide" &&
        new Date(utilisateur.dateExpirationCompte * 1000) > new Date();

      const isExpire =
        expirationFilter === "Expiré" &&
        new Date(utilisateur.dateExpirationCompte * 1000) <= new Date();

      return (
        utilisateur.nom.toLowerCase().includes(nomFilter.toLowerCase()) &&
        utilisateur.prenom.toLowerCase().includes(prenomFilter.toLowerCase()) &&
        (roleFilter === "" || utilisateur.role === roleFilter) &&
        utilisateur.genre.includes(genreFilter) &&
        utilisateur.email.toLowerCase().includes(emailFilter.toLowerCase()) &&
        utilisateur.telephone.toString().includes(telephoneFilter) &&
        calculerAge(utilisateur.dateNaissance) >= ageFilter &&
        (expirationFilter === "" || isValide || isExpire)
      );
    });

    const utilisateursItems = filteredUtilisateurs.map((utilisateur, index) => (
      <tr key={index}>
        <td>
          <FontAwesomeIcon className="icone_crayon_edit" icon={faPencilAlt} />
        </td>
        <td>{utilisateur.nom}</td>
        <td>{utilisateur.prenom}</td>
        <td>{calculerAge(utilisateur.dateNaissance)} ans</td>
        <td>{formaterDate(utilisateur.dateNaissance)}</td>
        <td>{utilisateur.role}</td>
        <td>{utilisateur.genre}</td>
        <td>{utilisateur.email}</td>
        <td>{utilisateur.telephone}</td>
        <td>{formaterDate(utilisateur.dateExpirationCompte)}</td>
      </tr>
    ));

    return (
      <div>
        {loading ? (
          <p>Chargement en cours...</p>
        ) : (
          <div className={styles.main}>
            <Row className={styles.head}>
              <Col xs={8} lg={3}>
                <h1 className={styles.title}>Liste des Utilisateurs</h1>
              </Col>
              <Col xs={2} lg={2}>
                <Button onClick={handleOpenModal}>
                  <FontAwesomeIcon icon={faUserPlus} />
                </Button>
              </Col>
            </Row>
            <div className={styles.table_container}>
              <table className="table">
                <thead className={styles.enTete}>
                  <tr>
                    <th></th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th colSpan="2">Age</th>
                    <th>Rôle</th>
                    <th>Genre</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Validité</th>
                  </tr>
                  <tr>
                    <th></th>
                    <th>
                      <input
                        placeholder="Rechercher un nom"
                        type="text"
                        value={nomFilter}
                        onChange={(e) => setNomFilter(e.target.value)}
                        autoComplete="off"
                      />
                    </th>
                    <th>
                      <input
                        placeholder="Rechercher un prénom"
                        type="text"
                        value={prenomFilter}
                        onChange={(e) => setPrenomFilter(e.target.value)}
                      />
                    </th>
                    <th colSpan="2">
                      <input
                        placeholder="Age minimum"
                        type="number"
                        value={ageFilter}
                        onChange={(e) => setAgeFilter(e.target.value)}
                      />
                    </th>

                    <th>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        <option value="">Tous</option>
                        <option value="ADMIN">Admin</option>
                        <option value="DIRECTION">Direction</option>
                        <option value="ANIM">Anim</option>
                        <option value="ANIM_AS">Anim_AS</option>
                      </select>
                    </th>
                    <th>
                      <select
                        value={genreFilter}
                        onChange={(e) => setGenreFilter(e.target.value)}
                      >
                        <option value="">Tous</option>
                        <option value="Masculin">Masculin</option>
                        <option value="Féminin">Féminin</option>
                      </select>
                    </th>
                    <th>
                      <input
                        placeholder="Rechercher un email"
                        type="text"
                        value={emailFilter}
                        onChange={(e) => setEmailFilter(e.target.value)}
                      />
                    </th>
                    <th>
                      <input
                        placeholder="Rechercher un numéro"
                        type="text"
                        value={telephoneFilter}
                        onChange={(e) => setTelephoneFilter(e.target.value)}
                      />
                    </th>
                    <th>
                      <select
                        value={expirationFilter}
                        onChange={(e) => setExpirationFilter(e.target.value)}
                      >
                        <option value="">Toutes</option>
                        <option value="Valide">Valides</option>
                        <option value="Expiré">Expirés</option>
                      </select>
                    </th>
                  </tr>
                </thead>

                <tbody>{utilisateursItems}</tbody>
              </table>
            </div>
          </div>
        )}

        <Modal isOpen={showModal} toggle={handleCloseModal}>
          <ModalHeader toggle={handleCloseModal}>
            Ajouter un Utilisateur
          </ModalHeader>
          <ModalBody>
            <Formulaire_ajout_modif_utilisateur
              handleCloseModal={handleCloseModal}
              refreshList={refreshList}
            />
          </ModalBody>
        </Modal>
      </div>
    );
  }
  return <Acces_non_autorise />;
}

export default Liste_utilisateurs;
