import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LANGUAGES } from "@/i18n";

const LanguageSelect = ({
  align = "right",
}: {
  align?: "left" | "right";
}) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="lang-select-btn"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 sm:px-4 h-10 rounded-full glass text-foreground/90 hover:border-primary/40 transition-colors text-sm"
      >
        <Globe className="w-4 h-4 text-primary shrink-0" />
        <span className="text-lg leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-xs tracking-wider">{current.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          data-testid="lang-select-menu"
          className={`absolute top-12 ${align === "right" ? "right-0" : "left-0"} z-50 glass-card rounded-xl p-1 w-48 max-h-72 overflow-y-auto`}
        >
          {LANGUAGES.map((l) => {
            const active = l.code === current.code;
            return (
              <button
                key={l.code}
                data-testid={`lang-option-${l.code}`}
                onClick={() => {
                  void i18n.changeLanguage(l.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/80 hover:bg-primary/10 hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <span className="flex-1 text-start">{l.label}</span>
                {active && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelect;
