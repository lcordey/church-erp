type SongNavigationActionsProps = {
  nextDisabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  position: number;
  previousDisabled: boolean;
  total: number;
};

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function SongNavigationActions({
  nextDisabled,
  onNext,
  onPrevious,
  position,
  previousDisabled,
  total,
}: SongNavigationActionsProps) {
  return (
    <>
      <span className="song-navigation__count">
        {position} / {total}
      </span>
      <button
        aria-label="Chant précédent"
        className="icon-button"
        disabled={previousDisabled}
        onClick={onPrevious}
        type="button"
      >
        <ArrowLeftIcon />
      </button>
      <button
        aria-label="Chant suivant"
        className="icon-button icon-button--primary"
        disabled={nextDisabled}
        onClick={onNext}
        type="button"
      >
        <ArrowRightIcon />
      </button>
    </>
  );
}
