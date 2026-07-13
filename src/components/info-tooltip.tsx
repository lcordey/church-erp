"use client";

import { useRef } from "react";

type InfoTooltipProps = {
  children: string;
  label?: string;
};

export function InfoTooltip({ children, label = "Plus d’informations" }: InfoTooltipProps) {
  const tooltipRef = useRef<HTMLSpanElement>(null);

  function updatePosition() {
    const tooltip = tooltipRef.current;
    const trigger = tooltip?.querySelector("button");

    if (!tooltip || !trigger) {
      return;
    }

    const { top } = trigger.getBoundingClientRect();
    tooltip.style.setProperty("--info-tooltip-trigger-top", String(top) + "px");
  }

  return (
    <span
      className="info-tooltip"
      onFocus={updatePosition}
      onPointerEnter={updatePosition}
      ref={tooltipRef}
    >
      <button aria-label={label} className="info-tooltip__trigger" type="button">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></svg>
      </button>
      <span className="info-tooltip__content" role="tooltip">{children}</span>
    </span>
  );
}
