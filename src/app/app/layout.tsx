import { Sidebar } from "@/components/layout/sidebar";
import { RecipesProvider } from "@/components/providers/recipes-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecipesProvider>
      <div className="min-h-screen bg-cream">
        <Sidebar />
        <main className="min-h-screen px-4 pb-10 pt-20 sm:px-6 sm:pb-12 lg:ml-64 lg:px-12 lg:py-12">
          {children}
        </main>
      </div>
    </RecipesProvider>
  );
}
