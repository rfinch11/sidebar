export interface Theme {
  name: string;
  label: string;
  swatch: string;
  isDark: boolean;
}

export const DEFAULT_THEME = "dusk";

export const DARK_THEMES = ["dusk", "slate", "graphite", "midnight", "forest", "walnut", "ash", "onyx"];

export const THEMES: Theme[] = [
  { name: "paper",    label: "Paper",    swatch: "oklch(1 0 0)",              isDark: false },
  { name: "linen",    label: "Linen",    swatch: "oklch(0.97 0.014 78)",      isDark: false },
  { name: "fog",      label: "Fog",      swatch: "oklch(0.97 0.006 222)",     isDark: false },
  { name: "chalk",    label: "Chalk",    swatch: "oklch(0.96 0 0)",           isDark: false },
  { name: "dusk",     label: "Dusk",     swatch: "oklch(0.147 0.004 49.25)",  isDark: true  },
  { name: "slate",    label: "Slate",    swatch: "oklch(0.15 0.012 225)",     isDark: true  },
  { name: "graphite", label: "Graphite", swatch: "oklch(0.18 0 0)",           isDark: true  },
  { name: "midnight", label: "Midnight", swatch: "oklch(0.13 0.025 255)",     isDark: true  },
  { name: "forest",   label: "Forest",   swatch: "oklch(0.15 0.018 145)",     isDark: true  },
  { name: "walnut",   label: "Walnut",   swatch: "oklch(0.14 0.015 35)",      isDark: true  },
  { name: "ash",      label: "Ash",      swatch: "oklch(0.26 0.007 50)",      isDark: true  },
  { name: "onyx",     label: "Onyx",     swatch: "oklch(0.1 0 0)",            isDark: true  },
];
