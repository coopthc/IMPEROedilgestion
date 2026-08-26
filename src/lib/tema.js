// Tema scuro predefinito (replica del plugin WordPress originale)
export const TEMA_DARK = {
  "--background": "240 33% 7%",
  "--foreground": "0 0% 94%",
  "--card": "240 24% 10%",
  "--card-foreground": "0 0% 94%",
  "--popover": "240 24% 10%",
  "--popover-foreground": "0 0% 94%",
  "--primary": "328 82% 52%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "240 28% 14%",
  "--secondary-foreground": "0 0% 94%",
  "--muted": "240 28% 14%",
  "--muted-foreground": "240 10% 57%",
  "--accent": "328 82% 52%",
  "--accent-foreground": "0 0% 100%",
  "--destructive": "0 84% 60%",
  "--destructive-foreground": "0 0% 98%",
  "--border": "240 10% 18%",
  "--input": "240 28% 14%",
  "--ring": "328 82% 52%",
  "--sidebar-background": "240 24% 10%",
  "--sidebar-foreground": "0 0% 94%",
  "--sidebar-primary": "328 82% 52%",
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": "240 28% 14%",
  "--sidebar-accent-foreground": "0 0% 94%",
  "--sidebar-border": "240 10% 18%",
  "--sidebar-ring": "328 82% 52%",
};

// Tema chiaro — testi scuri su sfondi chiari
export const TEMA_CHIARO = {
  "--background": "220 20% 97%",
  "--foreground": "240 10% 12%",
  "--card": "0 0% 100%",
  "--card-foreground": "240 10% 12%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "240 10% 12%",
  "--primary": "328 76% 48%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "220 14% 93%",
  "--secondary-foreground": "240 10% 12%",
  "--muted": "220 14% 93%",
  "--muted-foreground": "240 5% 42%",
  "--accent": "328 76% 48%",
  "--accent-foreground": "0 0% 100%",
  "--destructive": "0 72% 51%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "220 13% 88%",
  "--input": "220 14% 90%",
  "--ring": "328 76% 48%",
  "--sidebar-background": "0 0% 100%",
  "--sidebar-foreground": "240 10% 12%",
  "--sidebar-primary": "328 76% 48%",
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": "220 14% 93%",
  "--sidebar-accent-foreground": "240 10% 12%",
  "--sidebar-border": "220 13% 88%",
  "--sidebar-ring": "328 76% 48%",
};

// Token modificabili dall'utente, raggruppati
export const TEMA_TOKENS = [
  { key: "--background", label: "Sfondo principale", group: "sfondi" },
  { key: "--card", label: "Sfondo card/pannelli", group: "sfondi" },
  { key: "--popover", label: "Sfondo dialog", group: "sfondi" },
  { key: "--secondary", label: "Sfondo secondario", group: "sfondi" },
  { key: "--muted", label: "Sfondo muted", group: "sfondi" },
  { key: "--foreground", label: "Testo principale", group: "testi" },
  { key: "--card-foreground", label: "Testo card", group: "testi" },
  { key: "--popover-foreground", label: "Testo dialog", group: "testi" },
  { key: "--secondary-foreground", label: "Testo secondario", group: "testi" },
  { key: "--muted-foreground", label: "Testo muted/etichette", group: "testi" },
  { key: "--primary", label: "Colore primario/brand", group: "primario" },
  { key: "--primary-foreground", label: "Testo su primario", group: "primario" },
  { key: "--accent", label: "Colore accento", group: "primario" },
  { key: "--accent-foreground", label: "Testo su accento", group: "primario" },
  { key: "--destructive", label: "Colore errore", group: "altro" },
  { key: "--destructive-foreground", label: "Testo su errore", group: "altro" },
  { key: "--border", label: "Bordi", group: "altro" },
  { key: "--input", label: "Sfondo campi input", group: "altro" },
  { key: "--ring", label: "Anelli focus", group: "altro" },
];

export const TEMA_GROUP_LABELS = {
  sfondi: "Sfondi",
  testi: "Testi",
  primario: "Primario e accento",
  altro: "Bordi, input e altro",
};

// Applica un set di colori (CSS variables) al document root
export function applyTema(colors) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// Converte "240 33% 7%" in #hex
export function hslStringToHex(hslStr) {
  if (!hslStr) return "#000000";
  const parts = hslStr.trim().split(/\s+/);
  const h = parseFloat(parts[0]) || 0;
  const s = (parseFloat(parts[1]) || 0) / 100;
  const l = (parseFloat(parts[2]) || 0) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Converte #hex in "240 33% 7%"
export function hexToHslString(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else h = ((r - g) / d + 4);
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}