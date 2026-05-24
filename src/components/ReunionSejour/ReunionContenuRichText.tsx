import type { FC } from "react";
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Content } from "@tiptap/core";
import type { ReunionContenuTipTapJson } from "../../types/api";
import { getReunionTiptapExtensions } from "../../helpers/reunionTiptapExtensions";
import reunionStyles from "./SectionReunionsSejour.module.scss";

const DOC_VIDE: Content = { type: "doc", content: [{ type: "paragraph" }] };

/** Affichage ou édition d’un corps TipTap (mêmes extensions StarterKit que le formulaire). */
export const ReunionContenuRichText: FC<{
    value?: Content | ReunionContenuTipTapJson | null;
    editable: boolean;
    className?: string;
}> = ({ value, editable, className }) => {
    const initial: Content =
        typeof value === "object" && value !== null && "type" in value ? (value as Content) : DOC_VIDE;

    const editor = useEditor({
        extensions: getReunionTiptapExtensions(),
        editable,
        content: initial,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: reunionStyles.proseMirrorRoot,
                ...(editable ? { "aria-label": "Contenu du compte rendu" } : {}),
            },
        },
    });

    useEffect(() => {
        if (!editor) return;
        if (typeof value === "object" && value !== null && "type" in value) {
            editor.commands.setContent(value as Content, false);
        }
    }, [editor, value]);

    if (!editor) return null;

    return (
        <div
            className={[
                reunionStyles.richOuter,
                editable ? reunionStyles.editing : reunionStyles.reading,
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <EditorContent editor={editor} />
        </div>
    );
};
