import { StrategySummary } from "./StrategySummary";
import { YourNumbersCard } from "./YourNumbersCard";
import { CollapsibleSection } from "./CollapsibleSection";
import { SrTimingSection } from "./SrTimingSection";
import { MeasuredValueSection } from "./MeasuredValueSection";
import { NovaPlanSection } from "./NovaPlanSection";
import { CycleStrategySection } from "./CycleStrategySection";
import { CreditStrategySection } from "./CreditStrategySection";

/**
 * The Strategy tab — "what should I do next".
 *
 * Structured as answer-then-evidence. The summary states the call; the inputs
 * it rests on sit directly beneath it; everything below is the detail that
 * justifies it, collapsed by default because five expanded sections buried
 * the answer they were meant to support.
 *
 * Section order follows how much each decision is worth:
 *   1. When to Super Rebirth  — sets crystal income for everything else
 *   2. Measured value         — computed ranking, where effects are known
 *   3. What to buy            — the rest of the shop, ordered by argument
 *   4. Which droids to keep   — the cycle's keeper set
 *   5. How to raise credits/s — deployment moves, which feed back into (1)
 *
 * (2) and (3) stay separate: one is arithmetic, the other judgement, and the
 * UI shouldn't blur which is which.
 */
export function StrategyPanel() {
  return (
    <>
      <StrategySummary />
      <YourNumbersCard />

      <CollapsibleSection
        id="sr-timing"
        title="When to Super Rebirth"
        defaultOpen
        hint="crystals/hour by stopping level"
      >
        <SrTimingSection />
      </CollapsibleSection>

      <CollapsibleSection id="measured" title="Measured value" hint="computed">
        <MeasuredValueSection />
      </CollapsibleSection>

      <CollapsibleSection id="nova-plan" title="What to buy next" hint="judgement">
        <NovaPlanSection />
      </CollapsibleSection>

      {/* These two already carry their own <details> disclosure, so they are
          rendered bare rather than double-wrapped. */}
      <CycleStrategySection />
      <CreditStrategySection />
    </>
  );
}
