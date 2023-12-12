import styles from "./Profil.module.scss";
import React, { useEffect, useState } from "react";
import formaterDate from "../../helpers/formaterDate";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { Navigate } from "react-router-dom";

function Profil() {
  const [loading, setLoading] = useState(true);
  const [utilisateur, setUtilisateur] = useState(null);
  const propertyMappings = [
    { display: "Nom", property: "nom" },
    { display: "Prénom", property: "prenom" },
    { display: "Genre", property: "genre" },
    { display: "Email", property: "email" },
    { display: "N° de téléphone", property: "telephone" },
    { display: "Rôle", property: "role" },
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
    <div className={styles.container}>
      {loading ? (
        <p>Chargement en cours...</p>
      ) : (
        <div className={styles.profilBox}>
          <div className={styles.title_box}>
            <h1>Mon profil</h1>
          </div>
          <div className={styles.content_box}>
            <div className={styles.infos_box}>
              {propertyMappings.map((mapping) => (
                <div key={mapping.display} className={styles.infos_row}>
                  <div className={styles.infos_content}>
                    <div className={styles.label}>{mapping.display}</div>
                    <div className={styles.value}>
                      {mapping.isDate
                        ? formaterDate(utilisateur[mapping.property]) // Appeler le formateur de date
                        : utilisateur[mapping.property]}
                    </div>
                  </div>
                  <div className={styles.infos_edit}></div>
                </div>
              ))}
            </div>
            <div className={styles.photo_box}></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profil;
