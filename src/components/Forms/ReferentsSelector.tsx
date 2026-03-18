import { FormGroup, Input, Label } from "reactstrap";
import styles from "./Form.module.scss";

export interface EquipePerson {
    tokenId: string;
    nom: string;
    prenom: string;
}

interface ReferentsSelectorProps {
    value: string;
    onChange: (newValue: string) => void;
    equipe: EquipePerson[];
    disabled?: boolean;
    label?: string;
    required?: boolean;
    error?: string;
}

function parseTokenIds(value: string): Set<string> {
    if (!value || value.trim() === "") return new Set();
    try {
        const arr = JSON.parse(value) as string[];
        return new Set(Array.isArray(arr) ? arr : []);
    } catch {
        return new Set();
    }
}

export default function ReferentsSelector({
    value,
    onChange,
    equipe,
    disabled = false,
    label = "Référents",
    required = false,
    error,
}: ReferentsSelectorProps) {
    const selected = parseTokenIds(value);

    const handleToggle = (tokenId: string) => {
        const next = new Set(selected);
        if (next.has(tokenId)) {
            next.delete(tokenId);
        } else {
            next.add(tokenId);
        }
        onChange(JSON.stringify([...next]));
    };

    if (equipe.length === 0) {
        return (
            <FormGroup className={styles.referents_form_group}>
                <div className={styles.referents_content}>
                    <Label className={styles.label}>
                        {label}
                        {required && <span className={styles.required}> *</span>}
                    </Label>
                    <p className="text-muted small mb-0">Aucun membre dans l'équipe. Ajoutez des membres à l'équipe du séjour pour pouvoir les désigner comme référents.</p>
                </div>
            </FormGroup>
        );
    }

    return (
        <FormGroup className={styles.referents_form_group}>
            <div className={styles.referents_content}>
                <div className={styles.referents_row}>
                    <Label className={styles.label}>
                        {label}
                        {required && <span className={styles.required}> *</span>}
                    </Label>
                    <label className={styles.checkbox_label_inline} style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
                        <Input
                            type="checkbox"
                            checked={selected.has(equipe[0].tokenId)}
                            onChange={() => handleToggle(equipe[0].tokenId)}
                            disabled={disabled}
                        />
                        <span>{equipe[0].prenom} {equipe[0].nom}</span>
                    </label>
                </div>
                {equipe.slice(1).map((person) => (
                    <label key={person.tokenId} className={styles.checkbox_label_indent} style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
                        <Input
                            type="checkbox"
                            checked={selected.has(person.tokenId)}
                            onChange={() => handleToggle(person.tokenId)}
                            disabled={disabled}
                        />
                        <span>{person.prenom} {person.nom}</span>
                    </label>
                ))}
                <p className="text-muted small mt-2 mb-0">
                    Sélectionnez les référents du groupe.
                </p>
                {error && (
                    <div className={styles.errorMessage}>{error}</div>
                )}
            </div>
        </FormGroup>
    );
}
