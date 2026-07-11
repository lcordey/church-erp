"use client";

import { useState, useTransition } from "react";

import type { AdminUserSummary, GroupCode } from "../types/identity";

type UserAdminProps = { actorId: string; initialUsers: AdminUserSummary[] };
type FormState = {
  id?: string;
  username: string;
  displayName: string;
  temporaryPassword: string;
  status: "active" | "disabled";
  groupCodes: GroupCode[];
};
type PasswordResetState = {
  user: AdminUserSummary;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
};

const emptyForm: FormState = {
  username: "",
  displayName: "",
  temporaryPassword: "",
  status: "active",
  groupCodes: ["worship"],
};

function errorMessage(payload: unknown) {
  const value = payload as { error?: { message?: string; fields?: Record<string, string> } };
  return Object.values(value.error?.fields ?? {})[0] ?? value.error?.message ?? "Impossible d’enregistrer le compte.";
}

export function UserAdmin({ actorId, initialUsers }: UserAdminProps) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState<FormState | null>(null);
  const [message, setMessage] = useState("");
  const [passwordReset, setPasswordReset] = useState<PasswordResetState | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleGroup(groupCode: GroupCode) {
    setForm((current) => current ? {
      ...current,
      groupCodes: current.groupCodes.includes(groupCode)
        ? current.groupCodes.filter((code) => code !== groupCode)
        : [...current.groupCodes, groupCode],
    } : current);
  }

  async function save() {
    if (!form) return;
    setMessage("");
    const response = await fetch(form.id ? `/api/admin/users/${form.id}` : "/api/admin/users", {
      method: form.id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form.id ? {
        username: form.username,
        displayName: form.displayName,
        status: form.status,
        groupCodes: form.groupCodes,
      } : {
        username: form.username,
        displayName: form.displayName,
        temporaryPassword: form.temporaryPassword,
        groupCodes: form.groupCodes,
      }),
    });
    const payload = await response.json().catch(() => null) as { data?: AdminUserSummary } | null;
    if (!response.ok || !payload?.data) {
      setMessage(errorMessage(payload));
      return;
    }
    setUsers((current) => form.id
      ? current.map((user) => user.id === payload.data?.id ? payload.data : user)
      : [...current, payload.data!].sort((a, b) => a.displayName.localeCompare(b.displayName, "fr")));
    setForm(null);
  }

  async function resetPassword() {
    if (!passwordReset) return;
    setMessage("");
    const response = await fetch(`/api/admin/users/${passwordReset.user.id}/password-reset`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        temporaryPassword: passwordReset.temporaryPassword,
        confirmTemporaryPassword: passwordReset.confirmTemporaryPassword,
      }),
    });
    if (!response.ok) {
      setMessage(errorMessage(await response.json().catch(() => null)));
      return;
    }
    setUsers((current) => current.map((item) => item.id === passwordReset.user.id ? { ...item, mustChangePassword: true } : item));
    setPasswordReset(null);
    setMessage("Le mot de passe temporaire a été enregistré.");
  }

  return (
    <div className="identity-admin">
      <div className="identity-admin__toolbar">
        <button className="admin-button admin-button--primary" onClick={() => { setMessage(""); setForm(emptyForm); }} type="button">Créer un compte</button>
      </div>
      {message ? <p className="form-message">{message}</p> : null}
      <div className="identity-user-list">
        {users.map((user) => (
          <article className="identity-user-card" key={user.id}>
            <div><strong>{user.displayName}</strong><span>@{user.username}</span></div>
            <div className="identity-user-card__badges">
              {user.groupCodes.map((code) => <span key={code}>{code === "admin" ? "Admin" : "Louange"}</span>)}
              {user.status === "disabled" ? <span>Compte désactivé</span> : null}
              {user.mustChangePassword ? <span>Mot de passe temporaire</span> : null}
            </div>
            <div className="identity-user-card__actions">
              <button className="admin-button" onClick={() => setForm({ ...user, temporaryPassword: "" })} type="button">Modifier</button>
              <button className="admin-button" disabled={user.id === actorId || isPending} onClick={() => { setMessage(""); setPasswordReset({ user, temporaryPassword: "", confirmTemporaryPassword: "" }); }} type="button">Réinitialiser le mot de passe</button>
            </div>
          </article>
        ))}
      </div>
      {form ? (
        <div aria-modal="true" className="app-dialog-backdrop" role="dialog">
          <form className="app-dialog identity-user-form" onSubmit={(event) => { event.preventDefault(); startTransition(() => { void save(); }); }}>
            <div className="app-dialog__header"><div><p className="eyebrow">Compte</p><h2>{form.id ? "Modifier le compte" : "Créer un compte"}</h2></div><button aria-label="Fermer" className="icon-button" onClick={() => setForm(null)} type="button">×</button></div>
            <label><span>Nom affiché</span><input maxLength={100} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required value={form.displayName} /></label>
            <label><span>Identifiant</span><input autoCapitalize="none" maxLength={50} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })} required value={form.username} /></label>
            {!form.id ? <label><span>Mot de passe temporaire</span><input minLength={8} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} required type="password" value={form.temporaryPassword} /></label> : null}
            <fieldset><legend>Groupes</legend>{(["worship", "admin"] as const).map((code) => <label className="checkbox-row" key={code}><input checked={form.groupCodes.includes(code)} onChange={() => toggleGroup(code)} type="checkbox" /><span>{code === "admin" ? "Admin" : "Louange"}</span></label>)}</fieldset>
            {form.id ? <label className="checkbox-row"><input checked={form.status === "active"} disabled={form.id === actorId} onChange={(event) => setForm({ ...form, status: event.target.checked ? "active" : "disabled" })} type="checkbox" /><span>Compte actif</span></label> : null}
            {message ? <p className="form-message form-message--error">{message}</p> : null}
            <div className="admin-form__actions"><button className="admin-button" onClick={() => setForm(null)} type="button">Annuler</button><button className="admin-button admin-button--primary" disabled={isPending} type="submit">Enregistrer</button></div>
          </form>
        </div>
      ) : null}
      {passwordReset ? (
        <div aria-modal="true" className="app-dialog-backdrop" role="dialog">
          <form className="app-dialog identity-user-form" onSubmit={(event) => { event.preventDefault(); startTransition(() => { void resetPassword(); }); }}>
            <div className="app-dialog__header">
              <div><p className="eyebrow">Sécurité</p><h2>Réinitialiser le mot de passe</h2></div>
              <button aria-label="Fermer" className="icon-button" onClick={() => setPasswordReset(null)} type="button">×</button>
            </div>
            <p>Définissez un mot de passe temporaire pour {passwordReset.user.displayName}. La personne devra le remplacer à sa prochaine connexion.</p>
            <label><span>Mot de passe temporaire</span><input autoComplete="new-password" maxLength={128} minLength={8} onChange={(event) => setPasswordReset({ ...passwordReset, temporaryPassword: event.target.value })} required type="password" value={passwordReset.temporaryPassword} /></label>
            <label><span>Confirmer le mot de passe temporaire</span><input autoComplete="new-password" maxLength={128} minLength={8} onChange={(event) => setPasswordReset({ ...passwordReset, confirmTemporaryPassword: event.target.value })} required type="password" value={passwordReset.confirmTemporaryPassword} /></label>
            {message ? <p className="form-message form-message--error">{message}</p> : null}
            <div className="admin-form__actions"><button className="admin-button" onClick={() => setPasswordReset(null)} type="button">Annuler</button><button className="admin-button admin-button--primary" disabled={isPending} type="submit">Réinitialiser</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
