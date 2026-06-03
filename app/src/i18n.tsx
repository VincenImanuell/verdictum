import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "id";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** pick the English or Indonesian variant of a string */
  t: (en: string, id: string) => string;
}

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: (en) => en });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = (en: string, id: string) => (lang === "en" ? en : id);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLang = () => useContext(Ctx);
