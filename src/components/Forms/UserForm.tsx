import { useState, useMemo } from "react";
import Form, { FormField } from "./Form";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { sejourService } from "../../services/sejour.service";
import { regexValidation } from "../../helpers/regexValidation";
import formatDateAnglais from "../../helpers/formatDateAnglais";
import dateToISO from "../../helpers/dateToISO";
import { RoleSejour, RoleSejourLabels } from "../../enums/RoleSejour";
import { MembreEquipeRequest, RegisterRequest, ChangePasswordRequest } from "../../types/api";
import { RoleSysteme, RoleSystemeLabels } from "../../enums/RoleSysteme";

interface EmailCheckData {
  email: string;
}

interface UserFormData {
  email?: string;
  prenom?: string;
  nom?: string;
  genre?: string;
  dateNaissance?: string;
  telephone?: string;
  role?: string;
  roleSejour?: RoleSejour;
  motDePasse?: string;
  dateExpiration?: string;
  [key: string]: unknown; // Pour permettre d'autres propriétés dynamiques
}

interface UserFormProps {
  handleCloseModal: () => void;
  data?: UserFormData & { tokenId?: string; dateExpirationCompte?: string | number; id?: number }; 
  isEditMode?: boolean; 
  excludedRoles?: string[];
  sejourId?: number;
}

