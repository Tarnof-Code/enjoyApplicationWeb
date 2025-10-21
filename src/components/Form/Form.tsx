import { useState, useEffect, useRef } from "react";
import {
  Container,
  Col,
  Form as ReactstrapForm,
  FormGroup,
  Input,
  Button,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import styles from "./Form.module.scss";

// Interface pour définir un champ de formulaire
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'date' | 'tel' | 'password';
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: (value: any) => string | null;
  placeholder?: string;
  disabled?: boolean;
  colSpan?: number; // Pour les champs qui prennent plus d'espace
}

// Interface pour les props du composant Form
export interface FormProps {
  fields: FormField[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  title?: string;
  onCloseModal?: () => void;
  successMessage?: string;
  errorMessage?: string | null;
  loading?: boolean;
}

function Form({
  fields,
  initialData,
  onSubmit,
  onCancel,
  submitText = "Valider",
  cancelText = "Annuler",
  title,
  onCloseModal,
  successMessage,
  errorMessage,
  loading = false,
}: FormProps) {
  // État pour les données du formulaire
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  
  // Référence pour garder trace des données initiales
  const lastInitialDataRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  
  // Initialiser les données du formulaire seulement si c'est la première fois ou si les données ont vraiment changé
  useEffect(() => {
    const hasDataChanged = JSON.stringify(initialData) !== JSON.stringify(lastInitialDataRef.current);
    
    if (!isInitializedRef.current || hasDataChanged) {
      const initialFormData: Record<string, any> = {};
      fields.forEach(field => {
        initialFormData[field.name] = initialData?.[field.name] || "";
      });
      setFormData(initialFormData);
      isInitializedRef.current = true;
      lastInitialDataRef.current = initialData;
    }
  }, [initialData, fields]);

  // Gestion des changements de champs
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Validation en temps réel
    const field = fields.find(f => f.name === fieldName);
    if (field?.validation) {
      const error = field.validation(value);
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: error || ""
      }));
    }
  };

  // Validation de tous les champs
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const value = formData[field.name];
      
      // Validation des champs requis
      if (field.required && (!value || value.toString().trim() === "")) {
        errors[field.name] = `${field.label} est requis`;
        isValid = false;
      }
      
      // Validation personnalisée
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          errors[field.name] = error;
          isValid = false;
        }
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      
      if (successMessage) {
        setModalMessage(successMessage);
        setModalIsOpen(true);
      }
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rendu d'un champ
  const renderField = (field: FormField) => {
    const value = formData[field.name] || "";
    const error = validationErrors[field.name];
    const hasError = !!error;

    const inputProps = {
      id: field.name,
      name: field.name,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => 
        handleFieldChange(field.name, e.target.value),
      className: hasError ? styles.errorInput : "",
      placeholder: field.placeholder,
      disabled: field.disabled || loading,
    };

    return (
      <FormGroup key={field.name} className={styles.form_group}>
        <Col lg={field.colSpan || 4}>
          <Label className={styles.label}>
            {field.label}
            {field.required && <span className={styles.required}> *</span>}
          </Label>
        </Col>
        <Col lg={field.colSpan || 8}>
          {field.type === 'select' ? (
            <Input type="select" {...inputProps}>
              <option value="">Choisir...</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Input>
          ) : (
            <Input
              type={field.type === 'password' ? 'password' : field.type}
              {...inputProps}
            />
          )}
          {hasError && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </Col>
      </FormGroup>
    );
  };

  return (
    <div className={styles.main}>
      <Container className={styles.formContainer}>
        {title && <h2 className={styles.title}>{title}</h2>}
        
        {errorMessage && (
          <p className="errorMessage">{errorMessage}</p>
        )}

        <ReactstrapForm className={styles.form}>
          {fields.map(renderField)}
          
          <div className={styles.buttonContainer}>
            <Button 
              onClick={onCancel}
              disabled={loading || isSubmitting}
            >
              {cancelText}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || isSubmitting}
              className="btn_valider"
            >
              {isSubmitting ? "En cours..." : submitText}
            </Button>
          </div>
        </ReactstrapForm>

        {/* Modal de confirmation */}
        {modalIsOpen && (
          <Modal isOpen={modalIsOpen} toggle={() => setModalIsOpen(false)}>
            <ModalHeader toggle={() => setModalIsOpen(false)}>
              Confirmation
            </ModalHeader>
            <ModalBody>
              <p>{modalMessage}</p>
            </ModalBody>
            <ModalFooter>
              <Button
                onClick={() => {
                  setModalIsOpen(false);
                  onCloseModal?.();
                }}
              >
                Fermer
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </Container>
    </div>
  );
}

export default Form;
