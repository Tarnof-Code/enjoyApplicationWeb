import React from "react";
import styles from "./Liste_utilisateurs.module.scss";
import "@fontsource/dancing-script";
import { useEffect, useState, useMemo, useCallback, useReducer } from "react";
import { useSelector } from "react-redux";
import { utilisateurService } from "../../../services/utilisateur.service";
import formaterDate from "../../../helpers/formaterDate";
import formatDateAnglais from "../../../helpers/formatDateAnglais";
import dateToISO from "../../../helpers/dateToISO";
import calculerAge from "../../../helpers/calculerAge";
import Acces_non_autorise from "../../Erreurs/Acces_non_autorise";
import {
  Button,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
} from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faPencilAlt,
  faTimes,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import Formulaire_ajout_modif_utilisateur from "../../../components/Formulaire_ajout_modif_utilisateur/Formulaire_ajout_modif_utilisateur";

interface FiltersState {
  nomFilter: string;
  prenomFilter: string;
  roleFilter: string;
  genreFilter: string;
  emailFilter: string;
  telephoneFilter: string;
  ageFilter: string;
  expirationFilter: string;
}

interface FilterAction {
  type: 'SET_FILTER' | 'RESET_FILTERS';
  field?: keyof FiltersState;
  value?: string;
}

const filtersReducer = (state: FiltersState, action: FilterAction): FiltersState => {
  switch (action.type) {
    case 'SET_FILTER':
      if (action.field && action.value !== undefined) {
        return { ...state, [action.field]: action.value };
      }
      return state;
    case 'RESET_FILTERS':
      return {
        nomFilter: "",
        prenomFilter: "",
        roleFilter: "",
        genreFilter: "",
        emailFilter: "",
        telephoneFilter: "",
        ageFilter: "",
        expirationFilter: ""
      };
    default:
      return state;
  }
};

