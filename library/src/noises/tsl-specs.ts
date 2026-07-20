// TSL shader specs for every registry variant, keyed by variant id. Kept in a
// separate module (merged into the registry at load time) so the main registry
// entries stay language-agnostic. Display expressions mirror the GLSL/WGSL
// ones: value * (0.5 * norm) + 0.5 clamped for signed noises.

import { CELLULAR_TSL } from './cellular.tsl'
import { COMMON_TSL } from './common.tsl'
import { FLOW_TSL } from './flow.tsl'
import { GABOR_TSL } from './gabor.tsl'
import {
  CHEBYSHEV2_NORM,
  CHEBYSHEV3_NORM,
  CRACKLE_NORM,
  GABOR2_NORM,
  GABOR3_NORM,
  MANHATTAN2_NORM,
  MANHATTAN3_NORM,
  PERLIN2_NORM,
  PERLIN3_NORM,
  RIPPLE_NORM,
  SIMPLEX_VALUE_NORM,
  SIMPLEX_VALUE4_NORM,
  SIMPLEX2_NORM,
  SIMPLEX3_NORM,
  SIMPLEX4_NORM,
  STARS_NORM,
} from './normalization'
import { PERLIN_DERIVED_TSL } from './perlin-derived.tsl'
import { PERLIN_TSL } from './perlin.tsl'
import { RIPPLE_TSL } from './ripple.tsl'
import { SIMPLEX_LOOP_TSL } from './simplex-loop.tsl'
import { SIMPLEX_VALUE_TSL } from './simplex-value.tsl'
import { SIMPLEX_TSL } from './simplex.tsl'
import { SIMPLEX4_TSL } from './simplex4.tsl'
import { CELLULAR_TILEABLE_TSL } from './tileable/cellular-tileable.tsl'
import { FLOW_TILEABLE_TSL } from './tileable/flow-tileable.tsl'
import { GABOR_TILEABLE_TSL } from './tileable/gabor-tileable.tsl'
import { PERLIN_DERIVED_TILEABLE_TSL } from './tileable/perlin-derived-tileable.tsl'
import { PERLIN_TILEABLE_TSL } from './tileable/perlin-tileable.tsl'
import { RIPPLE_TILEABLE_TSL } from './tileable/ripple-tileable.tsl'
import { SIMPLEX_TILEABLE_TSL } from './tileable/simplex-tileable.tsl'
import { SIMPLEX_VALUE_TILEABLE_TSL } from './tileable/simplex-value-tileable.tsl'
import { TRUCHET_TILEABLE_TSL } from './tileable/truchet-tileable.tsl'
import { VALUE_TILEABLE_TSL } from './tileable/value-tileable.tsl'
import { VORTEX_TILEABLE_TSL } from './tileable/vortex-tileable.tsl'
import { WAVE_TILEABLE_TSL } from './tileable/wave-tileable.tsl'
import { WHITE_TILEABLE_TSL } from './tileable/white-tileable.tsl'
import { WORLEY_METRICS_TILEABLE_TSL } from './tileable/worley-metrics-tileable.tsl'
import { WORLEY_TILEABLE_TSL } from './tileable/worley-tileable.tsl'
import { TRUCHET_TSL } from './truchet.tsl'
import { VALUE_TSL } from './value.tsl'
import { VORTEX_TSL } from './vortex.tsl'
import { WAVE_TSL } from './wave.tsl'
import { WHITE_TSL } from './white.tsl'
import { WORLEY_METRICS_TSL } from './worley-metrics.tsl'
import { WORLEY_TSL } from './worley.tsl'

import type { ShaderSpec } from '../registry'

export type TslSpecPair = { tsl: ShaderSpec; tslTileable: ShaderSpec | null }

const spec = (dim: 2 | 3, deps: string[], expr: string): ShaderSpec => ({ dim, deps, expr })

/** value * (0.5 * norm) + 0.5, clamped — matches signedExpr in the registry. */
const signed = (norm: number, call: string): string => `${call}.mul(${0.5 * norm}).add(0.5).clamp(0.0, 1.0)`

