import { useState, useEffect, useRef } from "react";
import { useRevalidator } from "react-router-dom";
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

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'date' | 'tel' | 'password' | 'textarea' | 'number' | 'custom';
  /** Obligatoire : boolean ou fonction (formData) => boolean pour un required conditionnel */
  required?: boolean | ((formData: Record<string, any>) => boolean);
  options?: { value: string; label: string }[];
  validation?: (value: any, allValues?: Record<string, any>) => string | null;
  placeholder?: string;
  disabled?: boolean;
  customComponent?: React.ComponentType<any>;
  autoComplete?: string;
  /** Si défini, le champ n'est affiché que lorsque la fonction retourne true */
  visible?: (formData: Record<string, any>) => boolean;
}

export interface FormProps {
  fields: FormField[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  submitText?: string;
  cancelText?: string;
  title?: string;
  successMessage?: string | ((formData: any) => string);
  errorMessage?: string | null;
  loading?: boolean;
  /** Contenu informatif affiché au-dessus des champs (peut dépendre de formData) */
  infoContent?: (formData: Record<string, any>) => React.ReactNode;
}

function Form({
  fields,
  initialData,
  onSubmit,
  onClose,
  submitText = "Valider",
  cancelText = "Annuler",
  title,
  successMessage,
  errorMessage,
  loading = false,
  infoContent,
}: FormProps) {
  const revalidator = useRevalidator();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const lastInitialDataRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

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

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    const field = fields.find(f => f.name === fieldName);
    if (field?.validation) {
      const nextAllValues = {
        ...formData,
        [fieldName]: value,
      };
      const error = field.validation(value, nextAllValues);
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: error || ""
      }));
    }

    if (fieldName === 'dateDebut') {
      const dateFinField = fields.find(f => f.name === 'dateFin');
      if (dateFinField?.validation) {
        const dateFinValue = (formData['dateFin'] || "");
        const nextAllValues = {
          ...formData,
          [fieldName]: value,
        };
        const finError = dateFinField.validation(dateFinValue, nextAllValues) || "";
        setValidationErrors(prev => ({
          ...prev,
          dateFin: finError,
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;
    fields.forEach(field => {
      const value = formData[field.name];
      const isVisible = !field.visible || field.visible(formData);
      const isRequired = typeof field.required === 'function' ? field.required(formData) : !!field.required;
      if (isRequired && isVisible && (!value || value.toString().trim() === "")) {
        errors[field.name] = `${field.label} est requis`;
        isValid = false;
      }
      if (field.validation && isVisible) {
        const error = field.validation(value, formData);
        if (error) {
          errors[field.name] = error;
          isValid = false;
        }
      }
    });
    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (successMessage) {
        const message = typeof successMessage === 'function' 
          ? successMessage(formData) 
          : successMessage;
        setModalMessage(message);
        setModalIsOpen(true);
      } else {
        onClose();
        revalidator.revalidate();
      }
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      autoComplete: field.autoComplete,
    };

    const isRequired = typeof field.required === 'function' ? field.required(formData) : !!field.required;

    if (field.type === 'custom' && field.customComponent) {
      const CustomComponent = field.customComponent;
      return (
        <CustomComponent
          key={field.name}
          value={value}
          onChange={(newValue: string) => handleFieldChange(field.name, newValue)}
          error={error}
          disabled={field.disabled || loading}
          label={field.label}
          required={isRequired}
        />
      );
    }
    const showRequired = (!field.visible || field.visible(formData)) && isRequired;

    return (
      <FormGroup key={field.name} className={styles.form_group}>
        <Col lg={4}>
          <Label className={styles.label}>
            {field.label}
            {showRequired && <span className={styles.required}> *</span>}
          </Label>
        </Col>
        <Col lg={8}>
          {field.type === 'select' ? (
            <Input type="select" {...inputProps}>
              <option value="">Choisir...</option>
              {field.options?.map((option, index) => (
                 <option key={`${field.name}-option-${index}`} value={option.value}>
                 {option.label}
               </option>
              ))}
            </Input>
          ) : field.type === 'textarea' ? (
            <Input
              type="textarea"
              rows={4}
              {...inputProps}
            />
          ) : (
            <Input
              type={field.type === 'password' ? 'password' : field.type === 'custom' ? 'text' : field.type === 'number' ? 'number' : field.type}
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
        {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
        {infoContent?.(formData)}
        <ReactstrapForm 
          className={styles.form} 
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {fields.filter((f) => !f.visible || f.visible(formData)).map(renderField)}        
          <div className={styles.buttonContainer}>
            <Button 
              color="secondary"
              onClick={onClose}
              disabled={loading || isSubmitting}
            >
              {cancelText}
            </Button>
            <Button 
              color="success"
              onClick={handleSubmit}
              disabled={loading || isSubmitting}
              className="btn_valider"
            >
              {isSubmitting ? "En cours..." : submitText}
            </Button>
          </div>
        </ReactstrapForm>

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
                color="secondary"
                onClick={() => {
                  setModalIsOpen(false);
                  onClose();
                  revalidator.revalidate();
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
