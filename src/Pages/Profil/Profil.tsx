import styles from "./Profil.module.scss";
import { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import formaterDate from "../../helpers/formaterDate";
import dateToISO from "../../helpers/dateToISO";
import { canEditEmail, getEmailReadOnlyMessage } from "../../helpers/canEditEmail";
import { libelleRoleBadgeProfil } from "../../helpers/libelleRoleSurSejour";
import { lireHeaderSejourContext } from "../../helpers/headerSejourContext";
import { getApiErrorMessage } from "../../helpers/axiosError";
import { throwRouteLoaderError } from "../../helpers/routeError";
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
  faTimes,
  faKey,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { fr } from "date-fns/locale/fr";
import ChangePasswordForm from "../../components/Forms/ChangePasswordForm";

registerLocale("fr", fr);
setDefaultLocale("fr");

interface Utilisateur {
  tokenId?: string;
  prenom?: string;
  nom?: string;
  genre?: string;
  email?: string;
  telephone?: string;
  dateNaissance?: Date;
  dateExpirationCompte?: Date;
  role?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export async function profilLoader() {
  try {
    const response = await utilisateurService.getUser();
    return response.data;
  } catch (error) {
    throwRouteLoaderError(error);
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
        {
          display: "Mot de passe",
          property: "motDePasse",
          isPassword: true,
          icon: faKey,
        },
      ]
    },
  ];
  
  const [editingField, setEditingField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(() => new Set([0]));
  const [sejourContext] = useState(() => lireHeaderSejourContext());

  const tokenConnecte = accountService.getTokenInfo()?.payload?.sub;
  const roleBadgeLabel = libelleRoleBadgeProfil(
    utilisateur?.tokenId ?? (typeof tokenConnecte === "string" ? tokenConnecte : null),
    utilisateur?.genre ?? null,
    utilisateur?.role ?? null,
    sejourContext,
  );

  const toggleSection = (sectionIndex: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionIndex)) {
        next.delete(sectionIndex);
      } else {
        next.add(sectionIndex);
      }
      return next;
    });
  };

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
    if (!utilisateur || !initialUtilisateur) return;
    const emailEditable = canEditEmail(
      { role: utilisateur.role, tokenId: utilisateur.tokenId },
      { role: utilisateur.role, tokenId: utilisateur.tokenId }
    );
    try {
      const utilisateurPourApi = {
        ...utilisateur,
        email: emailEditable ? utilisateur.email : initialUtilisateur.email,
        dateNaissance: dateToISO(utilisateur.dateNaissance) ?? new Date().toISOString(),
        dateExpirationCompte: dateToISO(utilisateur.dateExpirationCompte) ?? new Date().toISOString()
      };
      await utilisateurService.updateUser(utilisateurPourApi);
      setEditingField(null);
      setInitialUtilisateur(utilisateur);
      setErrorMessage(null);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      const status = axiosError.response?.status;
      const defaultMessage =
        status === 404 ? "Utilisateur introuvable" : "Erreur lors de la mise à jour de l'utilisateur";
      const message = getApiErrorMessage(axiosError.response?.data, defaultMessage);
      setErrorMessage(message);
      console.error("Erreur lors de la mise à jour de l'utilisateur :", message);
    }
  };

  if (!accountService.isLogged()) return <Navigate to="/" />;

  const emailEditable = utilisateur
    ? canEditEmail(
        { role: utilisateur.role, tokenId: utilisateur.tokenId },
        { role: utilisateur.role, tokenId: utilisateur.tokenId }
      )
    : false;
  const emailReadOnlyMessage = getEmailReadOnlyMessage(utilisateur?.role);

  const renderField = (mapping: any) => {
    const isEditing = editingField === mapping.property;
    const isEmailReadOnly = mapping.property === "email" && !emailEditable;
    const isReadOnly = mapping.property === "dateExpirationCompte" || isEmailReadOnly;
    const isPassword = mapping.isPassword === true;
    const handleEditClick = () => {
      if (isPassword) {
        setPasswordModalOpen(true);
      } else {
        setEditingField(mapping.property);
      }
    };
    const renderValue = () => {
      if (isPassword) {
        return <span className={styles.value}>••••••••</span>;
      }
      if (mapping.isDate) {
        return utilisateur && utilisateur[mapping.property] 
          ? formaterDate(utilisateur[mapping.property] as string | Date)
          : null;
      }
      return utilisateur?.[mapping.property] || <span className="text-muted fst-italic">Non renseigné</span>;
    };
    const renderEditingInput = () => {
      if (mapping.isDate) {
        return (
          <DatePicker
            className="form-control"
            selected={utilisateur?.[mapping.property]}
            onChange={(date) => handleInputChange(mapping.property, date)}
            locale="fr"
            dateFormat="dd/MM/yyyy"
            showYearDropdown
            scrollableYearDropdown
          />
        );
      }
      if (mapping.property === "genre") {
        return (
          <select
            className="form-select"
            value={utilisateur?.[mapping.property] || ''}
            onChange={(e) => handleInputChange(mapping.property, e.target.value)}
          >
            <option value="Féminin">Féminin</option>
            <option value="Masculin">Masculin</option>
          </select>
        );
      }
      return (
        <input
          className="form-control"
          type="text"
          value={utilisateur?.[mapping.property] || ''}
          onChange={(e) => handleInputChange(mapping.property, e.target.value)}
          autoFocus
        />
      );
    };
  
    return (
      <div key={mapping.display} className={`${styles.infoItem} ${isEditing ? styles.editing : ''}`}>
        <div className={styles.iconCol}>
          <div className={styles.iconBubble}>
            <FontAwesomeIcon icon={mapping.icon} />
          </div>
        </div>
        
        <div className={styles.contentCol}>
          <span className={styles.label}>{mapping.display}</span>   
          <div className={`${styles.valueContainer} ${isEmailReadOnly ? styles.withHint : ""}`}>
            {isEditing && !isPassword ? (
              renderEditingInput()
            ) : (
              <span className={styles.value}>
                {renderValue()}
              </span>
            )}
            {isEmailReadOnly && emailReadOnlyMessage && (
              <small className="text-muted">{emailReadOnlyMessage}</small>
            )}
          </div>
        </div>
        {!isReadOnly && (
          <div className={styles.actionCol}>
            {isEditing && !isPassword ? (
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
                onClick={handleEditClick}
                title={isPassword ? "Modifier le mot de passe" : "Modifier"}
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
              <div className={styles.summaryCardWrap}>
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
                      <span className={styles.roleBadge}>
                        {roleBadgeLabel}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
              </div>
            </div>
            <div className="col-lg-8">
              {sections.map((section, sectionIndex) => {
                const isOpen = openSections.has(sectionIndex);
                return (
                <Card key={sectionIndex} className={styles.sectionCard}>
                  <CardHeader
                    tag="button"
                    type="button"
                    className={`${styles.sectionHeader} ${isOpen ? styles.sectionHeaderOpen : ""}`}
                    onClick={() => toggleSection(sectionIndex)}
                    aria-expanded={isOpen}
                  >
                    <h5 className={styles.sectionTitle}>{section.title}</h5>
                    <FontAwesomeIcon icon={faChevronDown} className={styles.sectionChevron} aria-hidden />
                  </CardHeader>
                  {isOpen ? (
                  <CardBody>
                    <div className={styles.sectionFields}>
                      {section.fields.map((field) => renderField(field))}
                    </div>
                  </CardBody>
                  ) : null}
                </Card>
              );
              })}
              {errorMessage && (
                <div className="alert alert-danger mt-3">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ChangePasswordForm
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        tokenId={utilisateur?.tokenId || ""}
      />
    </div>
  );
};

export default Profil;
