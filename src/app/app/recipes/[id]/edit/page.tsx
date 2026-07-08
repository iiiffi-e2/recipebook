"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useRecipe, useCollections, useRecipesContext } from "@/lib/recipes";
import type { Collection, Ingredient, Instruction, Recipe } from "@/lib/types";

function EditRecipeForm({
  recipe,
  collections,
}: {
  recipe: Recipe;
  collections: Collection[];
}) {
  const router = useRouter();
  const { refreshRecipes, refreshCollections } = useRecipesContext();

  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [servings, setServings] = useState(recipe.servings);
  const [prepTime, setPrepTime] = useState(recipe.prepTime);
  const [cookTime, setCookTime] = useState(recipe.cookTime);
  const [category, setCategory] = useState(recipe.category);
  const [ingredients, setIngredients] = useState(() =>
    recipe.ingredients.map((i) => ({ ...i }))
  );
  const [instructions, setInstructions] = useState(() =>
    recipe.instructions.map((i) => ({ ...i }))
  );
  const [selectedCollections, setSelectedCollections] = useState(() => [...recipe.collections]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function updateInstruction(index: number, field: keyof Instruction, value: string | number) {
    setInstructions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, amount: "", unit: "", name: "" },
    ]);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function addInstruction() {
    setInstructions((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, step: prev.length + 1, text: "" },
    ]);
  }

  function removeInstruction(index: number) {
    setInstructions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, step: i + 1 }))
    );
  }

  function toggleCollection(collectionId: string) {
    setSelectedCollections((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          servings,
          prepTime,
          cookTime,
          category,
          tags: recipe.tags,
          mealTypes: recipe.mealTypes,
          difficulty: recipe.difficulty,
          source: recipe.source,
          ingredients: ingredients.map((item) => ({
            amount: item.amount,
            unit: item.unit,
            name: item.name,
            notes: item.notes,
          })),
          instructions: instructions.map((item) => ({
            step: item.step,
            text: item.text,
            timerMinutes: item.timerMinutes ?? null,
          })),
          collectionIds: selectedCollections,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }

      await refreshRecipes();
      await refreshCollections();
      router.push(`/app/recipes/${recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link
        href={`/app/recipes/${recipe.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-charcoal-muted hover:text-charcoal transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Recipe
      </Link>

      <h1 className="mb-8 font-serif text-3xl font-medium">Edit Recipe</h1>

      <form onSubmit={handleSave} className="space-y-10">
        <section className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border border-warm-gray bg-ivory px-4 py-2 text-sm text-charcoal placeholder:text-charcoal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Servings</label>
              <Input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Prep (min)</label>
              <Input
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Cook (min)</label>
              <Input
                type="number"
                min={0}
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-medium">Ingredients</h2>
            <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="space-y-3">
            {ingredients.map((ingredient, index) => (
              <div key={ingredient.id} className="flex gap-2">
                <Input
                  placeholder="Amount"
                  value={ingredient.amount}
                  onChange={(e) => updateIngredient(index, "amount", e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Unit"
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Ingredient"
                  value={ingredient.name}
                  onChange={(e) => updateIngredient(index, "name", e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeIngredient(index)}
                >
                  <Trash2 className="h-4 w-4 text-charcoal-muted" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-medium">Instructions</h2>
            <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="space-y-3">
            {instructions.map((instruction, index) => (
              <div key={instruction.id} className="flex gap-2">
                <span className="mt-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sage/20 text-sm font-medium text-sage">
                  {instruction.step}
                </span>
                <textarea
                  value={instruction.text}
                  onChange={(e) => updateInstruction(index, "text", e.target.value)}
                  rows={2}
                  className="flex-1 rounded-xl border border-warm-gray bg-ivory px-4 py-2 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInstruction(index)}
                >
                  <Trash2 className="h-4 w-4 text-charcoal-muted" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {collections.length > 0 && (
          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium">Collections</h2>
            <div className="space-y-2">
              {collections.map((collection) => (
                <label
                  key={collection.id}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-ivory"
                >
                  <Checkbox
                    checked={selectedCollections.includes(collection.id)}
                    onCheckedChange={() => toggleCollection(collection.id)}
                  />
                  <span>{collection.name}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href={`/app/recipes/${recipe.id}`}>
            <Button type="button" variant="outline" size="lg">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </>
  );
}

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { recipe, loading } = useRecipe(id);
  const { collections } = useCollections();
  const { usingDatabase } = useRecipesContext();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      </div>
    );
  }

  if (!recipe) notFound();

  if (!usingDatabase) {
    return (
      <div className="max-w-3xl">
        <p className="text-charcoal-muted">
          Recipe editing requires a connected database. Connect Supabase to edit recipes.
        </p>
        <Link href={`/app/recipes/${id}`} className="mt-4 inline-block text-sage hover:underline">
          Back to recipe
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <EditRecipeForm key={recipe.id} recipe={recipe} collections={collections} />
    </div>
  );
}
