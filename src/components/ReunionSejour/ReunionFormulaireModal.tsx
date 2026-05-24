import type { FC } from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, Content } from "@tiptap/core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBold,
    faItalic,
    faListOl,
    faListUl,
    faRedo,
    faUndo,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import type { ReunionDto, SaveReunionRequest } from "../../types/api";
import { getReunionTiptapExtensions } from "../../helpers/reunionTiptapExtensions";
import { sejourReunionService } from "../../services/sejour-reunion.service";
import reunionStyles from "./SectionReunionsSejour.module.scss";

/** Valeur utilisée dans `<textarea controlled>` ; tolère des réponses API mal typées au runtime. */
function chainePourChampOrdreDuJour(raw: unknown): string {
    if (raw === null || raw === undefined) return "";
    if (typeof raw === "string") return raw;
    if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
    return "";
}

export type ReunionFormulaireModalProps = {
    isOpen: boolean;
    toggle: () => void;
    sejourId: number;
    /** null = création */
    reunion: ReunionDto | null;
    onSaved: () => void;
    modalKey: number;
};

/** Création / édition : un TipTap avec barre minimale (`getJSON` pour le payload API). */
type ReunionFormulaireModalInterneProps = Omit<ReunionFormulaireModalProps, "isOpen" | "modalKey" | "onSaved"> & {
    /** Après succès API : rafraîchissement, fermeture du formulaire, ouverture de la modale de confirmation (assurée par le parent). */
    apresSuccesServeur: () => void;
};

