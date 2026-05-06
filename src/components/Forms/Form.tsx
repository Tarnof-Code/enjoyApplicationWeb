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

export interface CheckboxGroupOption {
  value: number;
  label: string;
  disabled?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'date' | 'tel' | 'password' | 'textarea' | 'number' | 'custom' | 'checkbox-group';
  /** Obligatoire : boolean ou fonction (formData) => boolean pour un required conditionnel */
  required?: boolean | ((formData: Record<string, any>) => boolean);
  options?: { value: string; label: string }[];
  /** Pour type checkbox-group : valeurs sélectionnées = number[] dans formData */
  checkboxOptions?: CheckboxGroupOption[];
  validation?: (value: any, allValues?: Record<string, any>) => string | null;
  placeholder?: string;
  disabled?: boolean;
  customComponent?: React.ComponentType<any>;
  autoComplete?: string;
  /** Si défini, le champ n'est affiché que lorsque la fonction retourne true */
  visible?: (formData: Record<string, any>) => boolean;
  /** Hauteur initiale des `<textarea />` (défaut 4) */
  rows?: number;
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
  /** Où afficher `errorMessage` (défaut : au-dessus du formulaire). */
  errorMessagePlacement?: "top" | "bottom";
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
  errorMessagePlacement = "top",
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
        if (field.type === 'checkbox-group') {
          initialFormData[field.name] = Array.isArray(initialData?.[field.name])
            ? [...(initialData[field.name] as number[])]
            : [];
        } else {
          initialFormData[field.name] = initialData?.[field.name] ?? "";
        }
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
      if (field.type === 'checkbox-group') {
        const ids = Array.isArray(value) ? value : [];
        if (isRequired && isVisible && ids.length === 0) {
          errors[field.name] = `${field.label} est requis`;
          isValid = false;
        }
      } else if (isRequired && isVisible && (!value || value.toString().trim() === "")) {
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
    const rawValue = formData[field.name];
    const value = field.type === 'checkbox-group'
      ? (Array.isArray(rawValue) ? rawValue : []) as number[]
      : (rawValue ?? "");
    const error = validationErrors[field.name];
    const hasError = !!error;

    const inputProps = {
      id: field.name,
      name: field.name,
      value: field.type === 'checkbox-group' ? "" : value as string | number,
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

    if (field.type === 'checkbox-group') {
      const selectedIds = value as number[];
      const showCheckboxRequired = (!field.visible || field.visible(formData)) && isRequired;
      return (
        <FormGroup key={field.name} className={`${styles.form_group} ${styles.form_group_label_top}`}>
          <Col lg={4}>
            <Label className={styles.label}>
              {field.label}
              {showCheckboxRequired && <span className={styles.required}> *</span>}
            </Label>
          </Col>
          <Col lg={8}>
            <div className={styles.checkbox_group_field} role="group" aria-label={field.label}>
              {(field.checkboxOptions ?? []).map((opt) => {
                const checked = selectedIds.includes(opt.value);
                return (
                  <label key={opt.value} className={styles.checkbox_row_ref_alimentaire}>
                    <Input
                      type="checkbox"
                      checked={checked}
                      disabled={field.disabled || loading || !!opt.disabled}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const next = e.target.checked
                          ? [...selectedIds, opt.value]
                          : selectedIds.filter((id) => id !== opt.value);
                        handleFieldChange(field.name, next);
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
            {hasError && (
              <div className={styles.errorMessage}>{error}</div>
            )}
          </Col>
        </FormGroup>
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
              rows={field.rows ?? 4}
              {...inputProps}
            />
          ) : (
            <Input
              type={
                field.type === 'password'
                  ? 'password'
                  : field.type === 'custom'
                    ? 'text'
                    : field.type === 'number'
                      ? 'number'
                      : field.type
              }
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
        {errorMessagePlacement === "top" && errorMessage && (
          <p className={styles.errorMessage}>{errorMessage}</p>
        )}
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
          {errorMessagePlacement === "bottom" && errorMessage && (
            <p className={`${styles.errorMessage} ${styles.errorMessageBelowButtons}`} role="alert">
              {errorMessage}
            </p>
          )}
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
