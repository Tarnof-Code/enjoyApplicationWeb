import { useState, useMemo } from "react";
import Form, { FormField } from "./Form";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { regexValidation } from "../../helpers/regexValidation";
import formatDateAnglais from "../../helpers/formatDateAnglais";

interface UserFormProps {
  handleCloseModal: () => void;
  refreshList: () => void;
  data?: any; 
  isEditMode?: boolean; 
}

function User_form({ handleCloseModal, refreshList, data, isEditMode = false }: UserFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialData = useMemo(() => {
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
      email: "",
      prenom: "",
      nom: "",
      genre: "",
      dateNaissance: "",
      telephone: "",
      role: "",
      motDePasse: "",
      dateExpiration: "",
    };
  }, [data, isEditMode]);

  const handleCloseModalAndRefresh = () => {
    handleCloseModal();
    refreshList();
  };

  const getSuccessMessage = (formData: any): string => {
    if (formData.genre === "Féminin") {
      return isEditMode 
        ? `${formData.prenom} ${formData.nom} a bien été modifiée.`
        : `${formData.prenom} ${formData.nom} a bien été ajoutée.`;
    } else {
      return isEditMode
        ? `${formData.prenom} ${formData.nom} a bien été modifié.`
        : `${formData.prenom} ${formData.nom} a bien été ajouté.`;
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      setErrorMessage(null);
      
      if (isEditMode && data) {
        const dateExpirationTimestamp = new Date(formData.dateExpiration).getTime() / 1000;
        const updatedUser = {
          ...data,
          ...formData,
          dateExpirationCompte: dateExpirationTimestamp,
          ...(formData.motDePasse && { password: formData.motDePasse })
        };
        
        await utilisateurService.updateUser(updatedUser);
      } else {
        const dateExpirationTimestamp = new Date(formData.dateExpiration).getTime() / 1000;
        const userInfos = {
          ...formData,
          dateExpiration: dateExpirationTimestamp,
          password: formData.motDePasse
        };
        
        await accountService.addUser(userInfos);
      }
    } catch (error) {
      console.error("Erreur lors de l'opération", error);
      setErrorMessage("Une erreur est survenue lors de l'opération");
      throw error;
    }
  };

  const formFields: FormField[] = [
    {
      name: "role",
      label: "Rôle",
      type: "select",
      required: true,
      options: [
        { value: "DIRECTION", label: "Direction" },
        { value: "ADJ_DIRECTION", label: "Adjoint" },
        { value: "ANIM", label: "Anim" },
        { value: "ANIM_AS", label: "Anim_AS" },
        { value: "ADMIN", label: "Admin" }
      ],
      validation: (value) => value === "" ? "Veuillez choisir un rôle" : null
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
      autoComplete: isEditMode ? undefined : "off",
      validation: (value) => {
        if (!value) return "Veuillez entrer une adresse e-mail";
        if (!regexValidation.validateEmail(value)) return "Veuillez entrer une adresse e-mail valide";
        return null;
      }
    },
    {
      name: "prenom",
      label: "Prénom",
      type: "text",
      required: true,
      validation: (value) => !value ? "Veuillez saisir un prénom" : null
    },
    {
      name: "nom",
      label: "Nom",
      type: "text",
      required: true,
      validation: (value) => !value ? "Veuillez saisir un nom" : null
    },
    {
      name: "genre",
      label: "Genre",
      type: "select",
      required: true,
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
      validation: (value) => !value ? "Veuillez entrer une date de naissance" : null
    },
    {
      name: "telephone",
      label: "N° de téléphone",
      type: "tel",
      required: true,
      validation: (value) => {
        if (!value) return "Veuillez entrer un numéro de téléphone";
        if (!regexValidation.validatePhone(value)) return "Veuillez entrer un numéro de téléphone valide";
        return null;
      }
    },
    {
      name: "motDePasse",
      label: isEditMode ? "Mot de passe (optionnel)" : "Mot de passe",
      type: "password",
      required: !isEditMode, 
      placeholder: isEditMode ? "Laisser vide si pas de modification" : "",
      autoComplete: isEditMode ? "new-password" : "new-password",
      validation: (value) => {
        if (!isEditMode && (!value || !regexValidation.validatePassword(value))) {
          return "Le mot de passe doit contenir au moins une minuscule, une majuscule, et un caractère spécial, et comporter au moins 4 caractères";
        }
        return null;
      }
    },
    {
      name: "dateExpiration",
      label: "Valide jusqu'au",
      type: "date",
      required: true,
      validation: (value) => !value ? "Veuillez entrer une date d'expiration pour le compte" : null
    }
  ];

  return (
    <Form
      key={`${data?.id || 'new'}-${isEditMode}`} 
      fields={formFields}
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCloseModal}
      onCloseModal={handleCloseModalAndRefresh}
      submitText={isEditMode ? "Modifier" : "Ajouter"}
      cancelText="Annuler"
      errorMessage={errorMessage}
      successMessage={getSuccessMessage}
    />
  );
}

export default User_form;
