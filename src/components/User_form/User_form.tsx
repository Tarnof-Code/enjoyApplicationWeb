import { useState, useMemo } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import Form, { FormField } from "../Form/Form";
import { accountService } from "../../services/account.service";
import { utilisateurService } from "../../services/utilisateur.service";
import { regexService } from "../../services/regex.service";
import formatDateAnglais from "../../helpers/formatDateAnglais";

interface UserFormProps {
  handleCloseModal: () => void;
  refreshList: () => void;
  userData?: any; 
  isEditMode?: boolean; 
}

function User_form({ handleCloseModal, refreshList, userData, isEditMode = false }: UserFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const initialData = useMemo(() => {
    if (userData && isEditMode) {
      return {
        email: userData.email || "",
        prenom: userData.prenom || "",
        nom: userData.nom || "",
        genre: userData.genre || "",
        dateNaissance: userData.dateNaissance ? formatDateAnglais(userData.dateNaissance) : "",
        telephone: userData.telephone || "",
        role: userData.role || "",
        motDePasse: "",
        dateExpiration: userData.dateExpirationCompte ? formatDateAnglais(userData.dateExpirationCompte) : "",
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
  }, [userData, isEditMode]);

  const handleCloseModalAndRefresh = () => {
    setModalIsOpen(false);
    handleCloseModal();
    refreshList();
  };

  const handleSubmit = async (formData: any) => {
    try {
      setErrorMessage(null);
      
      if (isEditMode && userData) {
        const dateExpirationTimestamp = new Date(formData.dateExpiration).getTime() / 1000;
        const updatedUser = {
          ...userData,
          ...formData,
          dateExpirationCompte: dateExpirationTimestamp,
          ...(formData.motDePasse && { password: formData.motDePasse })
        };
        
        await utilisateurService.updateUser(updatedUser);
        
        if (formData.genre === "Féminin") {
          setModalMessage(
            `${formData.prenom} ${formData.nom} a bien été modifiée.`
          );
        } else {
          setModalMessage(
            `${formData.prenom} ${formData.nom} a bien été modifié.`
          );
        }
      } else {
        const dateExpirationTimestamp = new Date(formData.dateExpiration).getTime() / 1000;
        const userInfos = {
          ...formData,
          dateExpiration: dateExpirationTimestamp,
          password: formData.motDePasse
        };
        
        await accountService.addUser(userInfos);

        if (formData.genre === "Féminin") {
          setModalMessage(
            `${formData.prenom} ${formData.nom} a bien été ajoutée.`
          );
        } else {
          setModalMessage(
            `${formData.prenom} ${formData.nom} a bien été ajouté.`
          );
        }
      }

      setModalIsOpen(true);
    } catch (error) {
      console.error("Erreur lors de l'opération", error);
      setErrorMessage("Une erreur est survenue lors de l'opération");
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
      validation: (value) => {
        if (!value) return "Veuillez entrer une adresse e-mail";
        if (!regexService.validateEmail(value)) return "Veuillez entrer une adresse e-mail valide";
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
        if (!regexService.validatePhone(value)) return "Veuillez entrer un numéro de téléphone valide";
        return null;
      }
    },
    {
      name: "motDePasse",
      label: isEditMode ? "Mot de passe (optionnel)" : "Mot de passe",
      type: "password",
      required: !isEditMode, 
      placeholder: isEditMode ? "Laisser vide si pas de modification" : "",
      validation: (value) => {
        if (!isEditMode && (!value || !regexService.validatePassword(value))) {
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
    <>
      <Form
        key={`${userData?.id || 'new'}-${isEditMode}`} 
        fields={formFields}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
        submitText={isEditMode ? "Modifier" : "Ajouter"}
        cancelText="Annuler"
        errorMessage={errorMessage}
      />

      <Modal isOpen={modalIsOpen} toggle={handleCloseModalAndRefresh}>
        <ModalHeader toggle={handleCloseModalAndRefresh}>
          Confirmation
        </ModalHeader>
        <ModalBody>
          <p>{modalMessage}</p>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleCloseModalAndRefresh}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export default User_form;
