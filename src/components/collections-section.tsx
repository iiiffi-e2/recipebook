"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollections } from "@/lib/recipes";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/types";

interface CollectionsSectionProps {
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
}

export function CollectionsSection({
  activeCollectionId,
  onSelectCollection,
}: CollectionsSectionProps) {
  const { collections, addCollection, usingDatabase } = useCollections();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const created = await addCollection(name.trim());
    setSaving(false);

    if (created) {
      setName("");
      setShowForm(false);
      onSelectCollection(created.id);
    }
  }

  if (collections.length === 0 && !usingDatabase) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-medium text-charcoal">Collections</h2>
        {usingDatabase && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                New Collection
              </>
            )}
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
          <Input
            placeholder="Collection name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </form>
      )}

      {collections.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {collections.map((collection: Collection) => (
            <button
              key={collection.id}
              onClick={() =>
                onSelectCollection(
                  activeCollectionId === collection.id ? null : collection.id
                )
              }
              className={cn(
                "flex-shrink-0 rounded-2xl border px-6 py-4 text-left transition-all",
                activeCollectionId === collection.id
                  ? "border-sage bg-sage/10"
                  : "border-warm-gray/60 bg-ivory hover:border-sage/50"
              )}
            >
              <p className="font-serif text-lg font-medium">{collection.name}</p>
              <p className="text-sm text-charcoal-muted">
                {collection.recipeCount} {collection.recipeCount === 1 ? "recipe" : "recipes"}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-warm-gray/60 bg-ivory/50 px-6 py-8 text-center text-charcoal-muted">
          No collections yet. Create one to organize your recipes.
        </p>
      )}
    </section>
  );
}
