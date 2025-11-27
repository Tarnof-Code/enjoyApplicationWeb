import styles from "./Profil.module.scss";
import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardBody } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import formaterDate from "../../helpers/formaterDate";
import dateToISO from "../../helpers/dateToISO";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { Navigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPencilAlt, 
  faUser, 
  faEnvelope, 
  faPhone, 
  faCalendarAlt, 
  faVenusMars, 
  faClock,
  faCamera,
  faCheck,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
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
  const utilisateurRef = useRef<Utilisateur | null>(null);
  
  useEffect(() => {
    utilisateurRef.current = utilisateur;
  }, [utilisateur]);
  
  const propertyMappings = [
    { display: "Prénom", property: "prenom", icon: faUser },
    { display: "Nom", property: "nom", icon: faUser },
    { display: "Genre", property: "genre", icon: faVenusMars },
    { display: "Email", property: "email", icon: faEnvelope },
    { display: "N° de téléphone", property: "telephone", icon: faPhone },
    { display: "Date de naissance", property: "dateNaissance", isDate: true, icon: faCalendarAlt },
    {
      display: "Compte valide jusqu'au",
      property: "dateExpirationCompte",
      isDate: true,
      icon: faClock,
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
    setUtilisateur(prevUtilisateur => ({ 
      ...prevUtilisateur, 
      [property]: value 
    }));
    setErrorMessage(null);
  }, []);

  const handleCancel = useCallback(() => {
    setUtilisateur(() => initialUtilisateur);
    setEditingField(null);
    setErrorMessage(null);
  }, [initialUtilisateur]);

  const handleValidate = useCallback(async () => {
    const currentUtilisateur = utilisateurRef.current;
    if (!currentUtilisateur) return;
    
    try {
      const dateExpiration = currentUtilisateur.dateExpirationCompte || new Date();
      const utilisateurToUpdate = {
        ...currentUtilisateur,
        dateExpirationCompte: new Date(dateToISO(dateExpiration))
      };
      await utilisateurService.updateUser(utilisateurToUpdate);
      setEditingField(null);
      setInitialUtilisateur(utilisateurToUpdate);
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
        console.error(
          "Erreur lors de la mise à jour de l'utilisateur :",
          messageTransmis
        );
      }
    }
  }, []);

  if (!accountService.isLogged()) return <Navigate to="/" />;

  return (
    <div className={`page-main ${styles.pageMainProfile}`}>
      {loading ? (
        <div className={styles.loadingOverlay}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.profileContent}>
            <Card className={styles.detailsCard}>
              <CardBody>
                <div className={styles.profileHeader}>
                  <div className={styles.avatarWrapper}>
                    <img
                      src="https://bootdey.com/img/Content/avatar/avatar1.png"
                      alt="Avatar"
                      className={styles.avatar}
                    />
                    <button className={styles.editAvatarBtn} title="Modifier la photo">
                      <FontAwesomeIcon icon={faCamera} />
                    </button>
                  </div>
                  <div className={styles.profileIdentity}>
                    <h2>{utilisateur?.prenom} {utilisateur?.nom}</h2>
                    <span className={styles.roleBadge}>{utilisateur?.role}</span>
                  </div>
                </div>            
                <div className={styles.infoList}>
                    {propertyMappings.map((mapping) => {
                      const isEditing = editingField === mapping.property;
                      const isReadOnly = mapping.property === "dateExpirationCompte";
                      
                      return (
                        <div key={mapping.display} className={`${styles.infoItem} ${isEditing ? styles.editing : ''}`}>
                          <div className={styles.iconCol}>
                            <div className={styles.iconBubble}>
                              <FontAwesomeIcon icon={mapping.icon} />
                            </div>
                          </div>
                          
                          <div className={styles.contentCol}>
                            <span className={styles.label}>{mapping.display}</span>
                            
                            <div className={styles.valueContainer}>
                              {isEditing ? (
                                mapping.isDate ? (
                                  <DatePicker
                                    className="form-control"
                                    selected={utilisateur?.[mapping.property]}
                                    onChange={(date) => handleInputChange(mapping.property, date)}
                                    locale="fr"
                                    dateFormat="dd/MM/yyyy"
                                    showYearDropdown
                                    scrollableYearDropdown
                                  />
                                ) : mapping.property === "genre" ? (
                                  <select
                                    className="form-select"
                                    value={utilisateur?.[mapping.property] || ''}
                                    onChange={(e) => handleInputChange(mapping.property, e.target.value)}
                                  >
                                    <option value="Féminin">Féminin</option>
                                    <option value="Masculin">Masculin</option>
                                  </select>
                                ) : (
                                  <input
                                    className="form-control"
                                    type="text"
                                    value={utilisateur?.[mapping.property] || ''}
                                    onChange={(e) => handleInputChange(mapping.property, e.target.value)}
                                    autoFocus
                                  />
                                )
                              ) : (
                                <span className={styles.value}>
                                  {mapping.isDate 
                                    ? (utilisateur && utilisateur[mapping.property] && formaterDate(utilisateur[mapping.property] as string | Date))
                                    : (utilisateur?.[mapping.property] || <span className="text-muted fst-italic">Non renseigné</span>)
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                          {!isReadOnly && (
                            <div className={styles.actionCol}>
                              {isEditing ? (
                                <div className={styles.editActions}>
                                  <button className={styles.btnSave} onClick={handleValidate} title="Valider">
                                    <FontAwesomeIcon icon={faCheck} />
                                  </button>
                                  <button className={styles.btnCancel} onClick={handleCancel} title="Annuler">
                                    <FontAwesomeIcon icon={faTimes} />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  className={styles.btnEdit} 
                                  onClick={() => setEditingField(mapping.property)}
                                  title="Modifier"
                                >
                                  <FontAwesomeIcon icon={faPencilAlt} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                {errorMessage && (
                  <div className="alert alert-danger mt-4">
                    {errorMessage}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Profil;
