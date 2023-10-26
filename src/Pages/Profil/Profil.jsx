import styles from "./Profil.module.scss";
import { useEffect, useState } from "react";
import { fetchProfil } from "../../api/utilisateursApi";
import { useSelector } from "react-redux";
import formaterDate from "../../Helpers/formaterDate";

function Profil() {
  const [loading, setLoading] = useState(true);
  const jwtToken = useSelector((state) => state.jwt.jwt);
  const [utilisateur, setUtilisateur] = useState(null);

  useEffect(() => {
    async function getProfil() {
      try {
        const response = await fetchProfil(jwtToken);
        setUtilisateur(response);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur s'est produite :", error);
        setLoading(false);
      }
    }

    getProfil();
  }, [jwtToken]);

  return (
    <div>
      {loading ? (
        <p>Chargement en cours...</p>
      ) : (
        <div className={styles.main}>
          <h1>Mon profil</h1>
          <ul>
            <li>{utilisateur.nom}</li>
            <li>{utilisateur.prenom}</li>
            <li>{utilisateur.genre}</li>
            <li>{utilisateur.email}</li>
            <li>{utilisateur.telephone}</li>
            <li>{formaterDate(utilisateur.dateNaissance)}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Profil;
