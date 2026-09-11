"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createCollection, deleteCollection, renameCollection, setCollectionArtwork } from "@/app/actions/marketplace";
import type { Artwork } from "@/app/data";
import type { ViewerState } from "@/lib/marketplace-data";

export function CollectionsManager({ initialCollections, savedArtworks }: { initialCollections: ViewerState["collections"]; savedArtworks: Artwork[] }) {
  const [collections, setCollections] = useState(initialCollections);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function add(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    startTransition(async () => {
      const result = await createCollection(name);
      if (result.ok && result.id) setCollections((current) => [{ id: result.id!, name, artworkIds: [] }, ...current]);
      else if (!result.ok) setError(result.error);
    });
  }
  return (
    <div>
      <form action={add} className="flex max-w-xl gap-3"><input name="name" required minLength={2} maxLength={80} placeholder="Dreamy Nights" className="field" /><button disabled={pending} className="button-light shrink-0"><Plus size={16} /> Create</button></form>
      <p role="status" className="mt-3 min-h-5 text-sm text-red-200">{error}</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {collections.map((collection) => (
          <section key={collection.id} className="border border-white/10 bg-white/[.025] p-6">
            <div className="flex items-center justify-between gap-3"><form action={(formData) => { const name = String(formData.get("name") ?? collection.name); startTransition(async () => { const result = await renameCollection(collection.id, name); if (result.ok) setCollections((current) => current.map((item) => item.id === collection.id ? { ...item, name } : item)); }); }} className="flex flex-1 gap-2"><input name="name" defaultValue={collection.name} aria-label="Collection name" className="min-w-0 flex-1 bg-transparent font-serif text-3xl outline-none focus:ring-1 focus:ring-cobalt-light" /><button className="text-xs text-white/40 hover:text-white">Rename</button></form><button onClick={() => startTransition(async () => { const result = await deleteCollection(collection.id); if (result.ok) setCollections((current) => current.filter((item) => item.id !== collection.id)); })} aria-label={`Delete ${collection.name}`} className="grid size-9 place-items-center text-white/35 hover:text-red-200"><Trash2 size={16} /></button></div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {savedArtworks.map((artwork) => {
                const active = collection.artworkIds.includes(artwork.id);
                return <button key={artwork.id} onClick={() => startTransition(async () => { const result = await setCollectionArtwork(collection.id, artwork.id, !active); if (result.ok) setCollections((current) => current.map((item) => item.id === collection.id ? { ...item, artworkIds: active ? item.artworkIds.filter((id) => id !== artwork.id) : [...item.artworkIds, artwork.id] } : item)); })} className={`group text-left ${active ? "opacity-100" : "opacity-45 hover:opacity-80"}`}><div className="relative aspect-square overflow-hidden"><Image src={artwork.image} alt="" fill sizes="180px" className="object-cover" /></div><p className="mt-2 text-sm">{artwork.title}</p><p className="text-xs text-white/40">{active ? "In collection" : "Add"}</p></button>;
              })}
            </div>
            {!savedArtworks.length && <p className="mt-8 text-sm text-white/40">Save artworks first, then arrange them here.</p>}
          </section>
        ))}
      </div>
      {!collections.length && <div className="mt-10 border border-white/10 p-12 text-center"><h2 className="font-serif text-4xl">Create your first little museum.</h2><p className="mt-3 text-white/45">Give a collection a name, then add your saved pieces.</p></div>}
    </div>
  );
}
