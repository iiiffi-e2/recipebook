import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <Sidebar />
      <main className="ml-64 min-h-screen p-8 lg:p-12">{children}</main>
    </div>
  );
}
