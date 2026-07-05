type ReorderItemActionsProps = {
  downLabel: string;
  isDownDisabled: boolean;
  isUpDisabled: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  upLabel: string;
};

export function ReorderItemActions({
  downLabel,
  isDownDisabled,
  isUpDisabled,
  onMoveDown,
  onMoveUp,
  onRemove,
  removeLabel,
  upLabel,
}: ReorderItemActionsProps) {
  return (
    <div className="reorderable-item__actions">
      <button
        aria-label={upLabel}
        className="reorderable-item__action"
        disabled={isUpDisabled}
        onClick={onMoveUp}
        type="button"
      >
        <span aria-hidden="true">↑</span>
      </button>
      <button
        aria-label={downLabel}
        className="reorderable-item__action"
        disabled={isDownDisabled}
        onClick={onMoveDown}
        type="button"
      >
        <span aria-hidden="true">↓</span>
      </button>
      {onRemove && removeLabel ? (
        <button
          aria-label={removeLabel}
          className="reorderable-item__action reorderable-item__action--remove"
          onClick={onRemove}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}
