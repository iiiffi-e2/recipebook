import { NextRequest, NextResponse } from "next/server";
import type { RecipeGroup } from "@/lib/import/types";

const OPENAI_TIMEOUT_MS = 90_000;
const GROUP_CHUNK_SIZE = 12;

interface GroupImageInput {
  id: string;
  fileName: string;
  captureTime: number;
  thumbnail?: string;
}

async function callOpenAI(body: Record<string, unknown>) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("OpenAI grouping error:", response.status, await response.text());
      return null;
    }
    return response.json();
  } catch (error) {
    console.error("OpenAI grouping request failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function newGroupId(seed: string): string {
  return `group-${seed}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0.6;
  return Math.max(0, Math.min(1, value));
}

// A lone image is confidently its own recipe; a metadata cluster of >1 is a
// medium-confidence guess that should be reviewed unless AI confirms it.
function fallbackGroups(provisionalGroups: string[][]): RecipeGroup[] {
  return provisionalGroups.map((imageIds, index) => ({
    id: newGroupId(String(index)),
    imageIds,
    confidence: imageIds.length > 1 ? 0.5 : 0.95,
    needsReview: imageIds.length > 1,
  }));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function groupChunk(images: GroupImageInput[]): Promise<RecipeGroup[] | null> {
  const withThumbs = images.filter((img) => img.thumbnail);
  if (withThumbs.length === 0) return null;

  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text:
        "These images may be photos/screenshots of recipes. Some images are multiple " +
        "pages/screenshots of the SAME recipe (e.g. ingredients on one, steps on another, " +
        "front/back of a card, OR notes/tips/nutrition that belong to that dish). " +
        "Keep notes and side screenshots in the same group as their recipe. " +
        "Only create a separate group when the image is a distinct recipe or clearly unrelated. " +
        "Return ONLY JSON: " +
        '{"groups":[{"imageIds":["id1","id2"],"confidence":0.0}]}. ' +
        "confidence is 0..1 that the grouping is correct. Every id must appear exactly once. " +
        "Order imageIds within a group by page order. Ids: " +
        withThumbs.map((i) => i.id).join(", "),
    },
    ...withThumbs.map((img) => ({
      type: "image_url",
      image_url: { url: img.thumbnail as string },
    })),
  ];

  const data = await callOpenAI({
    model: "gpt-4o",
    messages: [{ role: "user", content }],
    max_tokens: 800,
    temperature: 0,
  });

  const raw = data?.choices?.[0]?.message?.content as string | undefined;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")) as {
      groups?: Array<{ imageIds?: string[]; confidence?: number }>;
    };
    const validIds = new Set(images.map((i) => i.id));
    const seen = new Set<string>();
    const groups: RecipeGroup[] = [];

    for (const g of parsed.groups ?? []) {
      const imageIds = (g.imageIds ?? []).filter((id) => validIds.has(id) && !seen.has(id));
      imageIds.forEach((id) => seen.add(id));
      if (imageIds.length > 0) {
        groups.push({
          id: newGroupId("ai"),
          imageIds,
          confidence: typeof g.confidence === "number" ? clamp01(g.confidence) : 0.6,
          needsReview: false,
        });
      }
    }

    // Any id the model dropped becomes its own confident group.
    for (const img of images) {
      if (!seen.has(img.id)) {
        groups.push({ id: newGroupId("solo"), imageIds: [img.id], confidence: 0.95, needsReview: false });
      }
    }
    return groups;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      images?: GroupImageInput[];
      provisionalGroups?: string[][];
    };
    const images = body.images ?? [];
    const provisionalGroups = body.provisionalGroups ?? images.map((i) => [i.id]);

    if (images.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ groups: fallbackGroups(provisionalGroups) });
    }

    const sorted = [...images].sort((a, b) => a.captureTime - b.captureTime);
    const chunks = chunk(sorted, GROUP_CHUNK_SIZE);
    const groups: RecipeGroup[] = [];

    for (const c of chunks) {
      const result = await groupChunk(c);
      if (result) {
        groups.push(...result);
      } else {
        // Degrade this chunk to one-image-per-recipe.
        for (const img of c) {
          groups.push({ id: newGroupId("fb"), imageIds: [img.id], confidence: 0.95, needsReview: false });
        }
      }
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Grouping error:", error);
    return NextResponse.json({ error: "Failed to group images" }, { status: 500 });
  }
}
