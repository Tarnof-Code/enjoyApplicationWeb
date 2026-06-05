/** Variable CSS globale : hauteur du header fixe (mesurée en JS). */
export const SITE_HEADER_HEIGHT_VAR = "--site-header-height";

const SITE_HEADER_HEIGHT_FALLBACK = "4.5rem";

export function applySiteHeaderHeight(heightPx: number): void {
  document.documentElement.style.setProperty(
    SITE_HEADER_HEIGHT_VAR,
    heightPx > 0 ? `${Math.floor(heightPx)}px` : SITE_HEADER_HEIGHT_FALLBACK,
  );
}

export function clearSiteHeaderHeight(): void {
  document.documentElement.style.removeProperty(SITE_HEADER_HEIGHT_VAR);
}

/** Met à jour `--site-header-height` quand le header change de taille (resize, menu burger, retour à la ligne). */
export function observeSiteHeaderHeight(element: HTMLElement): () => void {
  let rafId: number | null = null;

  const apply = () => {
    applySiteHeaderHeight(element.getBoundingClientRect().height);
  };

  const scheduleApply = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      apply();
    });
  };

  scheduleApply();

  const resizeObserver = new ResizeObserver(scheduleApply);
  resizeObserver.observe(element);
  window.addEventListener("resize", scheduleApply);

  return () => {
    resizeObserver.disconnect();
    window.removeEventListener("resize", scheduleApply);
    if (rafId !== null) cancelAnimationFrame(rafId);
    clearSiteHeaderHeight();
  };
}
