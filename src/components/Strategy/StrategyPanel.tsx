import { SrTimingSection } from "./SrTimingSection";
import { NovaPlanSection } from "./NovaPlanSection";
import { CycleStrategySection } from "./CycleStrategySection";
import { CreditStrategySection } from "./CreditStrategySection";

/**
 * The Strategy tab — "what should I do next", in the order the decisions
 * actually matter:
 *
 *   1. When to Super Rebirth   — sets your crystal income for everything else
 *   2. What to buy with them   — the Nova Shop ordering
 *   3. Which droids to keep    — the cycle's keeper set
 *   4. How to raise credits/s  — deployment moves, which feed back into (1)
 *
 * The first two are new; the last two moved here from the Rebirths tab, which
 * had grown to six sections and mixed "what IS my state" with "what SHOULD I
 * do". Rebirths is now the former, Strategy the latter.
 */
export function StrategyPanel() {
  return (
    <>
      <SrTimingSection />
      <NovaPlanSection />
      <CycleStrategySection />
      <CreditStrategySection />
    </>
  );
}
