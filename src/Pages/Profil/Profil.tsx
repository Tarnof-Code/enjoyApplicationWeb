import styles from "./Profil.module.scss";
import { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import formaterDate from "../../helpers/formaterDate";
import dateToISO from "../../helpers/dateToISO";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { Navigate, useLoaderData } from "react-router-dom";
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

export async function profilLoader() {
  try {
    const response = await utilisateurService.getUser();
    return response?.data;
  } catch (error) {
    console.error("Erreur chargement profil", error);
    return null;
  }
}

const Profil: React.FC = () => {

  const loadedData = useLoaderData() as Utilisateur | null;

  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(loadedData);
  const [initialUtilisateur, setInitialUtilisateur] = useState<Utilisateur | null>(loadedData);
  
  const sections = [
    {
      title: "Informations personnelles",
      fields: [
        { display: "Prénom", property: "prenom", icon: faUser },
        { display: "Nom", property: "nom", icon: faUser },
        { display: "Genre", property: "genre", icon: faVenusMars },
        { display: "Date de naissance", property: "dateNaissance", isDate: true, icon: faCalendarAlt },
      ]
    },
    {
      title: "Contact",
      fields: [
        { display: "Email", property: "email", icon: faEnvelope },
        { display: "N° de téléphone", property: "telephone", icon: faPhone },
      ]
    },
    {
      title: "Compte & statut",
      fields: [
        {
          display: "Compte valide jusqu'au",
          property: "dateExpirationCompte",
          isDate: true,
          icon: faClock,
        },
      ]
    },
  ];
  
  const [editingField, setEditingField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInputChange = (property: string, value: any) => {
    setUtilisateur(prevUtilisateur => ({ 
      ...prevUtilisateur, 
      [property]: value 
    }));
    setErrorMessage(null);
  };

  const handleCancel = () => {
    setUtilisateur(initialUtilisateur);
    setEditingField(null);
    setErrorMessage(null);
  };

  const handleValidate = async () => {
    if (!utilisateur) return;
    
    try {
      const dateExpiration = utilisateur.dateExpirationCompte || new Date();
      const utilisateurToUpdate = {
        ...utilisateur,
        dateExpirationCompte: new Date(dateToISO(dateExpiration))
      };
      console.log("utilisateurToUpdate", utilisateurToUpdate);
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
  };

  if (!accountService.isLogged()) return <Navigate to="/" />;

  const renderField = (mapping: any) => {
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
  };

  return (
    <div className={`page-main ${styles.pageMainProfile}`}>
      <div className={styles.profileContent}>
        <div className="container-fluid">
          <div className="row g-4">
            <div className="col-lg-4">
              <Card className={styles.summaryCard}>
                <CardBody className={styles.summaryBody}>
                  <div className={styles.summaryHeader}>
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
                      <h2 className={styles.profileName}>
                        {utilisateur?.prenom} {utilisateur?.nom}
                      </h2>
                      <span className={styles.roleBadge}>
                        {utilisateurService.getRoleSystemeByGenre(utilisateur?.role || null, utilisateur?.genre || null)}
                      </span>
                    </div>
                  </div>           
                  <div className={styles.summaryContact}>
                    <div className={styles.contactItem}>
                      <FontAwesomeIcon icon={faEnvelope} className={styles.contactIcon} />
                      <span className={styles.contactValue}>
                        {utilisateur?.email || <span className="text-muted fst-italic">Non renseigné</span>}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="col-lg-8">
              {sections.map((section, sectionIndex) => (
                <Card key={sectionIndex} className={styles.sectionCard}>
                  <CardHeader className={styles.sectionHeader}>
                    <h5 className={styles.sectionTitle}>{section.title}</h5>
                  </CardHeader>
                  <CardBody>
                    <div className={styles.sectionFields}>
                      {section.fields.map((field) => renderField(field))}
                    </div>
                  </CardBody>
                </Card>
              ))}
              {errorMessage && (
                <div className="alert alert-danger mt-3">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profil;
