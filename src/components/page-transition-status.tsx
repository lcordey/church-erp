type PageTransitionStatusProps = {
  detail?: string;
  isVisible: boolean;
  label: string;
};

export function PageTransitionStatus({
  detail,
  isVisible,
  label,
}: PageTransitionStatusProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="page-transition-status"
      role="status"
    >
      <span
        aria-hidden="true"
        className="catalog-loading__spinner page-transition-status__spinner"
      />
      <div>
        <strong>{label}</strong>
        {detail ? <p>{detail}</p> : null}
      </div>
    </div>
  );
}
