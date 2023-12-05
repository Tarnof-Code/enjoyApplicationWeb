import styles from "./Liste_utilisateurs.module.scss";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { utilisateurService } from "../../services/utilisateur.service";
import formaterDate from "../../helpers/formaterDate";
import calculerAge from "../../helpers/calculerAge";

function Accueil() {
  const [listUtilisateurs, setListUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const roleUser = useSelector((state) => state.auth.role);

  // Ajoutez les états de filtre ici
  const [nomFilter, setNomFilter] = useState("");
  const [prenomFilter, setPrenomFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [telephoneFilter, setTelephoneFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");

  useEffect(() => {
    async function getUtilisateurs() {
      try {
        const response = await utilisateurService.getAllUsers();
        setListUtilisateurs(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur s'est produite :", error);
        setLoading(false);
      }
    }

    getUtilisateurs();
  }, []);

  // Filtrez la liste des utilisateurs avant de la mapper en lignes de tableau
  const filteredUtilisateurs = listUtilisateurs.filter(
    (utilisateur) =>
      utilisateur.nom.toLowerCase().includes(nomFilter.toLowerCase()) &&
      utilisateur.prenom.toLowerCase().includes(prenomFilter.toLowerCase()) &&
      utilisateur.role.includes(roleFilter) &&
      utilisateur.genre.includes(genreFilter) &&
      utilisateur.email.toLowerCase().includes(emailFilter.toLowerCase()) &&
      utilisateur.telephone.toString().includes(telephoneFilter) &&
      calculerAge(utilisateur.dateNaissance) >= ageFilter
  );

  const utilisateursItems = filteredUtilisateurs.map((utilisateur, index) => (
    <tr key={index}>
      <td>{utilisateur.nom}</td>
      <td>{utilisateur.prenom}</td>
      <td>{calculerAge(utilisateur.dateNaissance)} ans</td>
      <td>{formaterDate(utilisateur.dateNaissance)}</td>
      <td>{utilisateur.role}</td>
      <td>{utilisateur.genre}</td>
      <td>{utilisateur.email}</td>
      <td>{utilisateur.telephone}</td>
    </tr>
  ));

  console.log("salut " + roleUser);
  return (
    <div>
      {loading ? (
        <p>Chargement en cours...</p>
      ) : (
        <div className={styles.main}>
          <h1 style={{ marginBottom: "1em" }}>Liste des Utilisateurs</h1>
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th colSpan="2">Age</th>
                <th>Rôle</th>
                <th>Genre</th>
                <th>Email</th>
                <th>Téléphone</th>
              </tr>
              <tr>
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
                    <option value="ADMIN">ADMIN</option>
                    <option value="DIRECTEUR">DIRECTEUR</option>
                    <option value="ANIMATEUR">ANIMATEUR</option>
                    <option value="ANIMATEUR_AS">ANIMATEUR_AS</option>
                  </select>
                </th>
                <th>
                  <select
                    value={genreFilter}
                    onChange={(e) => setGenreFilter(e.target.value)}
                  >
                    <option value="">Tous</option>
                    <option value="Masculin">Masculin</option>
                    <option value="Feminin">Féminin</option>
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
              </tr>
            </thead>

            <tbody>{utilisateursItems}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Accueil;
