"use client";

import { useState } from "react";
import { ChevronDown, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollections } from "@/lib/recipes";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/types";

interface CollectionsMenuProps {
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
}

type DialogMode = "create" | "edit" | "delete" | null;

export function CollectionsMenu({
  activeCollectionId,
  onSelectCollection,
}: CollectionsMenuProps) {
  const {
    collections,
    addCollection,
    updateCollection,
    deleteCollection,
    usingDatabase,
  } = useCollections();
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [targetCollection, setTargetCollection] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const activeCollection = collections.find((c) => c.id === activeCollectionId);

  function openCreateDialog() {
    setTargetCollection(null);
    setName("");
    setDialogMode("create");
    setOpen(false);
  }

  function openEditDialog(collection: Collection) {
    setTargetCollection(collection);
    setName(collection.name);
    setDialogMode("edit");
    setOpen(false);
  }

  function openDeleteDialog(collection: Collection) {
    setTargetCollection(collection);
    setDialogMode("delete");
    setOpen(false);
  }

  function closeDialog() {
    setDialogMode(null);
    setTargetCollection(null);
    setName("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);

    if (dialogMode === "create") {
      const created = await addCollection(trimmed);
      if (created) {
        onSelectCollection(created.id);
        closeDialog();
      }
    } else if (dialogMode === "edit" && targetCollection) {
      const updated = await updateCollection(targetCollection.id, trimmed);
      if (updated) {
        closeDialog();
      }
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (!targetCollection) return;

    setSaving(true);
    const success = await deleteCollection(targetCollection.id);
    setSaving(false);

    if (success) {
      if (activeCollectionId === targetCollection.id) {
        onSelectCollection(null);
      }
      closeDialog();
    }
  }

  function handleSelectCollection(id: string) {
    onSelectCollection(activeCollectionId === id ? null : id);
    setOpen(false);
  }

  if (collections.length === 0 && !usingDatabase) {
    return null;
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all sm:text-base",
              activeCollection
                ? "bg-sage/15 text-charcoal ring-1 ring-sage/40"
                : "bg-ivory text-charcoal-muted hover:bg-warm-gray hover:text-charcoal"
            )}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="max-w-[10rem] truncate">
              {activeCollection ? activeCollection.name : "Collections"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Filter by collection</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {collections.length > 0 ? (
            collections.map((collection) => (
              <DropdownMenuItem
                key={collection.id}
                onSelect={() => handleSelectCollection(collection.id)}
                className="group flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-medium",
                      activeCollectionId === collection.id && "text-sage"
                    )}
                  >
                    {collection.name}
                  </p>
                  <p className="text-xs text-charcoal-muted">
                    {collection.recipeCount}{" "}
                    {collection.recipeCount === 1 ? "recipe" : "recipes"}
                  </p>
                </div>

                {usingDatabase && (
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`Edit ${collection.name}`}
                      className="rounded-md p-1.5 text-charcoal-muted transition-colors hover:bg-cream hover:text-charcoal"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(collection);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${collection.name}`}
                      className="rounded-md p-1.5 text-charcoal-muted transition-colors hover:bg-red-50 hover:text-red-600"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(collection);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-sm text-charcoal-muted">
              No collections yet
            </p>
          )}

          {activeCollectionId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onSelectCollection(null)}>
                Clear collection filter
              </DropdownMenuItem>
            </>
          )}

          {usingDatabase && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  openCreateDialog();
                }}
              >
                <Plus className="h-4 w-4" />
                New collection
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialogMode === "create" || dialogMode === "edit"}
        onOpenChange={(isOpen) => !isOpen && closeDialog()}
      >
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {dialogMode === "create" ? "New collection" : "Rename collection"}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === "create"
                  ? "Create a collection to organize related recipes."
                  : "Update the name of this collection."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <Input
                placeholder="Collection name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving
                  ? "Saving..."
                  : dialogMode === "create"
                    ? "Create"
                    : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === "delete"}
        onOpenChange={(isOpen) => !isOpen && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete collection?</DialogTitle>
            <DialogDescription>
              &ldquo;{targetCollection?.name}&rdquo; will be removed. Recipes in this
              collection won&apos;t be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              disabled={saving}
              onClick={handleDelete}
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
