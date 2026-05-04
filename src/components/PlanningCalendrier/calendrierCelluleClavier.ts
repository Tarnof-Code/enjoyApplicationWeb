import type React from "react";

/** Déclenché uniquement pour Entrée ou Espace (accessibilité des cases ajout planning). */
export function declencherActionCalendrierClavier<E extends { preventDefault(): void }>(
    event: E,
    key: string | undefined,
    action: () => void,
): boolean {
    if (key === "Enter" || key === " ") {
        event.preventDefault();
        action();
        return true;
    }
    return false;
}

type ProprietesTdAjoutPlanning = Partial<
    Pick<
        React.ComponentPropsWithoutRef<"td">,
        "role" | "tabIndex" | "aria-label" | "onClick" | "onKeyDown"
    >
>;

/** Attributs `td` lorsque la case vide est cliquable (aligné ListeActivités / menus). */
export function proprietesTdAjoutPlanning(
    peutAjouterIci: boolean,
    ariaLabelAjout: string,
    ouvrir: () => void,
): ProprietesTdAjoutPlanning {
    return peutAjouterIci
        ? {
              role: "button",
              tabIndex: 0,
              "aria-label": ariaLabelAjout,
              onClick: ouvrir,
              onKeyDown: (e: React.KeyboardEvent<HTMLTableCellElement>) => {
                  declencherActionCalendrierClavier(e, e.key, ouvrir);
              },
          }
        : {};
}