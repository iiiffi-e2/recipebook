"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/lib/store";

const departmentOrder = [
  "Produce",
  "Meat & Seafood",
  "Dairy",
  "Canned Goods",
  "Bakery",
  "Frozen",
  "Other",
];

export default function ShoppingPage() {
  const { shoppingList, toggleShoppingItem, clearCheckedItems } = useAppStore();

  const grouped = useMemo(() => {
    const groups: Record<string, typeof shoppingList> = {};
    for (const item of shoppingList) {
      if (!groups[item.department]) groups[item.department] = [];
      groups[item.department].push(item);
    }
    return Object.entries(groups).sort(
      ([a], [b]) => departmentOrder.indexOf(a) - departmentOrder.indexOf(b)
    );
  }, [shoppingList]);

  const checkedCount = shoppingList.filter((i) => i.checked).length;
  const totalCount = shoppingList.length;

  return (
    <>
      <Header
        title="Shopping List"
        subtitle="Generated from your meal plan — ingredients grouped by aisle"
      />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-sage" />
          <span className="text-charcoal-muted">
            {checkedCount} of {totalCount} items checked
          </span>
        </div>
        {checkedCount > 0 && (
          <Button variant="outline" size="sm" onClick={clearCheckedItems}>
            <Trash2 className="h-4 w-4" />
            Clear checked
          </Button>
        )}
      </div>

      <div className="space-y-8">
        {grouped.map(([department, items], groupIndex) => (
          <motion.section
            key={department}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.05 }}
          >
            <h2 className="mb-4 font-serif text-xl font-medium text-charcoal">
              {department}
            </h2>
            <div className="rounded-2xl bg-ivory shadow-[var(--shadow-soft)] divide-y divide-warm-gray/40">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-cream/50 transition-colors"
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => toggleShoppingItem(item.id)}
                  />
                  <span className={item.checked ? "ingredient-checked flex-1" : "flex-1"}>
                    <span className="font-medium">
                      {item.amount} {item.unit}
                    </span>{" "}
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </>
  );
}
