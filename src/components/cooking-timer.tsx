"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

function CookingTimer({ minutes }: { minutes: number }) {
  const totalMs = minutes * 60 * 1000;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => clearInterval(interval);
  }, [minutes]);

  const remaining = Math.max(0, totalMs - elapsed);
  const totalSec = Math.ceil(remaining / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const display = `${min}:${sec.toString().padStart(2, "0")}`;

  if (remaining <= 0) {
    return (
      <div className="mt-8 text-terracotta font-serif text-xl">
        Timer complete!
      </div>
    );
  }

  return (
    <div className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-terracotta/20 px-8 py-4">
      <Timer className="h-8 w-8 text-terracotta" />
      <span className="font-serif text-4xl text-terracotta">{display}</span>
    </div>
  );
}

interface TimerButtonProps {
  minutes: number;
  isActive: boolean;
  onStart: () => void;
}

export function TimerButton({ minutes, isActive, onStart }: TimerButtonProps) {
  if (isActive) {
    return <CookingTimer minutes={minutes} />;
  }

  return (
    <Button size="lg" className="mt-8" onClick={onStart}>
      <Timer className="h-5 w-5" />
      Start {minutes} min timer
    </Button>
  );
}
