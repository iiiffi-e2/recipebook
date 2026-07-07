"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
}

export function Header({ title, subtitle, showSearch = false }: HeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/app?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-serif text-4xl font-medium tracking-tight text-charcoal">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-charcoal-muted">{subtitle}</p>
          )}
        </div>
        {showSearch && (
          <form onSubmit={handleSearch} className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <Input
              placeholder="Search recipes, ingredients, memories..."
              className="pl-11"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        )}
      </div>
    </header>
  );
}
