"use client";

import { useState, useTransition } from "react";

import type {
  SongTaxonomies,
  SongTaxonomyItem,
} from "../types/song-taxonomy";

type SongTaxonomyAdminProps = {
  initialTaxonomies: SongTaxonomies;
};

type TaxonomyListProps = {
  items: SongTaxonomyItem[];
  kind: "themes" | "labels";
  title: string;
  description: string;
  onCreate: (kind: "themes" | "labels", name: string) => Promise<void>;
  onDelete: (
    kind: "themes" | "labels",
    item: SongTaxonomyItem,
  ) => Promise<void>;
  onRename: (
    kind: "themes" | "labels",
    item: SongTaxonomyItem,
    name: string,
  ) => Promise<void>;
};

type ApiPayload = {
  data?: SongTaxonomyItem;
  error?: { message?: string };
};

function TaxonomyList({
  items,
  kind,
  title,
  description,
  onCreate,
  onDelete,
  onRename,
}: TaxonomyListProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <section className="taxonomy-panel">
      <div className="taxonomy-panel__heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span>{items.length}</span>
      </div>

      <form
        className="taxonomy-create"
        onSubmit={(event) => {
          event.preventDefault();
          const name = newName.trim();

          if (!name) {
            return;
          }

          startTransition(async () => {
            await onCreate(kind, name);
            setNewName("");
          });
        }}
      >
        <label className="sr-only" htmlFor={`new-${kind}`}>
          Nouveau nom
        </label>
        <input
          disabled={isPending}
          id={`new-${kind}`}
          maxLength={80}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={kind === "themes" ? "Nouveau thème" : "Nouveau label"}
          value={newName}
        />
        <button
          className="admin-button admin-button--primary"
          disabled={isPending || !newName.trim()}
        >
          Ajouter
        </button>
      </form>

      {items.length > 0 ? (
        <ul className="taxonomy-list">
          {items.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                <form
                  className="taxonomy-list__edit"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = editingName.trim();

                    if (!name) {
                      return;
                    }

                    startTransition(async () => {
                      await onRename(kind, item, name);
                      setEditingId(null);
                    });
                  }}
                >
                  <input
                    autoFocus
                    disabled={isPending}
                    maxLength={80}
                    onChange={(event) => setEditingName(event.target.value)}
                    value={editingName}
                  />
                  <button disabled={isPending} type="submit">
                    Enregistrer
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => setEditingId(null)}
                    type="button"
                  >
                    Annuler
                  </button>
                </form>
              ) : (
                <>
                  <span>{item.name}</span>
                  <div>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingName(item.name);
                      }}
                      type="button"
                    >
                      Renommer
                    </button>
                    <button
                      className="taxonomy-list__delete"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Supprimer « ${item.name} » ? Ses associations aux chants seront retirées.`,
                          )
                        ) {
                          startTransition(() => onDelete(kind, item));
                        }
                      }}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="taxonomy-panel__empty">Aucun élément dans cette liste.</p>
      )}
    </section>
  );
}

export function SongTaxonomyAdmin({
  initialTaxonomies,
}: SongTaxonomyAdminProps) {
  const [taxonomies, setTaxonomies] = useState(initialTaxonomies);
  const [message, setMessage] = useState("");

  async function createItem(kind: "themes" | "labels", name: string) {
    setMessage("");
    const response = await fetch("/api/admin/song-taxonomies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, name }),
    });
    const payload = (await response.json().catch(() => null)) as ApiPayload | null;

    if (!response.ok || !payload?.data) {
      setMessage(payload?.error?.message ?? "Impossible d’ajouter cet élément.");
      return;
    }

    setTaxonomies((current) => ({
      ...current,
      [kind]: [...current[kind], payload.data as SongTaxonomyItem].sort(
        (left, right) => left.name.localeCompare(right.name, "fr"),
      ),
    }));
  }

  async function renameItem(
    kind: "themes" | "labels",
    item: SongTaxonomyItem,
    name: string,
  ) {
    setMessage("");
    const response = await fetch(
      `/api/admin/song-taxonomies/${kind}/${item.id}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      },
    );
    const payload = (await response.json().catch(() => null)) as ApiPayload | null;

    if (!response.ok || !payload?.data) {
      setMessage(payload?.error?.message ?? "Impossible de renommer cet élément.");
      return;
    }

    setTaxonomies((current) => ({
      ...current,
      [kind]: current[kind]
        .map((currentItem) =>
          currentItem.id === item.id
            ? (payload.data as SongTaxonomyItem)
            : currentItem,
        )
        .sort((left, right) => left.name.localeCompare(right.name, "fr")),
    }));
  }

  async function deleteItem(
    kind: "themes" | "labels",
    item: SongTaxonomyItem,
  ) {
    setMessage("");
    const response = await fetch(
      `/api/admin/song-taxonomies/${kind}/${item.id}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiPayload | null;
      setMessage(payload?.error?.message ?? "Impossible de supprimer cet élément.");
      return;
    }

    setTaxonomies((current) => ({
      ...current,
      [kind]: current[kind].filter(
        (currentItem) => currentItem.id !== item.id,
      ),
    }));
  }

  return (
    <div className="taxonomy-admin">
      {message ? (
        <p className="form-message" role="alert">
          {message}
        </p>
      ) : null}
      <div className="taxonomy-admin__grid">
        <TaxonomyList
          description="Contenu et usage liturgique des chants."
          items={taxonomies.themes}
          kind="themes"
          onCreate={createItem}
          onDelete={deleteItem}
          onRename={renameItem}
          title="Thèmes"
        />
        <TaxonomyList
          description="Listes internes : favoris, groupes, camps ou événements."
          items={taxonomies.labels}
          kind="labels"
          onCreate={createItem}
          onDelete={deleteItem}
          onRename={renameItem}
          title="Labels"
        />
      </div>
    </div>
  );
}
