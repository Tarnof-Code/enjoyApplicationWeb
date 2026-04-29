import type { FC, ReactNode } from "react";
import { FaGripVertical } from "react-icons/fa";
import styles from "../../Pages/_Directeur/DetailsSejour/DetailsSejour.module.scss";

export type DetailsSejourAccordionItemProps = {
    id: string;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    containerRef: (el: HTMLDivElement | null) => void;
    children: ReactNode;
    isDragging: boolean;
    isDropTarget: boolean;
    onDragHandleStart: () => void;
    onDragHandleEnd: () => void;
    onItemDragOver: () => void;
    onReorderDrop: (draggedId: string, targetId: string) => void;
};

/** Ligne accordéon avec poignée de glisser-déposer pour réordonner les blocs. */
const DetailsSejourAccordionItem: FC<DetailsSejourAccordionItemProps> = ({
    id,
    title,
    isOpen,
    onToggle,
    containerRef,
    children,
    isDragging,
    isDropTarget,
    onDragHandleStart,
    onDragHandleEnd,
    onItemDragOver,
    onReorderDrop,
}) => {
    const itemClass = [
        styles.accordionItem,
        isDragging ? styles.accordionItemDragging : "",
        isDropTarget ? styles.accordionItemDropTarget : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            ref={containerRef}
            data-accordion-id={id}
            className={itemClass}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                onItemDragOver();
            }}
            onDrop={(e) => {
                e.preventDefault();
                const dragged = e.dataTransfer.getData("text/plain");
                if (dragged) onReorderDrop(dragged, id);
            }}
        >
            <div className={styles.accordionHeaderRow}>
                <div
                    className={styles.dragHandle}
                    aria-label="Glisser pour réorganiser les blocs"
                    title="Réorganiser"
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", id);
                        e.dataTransfer.effectAllowed = "move";
                        onDragHandleStart();
                    }}
                    onDragEnd={onDragHandleEnd}
                >
                    <FaGripVertical aria-hidden size={18} />
                </div>
                <button type="button" className={`${styles.accordionHeader} ${isOpen ? styles.active : ""}`} onClick={onToggle}>
                    {title}
                </button>
            </div>
            {isOpen && <div className={styles.accordionBody}>{children}</div>}
        </div>
    );
};

export default DetailsSejourAccordionItem;
