import { RecipesProvider } from "@/components/providers/recipes-provider";

export default function CookLayout({ children }: { children: React.ReactNode }) {
  return <RecipesProvider>{children}</RecipesProvider>;
}
