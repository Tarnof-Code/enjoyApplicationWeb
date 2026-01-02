import { useState } from "react";
import { Modal, ModalHeader, ModalBody } from "reactstrap";
import Form, { FormField } from "./Form";
import { utilisateurService } from "../../services/utilisateur.service";
import { regexValidation } from "../../helpers/regexValidation";

interface ChangePasswordFormProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: string;
}

function ChangePasswordForm({ isOpen, onClose, tokenId }: ChangePasswordFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fields: FormField[] = [
    {
      name: "ancienMotDePasse",
      label: "Ancien",
      type: "password",
      required: true,
    },
    {
      name: "nouveauMotDePasse",
      label: "Nouveau",
      type: "password",
      required: true,
      validation: (value: string) => {
        if (!regexValidation.validatePassword(value)) {
          return "Le mot de passe doit contenir au moins une minuscule, une majuscule, un caractère spécial (@#$%^&*!), et au moins 4 caractères";
        }
        return null;
      },
    },
    {
      name: "confirmationMotDePasse",
      label: "Confirmer le nouveau",
      type: "password",
      required: true,
      validation: (value: string, allValues?: Record<string, unknown>) => {
        if (value !== allValues?.nouveauMotDePasse) {
          return "Les mots de passe ne correspondent pas";
        }
        return null;
      },
    },
  ];

  const handleSubmit = async (formData: Record<string, string>) => {
    setErrorMessage(null);
    try {
      await utilisateurService.changePassword({
        tokenId,
        ancienMotDePasse: formData.ancienMotDePasse,
        nouveauMotDePasse: formData.nouveauMotDePasse,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      if (err.response?.data?.error) {
        setErrorMessage(err.response.data.error);
      } else if (err.message) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Une erreur est survenue");
      }
      throw error;
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} toggle={handleClose}>
      <ModalHeader toggle={handleClose}>Modifier mon mot de passe</ModalHeader>
      <ModalBody>
        <Form
          fields={fields}
          onSubmit={handleSubmit}
          onClose={handleClose}
          submitText="Modifier"
          successMessage="Mot de passe modifié avec succès"
          errorMessage={errorMessage}
        />
      </ModalBody>
    </Modal>
  );
}

export default ChangePasswordForm;
