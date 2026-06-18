"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

type AppShellProps = {
  children: ReactNode;
};

type NavigationItem = {
  href: string;
  label: string;
  description: string;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/worship",
    label: "Louange",
    description: "Répertoire et consultation des chants",
  },
  {
    href: "/setlist",
    label: "Setlist",
    description: "Préparation des séquences",
  },
  {
    href: "/settings",
    label: "Réglages",
    description: "Notation et préférences",
  },
  {
    href: "/profile",
    label: "Profil",
    description: "Compte et autorisations",
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/worship") {
    return (
      pathname === "/worship" ||
      pathname.startsWith("/chants/") ||
      pathname.startsWith("/admin/chants")
    );
  }

  return pathname === href;
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="app-shell">
      <button
        aria-controls="app-navigation"
        aria-expanded={isOpen}
        className="app-shell__menu-button"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
        <span>{isOpen ? "Fermer" : "Menu"}</span>
      </button>

      <aside
        className={`app-sidebar${isOpen ? " app-sidebar--open" : ""}`}
        id="app-navigation"
      >
        <div className="app-sidebar__header">
          <Link className="app-sidebar__brand" href="/worship">
            <span className="site-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>
              <strong>ChurchERP</strong>
              <small>Équipe louange</small>
            </span>
          </Link>
        </div>

        <nav aria-label="Navigation principale" className="app-sidebar__nav">
          {navigationItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className="app-sidebar__link"
                href={item.href}
                key={item.href}
                onClick={() => setIsOpen(false)}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </Link>
            );
          })}
        </nav>
      </aside>

      {isOpen ? (
        <button
          aria-hidden="true"
          className="app-shell__backdrop"
          onClick={() => setIsOpen(false)}
          tabIndex={-1}
          type="button"
        />
      ) : null}

      <div className="app-shell__content">{children}</div>
    </div>
  );
}
