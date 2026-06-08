import styles from "./Profil.module.scss";
import { useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardHeader, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import formaterDate from "../../helpers/formaterDate";
import dateToISO from "../../helpers/dateToISO";
import { canEditEmail, getEmailReadOnlyMessage } from "../../helpers/canEditEmail";
import { libelleRoleBadgeProfil } from "../../helpers/libelleRoleSurSejour";
import { lireHeaderSejourContext } from "../../helpers/headerSejourContext";
import { getApiErrorMessage, getUserFacingErrorMessage } from "../../helpers/axiosError";
import { throwRouteLoaderError } from "../../helpers/routeError";
import { PhotoProfilRecadrageModal } from "../../components/Profil/PhotoProfilRecadrageModal";
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
  faCrop,
  faTrash,
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
  photoProfilUrl?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const PHOTO_PROFIL_ACCEPT = "image/jpeg,image/png,image/webp";

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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoDeleteModalOpen, setPhotoDeleteModalOpen] = useState(false);
  const [photoDeleting, setPhotoDeleting] = useState(false);
  const [photoReloadKey, setPhotoReloadKey] = useState(0);
  const [recadrageModalOpen, setRecadrageModalOpen] = useState(false);
  const [recadrageImageUrl, setRecadrageImageUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoOriginaleRef = useRef<File | null>(null);
  const [photoOriginaleDisponible, setPhotoOriginaleDisponible] = useState(false);
  const recadrageUrlOwnedRef = useRef(false);
  const photoFetchGenerationRef = useRef(0);
  const hasPhotoProfil = Boolean(utilisateur?.photoProfilUrl);
  const photoBusy = photoUploading || photoDeleting;

  const tokenConnecte = accountService.getTokenInfo()?.payload?.sub;
  const roleBadgeLabel = libelleRoleBadgeProfil(
    utilisateur?.tokenId ?? (typeof tokenConnecte === "string" ? tokenConnecte : null),
    utilisateur?.genre ?? null,
    utilisateur?.role ?? null,
    sejourContext,
  );

  useEffect(() => {
    const tokenId = utilisateur?.tokenId;
    if (!tokenId || !utilisateur?.photoProfilUrl) {
      setPhotoUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      setPhotoLoading(false);
      return;
    }

    const generation = ++photoFetchGenerationRef.current;
    setPhotoLoading(true);

    utilisateurService
      .getPhotoProfilBlobUrl(tokenId, Date.now())
      .then((url) => {
        if (generation !== photoFetchGenerationRef.current) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        setPhotoUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });
      })
      .catch(() => {
        if (generation !== photoFetchGenerationRef.current) return;
        setPhotoUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return null;
        });
      })
      .finally(() => {
        if (generation === photoFetchGenerationRef.current) {
          setPhotoLoading(false);
        }
      });
  }, [utilisateur?.tokenId, utilisateur?.photoProfilUrl, photoReloadKey]);

  useEffect(() => {
    return () => {
      setPhotoUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, []);

  const fermerRecadrageModal = () => {
    if (recadrageUrlOwnedRef.current && recadrageImageUrl) {
      URL.revokeObjectURL(recadrageImageUrl);
    }
    recadrageUrlOwnedRef.current = false;
    setRecadrageImageUrl(null);
    setRecadrageModalOpen(false);
  };

  const ouvrirRecadrageAvecUrl = (url: string, owned: boolean) => {
    if (recadrageUrlOwnedRef.current && recadrageImageUrl) {
      URL.revokeObjectURL(recadrageImageUrl);
    }
    recadrageUrlOwnedRef.current = owned;
    setRecadrageImageUrl(url);
    setRecadrageModalOpen(true);
  };

  useEffect(() => {
    if (!photoPreviewOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhotoPreviewOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [photoPreviewOpen]);

  const handlePhotoInputClick = () => {
    photoInputRef.current?.click();
  };

  const handleRecadrerClick = () => {
    if (photoBusy || !photoOriginaleRef.current) return;
    ouvrirRecadrageAvecUrl(URL.createObjectURL(photoOriginaleRef.current), true);
  };

  const handleEnregistrerPhotoRecadree = async (file: File) => {
    if (!utilisateur?.tokenId) return;

    setPhotoUploading(true);
    try {
      const profilMisAJour = await utilisateurService.remplacerPhotoProfil(utilisateur.tokenId, file);
      const photoProfilUrl =
        profilMisAJour.photoProfilUrl ?? `/api/v1/utilisateurs/${utilisateur.tokenId}/photo-profil`;

      setUtilisateur((prev) => ({
        ...prev,
        photoProfilUrl,
      }));
      setInitialUtilisateur((prev) =>
        prev
          ? {
              ...prev,
              photoProfilUrl,
            }
          : prev
      );
      fermerRecadrageModal();
      setPhotoReloadKey((key) => key + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: unknown } };
      const message = axiosError.response?.data
        ? getApiErrorMessage(axiosError.response.data, "Erreur lors de l'envoi de la photo")
        : getUserFacingErrorMessage(error, "Erreur lors de l'envoi de la photo");
      throw new Error(message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoDeleteClick = () => {
    setPhotoDeleteModalOpen(true);
  };

  const handleConfirmPhotoDelete = async () => {
    if (!utilisateur?.tokenId) return;

    setPhotoDeleting(true);
    setErrorMessage(null);
    try {
      await utilisateurService.deletePhotoProfil(utilisateur.tokenId);
      photoOriginaleRef.current = null;
      setPhotoOriginaleDisponible(false);
      setUtilisateur((prev) => ({
        ...prev,
        photoProfilUrl: null,
      }));
      setInitialUtilisateur((prev) =>
        prev
          ? {
              ...prev,
              photoProfilUrl: null,
            }
          : prev
      );
      setPhotoPreviewOpen(false);
      setPhotoDeleteModalOpen(false);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: unknown } };
      const message = axiosError.response?.data
        ? getApiErrorMessage(axiosError.response.data, "Erreur lors de la suppression de la photo")
        : getUserFacingErrorMessage(error, "Erreur lors de la suppression de la photo");
      setErrorMessage(message);
    } finally {
      setPhotoDeleting(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !utilisateur?.tokenId) return;

    setErrorMessage(null);
    photoOriginaleRef.current = file;
    setPhotoOriginaleDisponible(true);
    ouvrirRecadrageAvecUrl(URL.createObjectURL(file), true);
  };

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
                      {photoUrl ? (
                        <button
                          type="button"
                          className={styles.avatarButton}
                          onClick={() => setPhotoPreviewOpen(true)}
                          title="Voir la photo en grand"
                          aria-label="Voir la photo en grand"
                        >
                          <img
                            key={photoUrl}
                            src={photoUrl}
                            alt="Photo de profil"
                            className={styles.avatar}
                          />
                        </button>
                      ) : (
                        <div
                          className={`${styles.avatar} ${styles.avatarPlaceholder} ${photoLoading ? styles.avatarLoading : ""}`}
                          aria-hidden={!photoLoading}
                        >
                          <FontAwesomeIcon icon={faUser} />
                        </div>
                      )}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept={PHOTO_PROFIL_ACCEPT}
                        className={styles.photoInput}
                        onChange={handlePhotoChange}
                        aria-label="Choisir une photo de profil"
                      />
                      {hasPhotoProfil && photoOriginaleDisponible ? (
                        <button
                          type="button"
                          className={styles.recadrerAvatarBtn}
                          title="Recadrer la photo"
                          onClick={handleRecadrerClick}
                          disabled={photoBusy}
                          aria-label="Recadrer la photo"
                        >
                          <FontAwesomeIcon icon={faCrop} />
                        </button>
                      ) : null}
                      {hasPhotoProfil ? (
                        <button
                          type="button"
                          className={styles.deleteAvatarBtn}
                          title="Supprimer la photo"
                          onClick={handlePhotoDeleteClick}
                          disabled={photoBusy}
                          aria-label="Supprimer la photo"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.editAvatarBtn}
                        title="Modifier la photo"
                        onClick={handlePhotoInputClick}
                        disabled={photoBusy}
                      >
                        <FontAwesomeIcon icon={faCamera} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.profileIdentity}>
                    <span className={styles.roleBadge}>
                      {roleBadgeLabel}
                    </span>
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
      {photoPreviewOpen && photoUrl ? (
        <div
          className={styles.photoPreviewOverlay}
          onClick={() => setPhotoPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo de profil agrandie"
        >
          <div className={styles.photoPreviewActions}>
            <button
              type="button"
              className={styles.photoPreviewDelete}
              onClick={(event) => {
                event.stopPropagation();
                handlePhotoDeleteClick();
              }}
              disabled={photoBusy}
              aria-label="Supprimer la photo"
            >
              <FontAwesomeIcon icon={faTrash} />
              <span>Supprimer</span>
            </button>
            <button
              type="button"
              className={styles.photoPreviewClose}
              onClick={() => setPhotoPreviewOpen(false)}
              aria-label="Fermer"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <img
            src={photoUrl}
            alt="Photo de profil agrandie"
            className={styles.photoPreviewImage}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
      <PhotoProfilRecadrageModal
        isOpen={recadrageModalOpen}
        imageUrl={recadrageImageUrl}
        onClose={fermerRecadrageModal}
        onSave={handleEnregistrerPhotoRecadree}
        saving={photoUploading}
      />
      <Modal
        isOpen={photoDeleteModalOpen}
        toggle={() => !photoDeleting && setPhotoDeleteModalOpen(false)}
      >
        <ModalHeader toggle={() => !photoDeleting && setPhotoDeleteModalOpen(false)}>
          Supprimer la photo de profil
        </ModalHeader>
        <ModalBody>
          <p>Voulez-vous vraiment supprimer votre photo de profil ?</p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={() => setPhotoDeleteModalOpen(false)}
            disabled={photoDeleting}
          >
            Annuler
          </Button>
          <Button color="danger" onClick={handleConfirmPhotoDelete} disabled={photoDeleting}>
            {photoDeleting ? "Suppression…" : "Confirmer la suppression"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default Profil;
