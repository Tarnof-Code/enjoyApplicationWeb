import styles from "./Liste_utilisateurs.module.scss";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { utilisateurService } from "../../services/utilisateur.service";
import formaterDate from "../../helpers/formaterDate";

function Accueil() {
  const [listUtilisateurs, setListUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const roleUser = useSelector((state) => state.auth.role);

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

  const utilisateursItems = listUtilisateurs.map((utilisateur, index) => (
    <tr key={index}>
      <td>{utilisateur.nom}</td>
      <td>{utilisateur.prenom}</td>
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
        <div>
          <h1>Liste des Utilisateurs</h1>
          <h2>{roleUser}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Date de naissance</th>
                <th>Rôle</th>
                <th>Genre</th>
                <th>Email</th>
                <th>Téléphone</th>
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
