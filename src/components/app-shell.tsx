"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { AppHeaderProvider, AppShellHeader } from "./app-header-context";
import { PwaInstallBanner } from "./pwa-install-banner";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";
import type { AuthenticatedActor, Permission } from "@/src/modules/identity/types/identity";

type AppShellProps = {
  children: ReactNode;
  actor: AuthenticatedActor | null;
};

type NavigationItem = {
  href: string;
  label: string;
  description: string;
  requiredPermission?: Permission;
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
    href: "/events",
    label: "Événements",
    description: "Agenda et équipes de service",
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Comptes et référentiels",
    requiredPermission: "user.manage",
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

  if (href === "/events") {
    return pathname === "/events" || pathname.startsWith("/events/");
  }

  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }

  return pathname === href;
}

export function AppShell({ children, actor }: AppShellProps) {
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
              .filter(
                (item) =>
                  !item.requiredPermission ||
                  actor?.permissions.includes(item.requiredPermission),
              )
              .map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className="app-sidebar__link"
                    href={item.href}
                    key={item.href}
                    onNavigate={() => setIsOpen(false)}
                  >
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </Link>
                );
              })}
          </nav>

          <div className="app-sidebar__session">
            {actor ? (
              <form action="/api/auth/logout" method="post">
                {actor.mustChangePassword ? (
                  <Link href="/password-change">Changer le mot de passe</Link>
                ) : null}
                <button type="submit">Se déconnecter</button>
              </form>
            ) : (
              <Link
                href={getLoginHref(pathname)}
                onNavigate={() => setIsOpen(false)}
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
          <PwaInstallBanner />
        </div>
      </div>
    </AppHeaderProvider>
  );
}
