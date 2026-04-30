"use client";

import { useState, useEffect } from "react";
import { THEMES, DEFAULT_THEME } from "@/lib/themes";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME);
  const [noise, setNoise] = useState(0);

  useEffect(() => {
    setCurrentTheme(document.documentElement.dataset.theme || DEFAULT_THEME);
    const stored = localStorage.getItem("sidebar-noise");
    setNoise(stored ? parseFloat(stored) : 0);
  }, []);

  const applyTheme = (name: string) => {
    document.documentElement.dataset.theme = name;
    localStorage.setItem("sidebar-theme", name);
    setCurrentTheme(name);
  };

  const applyNoise = (value: number) => {
    const opacity = (value / 100) * 0.25;
    document.documentElement.style.setProperty("--noise-opacity", String(opacity));
    localStorage.setItem("sidebar-noise", String(opacity));
    setNoise(value);
  };

  return (
    <div onPointerDown={e => e.stopPropagation()} className="px-2 py-1.5 space-y-3">
      {/* Swatch grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {THEMES.map(theme => (
          <button
            key={theme.name}
            title={theme.label}
            onClick={() => applyTheme(theme.name)}
            className={cn(
              "h-6 w-6 rounded-full transition-all duration-150 ring-offset-background",
              currentTheme === theme.name
                ? "ring-2 ring-foreground ring-offset-2 scale-110"
                : "hover:scale-110 hover:ring-1 hover:ring-foreground/30 hover:ring-offset-1"
            )}
            style={{ background: theme.swatch }}
            aria-label={theme.label}
            aria-pressed={currentTheme === theme.name}
          />
        ))}
      </div>

      {/* Noise slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Texture</span>
          {noise > 0 && (
            <span className="text-xs text-muted-foreground">{Math.round(noise)}%</span>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={noise}
          onChange={e => applyNoise(Number(e.target.value))}
          className="w-full h-1 rounded-full accent-foreground cursor-pointer"
          aria-label="Background texture intensity"
        />
      </div>
    </div>
  );
}
