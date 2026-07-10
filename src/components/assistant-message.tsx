"use client";

import Link from "next/link";
import { parseAssistantMessage } from "@/lib/assistant-message";

interface AssistantMessageContentProps {
  content: string;
}

export function AssistantMessageContent({ content }: AssistantMessageContentProps) {
  const parts = parseAssistantMessage(content);

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.type === "link") {
          const label = part.bold ? <strong>{part.text}</strong> : part.text;
          return (
            <Link
              key={index}
              href={part.href}
              className="font-medium text-sage underline decoration-sage/40 underline-offset-2 transition-colors hover:text-sage/80"
            >
              {label}
            </Link>
          );
        }

        if (part.type === "bold") {
          return <strong key={index}>{part.text}</strong>;
        }

        return <span key={index}>{part.text}</span>;
      })}
    </p>
  );
}
