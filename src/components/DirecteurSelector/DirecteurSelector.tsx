import { useState, useEffect, useDeferredValue } from "react";
import { Input, FormGroup, Label, Col } from "reactstrap";
import { utilisateurService } from "../../services/utilisateur.service";
import styles from "./DirecteurSelector.module.scss";

interface Directeur {
  tokenId: number;
  nom: string;
  prenom: string;
}

interface DirecteurSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

function DirecteurSelector({ 
  value, 
  onChange, 
  error, 
  disabled = false, 
  label = "Directeur",
  required = false 
}: DirecteurSelectorProps) {
  const [directeurs, setDirecteurs] = useState<Directeur[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedDirecteur = directeurs.find(d => d.tokenId.toString() === value) || null;

  const loadDirecteurs = async () => {
    try {
      setLoading(true);
      const response = await utilisateurService.getDirecteurs();
      setDirecteurs(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des directeurs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirecteurs();
  }, []);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  const filteredDirecteurs = deferredSearchTerm.trim() === "" 
    ? directeurs 
    : directeurs.filter(directeur => 
        `${directeur.prenom} ${directeur.nom}`.toLowerCase().includes(deferredSearchTerm.toLowerCase())
      );

 
  useEffect(() => {
    if (selectedDirecteur) {
      const fullName = `${selectedDirecteur.prenom} ${selectedDirecteur.nom}`;
      if (searchTerm !== fullName) {
          setSearchTerm(fullName);
      }
    } else if (!value && searchTerm !== "") {
      setSearchTerm("");
    }
  }, [value, selectedDirecteur]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
    
    if (newSearchTerm === "") {
      onChange("");
    }
  };

  const handleDirecteurSelect = (directeur: Directeur) => {
    setSearchTerm(`${directeur.prenom} ${directeur.nom}`);
    setIsOpen(false);
    onChange(directeur.tokenId.toString());
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleClear = () => {
    setSearchTerm("");
    onChange("");
  };

  return (
    <div className={styles.directeurSelector}>
      <FormGroup className={styles.form_group}>
        <Col lg={4}>
          <Label className={styles.label}>
            {label}
            {required && <span className={styles.required}> *</span>}
          </Label>
        </Col>
        <Col lg={8}>
          <div className={styles.inputContainer}>
            <Input
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Rechercher un directeur..."
              disabled={disabled || loading}
              className={`${styles.searchInput} ${error ? styles.errorInput : ""}`}
            />
            {(searchTerm || value) && !disabled && !loading && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClear}
                aria-label="Supprimer la sélection"
              >
                ✕
              </button>
            )}
            
            {isOpen && (
              <div className={styles.dropdown}>
                {loading ? (
                  <div className={styles.loading}>Chargement...</div>
                ) : filteredDirecteurs.length > 0 ? (
                  filteredDirecteurs.map((directeur) => (
                    <div
                      key={directeur.tokenId}
                      className={`${styles.dropdownItem} ${
                        selectedDirecteur?.tokenId === directeur.tokenId ? styles.selected : ""
                      }`}
                      onClick={() => handleDirecteurSelect(directeur)}
                    >
                      {directeur.prenom} {directeur.nom}
                    </div>
                  ))
                ) : (
                  <div className={styles.noResults}>
                    Aucun directeur trouvé
                  </div>
                )}
              </div>
            )}
          </div>
          
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </Col>
      </FormGroup>
    </div>
  );
}

export default DirecteurSelector;
