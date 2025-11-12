import { useState, useMemo } from "react";
import Form, { FormField } from "../Forms/Form";
import DirecteurSelector from "../DirecteurSelector/DirecteurSelector";
import { sejourService } from "../../services/sejour.service";
import formatDateAnglais from "../../helpers/formatDateAnglais";

interface SejourFormProps {
  handleCloseModal: () => void;
  refreshList: () => void;
  data?: any; 
  isEditMode?: boolean; 
}


function Sejour_form({ handleCloseModal, refreshList, data, isEditMode = false }: SejourFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialData = useMemo(() => {
    if (data && isEditMode) {
      return {
        nom: data.nom || "",
        description: data.description || "",
        lieuDuSejour: data.lieuDuSejour || "",
        directeurTokenId: data.directeur?.tokenId ? String(data.directeur.tokenId) : "",
        dateDebut: data.dateDebut ? formatDateAnglais(data.dateDebut) : "",
        dateFin: data.dateFin ? formatDateAnglais(data.dateFin) : "",
      };
    }
    return {
      nom: "",
      description: "",
      lieuDuSejour: "",
      directeurTokenId: "",
      dateDebut: "",
      dateFin: "",
    };
  }, [data, isEditMode]);

  const handleCloseModalAndRefresh = () => {
    handleCloseModal();
    refreshList();
  };

  const getSuccessMessage = (formData: any): string => {
    return isEditMode
      ? `Le séjour "${formData.nom}" a bien été modifié.`
      : `Le séjour "${formData.nom}" a bien été ajouté.`;
  };

  const handleSubmit = async (formData: any) => {
    try {
      setErrorMessage(null);
      
      if (isEditMode && data) {
        await sejourService.updateSejour(data.id, formData);
      } else {
        await sejourService.addSejour(formData);
      }
    } catch (error) {
      console.error("Erreur lors de l'opération", error);
      setErrorMessage("Une erreur est survenue lors de l'opération");
      throw error;
    }
  };

  // Validation pour vérifier que la date de fin est après la date de début
  const validateDateRange = (dateDebut: string, dateFin: string): string | null => {
    if (dateDebut && dateFin) {
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      if (fin <= debut) {
        return "La date de fin doit être postérieure à la date de début";
      }
    }
    return null;
  };

  const formFields: FormField[] = [
    {
      name: "nom",
      label: "Nom du séjour",
      type: "text",
      required: true,
      validation: (value) => !value ? "Veuillez saisir un nom de séjour" : null
    },
    {
      name: "description",
      label: "Description",
      type: "text",
      required: true,
      validation: (value) => !value ? "Veuillez saisir une description" : null
    },
    {
      name: "lieuDuSejour",
      label: "Lieu",
      type: "text",
      required: true,
      validation: (value) => !value ? "Veuillez saisir un lieu" : null
    },
    {
      name: "directeurTokenId",
      label: "Directeur",
      type: "custom",
      required: true,
      customComponent: DirecteurSelector,
      validation: (value) => {
        if (!value) return "Veuillez sélectionner un directeur";
        return null;
      }
    },
    {
      name: "dateDebut",
      label: "Date de début",
      type: "date",
      required: true,
      validation: (value) => {
        if (!value) return "Veuillez entrer une date de début";
        return null;
      }
    },
    {
      name: "dateFin",
      label: "Date de fin",
      type: "date",
      required: true,
      validation: (value, allValues) => {
        if (!value) return "Veuillez entrer une date de fin";
        const dateDebut = allValues?.dateDebut as string;
        if (dateDebut) return validateDateRange(dateDebut, value);
        return null;
      }
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

export default Sejour_form;
