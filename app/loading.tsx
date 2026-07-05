import { PageTransitionStatus } from "@/src/components/page-transition-status";

export default function Loading() {
  return (
    <PageTransitionStatus
      detail="La page va s’afficher dans un instant."
      isVisible
      label="Ouverture…"
    />
  );
}
