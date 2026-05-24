import StarterKit from "@tiptap/starter-kit";

/** Extensions TipTap pour les CR réunion — à garder identiques lecture / édition. */
export function getReunionTiptapExtensions() {
    return [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
        }),
    ];
}
