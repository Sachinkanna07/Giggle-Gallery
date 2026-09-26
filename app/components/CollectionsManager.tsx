"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Plus, Trash2, Check, FolderPlus, Layers } from "lucide-react";
import {
  createCollection,
  deleteCollection,
  renameCollection,
  setCollectionArtwork,
} from "@/app/actions/marketplace";
import type { Artwork } from "@/app/data";
import type { ViewerState } from "@/lib/marketplace-data";

export function CollectionsManager({
  initialCollections,
  savedArtworks,
}: {
  initialCollections: ViewerState["collections"];
  savedArtworks: Artwork[];
}) {
  const [collections, setCollections] = useState(initialCollections);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [nameInput, setNameInput] = useState("");

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const name = nameInput.trim();
    startTransition(async () => {
      const result = await createCollection(name);
      if (result.ok && result.id) {
        setCollections((current) => [{ id: result.id!, name, artworkIds: [] }, ...current]);
        setNameInput("");
        setError("");
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-12">
      {/* Create New Collection Form */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xl">
        <h2 className="font-serif text-2xl text-text-primary mb-2 flex items-center gap-2">
          <FolderPlus size={20} className="text-accent-secondary" /> Curate a New Collection Room
        </h2>
        <p className="text-xs text-text-secondary mb-6">
          Group your favorite artworks into tailored themes, visual moods, or private exhibition concepts.
        </p>

        <form onSubmit={add} className="flex flex-col sm:flex-row max-w-xl gap-3">
          <input
            name="name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Cobalt Meditations, Architectural Silences"
            className="field !py-2.5 text-sm flex-1"
          />
          <button
            type="submit"
            disabled={pending || !nameInput.trim()}
            className="button-light text-xs !py-2.5 !px-6 shrink-0 disabled:opacity-50"
          >
            <Plus size={15} /> Create Room
          </button>
        </form>

        {error && <p role="status" className="mt-3 text-xs text-red-400 font-medium">{error}</p>}
      </div>

      {/* Collection Rooms Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {collections.map((collection) => {
          const count = collection.artworkIds.length;
          const coverArtwork = savedArtworks.find((art) => collection.artworkIds.includes(art.id));

          return (
            <section
              key={collection.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-lg transition hover:border-border/80"
            >
              {/* Collection Cover Image */}
              {coverArtwork && (
                <div className="relative mb-5 h-28 w-full overflow-hidden rounded-xl bg-bg-secondary border border-border/40">
                  <Image
                    src={coverArtwork.image}
                    alt={collection.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                </div>
              )}

              {/* Collection Header & Rename */}
              <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
                <form
                  action={(formData) => {
                    const name = String(formData.get("name") ?? collection.name);
                    startTransition(async () => {
                      const result = await renameCollection(collection.id, name);
                      if (result.ok) {
                        setCollections((current) =>
                          current.map((item) =>
                            item.id === collection.id ? { ...item, name } : item
                          )
                        );
                      }
                    });
                  }}
                  className="flex flex-1 items-baseline gap-3"
                >
                  <input
                    name="name"
                    defaultValue={collection.name}
                    aria-label="Collection name"
                    className="min-w-0 flex-1 bg-transparent font-serif text-2xl sm:text-3xl text-text-primary outline-none focus:border-b focus:border-accent-secondary"
                  />
                  <button type="submit" className="text-xs text-text-secondary hover:text-text-primary transition shrink-0">
                    Rename
                  </button>
                </form>

                <button
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteCollection(collection.id);
                      if (result.ok) {
                        setCollections((current) =>
                          current.filter((item) => item.id !== collection.id)
                        );
                      }
                    })
                  }
                  aria-label={`Delete ${collection.name}`}
                  className="grid size-9 place-items-center rounded-full text-text-secondary hover:bg-red-500/10 hover:text-red-300 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="py-3 flex items-center justify-between text-xs text-text-secondary">
                <span>{count} {count === 1 ? "piece" : "pieces"} collected</span>
                <span className="text-[11px] uppercase tracking-wider text-accent-secondary">
                  Private Exhibition
                </span>
              </div>

              {/* Artwork Slots Selector */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {savedArtworks.map((artwork) => {
                  const active = collection.artworkIds.includes(artwork.id);
                  return (
                    <button
                      key={artwork.id}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await setCollectionArtwork(
                            collection.id,
                            artwork.id,
                            !active
                          );
                          if (result.ok) {
                            setCollections((current) =>
                              current.map((item) =>
                                item.id === collection.id
                                  ? {
                                      ...item,
                                      artworkIds: active
                                        ? item.artworkIds.filter((id) => id !== artwork.id)
                                        : [...item.artworkIds, artwork.id],
                                    }
                                  : item
                              )
                            );
                          }
                        })
                      }
                      className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                        active
                          ? "border-accent ring-2 ring-accent/30 bg-surface-elevated opacity-100"
                          : "border-border/60 opacity-40 hover:opacity-85 hover:border-text-primary"
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-bg-secondary">
                        <Image
                          src={artwork.image}
                          alt={artwork.title}
                          fill
                          sizes="160px"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-transparent to-transparent opacity-80" />
                        {active && (
                          <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-accent text-white shadow">
                            <Check size={11} />
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-serif text-text-primary truncate">{artwork.title}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5">{active ? "Curated" : "Tap to add"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!savedArtworks.length && (
                <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-xs text-text-secondary">
                  Save artworks with the heart button in the gallery to curate them into this room.
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!collections.length && (
        <div className="rounded-2xl border border-border p-16 text-center text-text-secondary">
          <Layers size={36} className="mx-auto mb-3 opacity-30 text-accent-secondary" />
          <h2 className="font-serif text-3xl text-text-primary">Create your first exhibition room</h2>
          <p className="mt-2 text-sm max-w-md mx-auto">
            Give your collection a distinct curatorial title above, then select your saved artworks to compose your private gallery.
          </p>
        </div>
      )}
    </div>
  );
}
