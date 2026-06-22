import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { GameVariant } from "./use-game";

type VariantContextValue = {
  variant: GameVariant;
  setVariant: (v: GameVariant) => void;
};

const VariantContext = createContext<VariantContextValue | null>(null);

// App-wide selection of Crossword vs Sudoku. The home switcher sets it, and the
// leaderboard / rank displays read it so everything stays on the same variant.
export const VariantProvider = ({ children }: { children: ReactNode }) => {
  const [variant, setVariant] = useState<GameVariant>("CROSSWORD");
  const value = useMemo(() => ({ variant, setVariant }), [variant]);
  return (
    <VariantContext.Provider value={value}>{children}</VariantContext.Provider>
  );
};

export const useVariant = () => {
  const ctx = useContext(VariantContext);
  if (!ctx) {
    // Fallback so components used outside the provider still work.
    return { variant: "CROSSWORD" as GameVariant, setVariant: () => {} };
  }
  return ctx;
};