function UserForm({ handleCloseModal, data, isEditMode = false, excludedRoles = [], sejourId }: UserFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [step, setStep] = useState<'email_check' | 'form'>((!isEditMode && sejourId) ? 'email_check' : 'form');
  const [checkedEmail, setCheckedEmail] = useState<string>("");
  const [foundUser, setFoundUser] = useState<UserFormData & { tokenId?: string; dateExpirationCompte?: string | number; id?: number } | null>(null);
  
  // Déterminer si on édite un membre existant de l'équipe (seul le rôle peut être modifié)
  const isEditingTeamMember = !!(isEditMode && sejourId && data?.tokenId);

  const initialData = useMemo(() => {
    // Si on est dans le contexte d'un séjour, utiliser roleSejour au lieu de role
    if (sejourId) {
      if (foundUser) {
        return {
          email: foundUser.email || checkedEmail,
          prenom: foundUser.prenom || "",
          nom: foundUser.nom || "",
          genre: foundUser.genre || "",
          dateNaissance: foundUser.dateNaissance ? formatDateAnglais(foundUser.dateNaissance) : "",
          telephone: foundUser.telephone || "",
          roleSejour: RoleSejour.ANIM, 
          motDePasse: "", 
          dateExpiration: foundUser.dateExpirationCompte ? formatDateAnglais(foundUser.dateExpirationCompte) : "",
          id: foundUser.id, 
          tokenId: foundUser.tokenId
        };
      }
      if (data && isEditMode) {
        return {
          email: data.email || "",
          prenom: data.prenom || "",
          nom: data.nom || "",
          genre: data.genre || "",
          dateNaissance: data.dateNaissance ? formatDateAnglais(data.dateNaissance) : "",
          telephone: data.telephone || "",
          roleSejour: data.roleSejour || RoleSejour.ANIM,
          motDePasse: "",
          dateExpiration: data.dateExpirationCompte ? formatDateAnglais(data.dateExpirationCompte) : "",
        };
      }    
      return {
        email: checkedEmail || "",
        prenom: "",
        nom: "",
        genre: "",
        dateNaissance: "",
        telephone: "",
        roleSejour: RoleSejour.ANIM, 
        motDePasse: "",
        dateExpiration: "",
      };
    }
    // Sinon, utiliser le rôle système comme avant
    if (foundUser) {
      return {
        email: foundUser.email || checkedEmail,
        prenom: foundUser.prenom || "",
        nom: foundUser.nom || "",
        genre: foundUser.genre || "",
        dateNaissance: foundUser.dateNaissance ? formatDateAnglais(foundUser.dateNaissance) : "",
        telephone: foundUser.telephone || "",
        role: foundUser.role || "",
        motDePasse: "", 
        dateExpiration: foundUser.dateExpirationCompte ? formatDateAnglais(foundUser.dateExpirationCompte) : "",
        id: foundUser.id, 
        tokenId: foundUser.tokenId
      };
    }
    if (data && isEditMode) {
      return {
        email: data.email || "",
        prenom: data.prenom || "",
        nom: data.nom || "",
        genre: data.genre || "",
        dateNaissance: data.dateNaissance ? formatDateAnglais(data.dateNaissance) : "",
        telephone: data.telephone || "",
        role: data.role || "",
        motDePasse: "",
        dateExpiration: data.dateExpirationCompte ? formatDateAnglais(data.dateExpirationCompte) : "",
      };
    }
    return {
      email: checkedEmail || "",
      prenom: "",
      nom: "",
      genre: "",
      dateNaissance: "",
      telephone: "",
      role: "",
      motDePasse: "",
      dateExpiration: "",
    };
  }, [sejourId, foundUser, checkedEmail, data, isEditMode]);

  const getSuccessMessage = (formData: UserFormData): string => {
    const mode = isEditMode ? 'modified' : 'added';
    const action = mode === 'modified' ? 'modifiée' : 'ajoutée';
    const actionMasc = mode === 'modified' ? 'modifié' : 'ajouté';
    if (formData.genre === "Féminin") {
      return `${formData.prenom} ${formData.nom} a bien été ${action}.`;
    } else {
      return `${formData.prenom} ${formData.nom} a bien été ${actionMasc}.`;
    }
  };

  const handleCheckEmail = async (formData: EmailCheckData) => {
    try {
        setErrorMessage(null);
        const email = formData.email;
        if (!email) return;        
        setCheckedEmail(email);     
        const response = await utilisateurService.getUserByEmail(email)        
        if (response && response.data) {
            setFoundUser(response.data);
        } else {
            setFoundUser(null);
        }
        setStep('form');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
        setErrorMessage(errorMessage);
        throw error;
    }
  };

  const handleSubmit = async (formData: UserFormData) => {
    try {
      setErrorMessage(null);   
      const effectiveEditMode = isEditMode || !!foundUser;
      const userData = foundUser || data; 
      if (sejourId) {
        // Gestion des membres d'un séjour - l'API gère la date d'expiration
        if (isEditMode && userData?.tokenId) {
          // Modification du rôle d'un membre existant
          await sejourService.modifierRoleMembreEquipe(
            sejourId, 
            userData.tokenId, 
            formData.roleSejour as RoleSejour
          );
        } else if (foundUser) {
          // Ajout d'un utilisateur existant à l'équipe
          if (!foundUser.tokenId) {
            throw new Error("TokenId manquant pour l'utilisateur trouvé");
          }
          const addMembreRequest: MembreEquipeRequest = {
            tokenId: foundUser.tokenId,
            roleSejour: formData.roleSejour as RoleSejour,
          };
          await sejourService.ajouterMembreExistantEquipe(sejourId, addMembreRequest);
        } else {
          const registerRequest: RegisterRequest = {
            ...(effectiveEditMode && userData ? userData : {}),
            ...formData,
            prenom: formData.prenom || '',
            nom: formData.nom || '',
            email: formData.email || '',
            genre: formData.genre || '',
            telephone: formData.telephone || '',
            dateNaissance: formData.dateNaissance || '',
            motDePasse: formData.motDePasse || '',
            role: RoleSysteme.BASIC_USER,
            roleSejour: formData.roleSejour
          };
          // Ne pas envoyer dateExpiration ni dateExpirationCompte - l'API gère
          await sejourService.ajouterNouveauMembreEquipe(sejourId, registerRequest);
        }
      } else {
        // Gestion hors séjour
        if (effectiveEditMode && userData) {
          // UpdateUserRequest attend dateExpirationCompte en string ISO 8601 (Instant sérialisé)
          // Utiliser le helper centralisé pour gérer tous les formats
          const dateExpirationCompte = formData.dateExpiration 
            ? dateToISO(formData.dateExpiration)
            : dateToISO(userData.dateExpirationCompte);
          
          // Construire updatedUser en s'assurant que dateExpirationCompte est correctement formaté
          const updatedUser = {
            tokenId: userData.tokenId || '',
            prenom: formData.prenom || userData.prenom || '',
            nom: formData.nom || userData.nom || '',
            genre: formData.genre || userData.genre || '',
            email: formData.email || userData.email || '',
            telephone: formData.telephone || userData.telephone || '',
            dateNaissance: formData.dateNaissance || userData.dateNaissance || '',
            role: (formData.role as RoleSysteme) || userData.role as RoleSysteme,
            dateExpirationCompte: dateExpirationCompte
          };
          await utilisateurService.updateUser(updatedUser);
          
          // Si le champ mot de passe est rempli, appeler l'API de changement de mot de passe
          if (formData.motDePasse && userData.tokenId) {
            const changePasswordRequest: ChangePasswordRequest = {
              tokenId: userData.tokenId,
              nouveauMotDePasse: formData.motDePasse
              // Pas besoin d'ancienMotDePasse pour les admins
            };
            await utilisateurService.changePassword(changePasswordRequest);
          }
        } else {
          // Création d'un utilisateur sans séjour
          const registerRequest: RegisterRequest = {
            prenom: formData.prenom || '',
            nom: formData.nom || '',
            email: formData.email || '',
            genre: formData.genre || '',
            telephone: formData.telephone || '',
            dateNaissance: formData.dateNaissance || '',
            motDePasse: formData.motDePasse || '',
            role: (formData.role as RoleSysteme) || RoleSysteme.BASIC_USER,
            roleSejour: formData.roleSejour,
            dateExpiration: dateToISO(formData.dateExpiration)
          };
          await accountService.addUser(registerRequest);
        }
      }
    } catch (error: unknown) {
      console.error("Erreur lors de l'opération", error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          setErrorMessage(axiosError.response.data.error);
        } else {
          setErrorMessage("Une erreur est survenue lors de l'opération");
        }
      } else {
        setErrorMessage("Une erreur est survenue lors de l'opération");
      }
      throw error;
    }
  };

  const emailField: FormField = {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
      autoComplete: "off",
      validation: (value) => {
        if (!value) return "Veuillez entrer une adresse e-mail";
        if (!regexValidation.validateEmail(value)) return "Veuillez entrer une adresse e-mail valide";
        return null;
      }
  };

  // Champ rôle système (pour les utilisateurs hors séjour)
  const roleField: FormField = {
    name: "role",
    label: "Rôle",
    type: "select",
    required: true,
    options: Object.values(RoleSysteme).map(role => ({
      value: role,
      label: RoleSystemeLabels[role]
    })).filter(option => !excludedRoles.includes(option.value)),
    validation: (value) => value === "" ? "Veuillez choisir un rôle" : null
  };

  // Champ rôle de séjour (pour les membres d'un séjour)
  const roleSejourField: FormField = {
    name: "roleSejour",
    label: "Rôle de séjour",
    type: "select",
    required: true,
    options: Object.values(RoleSejour).map(role => ({
      value: role,
      label: RoleSejourLabels[role]
    })),
    validation: (value) => !value ? "Veuillez choisir un rôle de séjour" : null
  };

  const fullFormFields: FormField[] = [
    {
        ...emailField,
        disabled: !!foundUser || isEditingTeamMember // Email non modifiable si utilisateur trouvé ou édition d'un membre de l'équipe
    }, 
    // Utiliser roleSejour (enum) si on est dans un séjour, sinon role système
    sejourId ? roleSejourField : roleField,
    {
      name: "prenom",
      label: "Prénom",
      type: "text",
      required: true,
      disabled: !!foundUser || isEditingTeamMember,
      validation: (value) => !value ? "Veuillez saisir un prénom" : null
    },
    {
      name: "nom",
      label: "Nom",
      type: "text",
      required: true,
      disabled: !!foundUser || isEditingTeamMember,
      validation: (value) => !value ? "Veuillez saisir un nom" : null
    },
    {
      name: "genre",
      label: "Genre",
      type: "select",
      required: true,
      disabled: !!foundUser,
      options: [
        { value: "Masculin", label: "Masculin" },
        { value: "Féminin", label: "Féminin" }
      ],
      validation: (value) => value === "" ? "Veuillez choisir un genre" : null
    },
    {
      name: "dateNaissance",
      label: "Date de naissance",
      type: "date",
      required: true,
      disabled: !!foundUser || isEditingTeamMember,
      validation: (value) => !value ? "Veuillez entrer une date de naissance" : null
    },
    {
      name: "telephone",
      label: "N° de téléphone",
      type: "tel",
      required: true,
      disabled: !!foundUser || isEditingTeamMember,
      validation: (value) => {
        if (!value) return "Veuillez entrer un numéro de téléphone";
        if (!regexValidation.validatePhone(value)) return "Veuillez entrer un numéro de téléphone valide";
        return null;
      }
    },
    {
      name: "motDePasse",
      label: (isEditMode || foundUser) ? "Mot de passe (optionnel)" : "Mot de passe",
      type: "password",
      // Required si NON édition ET NON utilisateur trouvé
      required: !(isEditMode || foundUser), 
      disabled: !!foundUser || isEditingTeamMember,
      placeholder: (isEditMode || foundUser) ? "Laisser vide si pas de modification" : "",
      autoComplete: "new-password",
      validation: (value) => {
        // Validation uniquement si requis ou si il a une valeur
        const isRequired = !(isEditMode || foundUser);
        if (isRequired && (!value || !regexValidation.validatePassword(value))) {
             return "Le mot de passe doit contenir au moins une minuscule, une majuscule, et un caractère spécial, et comporter au moins 4 caractères";
        }
        if (!isRequired && value && !regexValidation.validatePassword(value)) {
             return "Le mot de passe doit contenir au moins une minuscule, une majuscule, et un caractère spécial, et comporter au moins 4 caractères";
        }
        return null;
      }
    },
    {
      name: "dateExpiration",
      label: "Valide jusqu'au",
      type: "date",
      required: !sejourId, // Non requis quand on ajoute à un séjour (l'API gère)
      disabled: !!foundUser,
      validation: (value) => {
        // Validation seulement si requis (pas de sejourId)
        if (!sejourId && !value) {
          return "Veuillez entrer une date d'expiration pour le compte";
        }
        return null;
      }
    }
  ];

  if (step === 'email_check') {
      return (
        <Form
            key="email-check-form"
            fields={[emailField]} // Seulement email
            initialData={{ email: "" }}
            onSubmit={handleCheckEmail}
            onClose={handleCloseModal}
            submitText="Suivant"
            cancelText="Annuler"
            errorMessage={errorMessage}
            successMessage={() => ""} // Pas de message de succès pour cette étape
        />
      );
  }

  // Déterminer les champs visibles selon le contexte
  const visibleFields = (() => {
    const roleFieldName = sejourId ? 'roleSejour' : 'role';
    
    // Si on ajoute un utilisateur existant trouvé par email
    if (foundUser) {
      return fullFormFields.filter(field => 
        ['email', roleFieldName, 'prenom', 'nom', 'dateNaissance'].includes(field.name)
      );
    }
    
    // Si on édite un membre existant de l'équipe (avec sejourId et isEditMode)
    // Seul le rôle de séjour peut être modifié, les autres champs sont en lecture seule
    if (isEditingTeamMember) {
      return fullFormFields.filter(field => 
        ['email', roleFieldName, 'prenom', 'nom', 'dateNaissance'].includes(field.name)
      );
    }
    
    // Sinon, afficher tous les champs sauf dateExpiration pour les nouveaux membres avec sejourId
    return fullFormFields.filter(field => 
      !(field.name === 'dateExpiration' && sejourId && !isEditMode && !foundUser)
    );
  })();

  return (
    <Form
      key={`${data?.id || foundUser?.id || 'new'}-${isEditMode || !!foundUser}`} 
      fields={visibleFields}
      initialData={initialData}
      onSubmit={handleSubmit}
      onClose={handleCloseModal}
      submitText={isEditMode ? "Modifier" : "Ajouter"}
      cancelText="Annuler"
      errorMessage={errorMessage}
      successMessage={getSuccessMessage}
    />
  );
}

export default UserForm;
