import { costTier, TIER_LABEL } from 'noisetoy'

import type { CostTier } from 'noisetoy'

/** Green/yellow/orange, matching the tiers in the library's cost model. */
export const TIER_CLASS: Record<CostTier, string> = {
  cheap: 'text-emerald-400',
  moderate: 'text-yellow-400',
  heavy: 'text-orange-400',
}

const CostBadge = ({ units, label, title }: { units: number; label?: string; title?: string }) => {
  const tier = costTier(units)
  return (
    <span title={title} className={`font-medium ${TIER_CLASS[tier]}`}>
      {label ?? TIER_LABEL[tier]} · {units.toFixed(units < 10 ? 1 : 0)}
    </span>
  )
}

export default CostBadge
