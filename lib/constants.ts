export const CATEGORIES = [
  "hiring",
  "craft",
  "org_design",
  "leadership",
  "culture",
  "strategy",
  "career_growth",
  "critique",
  "process",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  hiring: "Hiring",
  craft: "Craft",
  org_design: "Org Design",
  leadership: "Leadership",
  culture: "Culture",
  strategy: "Strategy",
  career_growth: "Career Growth",
  critique: "Critique",
  process: "Process",
  other: "Other",
};
