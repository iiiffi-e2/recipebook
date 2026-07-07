import { Header } from "@/components/layout/header";
import { ImportDropzone } from "@/components/import-dropzone";

export default function ImportPage() {
  return (
    <>
      <Header
        title="Import Recipes"
        subtitle="Upload from anywhere — handwritten cards, screenshots, PDFs, or entire folders"
      />
      <ImportDropzone />

      <section className="mt-16 rounded-2xl bg-ivory p-8 shadow-[var(--shadow-soft)]">
        <h2 className="mb-6 font-serif text-2xl font-medium">What happens next?</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "AI Extraction",
              description:
                "Our AI reads each upload — handwriting, screenshots, PDFs — and extracts title, ingredients, instructions, and metadata.",
            },
            {
              step: "2",
              title: "Smart Organization",
              description:
                "Recipes are automatically categorized, tagged, and checked for duplicates. Originals are always preserved.",
            },
            {
              step: "3",
              title: "Ready to Cook",
              description:
                "Your recipes appear in the cookbook, fully searchable with interactive checklists, timers, and family memories.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage/20 font-serif text-xl text-sage">
                {item.step}
              </div>
              <h3 className="font-serif text-lg font-medium">{item.title}</h3>
              <p className="mt-2 text-sm text-charcoal-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
