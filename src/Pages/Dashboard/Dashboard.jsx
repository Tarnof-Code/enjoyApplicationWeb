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
          <h1 className={styles.title}>Mon profil</h1>
          <table>
            <tbody>
              <tr>
                <th>Nom</th>
                <td>{utilisateur.nom}</td>
              </tr>
              <tr>
                <th>Prénom</th>
                <td>{utilisateur.prenom}</td>
              </tr>
              <tr>
                <th>Genre</th>
                <td>{utilisateur.genre}</td>
              </tr>
              <tr>
                <th>Email</th>
                <td>{utilisateur.email}</td>
              </tr>
              <tr>
                <th>Téléphone</th>
                <td>{utilisateur.telephone}</td>
              </tr>
              <tr>
                <th>Role</th>
                <td>{utilisateur.role}</td>
              </tr>
              <tr>
                <th>Date de naissance</th>
                <td>{formaterDate(utilisateur.dateNaissance)}</td>
              </tr>
              <tr>
                <th>Compte valide jusqu'au</th>
                <td>
                  {formaterDate(utilisateur.dateExpirationRefreshToken * 1000)}
                  {/*  x1000 pour mettre en millisecondes */}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Profil;
