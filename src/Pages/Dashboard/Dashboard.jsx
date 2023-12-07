import styles from "./Dashboard.module.scss";
import React, { useEffect, useState } from "react";
import formaterDate from "../../helpers/formaterDate";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

function Profil() {
  const [loading, setLoading] = useState(true);
  const [utilisateur, setUtilisateur] = useState(null);

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
            <li>{utilisateur.role}</li>
            <li>{formaterDate(utilisateur.dateNaissance)}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Profil;