const Liste_utilisateurs: React.FC = () => {
  const [listUtilisateurs, setListUtilisateurs] = useState<any[]>([]);
  const [utilisateurUpdated, setUtilisateurUpdated] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  let role = useSelector((state: any) => state.auth.role);

  const [filters, dispatchFilter] = useReducer(filtersReducer, {
    nomFilter: "",
    prenomFilter: "",
    roleFilter: "",
    genreFilter: "",
    emailFilter: "",
    telephoneFilter: "",
    ageFilter: "",
    expirationFilter: ""
  });

  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [originalUser, setOriginalUser] = useState<any>(null); // Sauvegarde de l'utilisateur original

  const refreshList = useCallback(() => {
    setRefreshTrigger((prevValue) => !prevValue);
  }, []);

  const handleInputChange = useCallback(async (e: any, index: number, fieldName: string) => {
    const { value } = e.target;
    const updatedUtilisateurs = [...listUtilisateurs];
    updatedUtilisateurs[index][fieldName] = value;
    setUtilisateurUpdated(updatedUtilisateurs[index]);
    console.log(updatedUtilisateurs[index]);
    setErrorMessage(null);
    setListUtilisateurs(updatedUtilisateurs);
  }, [listUtilisateurs]);

  const startEditing = useCallback((index: number) => {
    setOriginalUser({ ...listUtilisateurs[index] });
    setEditingField(index);
  }, [listUtilisateurs]);

  const cancelModif = useCallback(() => {
    if (originalUser && editingField !== null) {
      const updatedUtilisateurs = [...listUtilisateurs];
      updatedUtilisateurs[editingField] = { ...originalUser };
      setListUtilisateurs(updatedUtilisateurs);
    }
    
    setEditingField(null);
    setUtilisateurUpdated(null);
    setOriginalUser(null);
  }, [originalUser, editingField, listUtilisateurs]);

  const handleValidate = useCallback(async () => {
    try {
      utilisateurUpdated.dateExpirationCompte = dateToISO(
        utilisateurUpdated.dateExpirationCompte
      );
      const response = await utilisateurService.updateUser(utilisateurUpdated);
      console.log("Utilisateur mis à jour :", response.data);
      setEditingField(null);
      setUtilisateurUpdated(null);
      setOriginalUser(null);
      refreshList();
    } catch (error: any) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.status === 400
      ) {
        setErrorMessage(error.response.data.message);
        console.error(
          "Erreur lors de la mise à jour de l'utilisateur :",
          error.response.data.message
        );
      }
    }
  }, [utilisateurUpdated, refreshList]);

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

    const handleOpenModal = useCallback(() => {
      setShowModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
      setShowModal(false);
    }, []);


    const filteredUtilisateurs = useMemo(() => {
      return listUtilisateurs.filter((utilisateur) => {
        const isValide =
          filters.expirationFilter === "Valide" &&
          new Date(utilisateur.dateExpirationCompte * 1000) > new Date();

        const isExpire =
          filters.expirationFilter === "Expiré" &&
          new Date(utilisateur.dateExpirationCompte * 1000) <= new Date();

        return (
          utilisateur.nom.toLowerCase().includes(filters.nomFilter.toLowerCase()) &&
          utilisateur.prenom.toLowerCase().includes(filters.prenomFilter.toLowerCase()) &&
          (filters.roleFilter === "" || utilisateur.role === filters.roleFilter) &&
          utilisateur.genre.includes(filters.genreFilter) &&
          utilisateur.email.toLowerCase().includes(filters.emailFilter.toLowerCase()) &&
          utilisateur.telephone.toString().includes(filters.telephoneFilter) &&
          (filters.ageFilter === "" || calculerAge(utilisateur.dateNaissance) >= parseInt(filters.ageFilter)) &&
          (filters.expirationFilter === "" || isValide || isExpire)
        );
      });
    }, [listUtilisateurs, filters]);

    const utilisateursItems = filteredUtilisateurs.map((utilisateur, index) => (
      <React.Fragment key={index}>
        {editingField !== null && editingField === index && (
          <tr>
            <th></th>
            <th></th>
            <th>Nom</th>
            <th>Prénom</th>
            <th colSpan={2}>Date de naissance</th>
            <th>Rôle</th>
            <th>Genre</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Validité</th>
          </tr>
        )}

        <tr
          className={
            editingField !== null && editingField !== index
              ? `${styles.flou}`
              : ""
          }
          key={index}
        >
          {editingField === null ? (
            <td className={styles.icones_box}>
              <FontAwesomeIcon
                className="icone_crayon_edit"
                icon={faPencilAlt}
                onClick={() => startEditing(index)}
              />
            </td>
          ) : editingField === index ? (
            <>
              <td>
                <FontAwesomeIcon
                  title="Annuler les modifications"
                  className={styles.icone_annuler}
                  icon={faTimes}
                  onClick={() => cancelModif()}
                />
              </td>
              <td>
                <FontAwesomeIcon
                  title="Valider les modifications"
                  className={styles.icone_valider}
                  icon={faCheck}
                  onClick={() => handleValidate()}
                />
              </td>
            </>
          ) : (
            <>
              <td></td>
              <td></td>
            </>
          )}

          <td>
            {editingField === index ? (
              <input
                value={utilisateur.nom}
                type="text"
                onChange={(e) => handleInputChange(e, index, "nom")}
              />
            ) : (
              utilisateur.nom
            )}
          </td>
          <td>
            {editingField === index ? (
              <input
                value={utilisateur.prenom}
                type="text"
                onChange={(e) => handleInputChange(e, index, "prenom")}
              />
            ) : (
              utilisateur.prenom
            )}
          </td>
          <td>{calculerAge(utilisateur.dateNaissance)} ans</td>
          <td>
            {editingField === index ? (
              <input
                value={formatDateAnglais(utilisateur.dateNaissance)}
                type="date"
                onChange={(e) => handleInputChange(e, index, "dateNaissance")}
              />
            ) : (
              formaterDate(utilisateur.dateNaissance)
            )}
          </td>
          <td>
            {editingField === index ? (
              <select onChange={(e) => handleInputChange(e, index, "role")}>
                <option value={utilisateur.role}>{utilisateur.role}</option>
                {utilisateur.role !== "DIRECTION" && (
                  <option value="DIRECTION">Direction</option>
                )}
                {utilisateur.role !== "ADJ_DIRECTION" && (
                  <option value="ADJ_DIRECTION">Adj_Direction</option>
                )}
                {utilisateur.role !== "ANIM" && (
                  <option value="ANIM">Anim</option>
                )}
                {utilisateur.role !== "ANIM_AS" && (
                  <option value="ANIM_AS">Anim_AS</option>
                )}
                {utilisateur.role !== "ADMIN" && (
                  <option value="ADMIN">Admin</option>
                )}
              </select>
            ) : (
              utilisateur.role
            )}
          </td>
          <td>
            {editingField === index ? (
              <select onChange={(e) => handleInputChange(e, index, "genre")}>
                <option value={utilisateur.genre}>{utilisateur.genre}</option>
                {utilisateur.genre !== "Masculin" && (
                  <option value="Masculin">Masculin</option>
                )}
                {utilisateur.genre !== "Féminin" && (
                  <option value="Féminin">Féminin</option>
                )}
              </select>
            ) : (
              utilisateur.genre
            )}
          </td>
          <td>
            {editingField === index ? (
              <input
                value={utilisateur.email}
                type="email"
                onChange={(e) => handleInputChange(e, index, "email")}
              />
            ) : (
              utilisateur.email
            )}
          </td>
          <td>
            {editingField === index ? (
              <input
                value={utilisateur.telephone}
                type="tel"
                onChange={(e) => handleInputChange(e, index, "telephone")}
              />
            ) : (
              utilisateur.telephone
            )}
          </td>
          <td>
            {editingField === index ? (
              <input
                value={formatDateAnglais(utilisateur.dateExpirationCompte)}
                type="date"
                onChange={(e) =>
                  handleInputChange(e, index, "dateExpirationCompte")
                }
              />
            ) : (
              formaterDate(utilisateur.dateExpirationCompte)
            )}
          </td>
        </tr>
      </React.Fragment>
    ));

    return (
      <div>
        {loading ? (
          <p>Chargement en cours...</p>
        ) : (
          <div className={styles.main}>
            {errorMessage && <p className="errorMessage">{errorMessage}</p>}
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
                <thead
                  className={
                    editingField !== null
                      ? `${styles.flou}`
                      : `${styles.enTete}`
                  }
                >
                  <tr>
                    {editingField !== null && <th></th>}
                    <th></th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th colSpan={2}>Age</th>
                    <th>Rôle</th>
                    <th>Genre</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Validité</th>
                  </tr>
                  <tr>
                    {editingField !== null && <th></th>}
                    <th></th>
                    <th>
                      <input
                        placeholder="Rechercher un nom"
                        type="text"
                        value={filters.nomFilter}
                        onChange={(e) => dispatchFilter({ type: 'SET_FILTER', field: 'nomFilter', value: e.target.value })}
                        autoComplete="off"
                      />
                    </th>
                    <th>
                      <input
                        placeholder="Rechercher un prénom"
                        type="text"
                        value={filters.prenomFilter}
                        onChange={(e) => dispatchFilter({ type: 'SET_FILTER', field: 'prenomFilter', value: e.target.value })}
                      />
                    </th>
                    <th colSpan={2}>
                      <input
                        placeholder="Age minimum"
                        type="number"
                        value={filters.ageFilter}
                        onChange={(e) => dispatchFilter({ type: 'SET_FILTER', field: 'ageFilter', value: e.target.value })}
                      />
                    </th>

                    <th>
                      <select
                        value={filters.roleFilter}
                        onChange={(e) => dispatchFilter({ type: 'SET_FILTER', field: 'roleFilter', value: e.target.value })}
                      >
                        <option value="">Tous</option>
                        <option value="ADMIN">Admin</option>
                        <option value="DIRECTION">Direction</option>
                        <option value="ADJ_DIRECTION">Adj_Direction</option>
                        <option value="ANIM">Anim</option>
                        <option value="ANIM_AS">Anim_AS</option>
                      </select>
                    </th>
                    <th>
                      <select
                        value={filters.genreFilter}
                        onChange={(e) => dispatchFilter({ type: 'SET_FILTER', field: 'genreFilter', value: e.target.value })}
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
                        value={filters.emailFilter}
                        onChange={(e) => dispatchFilter({ type: 'SET_FILTER', field: 'emailFilter', value: e.target.value })}
                      />
                    </th>
                    <th>
                      <input
                        placeholder="Rechercher un numéro"
                        type="text"
                        value={filters.telephoneFilter}
                        onChange={(e) => dispatchFilter({ type: 'SET_FILTER', field: 'telephoneFilter', value: e.target.value })}
                      />
                    </th>
                    <th>
                      <select
                        value={filters.expirationFilter}
                        onChange={(e) => dispatchFilter({ type: 'SET_FILTER', field: 'expirationFilter', value: e.target.value })}
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
};

export default Liste_utilisateurs;
