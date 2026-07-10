# Tagging & Category System Design

**Date:** 2026-07-09  
**Status:** Approved

## Summary

Standardize recipe categories to a fixed dish-type taxonomy, align cookbook category pills with that list, and add tag-based browsing with multi-tag OR filtering via URL params.

## Decisions

- **Category model:** Dish-type (Option B)
- **Multi-tag logic:** OR — show recipes matching any selected tag
- **Tag click behavior:** Navigate to cookbook with tag filter active
- **Migration approach:** Prompt + normalization + one-time DB migration (Approach 2)

## Canonical Categories

1. Appetizer
2. Soup
3. Salad
4. Main Course
5. Side Dish
6. Dessert
7. Bread & Baking
8. Drink
9. Sauce & Condiment

Unknown or legacy values (e.g. `Imported`, `Dinner`, `Entrée`) map to **Main Course** via synonym table in `src/lib/categories.ts`.

## Architecture

### Category pipeline

1. AI ingest prompts require one of the nine canonical categories.
2. `normalizeExtractedRecipe()` applies `normalizeCategory()` on import.
3. `saveRecipe()` / `updateRecipe()` normalize before writing to Supabase.
4. `migrateRecipeCategories()` rewrites legacy DB values; runs automatically on `GET /api/recipes` and via `POST /api/recipes/migrate-categories`.

### Tag filtering

- URL format: `/app?tags=kid-friendly,vegetarian`
- Cookbook shows removable tag chips for active filters.
- Recipe cards and detail pages link tags to the cookbook, appending to existing tag filters.
- Filter logic: category AND collection AND (any active tag).

## UI Changes

| Surface | Change |
|---------|--------|
| Cookbook | Canonical category pills; active tag chips |
| Recipe card | Clickable tags (outside main card link) |
| Recipe detail | Clickable tag links |
| Edit recipe | Category dropdown (canonical list) |

Tags remain free-form and are not editable in the UI yet.

## Out of Scope

- Tag editing UI
- DB enum / lookup table for categories
- AND toggle for multi-tag filtering
