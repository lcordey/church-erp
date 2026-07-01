"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { AppHeaderProvider, AppShellHeader } from "./app-header-context";
import { PwaInstallPrompt } from "./pwa-install-prompt";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

type AppShellProps = {
  children: ReactNode;
  isAuthenticated: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  description: string;
  requiresAuthentication?: boolean;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/worship",
    label: "Répertoire",
    description: "Répertoire et consultation des chants",
  },
  {
    href: "/setlist",
    label: "Setlist",
    description: "Préparation des séquences",
  },
  {
    href: "/admin/referentiels",
    label: "Admin",
    description: "Thèmes et labels",
    requiresAuthentication: true,
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

  if (href === "/setlist") {
    return pathname === "/setlist" || pathname.startsWith("/setlist/");
  }

  if (href === "/admin/referentiels") {
    return pathname.startsWith("/admin/referentiels");
  }

  return pathname === href;
}

export function AppShell({ children, isAuthenticated }: AppShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AppHeaderProvider>
      <div className="app-shell">
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
            {navigationItems
              .filter((item) => !item.requiresAuthentication || isAuthenticated)
              .map((item) => {
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

          <div className="app-sidebar__session">
            {isAuthenticated ? (
              <form action="/api/auth/logout" method="post">
                <button type="submit">Se déconnecter</button>
              </form>
            ) : (
              <Link
                href={getLoginHref(pathname)}
                onClick={() => setIsOpen(false)}
              >
                Se connecter
              </Link>
            )}
          </div>
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

        <div className="app-shell__content">
          <AppShellHeader
            isMenuOpen={isOpen}
            onToggleMenu={() => setIsOpen((current) => !current)}
          />
          {children}
          <PwaInstallPrompt />
        </div>
      </div>
    </AppHeaderProvider>
  );
}