const ReunionFormulaireModalInterne: FC<ReunionFormulaireModalInterneProps> = ({
    toggle,
    sejourId,
    reunion,
    apresSuccesServeur,
}) => {
    const idBase = useId();
    const idDate = `${idBase}-reunion-date`;
    const idOdj = `${idBase}-reunion-odj`;

    const [dateStr, setDateStr] = useState(() => reunion?.date ?? format(new Date(), "yyyy-MM-dd"));
    const [ordreDuJour, setOrdreDuJour] = useState(() => chainePourChampOrdreDuJour(reunion?.ordreDuJour));
    const [formulaireErreur, setFormulaireErreur] = useState<string | null>(null);
    const [soumission, setSoumission] = useState(false);
    /** Pendant le focus sur date / ordre du jour : ProseMirror inactif sinon il capte clic & saisie. */
    const [focusSurChampsNatifs, setFocusSurChampsNatifs] = useState(false);
    const retardFinFocusNatifs = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const editorRef = useRef<Editor | null>(null);

    const DOCUMENT_PAR_DEFAUT: Content = {
        type: "doc",
        content: [{ type: "paragraph" }],
    };

    const initialContenu: Content =
        reunion?.contenu !== undefined &&
        reunion.contenu !== null &&
        typeof reunion.contenu === "object"
            ? (reunion.contenu as Content)
            : DOCUMENT_PAR_DEFAUT;

    const editor = useEditor({
        extensions: getReunionTiptapExtensions(),
        editable: true,
        content: initialContenu,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: reunionStyles.proseMirrorRootEditing,
                "aria-label": "Contenu du compte rendu",
            },
        },
        onCreate: ({ editor: ed }) => {
            editorRef.current = ed;
        },
        onDestroy: () => {
            editorRef.current = null;
        },
        onTransaction: ({ editor: ed }) => {
            editorRef.current = ed;
        },
        onBlur: ({ editor: ed }) => {
            editorRef.current = ed;
        },
    });

    useLayoutEffect(() => {
        editor?.setEditable(!focusSurChampsNatifs);
    }, [editor, focusSurChampsNatifs]);

    const activerFocusChampNatif = useCallback(() => {
        if (retardFinFocusNatifs.current !== undefined) {
            clearTimeout(retardFinFocusNatifs.current);
            retardFinFocusNatifs.current = undefined;
        }
        setFocusSurChampsNatifs(true);
    }, []);

    const relacherFocusChampNatifAuFocusEditeur = useCallback(() => {
        if (retardFinFocusNatifs.current !== undefined) {
            clearTimeout(retardFinFocusNatifs.current);
            retardFinFocusNatifs.current = undefined;
        }
        setFocusSurChampsNatifs(false);
    }, []);

    const planifierFinFocusNatif = useCallback(() => {
        if (retardFinFocusNatifs.current !== undefined) clearTimeout(retardFinFocusNatifs.current);
        retardFinFocusNatifs.current = setTimeout(() => {
            retardFinFocusNatifs.current = undefined;
            setFocusSurChampsNatifs(false);
        }, 150);
    }, []);

    useEffect(
        () => () => {
            if (retardFinFocusNatifs.current !== undefined) clearTimeout(retardFinFocusNatifs.current);
            editor?.setEditable(true);
        },
        [editor],
    );

    const confirmeFerme = () => {
        if (retardFinFocusNatifs.current !== undefined) {
            clearTimeout(retardFinFocusNatifs.current);
            retardFinFocusNatifs.current = undefined;
        }
        setFocusSurChampsNatifs(false);
        setFormulaireErreur(null);
        setSoumission(false);
        toggle();
    };

    const soumettre = useCallback(async () => {
        setFormulaireErreur(null);
        if (retardFinFocusNatifs.current !== undefined) {
            clearTimeout(retardFinFocusNatifs.current);
            retardFinFocusNatifs.current = undefined;
        }
        setFocusSurChampsNatifs(false);
        if (!dateStr?.trim()) {
            setFormulaireErreur("La date est obligatoire.");
            return;
        }

        const ed = editor ?? editorRef.current;
        if (!ed) {
            setFormulaireErreur("L’éditeur n’est pas prêt.");
            return;
        }

        if (ed.isEmpty) {
            setFormulaireErreur("Le contenu du compte rendu ne peut pas être vide.");
            return;
        }

        const ojTrim = ordreDuJour.trim();
        const body: SaveReunionRequest = {
            date: dateStr.trim(),
            ordreDuJour: ojTrim ? ojTrim.slice(0, 500) : null,
            contenu: ed.getJSON() as SaveReunionRequest["contenu"],
        };

        setSoumission(true);
        try {
            if (reunion) {
                await sejourReunionService.modifierReunion(sejourId, reunion.id, body);
            } else {
                await sejourReunionService.creerReunion(sejourId, body);
            }
            setFormulaireErreur(null);
            apresSuccesServeur();
        } catch (e: unknown) {
            setFormulaireErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
        } finally {
            setSoumission(false);
        }
    }, [dateStr, ordreDuJour, editor, reunion, sejourId, apresSuccesServeur]);

    return (
        <>
            <ModalHeader toggle={confirmeFerme}>
                {reunion ? "Modifier le compte rendu" : "Nouveau compte rendu"}
            </ModalHeader>
            <ModalBody>
                {formulaireErreur ? (
                    <p className="text-danger mb-3" role="alert">
                        {formulaireErreur}
                    </p>
                ) : null}
                <div className={reunionStyles.reunionModalChampsHaut}>
                    <div className="mb-3">
                        <label htmlFor={idDate} className="form-label">
                            Date <span className="text-danger">*</span>
                        </label>
                        <input
                            id={idDate}
                            type="date"
                            className={`form-control form-control-sm ${reunionStyles.reunionModalChampDate}`}
                            value={dateStr}
                            onChange={(e) => setDateStr(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onFocus={activerFocusChampNatif}
                            onBlur={planifierFinFocusNatif}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor={idOdj} className="form-label">
                            Ordre du jour{" "}
                            <span className="text-muted small">(facultatif, max. 500 caractères)</span>
                        </label>
                        <textarea
                            id={idOdj}
                            name="reunionOrdreDuJour"
                            className={`form-control ${reunionStyles.reunionOrdreDuJourTextarea}`}
                            rows={1}
                            maxLength={500}
                            spellCheck={true}
                            autoComplete="off"
                            value={ordreDuJour}
                            onChange={(e) => setOrdreDuJour(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onFocus={activerFocusChampNatif}
                            onBlur={planifierFinFocusNatif}
                        />
                    </div>
                </div>
                <div
                    className={`${reunionStyles.reunionModalBlocEditeur} ${reunionStyles.formEditorBlock}`}
                    onPointerDownCapture={relacherFocusChampNatifAuFocusEditeur}
                >
                    <span className="form-label d-block mb-2">
                        Compte rendu <span className="text-danger">*</span>
                    </span>
                    {editor ? (
                        <div className={reunionStyles.toolbar}>
                            <Button
                                type="button"
                                color="light"
                                size="sm"
                                className={reunionStyles.toolbarBtn}
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                active={editor.isActive("bold")}
                                aria-pressed={editor.isActive("bold")}
                                title="Gras"
                            >
                                <FontAwesomeIcon icon={faBold} />
                            </Button>
                            <Button
                                type="button"
                                color="light"
                                size="sm"
                                className={reunionStyles.toolbarBtn}
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                active={editor.isActive("italic")}
                                aria-pressed={editor.isActive("italic")}
                                title="Italique"
                            >
                                <FontAwesomeIcon icon={faItalic} />
                            </Button>
                            <Button
                                type="button"
                                color="light"
                                size="sm"
                                className={reunionStyles.toolbarBtn}
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                active={editor.isActive("bulletList")}
                                aria-pressed={editor.isActive("bulletList")}
                                title="Liste à puces"
                            >
                                <FontAwesomeIcon icon={faListUl} />
                            </Button>
                            <Button
                                type="button"
                                color="light"
                                size="sm"
                                className={reunionStyles.toolbarBtn}
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                active={editor.isActive("orderedList")}
                                aria-pressed={editor.isActive("orderedList")}
                                title="Liste numérotée"
                            >
                                <FontAwesomeIcon icon={faListOl} />
                            </Button>
                            <Button
                                type="button"
                                color="light"
                                size="sm"
                                className={reunionStyles.toolbarBtn}
                                onClick={() => editor.chain().focus().undo().run()}
                                disabled={!editor.can().undo()}
                                title="Annuler"
                            >
                                <FontAwesomeIcon icon={faUndo} />
                            </Button>
                            <Button
                                type="button"
                                color="light"
                                size="sm"
                                className={reunionStyles.toolbarBtn}
                                onClick={() => editor.chain().focus().redo().run()}
                                disabled={!editor.can().redo()}
                                title="Refaire"
                            >
                                <FontAwesomeIcon icon={faRedo} />
                            </Button>
                        </div>
                    ) : null}
                    <div className={`${reunionStyles.richOuter} ${reunionStyles.editing}`}>
                        {editor ? <EditorContent editor={editor} /> : null}
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" outline onClick={confirmeFerme} disabled={soumission}>
                    Annuler
                </Button>
                <Button color="primary" onClick={soumettre} disabled={soumission}>
                    {soumission ? "Enregistrement…" : "Enregistrer"}
                </Button>
            </ModalFooter>
        </>
    );
};

export const ReunionFormulaireModal: FC<ReunionFormulaireModalProps> = ({
    isOpen,
    toggle,
    sejourId,
    reunion,
    onSaved,
    modalKey,
}) => {
    const [succesEnregistrementOuvert, setSuccesEnregistrementOuvert] = useState(false);
    const [messageSucces, setMessageSucces] = useState("");

    const fermerSuccesEnregistrement = useCallback(() => {
        setSuccesEnregistrementOuvert(false);
    }, []);

    /** Réouverture du formulaire : retirer toute fenêtre succès résiduelle. */
    useEffect(() => {
        if (isOpen) setSuccesEnregistrementOuvert(false);
    }, [isOpen]);

    const apresSuccesServeur = useCallback(() => {
        const texteSucces =
            reunion == null
                ? "Le compte rendu a bien été enregistré."
                : "Le compte rendu a bien été mis à jour.";
        onSaved();
        setMessageSucces(texteSucces);
        toggle();
        setSuccesEnregistrementOuvert(true);
    }, [onSaved, reunion, toggle]);

    return (
        <>
            <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
                {isOpen ? (
                    <ReunionFormulaireModalInterne
                        key={`${modalKey}-${reunion?.id ?? "nouveau"}`}
                        toggle={toggle}
                        sejourId={sejourId}
                        reunion={reunion}
                        apresSuccesServeur={apresSuccesServeur}
                    />
                ) : null}
            </Modal>

            <Modal isOpen={succesEnregistrementOuvert} toggle={fermerSuccesEnregistrement} zIndex={1060} centered>
                <ModalHeader toggle={fermerSuccesEnregistrement}>Compte rendu enregistré</ModalHeader>
                <ModalBody>
                    <p className="mb-0">{messageSucces}</p>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={fermerSuccesEnregistrement}>
                        OK
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};