const unsigned = (norm: number, call: string): string =>
  norm === 1 ? `${call}.clamp(0.0, 1.0)` : `${call}.mul(${norm}).clamp(0.0, 1.0)`

const TSL_SPECS: Record<string, TslSpecPair> = {
  'value-2d': {
    tsl: spec(2, [VALUE_TSL], 'value2(p)'),
    tslTileable: spec(2, [VALUE_TILEABLE_TSL], 'value2T(p, per)'),
  },
  'value-3d': {
    tsl: spec(3, [VALUE_TSL], 'value3(p)'),
    tslTileable: spec(3, [VALUE_TILEABLE_TSL], 'value3T(p, per)'),
  },
  'white-2d': {
    tsl: spec(2, [WHITE_TSL], 'white2(p)'),
    tslTileable: spec(2, [WHITE_TILEABLE_TSL], 'white2T(p, per)'),
  },
  'white-3d': {
    tsl: spec(3, [WHITE_TSL], 'white3(p)'),
    tslTileable: spec(3, [WHITE_TILEABLE_TSL], 'white3T(p, per)'),
  },
  'perlin-2d': {
    tsl: spec(2, [PERLIN_TSL], signed(PERLIN2_NORM, 'perlin2(p)')),
    tslTileable: spec(2, [PERLIN_TSL, PERLIN_TILEABLE_TSL], signed(PERLIN2_NORM, 'perlin2T(p, per)')),
  },
  'perlin-3d': {
    tsl: spec(3, [PERLIN_TSL], signed(PERLIN3_NORM, 'perlin3(p)')),
    tslTileable: spec(3, [PERLIN_TSL, PERLIN_TILEABLE_TSL], signed(PERLIN3_NORM, 'perlin3T(p, per)')),
  },
  'flow-3d': {
    tsl: spec(3, [FLOW_TSL], signed(PERLIN2_NORM, 'flow3(p)')),
    tslTileable: spec(3, [FLOW_TSL, FLOW_TILEABLE_TSL], signed(PERLIN2_NORM, 'flow3T(p, per)')),
  },
  'simplex-loop-3d': {
    tsl: spec(3, [SIMPLEX4_TSL, SIMPLEX_LOOP_TSL], signed(SIMPLEX4_NORM, 'simplexLoop3(p)')),
    tslTileable: null,
  },
  'simplex-2d': {
    tsl: spec(2, [SIMPLEX_TSL], signed(SIMPLEX2_NORM, 'simplex2(p)')),
    tslTileable: spec(2, [SIMPLEX4_TSL, SIMPLEX_TILEABLE_TSL], signed(SIMPLEX4_NORM, 'simplex2T(p, per)')),
  },
  'simplex-3d': {
    tsl: spec(3, [SIMPLEX_TSL], signed(SIMPLEX3_NORM, 'simplex3(p)')),
    tslTileable: null,
  },
  'worley-2d': {
    tsl: spec(2, [WORLEY_TSL], unsigned(1, 'worley2(p)')),
    tslTileable: spec(2, [WORLEY_TILEABLE_TSL], unsigned(1, 'worley2T(p, per)')),
  },
  'worley-3d': {
    tsl: spec(3, [WORLEY_TSL], unsigned(1, 'worley3(p)')),
    tslTileable: spec(3, [WORLEY_TILEABLE_TSL], unsigned(1, 'worley3T(p, per)')),
  },
  'worley-manhattan-2d': {
    tsl: spec(2, [WORLEY_METRICS_TSL], unsigned(MANHATTAN2_NORM, 'manhattan2(p)')),
    tslTileable: spec(2, [WORLEY_METRICS_TILEABLE_TSL], unsigned(MANHATTAN2_NORM, 'manhattan2T(p, per)')),
  },
  'worley-manhattan-3d': {
    tsl: spec(3, [WORLEY_METRICS_TSL], unsigned(MANHATTAN3_NORM, 'manhattan3(p)')),
    tslTileable: spec(3, [WORLEY_METRICS_TILEABLE_TSL], unsigned(MANHATTAN3_NORM, 'manhattan3T(p, per)')),
  },
  'worley-chebyshev-2d': {
    tsl: spec(2, [WORLEY_METRICS_TSL], unsigned(CHEBYSHEV2_NORM, 'chebyshev2(p)')),
    tslTileable: spec(2, [WORLEY_METRICS_TILEABLE_TSL], unsigned(CHEBYSHEV2_NORM, 'chebyshev2T(p, per)')),
  },
  'worley-chebyshev-3d': {
    tsl: spec(3, [WORLEY_METRICS_TSL], unsigned(CHEBYSHEV3_NORM, 'chebyshev3(p)')),
    tslTileable: spec(3, [WORLEY_METRICS_TILEABLE_TSL], unsigned(CHEBYSHEV3_NORM, 'chebyshev3T(p, per)')),
  },
  'gabor-2d': {
    tsl: spec(2, [GABOR_TSL], signed(GABOR2_NORM, 'gabor2(p)')),
    tslTileable: spec(2, [GABOR_TILEABLE_TSL], signed(GABOR2_NORM, 'gabor2T(p, per)')),
  },
  'gabor-3d': {
    tsl: spec(3, [GABOR_TSL], signed(GABOR3_NORM, 'gabor3(p)')),
    tslTileable: spec(3, [GABOR_TILEABLE_TSL], signed(GABOR3_NORM, 'gabor3T(p, per)')),
  },
  'simplex-value-2d': {
    tsl: spec(2, [SIMPLEX_VALUE_TSL], signed(SIMPLEX_VALUE_NORM, 'simplexValue2(p)')),
    tslTileable: spec(2, [SIMPLEX_VALUE_TILEABLE_TSL], signed(SIMPLEX_VALUE4_NORM, 'simplexValue2T(p, per)')),
  },
  'simplex-value-3d': {
    tsl: spec(3, [SIMPLEX_VALUE_TSL], signed(SIMPLEX_VALUE_NORM, 'simplexValue3(p)')),
    tslTileable: null,
  },
  'wave-2d': {
    tsl: spec(2, [WAVE_TSL], signed(1, 'wave2(p)')),
    tslTileable: spec(2, [WAVE_TSL, WAVE_TILEABLE_TSL], signed(1, 'wave2T(p, per)')),
  },
  'wave-3d': {
    tsl: spec(3, [WAVE_TSL], signed(1, 'wave3(p)')),
    tslTileable: spec(3, [WAVE_TSL, WAVE_TILEABLE_TSL], signed(1, 'wave3T(p, per)')),
  },
  'ripple-2d': {
    tsl: spec(2, [RIPPLE_TSL], signed(RIPPLE_NORM, 'ripple2(p)')),
    tslTileable: spec(2, [RIPPLE_TILEABLE_TSL], signed(RIPPLE_NORM, 'ripple2T(p, per)')),
  },
  'ripple-3d': {
    tsl: spec(3, [RIPPLE_TSL], signed(RIPPLE_NORM, 'ripple3(p)')),
    tslTileable: spec(3, [RIPPLE_TILEABLE_TSL], signed(RIPPLE_NORM, 'ripple3T(p, per)')),
  },
  'marble-2d': {
    tsl: spec(2, [PERLIN_TSL, PERLIN_DERIVED_TSL], signed(1, 'marble2(p)')),
    tslTileable: spec(2, [PERLIN_TSL, PERLIN_TILEABLE_TSL, PERLIN_DERIVED_TILEABLE_TSL], signed(1, 'marble2T(p, per)')),
  },
  'marble-3d': {
    tsl: spec(3, [PERLIN_TSL, PERLIN_DERIVED_TSL], signed(1, 'marble3(p)')),
    tslTileable: spec(3, [PERLIN_TSL, PERLIN_TILEABLE_TSL, PERLIN_DERIVED_TILEABLE_TSL], signed(1, 'marble3T(p, per)')),
  },
  'contour-2d': {
    tsl: spec(2, [PERLIN_TSL, PERLIN_DERIVED_TSL], signed(1, 'contour2(p)')),
    tslTileable: spec(
      2,
      [PERLIN_TSL, PERLIN_TILEABLE_TSL, PERLIN_DERIVED_TILEABLE_TSL],
      signed(1, 'contour2T(p, per)'),
    ),
  },
  'contour-3d': {
    tsl: spec(3, [PERLIN_TSL, PERLIN_DERIVED_TSL], signed(1, 'contour3(p)')),
    tslTileable: spec(
      3,
      [PERLIN_TSL, PERLIN_TILEABLE_TSL, PERLIN_DERIVED_TILEABLE_TSL],
      signed(1, 'contour3T(p, per)'),
    ),
  },
  'mosaic-2d': {
    tsl: spec(2, [CELLULAR_TSL], 'mosaic2(p)'),
    tslTileable: spec(2, [CELLULAR_TILEABLE_TSL], 'mosaic2T(p, per)'),
  },
  'mosaic-3d': {
    tsl: spec(3, [CELLULAR_TSL], 'mosaic3(p)'),
    tslTileable: spec(3, [CELLULAR_TILEABLE_TSL], 'mosaic3T(p, per)'),
  },
  'crackle-2d': {
    tsl: spec(2, [CELLULAR_TSL], unsigned(CRACKLE_NORM, 'crackle2(p)')),
    tslTileable: spec(2, [CELLULAR_TILEABLE_TSL], unsigned(CRACKLE_NORM, 'crackle2T(p, per)')),
  },
  'crackle-3d': {
    tsl: spec(3, [CELLULAR_TSL], unsigned(CRACKLE_NORM, 'crackle3(p)')),
    tslTileable: spec(3, [CELLULAR_TILEABLE_TSL], unsigned(CRACKLE_NORM, 'crackle3T(p, per)')),
  },
  'foam-2d': {
    tsl: spec(2, [CELLULAR_TSL], 'foam2(p)'),
    tslTileable: spec(2, [CELLULAR_TILEABLE_TSL], 'foam2T(p, per)'),
  },
  'foam-3d': {
    tsl: spec(3, [CELLULAR_TSL], 'foam3(p)'),
    tslTileable: spec(3, [CELLULAR_TILEABLE_TSL], 'foam3T(p, per)'),
  },
  'stars-2d': {
    tsl: spec(2, [CELLULAR_TSL], unsigned(STARS_NORM, 'stars2(p)')),
    tslTileable: spec(2, [CELLULAR_TILEABLE_TSL], unsigned(STARS_NORM, 'stars2T(p, per)')),
  },
  'stars-3d': {
    tsl: spec(3, [CELLULAR_TSL], unsigned(STARS_NORM, 'stars3(p)')),
    tslTileable: spec(3, [CELLULAR_TILEABLE_TSL], unsigned(STARS_NORM, 'stars3T(p, per)')),
  },
  'vortex-2d': {
    tsl: spec(2, [VORTEX_TSL], signed(1, 'vortex2(p)')),
    tslTileable: spec(2, [VORTEX_TSL, VORTEX_TILEABLE_TSL], signed(1, 'vortex2T(p, per)')),
  },
  'vortex-3d': {
    tsl: spec(3, [VORTEX_TSL], signed(1, 'vortex3(p)')),
    tslTileable: spec(3, [VORTEX_TSL, VORTEX_TILEABLE_TSL], signed(1, 'vortex3T(p, per)')),
  },
  'truchet-2d': {
    tsl: spec(2, [TRUCHET_TSL], signed(1, 'truchet2(p)')),
    tslTileable: spec(2, [TRUCHET_TILEABLE_TSL], signed(1, 'truchet2T(p, per)')),
  },
}

export const COMMON_TSL_CHUNK = COMMON_TSL

export const getTslSpec = (variantId: string): TslSpecPair => {
  const pair = TSL_SPECS[variantId]
  if (!pair) throw new Error(`Missing TSL spec for variant "${variantId}"`)
  return pair
}
