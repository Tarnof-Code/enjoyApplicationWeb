import styles from "./Liste_utilisateurs.module.scss";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { utilisateurService } from "../../services/utilisateur.service";

function Accueil() {
  const [listUtilisateurs, setListUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const jwtToken = useSelector((state) => state.jwt.jwt);

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

  // Vous pouvez mapper la liste d'utilisateurs pour les afficher
  const utilisateursItems = listUtilisateurs.map((utilisateur, index) => (
    <li key={index}>
      {utilisateur.nom} {utilisateur.prenom}
    </li>
  ));

  return (
    <div>
      {loading ? (
        <p>Chargement en cours...</p>
      ) : (
        <div className={styles.main}>
          <h1>Liste des Utilisateurs</h1>
          {utilisateursItems}
        </div>
      )}
    </div>
  );
}

export default Accueil;
