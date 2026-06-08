import { useEffect, useRef, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import {
  centrerFocusPhoto,
  calculerMetaRecadragePhoto,
  contraindreFocusPhoto,
  exporterPhotoProfilRecadree,
  peutDeplacerPhoto,
  type PhotoFocus,
  type PhotoPanMeta,
} from "../../helpers/photoProfilRecadrage";
import styles from "./PhotoProfilRecadrageModal.module.scss";

interface PhotoProfilRecadrageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
  saving?: boolean;
}

export function PhotoProfilRecadrageModal({
  isOpen,
  imageUrl,
  onClose,
  onSave,
  saving = false,
}: PhotoProfilRecadrageModalProps) {
  const [focus, setFocus] = useState<PhotoFocus>({ x: 50, y: 50 });
  const [peutDeplacer, setPeutDeplacer] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const metaRef = useRef<PhotoPanMeta | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originFocus: PhotoFocus;
  } | null>(null);

  const initialiserRecadrage = (recentrer = true) => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image || !image.naturalWidth || !image.naturalHeight) return false;

    const viewportSize = viewport.clientWidth;
    if (!viewportSize) return false;

    const meta = calculerMetaRecadragePhoto(
      image.naturalWidth,
      image.naturalHeight,
      viewportSize
    );
    if (!meta) return false;

    metaRef.current = meta;
    setPeutDeplacer(peutDeplacerPhoto(meta));

    if (recentrer) {
      setFocus(centrerFocusPhoto());
    }

    return true;
  };

  useEffect(() => {
    if (!isOpen || !imageUrl) {
      metaRef.current = null;
      setPeutDeplacer(false);
      setFocus(centrerFocusPhoto());
      setErrorMessage(null);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      initialiserRecadrage();
    });

    return () => cancelAnimationFrame(frameId);
  }, [isOpen, imageUrl]);

  const handleImageLoad = () => {
    initialiserRecadrage();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageUrl || saving) return;
    if (!metaRef.current) {
      initialiserRecadrage();
    }
    const meta = metaRef.current;
    if (!meta || !peutDeplacerPhoto(meta)) return;

    event.preventDefault();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originFocus: focus,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    const meta = metaRef.current;
    if (!dragState || !meta || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    setFocus(
      contraindreFocusPhoto(
        {
          x:
            meta.overflowX > 0
              ? dragState.originFocus.x + (deltaX / meta.overflowX) * 100
              : dragState.originFocus.x,
          y:
            meta.overflowY > 0
              ? dragState.originFocus.y + (deltaY / meta.overflowY) * 100
              : dragState.originFocus.y,
        },
        meta
      )
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    const meta = metaRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (meta) {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      setFocus(
        contraindreFocusPhoto(
          {
            x:
              meta.overflowX > 0
                ? dragState.originFocus.x + (deltaX / meta.overflowX) * 100
                : dragState.originFocus.x,
            y:
              meta.overflowY > 0
                ? dragState.originFocus.y + (deltaY / meta.overflowY) * 100
                : dragState.originFocus.y,
          },
          meta
        )
      );
    }

    dragStateRef.current = null;
    setDragging(false);
  };

  const handleSave = async () => {
    const meta = metaRef.current;
    if (!imageUrl || !meta) return;

    setErrorMessage(null);
    try {
      const blob = await exporterPhotoProfilRecadree(imageUrl, focus, meta);
      const file = new File([blob], "photo-profil.jpg", { type: "image/jpeg" });
      await onSave(file);
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim() !== ""
          ? error.message
          : "Impossible d'enregistrer le cadrage";
      setErrorMessage(message);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={() => !saving && onClose()}>
      <ModalHeader toggle={() => !saving && onClose()}>Recadrer la photo</ModalHeader>
      <ModalBody>
        <div className={styles.recadrageBody}>
          <div
            ref={viewportRef}
            className={`${styles.viewport} ${dragging ? styles.viewportDragging : ""}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {imageUrl ? (
              <img
                key={imageUrl}
                ref={imageRef}
                src={imageUrl}
                alt=""
                aria-hidden
                className={styles.image}
                style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
                onLoad={handleImageLoad}
                draggable={false}
              />
            ) : null}
          </div>
          <p className={styles.hint}>
            {peutDeplacer
              ? "Glissez la photo pour la repositionner dans le cercle."
              : "La photo remplit déjà le cercle. Vous pouvez l'enregistrer telle quelle."}
          </p>
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button color="primary" onClick={handleSave} disabled={saving || !imageUrl}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
