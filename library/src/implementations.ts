// The implementation inventory: for every noise, which concrete implementations
// of it live in this repo and how each one relates to the published algorithm.
//
// `noisetoy/implementations` — NOT part of the default entry. Importing a noise
// from `noisetoy` must never drag in the implementations it beat, so this module
// is a separate entry point and nothing under src/index.ts may import it. A test
// enforces that. See PROMOTION below for how the two stay in sync.
//
// Besides the metadata, this entry carries the non-shipping implementations
// THEMSELVES, as runnable display-mapped samplers (ALT_VARIANTS at the bottom).
// That is what lets the explorer preview and benchmark every implementation in
// the inventory without any of them riding along with the default entry.
//
// WHY THIS FILE EXISTS. A noise is an idea; an implementation is one way of
// computing it, and two implementations of the same idea can differ severalfold
// in cost while producing an equivalent-looking field. To hunt for faster
// implementations honestly you have to keep the slow one around and re-measure
// it, and you have to know what you started from — the reference formulation
// everyone else uses, a known alternative route, or something invented here with
// no precedent to compare against.
//
// Two fields describe that relationship, and both are mandatory:
//
//   `kind`     — the relationship claimed:
//     'canonical'    matches the authoritative reference formulation
//     'alternative'  implements the published algorithm by a different,
//                    documented route
//     'conventional' NO authoritative reference exists; this is simply how the
//                    technique is normally written. Folklore, honestly labelled
//                    instead of being promoted to canonical
//     'novel'        no known precedent; invented here
//
//   `evidence` — what backs that claim, from 'measured-against-reference' down
//                to 'none'. A claim of 'canonical' or 'alternative' asserts a
//                relationship to something published, so evidence 'none' is
//                rejected by evidenceSupportsKind and by the test suite.
//
// Read them together and never apart. "Canonical, read from the paper" is a
// materially weaker statement than "Canonical, measured against the reference",
// and the whole point of the second field is that the difference is visible.
// Anything displaying `kind` must display `evidence` next to it.
//
// PROMOTION. src/noises/** always holds the CURRENT FASTEST implementation of
// each noise — that is what `noisetoy` exports and what a consumer gets. When a
// faster one is found it is promoted into src/noises/**, the previous champion
// moves to src/alt/**, and both stay listed here with the loser marked
// `superseded`. The inventory is therefore the history of the search; the
// default entry is only ever its current winner. A challenger that measures
// faster on the CPU but cannot yet ship — registry variants need all four
// language backends, and a CPU win does not settle the GPU — waits in
// src/alt/** marked `candidate` until it either completes or loses.
//
// THE SHARED-PRIMITIVE CAVEAT. The largest single implementation decision in
// this repo was `gradDot2` / `gradDot3` in noises/common.ts, which turns a hash
// into a gradient using trigonometry, where every reference algorithm indexes a
// small fixed table of cheap vectors.
//
// Perlin and Simplex use the table gradients. Against the PUBLISHED reference
// implementations, which is the only comparison worth quoting, both are a dead
// heat — Perlin 1.007x, Simplex 0.99x.
// Neither is an improvement on the published algorithm. What remains on the
// trigonometric primitive is Wave and Vortex (which construct the same thing
// inline rather than calling it) and Gabor (for its kernel orientation). Those
// are the remaining candidates, and the same caveat applies to all of them: the
// measurements are CPU-only, and psrdnoise's case for trigonometry was about
// GPUs. The table gradients live alongside it in common.ts as `gradTable2` /
// `gradTable3`, so switching a noise over is a small change.

import {
  crackleFast2,
  crackleFast3,
  foamFast2,
  foamFast3,
  mosaicFast2,
  mosaicFast3,
  rippleFast2,
  rippleFast3,
  starsFast2,
  starsFast3,
} from './alt/cellular-fast'
import { CELLULAR_FAST_GLSL } from './alt/cellular-fast.glsl'
import { CELLULAR_FAST_TSL } from './alt/cellular-fast.tsl'
import { CELLULAR_FAST_WGSL } from './alt/cellular-fast.wgsl'
import { FAST_COMMON_GLSL } from './alt/fast-common.glsl'
import { FAST_COMMON_TSL } from './alt/fast-common.tsl'
import { FAST_COMMON_WGSL } from './alt/fast-common.wgsl'
import { flowFast3 } from './alt/flow-fast'
import { FLOW_FAST_GLSL } from './alt/flow-fast.glsl'
import { FLOW_FAST_TSL } from './alt/flow-fast.tsl'
import { FLOW_FAST_WGSL } from './alt/flow-fast.wgsl'
import { perlinFast2, perlinFast3 } from './alt/perlin-fast'
import { PERLIN_FAST_GLSL } from './alt/perlin-fast.glsl'
import { PERLIN_FAST_TSL } from './alt/perlin-fast.tsl'
import { PERLIN_FAST_WGSL } from './alt/perlin-fast.wgsl'
import { simplexFast2, simplexFast3 } from './alt/simplex-fast'
import { SIMPLEX_FAST_GLSL } from './alt/simplex-fast.glsl'
import { SIMPLEX_FAST_TSL } from './alt/simplex-fast.tsl'
import { SIMPLEX_FAST_WGSL } from './alt/simplex-fast.wgsl'
import { worleyFast2, worleyFast3 } from './alt/worley-fast'
import { WORLEY_FAST_GLSL } from './alt/worley-fast.glsl'
import { WORLEY_FAST_TSL } from './alt/worley-fast.tsl'
import { WORLEY_FAST_WGSL } from './alt/worley-fast.wgsl'
import { chebyshevFast2, chebyshevFast3, manhattanFast2, manhattanFast3 } from './alt/worley-metrics-fast'
import { WORLEY_METRICS_FAST_GLSL } from './alt/worley-metrics-fast.glsl'
import { WORLEY_METRICS_FAST_TSL } from './alt/worley-metrics-fast.tsl'
import { WORLEY_METRICS_FAST_WGSL } from './alt/worley-metrics-fast.wgsl'
import {
  CHEBYSHEV2_NORM,
  CRACKLE_NORM,
  CHEBYSHEV3_NORM,
  clamp01,
  fmt,
  MANHATTAN2_NORM,
  MANHATTAN3_NORM,
  PERLIN2_NORM,
  PERLIN3_NORM,
  RIPPLE_NORM,
  SIMPLEX2_NORM,
  SIMPLEX3_NORM,
  STARS_NORM,
} from './noises/normalization'

export type ImplementationKind = 'canonical' | 'alternative' | 'conventional' | 'novel'

/**
 * How the `kind` claim is backed. A label alone is an opinion; pairing it with
 * its evidence keeps the difference between "read from the paper" and
 * "measured against the reference" visible everywhere the label is shown.
 * A claim has to say what backs it, and 'canonical' is not available without
 * a reference to be canonical AGAINST.
 */
export type Evidence =
  /**
   * A reference implementation is transliterated into this repo and has been
   * run against the shipping one. The only level at which "matches the
   * reference" is a measured fact rather than an opinion.
   */
  | 'measured-against-reference'
  /**
   * An authoritative reference implementation exists and is cited, but has not
   * been brought into the repo — so nothing has actually been compared. Usually
   * because its licence forbids transliteration, or it is unreachable.
   */
  | 'reference-exists-uncompared'
  /**
   * A paper specifies the algorithm but publishes no reference implementation.
   * The claim rests on reading the paper — materially weaker than a measured
   * comparison.
   */
  | 'paper-only'
  /**
   * No authoritative source exists at all: community convention, or invented
   * here. 'canonical' is meaningless at this level and the type forbids it.
   */
  | 'none'

export type NoiseImplementation = {
  /** Unique within its noise. Also the suffix used by alternative variant ids. */
  id: string
  /** Short label naming the METHOD, not the noise, e.g. 'Trig unit gradients'. */
  name: string
  kind: ImplementationKind
  /** What backs `kind`. See Evidence — a test enforces the pairing. */
  evidence: Evidence
  /**
   * Where the authority actually lives: paper, reference implementation, URL,
   * and licence where it governs whether we may transliterate it. Absent only
   * when evidence is 'none'.
   */
  reference?: {
    /** Primary publication: author, title, year. */
    paper?: string
    /** Authoritative reference implementation, if one exists. */
    implementation?: string
    /** Licence of that implementation — this decides whether it can be copied. */
    licence?: string
    url?: string
    /** Path to our transliteration of it, when we have one. */
    inRepo?: string
  }
  /**
   * The published formulation this implements, with author and year. Omitted
   * only for 'novel' implementations, which by definition follow nothing.
   */
  follows?: string
  /**
   * Specific, checkable departures from that formulation. Each entry should be
   * concrete enough to verify against the source file — these are the candidate
   * targets when hunting for a faster implementation.
   */
  deviations?: string[]
  /** Why it was written this way, where the reason is not self-evident. */
  rationale?: string
  /**
   * Absent when this is the implementation that ships. Otherwise why it does
   * not: 'superseded' means it was the default and lost a measurement;
   * 'baseline' means it was never a candidate to ship and exists only to be
   * measured against; 'candidate' means it currently BEATS the shipping
   * implementation on the CPU but has not been promoted, because promotion
   * needs the GPU measurement its GLSL/WGSL/TSL specs (see ALT_VARIANTS)
   * make possible, plus the tileable paths, and has neither yet. Either way it provides no registry variants, so `variantIds` is
   * empty.
   */
  status?: 'superseded' | 'baseline' | 'candidate'
  /** Where the source of a non-shipping implementation lives. */
  archivedAt?: string
  /** Variant ids this implementation provides. Empty unless it ships. */
  variantIds: string[]
}

export const IMPLEMENTATION_KIND_LABEL: Record<ImplementationKind, string> = {
  canonical: 'Canonical',
  alternative: 'Known alternative',
  conventional: 'Conventional',
  novel: 'Novel',
}

export const IMPLEMENTATION_KIND_BLURB: Record<ImplementationKind, string> = {
  canonical: 'Verified against the authoritative reference implementation.',
  alternative: 'Implements the published algorithm by a documented route other than the reference one.',
  conventional: 'No authoritative reference exists; this is how the technique is normally written.',
  novel: 'No known precedent for computing it this way.',
}

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  'measured-against-reference': 'Measured against the reference',
  'reference-exists-uncompared': 'Reference exists, not yet compared',
  'paper-only': 'Read from the paper; no reference implementation',
  none: 'No authoritative source',
}

/**
 * The rule the type cannot express, enforced by implementations.test.ts.
 *
 * The bar for 'canonical' is that something authoritative EXISTS to be
 * canonical against — not that we have measured it. Requiring measurement would
 * be stricter than the world allows: Perlin's 1985 marble and Worley's F2 - F1
 * were published as papers with no reference implementation, so no amount of
 * diligence can produce one to diff against.
 *
 * A claim never stands alone: `evidence` is mandatory, is displayed everywhere
 * `kind` is displayed, and cannot be 'none' for a claim that asserts a
 * relationship to something published.
 */
export const evidenceSupportsKind = (kind: ImplementationKind, evidence: Evidence): boolean => {
  // Folklore and inventions have nothing to relate to, and must say so.
  if (kind === 'conventional' || kind === 'novel') return evidence === 'none'
  // Canonical and alternative both assert a relationship to a published thing,
  // so a published thing has to exist.
  return evidence !== 'none'
}

/** Shared wording for the trig-gradient deviation described in the header. */
const TRIG_GRADIENTS =
  'Gradients are continuous unit vectors built with cos/sin of a hashed angle (2D) and a hashed z-component plus azimuth (3D), where the reference implementations index a small fixed table of cheap {-1,0,1} vectors. Costs a hash, two trig calls and (in 3D) a sqrt per corner.'

/**
 * Shared wording for the cellular point-distribution deviation. Worley's own
 * implementation clamps the Poisson count to 1..9 around a mean of ~4 and he
 * concedes it "lost some isotropy" by forbidding empty cubes, so the reference
 * is already a compromise — but a variable count all the same.
 */
const ONE_POINT_PER_CELL =
  "Exactly one feature point per lattice cell, where Worley's paper draws a variable, Poisson-distributed count per cube (mean ~3-4, clamped to 1..9) seeded by a per-cube RNG. Makes the neighbourhood search a fixed 9 (2D) / 27 (3D) iterations with no variable-length inner loop, at the cost of a more regular point distribution."

const HASH_NOT_PERMUTATION =
  'Randomness comes from the shared lowbias32 integer hash rather than a 256-entry permutation table, so all four language backends derive identical values and lattice coordinates can be wrapped for tiling.'

export const IMPLEMENTATIONS: Record<string, NoiseImplementation[]> = {
  value: [
    {
      id: 'lattice-lerp',
      name: 'Quintic-interpolated lattice',
      kind: 'conventional',
      evidence: 'none',
      deviations: [HASH_NOT_PERMUTATION],
      rationale:
        "The standard formulation: hash a value per lattice corner, interpolate with the quintic fade. Uses Perlin 2002's fade rather than the older cosine interpolation, which is the modern default everywhere. Provenance: Classic value noise (folklore; no single reference paper).",
      variantIds: ['value-2d', 'value-3d'],
    },
  ],
  white: [
    {
      id: 'hashed-cell',
      name: 'One hash per cell',
      kind: 'conventional',
      evidence: 'none',
      rationale:
        'There is only one sensible way to do this: hash the cell, return it, interpolate nothing. Provenance: Hashed-cell white noise (folklore).',
      variantIds: ['white-2d', 'white-3d'],
    },
  ],
  perlin: [
    {
      id: 'table-gradients',
      name: 'Table gradients, folded hash',
      // NOT canonical, despite using the paper's gradient set: it differs from
      // the reference in ways that matter — no 256-cell period, a different
      // hash, slightly less even gradient distribution. It implements the
      // paper's method by a different, very widely used route, which is what
      // 'alternative' means.
      kind: 'alternative',
      evidence: 'reference-exists-uncompared',
      reference: {
        paper: "Ken Perlin, 'Improved Noise' (SIGGRAPH 2002)",
        implementation:
          'ImprovedNoise.java, by Perlin. Cited as the specification and deliberately not copied; no transliteration is kept in the repo because it would need the permutation table, whose provenance cannot be made airtight.',
        licence: 'NOT freely licensed: the file states "COPYRIGHT 2002 KEN PERLIN" and grants nothing.',
        url: 'https://cs.nyu.edu/~perlin/noise/',
      },
      follows: "Ken Perlin, 'Improved Noise' (2002)",
      deviations: [
        HASH_NOT_PERMUTATION,
        'The hash is folded rather than chained: each lattice axis is multiplied by its own odd constant once and the products are summed, so a corner costs one lowbias32 round instead of the three hash3u chains. Since (i + 1) * K == i * K + K, the far plane of each axis is an add rather than a multiply.',
        '2D uses the usual 8 gradients (four diagonals, four axes). That is a choice, not a deviation from anything: the 2002 paper is 3D-only and there is no canonical 2D gradient set.',
      ],
      rationale:
        "The gradient SET is the reference one — Perlin's 12 cube-edge midpoint vectors — but the mapping of hash slot to vector is not his, and neither is the hash. Measured against Perlin's OWN reference implementation it is a dead heat, 1.007x on the CPU: this is not faster than Perlin and must not be described as such. What it has over the reference is the absence of a 256-cell period and the ability to run in a shader. GPU unmeasured.",
      variantIds: ['perlin-2d', 'perlin-3d'],
    },
    {
      id: 'fib-hash',
      name: 'Top-bit gradients, Fibonacci hash',
      kind: 'alternative',
      evidence: 'reference-exists-uncompared',
      status: 'candidate',
      archivedAt: 'src/alt/perlin-fast.ts',
      reference: {
        paper: "Ken Perlin, 'Improved Noise' (SIGGRAPH 2002)",
        implementation:
          'ImprovedNoise.java, by Perlin. Cited as the specification and deliberately not copied; the measured comparison is against the SHIPPING implementation above, not the reference.',
        licence: 'NOT freely licensed: the file states "COPYRIGHT 2002 KEN PERLIN" and grants nothing.',
        url: 'https://cs.nyu.edu/~perlin/noise/',
      },
      follows: "Ken Perlin, 'Improved Noise' (2002)",
      deviations: [
        HASH_NOT_PERMUTATION,
        'Corner hashes are cheaper than the shipping full lowbias32 and DIFFER BY DIMENSION, because the required mixing differs by dimension. 2D: one xor-shift and one multiply by 2^32/phi (Knuth multiplicative hashing), selection bits read from the TOP of the product — valid on the two-axis fold (joints at +x/+y/+xy inside the 95% chi-square criticals). 3D: lowbias32 minus its final xor-shift, two ops and the u32 coercions cheaper than hashU32 — the single-multiply mix fails corner pairs at +yz/+xyz offsets (chi-square 425 and 202 against a 143-df critical of 172), a defect the first version of this file shipped until the simplex pass caught it. The fix cost nothing measurable.',
        'In 2D the xor-shift is hoisted out of the corners (applied to the two x lattice products, corners then combine by xor); the same hoist in 3D failed adjacent-corner chi-square (216 against a 143-df critical of 172).',
        'The 2D corner dots are factored: with the four diagonal gradients every dot is +-(fx + fy) or +-(fx - fy) up to a per-corner integer shift, so both bases are computed once per sample and a corner is a select, an add and a sign flip. The gradient set matches the shipping gradTable2, which draws the same four diagonals (its slots 4-7 repeat slots 0-3 with the operands swapped).',
        "3D keeps the reference's 12 cube-edge gradient set, chosen by the same integer range split as the shipping gradTable3, reading the low 30 bits so the axis choice stays disjoint from the sign bits at 30/31.",
      ],
      rationale:
        "The current challenger, and the measured FLOOR of the scalar form: a second tuning pass tried a hoisted 3D pre-mix, weighted-sum interpolation, an Estrin-reassociated fade, branchless 2D signs and a bias-trick floor, and every one measured flat or worse over 8-12 interleaved repeats — the FP skeleton (floors, fades, lerps) is ~156 ms of the ~190/~222 ms totals in the bench harness, so the remaining integer work sits latency-hidden behind it. Details in the source header. Measured with `bun run bench:impl`: perlin3 between 1.1x and 1.3x depending on the day's machine state, perlin2 ~1.1x, medians and bests agreeing within any single run. Gradient marginals, adjacent-corner joints along each axis and a checkerboard split all sit inside the 95% chi-square criticals, and the assembled field's mean, RMS, extrema and lattice-lag autocorrelation match the shipping perlin to three decimals — but the field is a DIFFERENT DRAW, so promotion would change the pattern every consumer sees. Not promoted yet: the GLSL/WGSL/TSL specs now exist (see ALT_VARIANTS), and the GPU measurement, since taken via the hardened /bench harness, came back a TIE with shipping in both dimensions (0.98-1.00x on WebGL and WebGPU) — the narrower avalanche neither wins nor loses there, so the CPU numbers are the whole case. The tileable paths are also unwritten.",
      variantIds: [],
    },
  ],
  flow: [
    {
      id: 'per-corner-rates',
      name: 'Per-corner integer rotation rates',
      kind: 'alternative',
      evidence: 'paper-only',
      reference: {
        paper: 'Ken Perlin & Fabrice Neyret, "Flow Noise" (SIGGRAPH 2001 sketch)',
        url: 'http://www-evasion.imag.fr/Publications/2001/PN01/sketch_col.pdf',
      },
      follows: "Ken Perlin & Fabrice Neyret, 'Flow Noise' (SIGGRAPH 2001 sketch)",
      deviations: [
        "Each corner gradient rotates at its own integer rate from {-2,-1,1,2}. NEITHER reference does this. Perlin & Neyret rotate every gradient in an octave by the SAME angle, and say so load-bearingly: uniform rotation is what preserves the decorrelation between gradients, so every frame still looks like Perlin noise. Their only rate variation is per octave (finer noise rotates faster). Gustavson & McEwan (2022) give each gradient its own rotation AXIS in 3D, but explicitly keep the angle common, and flag that they are knowingly abandoning Perlin & Neyret's constraint to do it. Varying the rate, as here, breaks that constraint further than either.",
        'The reason for it: a single shared rate makes the half-phase field the exact negative of the zero-phase field — a breathing inversion rather than flow — and integer rates keep the z period exactly 1 so the animation loops. Whether that trade is worth the correlation it introduces has not been measured.',
        'Pseudo-advection, the second half of the sketch, is not implemented: it warps each scale by the accumulated turbulence of coarser scales, which needs state this basis function does not have.',
        TRIG_GRADIENTS,
      ],
      rationale:
        'Perlin & Neyret 2001 is 2D-only, which is why this variant is a 2D lattice with the third input as phase rather than a 3D field.',
      variantIds: ['flow-3d'],
    },
    {
      id: 'fast-rot',
      name: 'Rotated table directions, shared-phase trig',
      kind: 'alternative',
      evidence: 'paper-only',
      status: 'candidate',
      archivedAt: 'src/alt/flow-fast.ts',
      reference: {
        paper: 'Ken Perlin & Fabrice Neyret, "Flow Noise" (SIGGRAPH 2001 sketch)',
        url: 'http://www-evasion.imag.fr/Publications/2001/PN01/sketch_col.pdf',
      },
      follows: "Ken Perlin & Fabrice Neyret, 'Flow Noise' (SIGGRAPH 2001 sketch)",
      deviations: [
        "Inherits the shipping implementation's per-corner integer rotation rates (the flagged departure from the sketch's shared angle) with the identical rate mapping and the exact z-period of 1.",
        'Per-corner trigonometry is eliminated: cos/sin of the phase are computed ONCE per sample, the rate-2 pair comes from the double-angle identities, negative rates flip the sign of sin, and each corner evaluates ck * (g . d) + sk * (g x d) with g its rest direction — two trig calls per sample against the shipping eight.',
        'Rest directions are the eight unit vectors at 45-degree steps, selected from the top 3 bits of the corner mix, against the shipping continuous to01(hash) * TAU angle. The same quantization trade every table-gradient noise here makes, and the rotation sweeps the set through all angles over a cycle. Rate bits come from bits 27-28 of the SAME mix, against the shipping second avalanche.',
        "The corner mix is the Perlin candidate's validated two-axis fold (pre-mixed x products, one multiply by 2^32/phi per corner). Flow reads 5 top bits, so the battery was re-run at 32 slots: marginal chi-square 33.1 against a 31-df critical of 45, joints at +x/+y/+xy 1005-1057 against a 1023-df critical of 1098.",
      ],
      rationale:
        'The current challenger, and the largest CPU win of the candidate hunt so far relative to its noise: ~2.1x the shipping flow3 (`bun run bench:impl`, best and median agreeing), because shipping flow is the most trig-bound sampler in the repo — twelve avalanche rounds and eight transcendentals per sample reduce to four short mixes and two. Field statistics match shipping at every phase tested (rms 0.216 both, extrema +-0.70) and the four-second loop is unchanged. On the GPU, where trigonometry is cheap relative to integer work, it still edges shipping out: 1.03x on WebGL and 1.04x on WebGPU (hardened /bench harness; in-browser JS showed 2.5x). Not promoted: no tileable path yet, and the quantized rest angles should be looked at in motion before they are declared invisible.',
      variantIds: [],
    },
  ],
  simplex: [
    {
      id: 'table-gradients',
      name: 'Table gradients, folded hash',
      kind: 'alternative',
      evidence: 'reference-exists-uncompared',
      reference: {
        paper: 'Stefan Gustavson, "Simplex noise demystified" (2005), after Ken Perlin (2001)',
        implementation:
          "SimplexNoise.java, by Gustavson — the de facto community reference. Note there are THREE things called the reference and they produce three different fields: Perlin's own Java from the 2002 Noise Hardware course notes (authoritative, almost never implemented, no licence grant), this one, and stegu/webgl-noise GLSL (MIT, 3D falloff 0.5 and scale 105, procedurally generated gradients). This repo compares against Gustavson because that is what the rest of the world ports.",
        licence:
          'Public domain. The CODE FILE states "This code was placed in the public domain by its original author, Stefan Gustavson"; note the 2005 PDF itself carries no such statement, so the grant comes from the file, not the paper.',
        url: 'https://github.com/SRombauts/SimplexNoise/blob/master/references/SimplexNoise.java',
      },
      follows: "Ken Perlin's simplex noise (2001) in Stefan Gustavson's 'Simplex noise demystified' (2005) formulation",
      deviations: [
        "The 3D kernel radius is 0.5 where Gustavson's reference uses 0.6. Two lineages exist: the historical (0.6 - r^2)^4, and the corrected (0.5 - r^2)^3 of Gustavson & McEwan 2022, who show 0.6 makes the region of influence too large and leaves the field discontinuous at simplex boundaries. This code pairs 0.5 with exponent 4, which belongs to neither: continuous like the corrected form, but lower amplitude than either, since the exponent was not reduced to compensate. 2D is unaffected — the reference uses 0.5 there too. This is what still keeps Simplex off 'canonical'.",
        HASH_NOT_PERMUTATION,
        "The hash is folded rather than chained: one lowbias32 round per corner instead of hash2/hash3's two or three. Every simplex corner offset is 0 or 1 per axis, so a corner selects between `i * K` and `i * K + K` rather than multiplying again.",
        "The reference's final scale factors (70 in 2D, 32 in 3D) are not applied; normalization is deferred to the display layer and recalibrated empirically, mostly because of the kernel-radius fork above.",
      ],
      rationale:
        "Gradients are Gustavson's own 12 cube-edge vectors, shared with Perlin through gradTable3 in common.ts. Measured 2.4x faster in both 2D and 3D on the CPU than the trigonometric construction this repo originally shipped (removed after losing consistently on every backend; the figure is recorded here rather than re-runnable), a modest win because simplex evaluates only 3 or 4 corners, so the skew and corner-ranking arithmetic is a larger share of what remains.\n\nMeasured against Gustavson's actual reference (in a baseline not kept in the repo): speed was a DEAD HEAT, 0.99x in 3D and 1.00x in 2D. That is the opposite of the Perlin result, where the permutation table beat the folded hash by ~8%, and the reason is structural — simplex chains its lookups as perm[ii + perm[jj + perm[kk]]], so the loads are dependent and serialise, while the folded hash computes each corner independently. Amplitude, with the reference's own scale factor applied to ours for comparison: 2D is 1.21x the reference (gradient set alone, same kernel), 3D is 0.38x (the kernel fork below).",
      variantIds: ['simplex-2d', 'simplex-3d'],
    },
    {
      id: 'fast-hash',
      name: 'Top-bit gradients, branchless ranking',
      kind: 'alternative',
      evidence: 'reference-exists-uncompared',
      status: 'candidate',
      archivedAt: 'src/alt/simplex-fast.ts',
      reference: {
        paper: 'Stefan Gustavson, "Simplex noise demystified" (2005), after Ken Perlin (2001)',
        implementation:
          'SimplexNoise.java, by Gustavson. The measured comparison is against the SHIPPING implementation above, not the reference.',
        licence: 'Public domain (dedicated in the code file).',
        url: 'https://github.com/SRombauts/SimplexNoise/blob/master/references/SimplexNoise.java',
      },
      follows: "Ken Perlin's simplex noise (2001) in Stefan Gustavson's 'Simplex noise demystified' (2005) formulation",
      deviations: [
        "Inherits the shipping implementation's deviations (kernel radius 0.5 with exponent 4 in 3D, folded lattice hash, deferred normalization) — this candidate changes how corners are hashed and ranked, not the algorithm's geometry.",
        'Corner hashes differ by dimension, as in the Perlin candidate: 2D uses one xor-shift and one multiply by 2^32/phi with selection bits read from the top of the product (valid on the two-axis fold); 3D uses lowbias32 minus its final xor-shift, because the single-multiply mix fails corner pairs at +yz/+xyz offsets — offsets a simplex traversal blends — at chi-square 425/202 against a 143-df critical of 172. THIS PASS IS WHAT FOUND THAT DEFECT, which the Perlin and Worley candidates had shipped with.',
        'The 3D corner-ranking ladder is replaced by branchless boolean algebra over a = x>=y, b = y>=z, c = x>=z (i1 = a&(b|c), j1 = !a&b, k1 = !b&(!a|!c); i2 = a|(b&c), j2 = !a|b, k2 = !b|(!a&!c)), verified equal to the reference ladder on 200k random triples plus every tie pattern.',
        'Middle-corner hash sums are single selects: corner 1 adds exactly one lattice constant to the base sum, corner 2 subtracts exactly one from the far corner sum.',
        "2D gradients are the four diagonals — the same set the shipping gradTable2 de facto draws (its slots 4-7 repeat slots 0-3 with operands swapped); 3D keeps the reference's 12 cube-edge set via the same integer range split.",
      ],
      rationale:
        'The current challenger, and a modest one, kept for the 2D win: 1.1-1.25x the shipping simplex2 run to run with `bun run bench:impl`, and a TIE in 3D (0.99-1.05x, best and median disagreeing across runs — treat as noise). The decomposition explains the ceiling: the FP skeleton (skew, ranking, kernels) is ~303 ms of the shipping ~365 ms in the bench harness, simplex hashes only 3-4 corners, and those hashes sit off the FP critical path — so unlike Perlin (8 corners) and Worley (9-27 cells), there is little integer work to remove. Field mean/rms/extrema match the shipping simplex to three decimals (different draw, same statistics). Not promoted: the GPU measurement came back a tie as well (0.97-0.99x on WebGL and WebGPU), so the 2D CPU win is the entire case, and the 3D tie should be broken or accepted first.',
      variantIds: [],
    },
  ],
  'simplex-loop': [
    {
      id: 'time-circle-4d',
      name: '4D simplex on a time circle',
      kind: 'canonical',
      evidence: 'paper-only',
      reference: {
        paper: 'Stefan Gustavson, "Simplex noise demystified" (2005)',
        implementation: 'SimplexNoise.java, by Gustavson',
        licence: 'Placed in the public domain by the author',
        url: 'https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf',
      },
      follows:
        "4D simplex per Gustavson's rank-based corner ordering, sampled along a circle in the two spare dimensions — the standard construction for seamlessly looping noise",
      deviations: [
        HASH_NOT_PERMUTATION,
        'Gradient selection is the reference one: the classic 32-vector 4D set (one component zero, the others ±1) chosen by hash bits, with no trigonometry. This is the only gradient noise in the repo that does it the reference way.',
      ],
      variantIds: ['simplex-loop-3d'],
    },
  ],
  worley: [
    {
      id: 'one-point-per-cell',
      name: 'One point per cell, F1',
      kind: 'alternative',
      evidence: 'paper-only',
      reference: {
        paper:
          'Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996). No code was published with the paper — it is prose and references only.',
        implementation:
          "cellular.c, by Worley, distributed separately from the paper. WARNING about the copies in circulation: github.com/bhickey/worley presents itself as Worley's reference \"released under the MIT license\" with a copyright line naming Worley, but the git history shows a third party added that MIT grant and DELETED Worley's original header — the very header Worley's terms require be kept. Rely on Worley's own terms, not that relicensing.",
        licence:
          'Permissive, from Worley\'s own header: "Copyright 1994, 2002 by Steven Worley. This software may be modified and redistributed without restriction provided this comment header remains intact in the source code." MIT-compatible, with the condition that the header travels with any transliteration.',
        url: 'http://www.worley.com/cellular.html (DEAD; the domain now belongs to an unrelated company and no archive of the file exists — it survives only through redistribution)',
      },
      follows: "Steven Worley, 'A Cellular Texture Basis Function' (SIGGRAPH 1996)",
      deviations: [
        ONE_POINT_PER_CELL,
        'Feature point positions come from the shared integer hash rather than a per-cube seeded random stream.',
        'F1 only. The paper defines a family F1..Fn and combinations of them; Crackle covers F2 - F1 separately.',
      ],
      rationale:
        "One point per cell is the ubiquitous real-time simplification — it is what essentially every shader implementation of cellular noise does, because a fixed loop count vectorises and a Poisson count does not.\n\nA complication worth knowing before treating either as gospel: WORLEY'S OWN CODE DISAGREES WITH WORLEY'S OWN PAPER. The paper describes mean density about 3-4 with the count clamped to 1..9, and offers 541i + 79j + 31k as an admittedly poor example hash. The released cellular.c uses mean 2.5, an unclamped 0..5 drawn from a 256-entry Poisson table indexed by the high byte of the seed, and the hash 702395077i + 915488749j + 2120969693k with an LCG. What the world reproduces is the code, so 'the Worley reference' has to name which one you mean.",
      variantIds: ['worley-2d', 'worley-3d'],
    },
    {
      id: 'split-bits-pruned',
      name: 'Split-bit offsets, pruned search',
      kind: 'alternative',
      evidence: 'paper-only',
      status: 'candidate',
      archivedAt: 'src/alt/worley-fast.ts',
      reference: {
        paper:
          'Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996). No code was published with the paper — it is prose and references only.',
        url: 'https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf',
      },
      follows: "Steven Worley, 'A Cellular Texture Basis Function' (SIGGRAPH 1996)",
      deviations: [
        ONE_POINT_PER_CELL,
        "ALL of a cell's offset axes are split out of ONE 32-bit hash (16+16 bits in 2D, 10+10+10 in 3D) — against the shipping three (2D) or five (3D) chained lowbias32 avalanches per cell — so feature-point positions are quantized to 2^-16 / 2^-10 of a cell. The mix differs by dimension: 2D uses one xor-shift, one multiply by 2^32/phi and a closing xor-shift (its position-bin battery passes at +x/+y/+xy); 3D uses the full lowbias32 shape, because the cheap mix fails +yz adjacency on the three-axis fold (chi-square 531-682 against a 255-df critical of 293) — a defect the first version of this file shipped until the simplex pass caught it. The upgrade cost ~13% of the 3D win.",
        "The neighbourhood search prunes: centre column/plane first, then a neighbouring column or plane only if its boundary distance still beats the current F1. Conservative, so the result is exactly the unpruned minimum (verified, zero mismatches over 600k probes). This is closer to the paper's own algorithm — Worley skips cubes that cannot contain a closer point — than the shipping exhaustive 9/27-cell loop is.",
      ],
      rationale:
        'The current challenger. Measured with `bun run bench:impl`: ~2.0x the shipping worley2 and ~3.4x worley3 on the CPU, best and median agreeing (3D includes the ~13% cost of the hash fix; the 2D figure is from an isolated run, per the harness caveat in bench.ts) — the win grows with dimension because a pruned 3D plane is nine cells never hashed. The 3D search is written out longhand because routing each plane through a many-argument helper left the speedup at the mercy of a fragile JIT inlining decision, measured swinging between 430 and 550 ms for identical semantics. Field mean/rms/extrema match the shipping worley to three decimals (different draw, same distribution). The GPU measurement, since taken via the hardened /bench harness, settled the divergence worry in favour of pruning: 1.16x the shipping worley2 and 2.0x worley3 on the GPU too (WebGL and WebGPU medians). This candidate now wins on every backend; what promotion still needs is the tileable paths.',
      variantIds: [],
    },
  ],
  'worley-manhattan': [
    {
      id: 'one-point-per-cell',
      name: 'One point per cell, L1',
      kind: 'alternative',
      evidence: 'paper-only',
      reference: {
        paper: 'Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996)',
        url: 'https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf',
      },
      follows:
        "Steven Worley (1996), which does discuss the Manhattan metric by name — it 'forms regions that are rigidly rectangular', which he suggests for spaceship hulls",
      deviations: [
        'Inherits the one-point-per-cell substrate from the shared cellular loop; only the distance function differs from plain Worley.',
        ONE_POINT_PER_CELL,
      ],
      variantIds: ['worley-manhattan-2d', 'worley-manhattan-3d'],
    },
    {
      id: 'split-bits-pruned',
      name: 'Split-bit offsets, pruned search (L1)',
      kind: 'alternative',
      evidence: 'paper-only',
      status: 'candidate',
      archivedAt: 'src/alt/worley-metrics-fast.ts',
      reference: {
        paper: 'Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996)',
        url: 'https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf',
      },
      follows: "Steven Worley, 'A Cellular Texture Basis Function' (SIGGRAPH 1996), Manhattan metric",
      deviations: [
        'The worley split-bits-pruned substrate under the L1 metric: one hash per cell with split-bit offsets, centre-first search. The prune bound composes ADDITIVELY across axes (a diagonal column clears |vx| + |vz| at least colDist + planeDist), still conservative, so the result is exactly the unpruned minimum (zero mismatches over 400k probes).',
      ],
      rationale:
        'Measured with `bun run bench:impl`: ~2.5x the shipping manhattan3 and ~1.7x manhattan2 on the CPU, and a GPU win too — 1.55x in 3D, 1.07x in 2D (WebGL+WebGPU medians). Field mean/rms/extrema match shipping to three decimals. Not promoted: no tileable paths yet.',
      variantIds: [],
    },
  ],
  'worley-chebyshev': [
    {
      id: 'one-point-per-cell',
      name: 'One point per cell, Linf',
      kind: 'alternative',
      evidence: 'paper-only',
      reference: {
        paper: 'Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996)',
        url: 'https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf',
      },
      follows: "Steven Worley's cellular basis, 'A Cellular Texture Basis Function' (SIGGRAPH 1996)",
      deviations: [
        "The Chebyshev metric is NOT in Worley's paper, which covers Manhattan by name and a radial variant. Linf is later shader folklore; only the cellular basis is traceable to the source.",
        'Inherits the one-point-per-cell substrate from the shared cellular loop; only the distance function differs from plain Worley.',
        ONE_POINT_PER_CELL,
      ],
      variantIds: ['worley-chebyshev-2d', 'worley-chebyshev-3d'],
    },
    {
      id: 'split-bits-pruned',
      name: 'Split-bit offsets, pruned search (Linf)',
      kind: 'alternative',
      evidence: 'paper-only',
      status: 'candidate',
      archivedAt: 'src/alt/worley-metrics-fast.ts',
      reference: {
        paper: 'Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996)',
        url: 'https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf',
      },
      follows: "Steven Worley's cellular basis, 'A Cellular Texture Basis Function' (SIGGRAPH 1996)",
      deviations: [
        "The Chebyshev metric is NOT in Worley's paper; only the cellular basis is traceable to the source (see the shipping entry).",
        'The worley split-bits-pruned substrate under the Linf metric: one hash per cell with split-bit offsets, centre-first search. The prune bound composes by MAX across axes, still conservative, so the result is exactly the unpruned minimum (zero mismatches over 400k probes).',
      ],
      rationale:
        'Measured with `bun run bench:impl`: ~2.5x the shipping chebyshev3 on the CPU, and a GPU win too — 1.9x in 3D, 1.09x in 2D (WebGL+WebGPU medians). chebyshev2 CPU is 1.2-1.45x ISOLATED but read 0.83x inside the full bench suite — the harness caveat in bench.ts, quoted here so nobody panics at the suite number. Field mean/rms/extrema match shipping to three decimals. Not promoted: no tileable paths yet.',
      variantIds: [],
    },
  ],
  gabor: [
    {
      id: 'one-impulse-per-cell',
      name: 'One impulse per cell',
      kind: 'alternative',
      evidence: 'paper-only',
      reference: {
        paper: 'Lagae, Lefebvre, Drettakis & Dutre, "Procedural Noise using Sparse Gabor Convolution" (SIGGRAPH 2009)',
        implementation:
          "noise.cpp, the authors' own example code (227 lines of C++), shipped with a reference image noise_reference.ppm. Two practical notes if it is ever transliterated: the reference seeds from std::time(0) so it is NOT bit-reproducible as shipped, and it does not compile on modern toolchains — its signature is `int main(int argc, char* argv)`.",
        licence: 'MIT, full text in the file, (c) 2009 the four authors. The cleanest licensing of any reference here.',
        url: 'https://graphics.cs.kuleuven.be/publications/LLDD09PNSGC/LLDD09PNSGC_code.zip',
      },
      follows: "Lagae, Lefebvre, Drettakis & Dutre, 'Procedural Noise using Sparse Gabor Convolution' (SIGGRAPH 2009)",
      deviations: [
        'One impulse per lattice cell, where the paper draws a Poisson-distributed count per cell (via Knuth for small means) at a density of 100 impulses per kernel on CPU, 25-50 on GPU. So this is not merely a simplification of the count — it is one to two orders of magnitude sparser than the paper runs it.',
        "Cells are seeded by the shared integer hash. The paper deliberately does NOT hash: it seeds by a bijective enumeration of cells (row-major, or Morton order for the nonperiodic case) and explicitly contrasts that choice with Lewis and Worley's random seeding.",
        'No analytic filtering, which along with being setup-free is what the paper is FOR. This is the plain evaluated form — the spectral control survives, the filtering does not.',
        `Kernel orientation reuses the shared gradient primitive. ${TRIG_GRADIENTS}`,
      ],
      rationale:
        "Keeps it a pure function of position, consistent with every other noise in the repo. The honest summary is that this implements the paper's kernel and its spectral parameterisation, not its sampling strategy or its filtering.",
      variantIds: ['gabor-2d', 'gabor-3d'],
    },
  ],
  marble: [
    {
      id: 'turbulence-cos',
      name: 'cos(x + turbulence)',
      kind: 'canonical',
      evidence: 'paper-only',
      reference: {
        paper: "Ken Perlin, 'An Image Synthesizer' (SIGGRAPH 1985)",
      },
      follows: "Ken Perlin, 'An Image Synthesizer' (1985)",
      deviations: [
        'cos rather than sin (a phase shift, not a different function) and a factor of pi, so the bands have an even period in lattice units and the pattern can tile.',
        "Turbulence is a fixed three octaves of |Perlin|. The 1985 paper's turbulence loop is band-limited — it runs `while (scale > pixelsize)`, an antialiasing criterion — rather than a fixed octave count. The absolute value is genuinely Perlin's, and so is perturbing x rather than y.",
        'The MARBLE_TURB strength constant has no counterpart in 1985; the original formula has no frequency or amplitude knobs at all.',
      ],
      variantIds: ['marble-2d', 'marble-3d'],
    },
  ],
  contour: [
    {
      id: 'cos-of-noise',
      name: 'cos of a noise value',
      kind: 'conventional',
      evidence: 'none',
      rationale:
        "Marble without the coordinate term. There is no other way it is normally written. Provenance: The 'sine of noise' iso-line idiom (shader folklore; no reference paper).",
      variantIds: ['contour-2d', 'contour-3d'],
    },
  ],
  mosaic: [
    {
      id: 'nearest-hash',
      name: 'Nearest-point hash',
      // Not folklore — Worley specifies it. p. 293: "If the F1 function
      // returns a unique ID number to represent the closest feature point's
      // identity, this number can be used to form values that are constant over
      // a Voronoi cell; for example to shade the entire cell a single constant
      // colour."
      kind: 'canonical',
      evidence: 'paper-only',
      reference: {
        paper: 'Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996), p. 293',
        url: 'https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf',
      },
      follows: 'Steven Worley (1996), which specifies the constant-per-Voronoi-cell shading explicitly',
      deviations: [ONE_POINT_PER_CELL],
      variantIds: ['mosaic-2d', 'mosaic-3d'],
    },
    {
      id: 'split-bits-pruned',
      name: 'Split-bit offsets, pruned search, winner re-hash',
      kind: 'canonical',
      evidence: 'paper-only',
      status: 'candidate',
      archivedAt: 'src/alt/cellular-fast.ts',
      reference: {
        paper: 'Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996), p. 293',
        url: 'https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf',
      },
      follows: 'Steven Worley (1996), which specifies the constant-per-Voronoi-cell shading explicitly',
      deviations: [
        ONE_POINT_PER_CELL,
        'The worley split-bits-pruned substrate, tracking WHICH cell won the F1 search. The flat cell value is one lowbias32 avalanche of the winning lattice fold — independent of the offset bits, so cell colours cannot correlate with feature-point positions. The shipping implementation spends 4-6 avalanches per cell; this spends one short mix per cell plus one avalanche for the winner. Pruning is exact (zero mismatches over 400k probes vs the unpruned reference).',
      ],
      rationale:
        'Measured with `bun run bench:impl`: 2.1x the shipping mosaic2 and 2.8x mosaic3 on the CPU, and a GPU win in 3D too — 1.9x (WebGL+WebGPU medians; 2D ~1.05x). Cell-value distribution matches shipping (mean 0.50, rms 0.577 — uniform). Not promoted: no tileable paths yet.',
      variantIds: [],
    },
  ],
  crackle: [
    {
      id: 'f2-minus-f1',
      name: 'F2 - F1',
      kind: 'canonical',
      evidence: 'paper-only',
      reference: {
        paper: "Steven Worley, 'A Cellular Texture Basis Function' (SIGGRAPH 1996)",
      },
      follows: 'Steven Worley (1996), which proposes F2 - F1 as a combination of the basis functions',
      deviations: [ONE_POINT_PER_CELL],
      variantIds: ['crackle-2d', 'crackle-3d'],
    },
    {
      id: 'split-bits-pruned',
      name: 'Split-bit offsets, F2-pruned search',
      kind: 'canonical',
      evidence: 'paper-only',
      status: 'candidate',
      archivedAt: 'src/alt/cellular-fast.ts',
      reference: {
        paper: "Steven Worley, 'A Cellular Texture Basis Function' (SIGGRAPH 1996)",
      },
      follows: 'Steven Worley (1996), which proposes F2 - F1 as a combination of the basis functions',
      deviations: [
        ONE_POINT_PER_CELL,
        'The worley split-bits-pruned substrate tracking F1 AND F2, pruning against F2: a skipped column can contain neither the nearest nor the second-nearest point, so the pair — and the difference — is exactly the unpruned one (zero mismatches over 400k probes).',
      ],
      rationale:
        'Measured with `bun run bench:impl`: ~1.3-1.45x the shipping crackle2 and 2.1x crackle3 on the CPU, and a GPU win in 3D too — 1.65x (WebGL+WebGPU medians; 2D ~1.03x). Field mean/rms match shipping. Not promoted: no tileable paths yet.',
      variantIds: [],
    },
  ],
  truchet: [
    {
      id: 'arc-distance',
      name: 'Arc-distance bands',
      kind: 'conventional',
      evidence: 'none',
      deviations: ['Tile orientation comes from one bit of the shared integer hash rather than a stored tile map.'],
      rationale:
        'Provenance: Truchet tiles (Sebastien Truchet 1704; the arc variant Cyril Stanley Smith 1987, public domain), shaded by distance to the nearest arc as is standard in shader implementations.',
      variantIds: ['truchet-2d'],
    },
  ],
  'simplex-value': [
    {
      id: 'kernel-weighted-values',
      name: 'Kernel-weighted lattice values',
      kind: 'novel',
      evidence: 'none',
      rationale:
        'Value noise on the simplex lattice: each simplex corner contributes its hashed value through the radial kernel instead of a gradient dot product. The simplex skew/unskew and the kernel are Perlin/Gustavson; substituting values for gradients is what appears to be original.',
      variantIds: ['simplex-value-2d', 'simplex-value-3d'],
    },
  ],
  wave: [
    {
      id: 'blended-corner-waves',
      name: 'Quintic-blended corner plane waves',
      kind: 'novel',
      evidence: 'none',
      rationale:
        'Each lattice corner emits a hashed plane wave and the corner waves are blended with the quintic fade. Related in spirit to Gabor and phasor noise, but reached by lattice blending rather than kernel summation, which is why it costs a fraction of the real Gabor.',
      variantIds: ['wave-2d', 'wave-3d'],
    },
  ],
  ripple: [
    {
      id: 'windowed-radial-waves',
      name: 'Windowed radial waves',
      kind: 'novel',
      evidence: 'none',
      rationale:
        "Radial cosine waves emitted from Worley-style feature points, windowed so contributions vanish inside the searched neighbourhood. A sparse-convolution noise with a radial kernel; inherits the cellular loop's one-point-per-cell substrate.",
      variantIds: ['ripple-2d', 'ripple-3d'],
    },
    {
      id: 'split-bits-pruned',
      name: 'Split-bit offsets, window-gated kernel',
      kind: 'novel',
      evidence: 'none',
      status: 'candidate',
      archivedAt: 'src/alt/cellular-fast.ts',
      rationale:
        'One hash per cell with split-bit offsets and the wave phase from a cheap remix, against the shipping 4-6 chained avalanches. The window radius (1.5 cells) exceeds every column bound, so — uniquely in the cellular sweep — NO cell can be pruned; but a cell outside the window support contributes exactly zero, and the shipping loop still pays its sqrt and cos before multiplying by that zero. Gating on d^2 >= 2.25 first makes far cells cost one mix and one compare, exactly (same values as an ungated loop with this hash). Field mean/rms match shipping. Measured with `bun run bench:impl`: ~1.5x the shipping ripple2 and ~2.15x ripple3 on the CPU; GPU 1.1x (2D) and 1.26x (3D) on WebGL+WebGPU. Not promoted: no tileable paths yet.',
      variantIds: [],
    },
  ],
  foam: [
    {
      id: 'max-of-domes',
      name: 'Max of spherical domes',
      kind: 'novel',
      evidence: 'none',
      rationale:
        'Maximum of sqrt(R^2 - d^2) domes over the feature points. Related to metaball and sparse-convolution folklore, but the max-of-domes formulation appears to be original.',
      variantIds: ['foam-2d', 'foam-3d'],
    },
    {
      id: 'split-bits-pruned',
      name: 'Split-bit offsets, dome-pruned search, one sqrt',
      kind: 'novel',
      evidence: 'none',
      status: 'candidate',
      archivedAt: 'src/alt/cellular-fast.ts',
      rationale:
        'The worley split-bits-pruned substrate tracking q = max(R^2 - d^2), which is monotone with the dome height — so the whole search costs ONE sqrt where the shipping loop pays one per contributing cell, and R^2 - q doubles as the prune threshold, tightening as q grows. Exact (zero mismatches over 400k probes). Measured with `bun run bench:impl`: ~1.8-2.2x the shipping foam2 and ~3.0x foam3 on the CPU. GPU: 2.05x shipping in 3D and ~1.07x in 2D (WebGL+WebGPU medians). Not promoted: no tileable paths yet.',
      variantIds: [],
    },
  ],
  stars: [
    {
      id: 'gaussian-splats',
      name: 'Summed Gaussian splats',
      kind: 'novel',
      evidence: 'none',
      rationale:
        'Sum of exp(-d^2 * k) splats with hashed brightness over the feature points. Gaussian splatting is folklore; this particular basis is original.',
      variantIds: ['stars-2d', 'stars-3d'],
    },
    {
      id: 'split-bits-pruned',
      name: 'Split-bit offsets, cutoff-pruned splat sum',
      kind: 'novel',
      evidence: 'none',
      status: 'candidate',
      archivedAt: 'src/alt/cellular-fast.ts',
      rationale:
        'The worley split-bits-pruned substrate over the splat sum, with one deliberate approximation a SUM requires for pruning: contributions with d^2 >= 0.77 — where exp(-18 d^2) is under 1e-6, three orders below an 8-bit display quantum — are dropped, and any column or plane whose boundary clears that cutoff is never hashed. Brightness comes from one cheap remix of the cell hash. Field mean/rms/extrema match shipping to three decimals. Measured with `bun run bench:impl`: ~2.1-2.3x the shipping stars2 and ~4.1x stars3 on the CPU — the largest 3D win of the cellular sweep, because the cutoff also eliminates most exp() calls. GPU: 1.05x (2D) and 1.55x (3D) on WebGL+WebGPU; the Three.js TSL 3D column reads ~0.73x — the one backend where the divergent early-outs cost more than the skipped exps save. Not promoted: no tileable paths yet.',
      variantIds: [],
    },
  ],
  vortex: [
    {
      id: 'blended-angle',
      name: 'Angle of a blended vector field',
      kind: 'novel',
      evidence: 'none',
      rationale:
        'Hashed unit vectors at the lattice corners are blended with the quintic fade and the ANGLE of the result is displayed as cos(2*theta), so the singularities where the blend cancels become pinwheels. Reading the angle of a blended random vector field appears to be original.',
      variantIds: ['vortex-2d', 'vortex-3d'],
    },
  ],
}

/** Every implementation in the inventory, flattened, tagged with its noise id. */
export const allImplementations = (): { noiseId: string; implementation: NoiseImplementation }[] =>
  Object.entries(IMPLEMENTATIONS).flatMap(([noiseId, impls]) =>
    impls.map(implementation => ({ noiseId, implementation })),
  )

/** The implementation a variant belongs to, for cost tables and UI labelling. */
export const implementationOf = (variantId: string): NoiseImplementation | undefined => {
  for (const impls of Object.values(IMPLEMENTATIONS)) {
    const found = impls.find(i => i.variantIds.includes(variantId))
    if (found) return found
  }
  return undefined
}

/** The implementation a caller gets from `noisetoy` when they do not ask for one. */
export const defaultImplementationOf = (noiseId: string): NoiseImplementation | undefined =>
  IMPLEMENTATIONS[noiseId]?.find(i => !i.status)

export const IMPLEMENTATION_STATUS_LABEL: Record<NonNullable<NoiseImplementation['status']>, string> = {
  superseded: 'Superseded',
  baseline: 'Baseline',
  candidate: 'Candidate',
}

export const IMPLEMENTATION_STATUS_BLURB: Record<NonNullable<NoiseImplementation['status']>, string> = {
  superseded: 'Was the default and lost a measured comparison; kept so the comparison can be re-run.',
  baseline: 'Never a candidate to ship; exists only to be measured against.',
  candidate:
    'Beats the shipping implementation on at least one backend but is not yet promoted; its rationale records where the comparison stands.',
}

// ---------------------------------------------------------------------------
// Runnable stand-ins for the non-shipping implementations.
//
// A registry variant is the full contract: four languages, tileable paths, a
// cost-model entry. An AltVariant is the runnable slice of that contract a
// non-shipping implementation carries: the TS samplers plus GLSL/WGSL/TSL
// shader specs, display-mapped exactly like the registry variant it stands in
// for, so previews, exports and benchmarks are apples-to-apples with the
// shipping row on every backend. What it deliberately lacks is the tileable
// paths and a cost entry — growing those, and winning the GPU measurement the
// shader specs now make possible, is what promotion means.
//
// Shader function names carry a Fast/Trig suffix so a stack can compose a
// candidate next to the shipping chunk of the same noise without collisions.

import type { ShaderSpec } from './registry'

export type AltSampleFn = (x: number, y: number, z: number) => number

export type AltVariant = {
  /** Globally unique: `${variantId}@${implementationId}`. */
  id: string
  /** The registry variant this stands in for, e.g. 'perlin-2d'. */
  variantId: string
  noiseId: string
  /** The inventory implementation (always one with `status` set) providing it. */
  implementationId: string
  dim: 2 | 3
  /** Pre-clamp display value, same mapping as the registry variant's sampleRaw. */
  sampleRaw: AltSampleFn
  /** Display sample, clamped to [0, 1], same contract as the registry's sample. */
  sample: AltSampleFn
  /** Shader specs, same shape and display mapping as the registry variant's. */
  glsl: ShaderSpec
  wgsl: ShaderSpec
  tsl: ShaderSpec
  /**
   * Cost of one evaluation in the shared unit (Perlin 3D = 1, see cost.ts) —
   * a transferred estimate in the cost model's own sense: the registry
   * variant's VARIANT_COST scaled by the measured GPU throughput ratio
   * between the two implementations (WebGL and WebGPU medians from the
   * hardened /bench harness, reference machine). Kept here rather than in
   * the core table so the core stays free of implementation knowledge.
   */
  cost: number
}

const spec = (dim: 2 | 3, deps: string[], expr: string): ShaderSpec => ({ dim, deps, expr })

/** value * (0.5 * norm) + 0.5, unclamped — matches signedExpr in the registry. */
const signedText = (norm: number, call: string): string => `0.5 + 0.5 * ${fmt(norm)} * ${call}`

const signedTsl = (norm: number, call: string): string => `${call}.mul(${0.5 * norm}).add(0.5)`

type AltShaders = { glsl: ShaderSpec; wgsl: ShaderSpec; tsl: ShaderSpec }

const altVariant = (
  noiseId: string,
  implementationId: string,
  dim: 2 | 3,
  cost: number,
  sampleRaw: AltSampleFn,
  shaders: AltShaders,
): AltVariant => ({
  id: `${noiseId}-${dim}d@${implementationId}`,
  variantId: `${noiseId}-${dim}d`,
  noiseId,
  implementationId,
  dim,
  cost,
  sampleRaw,
  sample: (x, y, z) => clamp01(sampleRaw(x, y, z)),
  ...shaders,
})

/**
 * The three language specs for one candidate call, sharing one display
 * expression shape: null norm renders raw, 'signed' maps 0.5 + 0.5 * norm * v
 * (Perlin-family), 'unsigned' maps norm * v (distance-family).
 */
const fastShaders = (
  dim: 2 | 3,
  chunks: { glsl: string; wgsl: string; tsl: string },
  call: string,
  norm: number | null,
  mode: 'signed' | 'unsigned' = 'signed',
): AltShaders => {
  const text = norm === null ? call : mode === 'signed' ? signedText(norm, call) : `${fmt(norm)} * ${call}`
  const tslText = norm === null ? call : mode === 'signed' ? signedTsl(norm, call) : `${call}.mul(${norm})`
  return {
    glsl: spec(dim, [FAST_COMMON_GLSL, chunks.glsl], text),
    wgsl: spec(dim, [FAST_COMMON_WGSL, chunks.wgsl], text),
    tsl: spec(dim, [FAST_COMMON_TSL, chunks.tsl], tslText),
  }
}

const PERLIN_FAST_CHUNKS = { glsl: PERLIN_FAST_GLSL, wgsl: PERLIN_FAST_WGSL, tsl: PERLIN_FAST_TSL }
const SIMPLEX_FAST_CHUNKS = { glsl: SIMPLEX_FAST_GLSL, wgsl: SIMPLEX_FAST_WGSL, tsl: SIMPLEX_FAST_TSL }
const WORLEY_FAST_CHUNKS = { glsl: WORLEY_FAST_GLSL, wgsl: WORLEY_FAST_WGSL, tsl: WORLEY_FAST_TSL }
const CELLULAR_FAST_CHUNKS = { glsl: CELLULAR_FAST_GLSL, wgsl: CELLULAR_FAST_WGSL, tsl: CELLULAR_FAST_TSL }
const WORLEY_METRICS_FAST_CHUNKS = {
  glsl: WORLEY_METRICS_FAST_GLSL,
  wgsl: WORLEY_METRICS_FAST_WGSL,
  tsl: WORLEY_METRICS_FAST_TSL,
}

/**
 * Display mappings mirror the registry: Perlin and Simplex are signed noises
 * mapped 0.5 + 0.5 * norm * raw; Worley's F1 distance is displayed raw.
 *
 * Costs, per the AltVariant doc, are the shipping VARIANT_COST scaled by the
 * measured GPU throughput ratio. The measurements (Msamples/s, WebGL /
 * WebGPU, 512x512, median of 5 calibrated batches): Perlin and Simplex
 * candidates are GPU TIES with shipping (ratios 0.98-1.00), so they keep the
 * shipping figures (0.23/0.42 and 0.29/0.39 after the ~2% tie). The pruned
 * Worley WINS on the GPU: 5274/3617 against shipping 4546/3101 in 2D (0.86x
 * the cost -> 0.51) and 3422/3216 against 1712/1723 in 3D (0.52x -> 1.2) —
 * the branch-divergence worry never materialized.
 */
export const ALT_VARIANTS: AltVariant[] = [
  altVariant(
    'perlin',
    'fib-hash',
    2,
    0.23,
    (x, y) => 0.5 + 0.5 * PERLIN2_NORM * perlinFast2(x, y),
    fastShaders(2, PERLIN_FAST_CHUNKS, 'perlinFast2(p)', PERLIN2_NORM),
  ),
  altVariant(
    'perlin',
    'fib-hash',
    3,
    0.42,
    (x, y, z) => 0.5 + 0.5 * PERLIN3_NORM * perlinFast3(x, y, z),
    fastShaders(3, PERLIN_FAST_CHUNKS, 'perlinFast3(p)', PERLIN3_NORM),
  ),
  // Flow's display mapping reuses PERLIN2_NORM like the shipping flow (unit
  // gradients in both). GPU measured a slight candidate win (WebGL 4688 vs
  // 4572, WebGPU 3305 vs 3179 Msamples/s), ratio ~0.97 -> cost 0.52.
  altVariant(
    'flow',
    'fast-rot',
    3,
    0.52,
    (x, y, z) => 0.5 + 0.5 * PERLIN2_NORM * flowFast3(x, y, z),
    fastShaders(3, { glsl: FLOW_FAST_GLSL, wgsl: FLOW_FAST_WGSL, tsl: FLOW_FAST_TSL }, 'flowFast3(p)', PERLIN2_NORM),
  ),
  // Same gradient set and kernel as the shipping simplex, so the shipping
  // norms apply unchanged.
  altVariant(
    'simplex',
    'fast-hash',
    2,
    0.29,
    (x, y) => 0.5 + 0.5 * SIMPLEX2_NORM * simplexFast2(x, y),
    fastShaders(2, SIMPLEX_FAST_CHUNKS, 'simplexFast2(p)', SIMPLEX2_NORM),
  ),
  altVariant(
    'simplex',
    'fast-hash',
    3,
    0.39,
    (x, y, z) => 0.5 + 0.5 * SIMPLEX3_NORM * simplexFast3(x, y, z),
    fastShaders(3, SIMPLEX_FAST_CHUNKS, 'simplexFast3(p)', SIMPLEX3_NORM),
  ),
  altVariant(
    'worley',
    'split-bits-pruned',
    2,
    0.51,
    (x, y) => worleyFast2(x, y),
    fastShaders(2, WORLEY_FAST_CHUNKS, 'worleyFast2(p)', null),
  ),
  altVariant(
    'worley',
    'split-bits-pruned',
    3,
    1.2,
    (x, y, z) => worleyFast3(x, y, z),
    fastShaders(3, WORLEY_FAST_CHUNKS, 'worleyFast3(p)', null),
  ),
  // Metric-candidate costs: shipping VARIANT_COST x measured GPU throughput
  // ratio (WebGL+WebGPU medians). Manhattan: 0.94 (2D) / 0.65 (3D).
  // Chebyshev: 0.92 (2D) / 0.52 (3D).
  // Ripple costs: shipping VARIANT_COST x measured GPU ratio, 0.91 (2D) and
  // 0.79 (3D) — WebGL+WebGPU medians.
  altVariant(
    'ripple',
    'split-bits-pruned',
    2,
    0.9,
    (x, y) => 0.5 + 0.5 * RIPPLE_NORM * rippleFast2(x, y),
    fastShaders(2, CELLULAR_FAST_CHUNKS, 'rippleFast2(p)', RIPPLE_NORM),
  ),
  altVariant(
    'ripple',
    'split-bits-pruned',
    3,
    2.8,
    (x, y, z) => 0.5 + 0.5 * RIPPLE_NORM * rippleFast3(x, y, z),
    fastShaders(3, CELLULAR_FAST_CHUNKS, 'rippleFast3(p)', RIPPLE_NORM),
  ),
  // Stars costs: shipping VARIANT_COST x measured GPU ratio, 0.97 (2D) and
  // 0.65 (3D) — WebGL+WebGPU medians.
  altVariant(
    'stars',
    'split-bits-pruned',
    2,
    0.81,
    (x, y) => STARS_NORM * starsFast2(x, y),
    fastShaders(2, CELLULAR_FAST_CHUNKS, 'starsFast2(p)', STARS_NORM, 'unsigned'),
  ),
  altVariant(
    'stars',
    'split-bits-pruned',
    3,
    2.0,
    (x, y, z) => STARS_NORM * starsFast3(x, y, z),
    fastShaders(3, CELLULAR_FAST_CHUNKS, 'starsFast3(p)', STARS_NORM, 'unsigned'),
  ),
  // Foam costs: shipping VARIANT_COST x measured GPU ratio, 0.94 (2D) and
  // 0.50 (3D) — WebGL+WebGPU medians.
  altVariant(
    'foam',
    'split-bits-pruned',
    2,
    0.59,
    (x, y) => foamFast2(x, y),
    fastShaders(2, CELLULAR_FAST_CHUNKS, 'foamFast2(p)', null),
  ),
  altVariant(
    'foam',
    'split-bits-pruned',
    3,
    1.25,
    (x, y, z) => foamFast3(x, y, z),
    fastShaders(3, CELLULAR_FAST_CHUNKS, 'foamFast3(p)', null),
  ),
  // Crackle costs: shipping VARIANT_COST x measured GPU ratio, 0.97 (2D)
  // and 0.61 (3D) — WebGL+WebGPU medians.
  altVariant(
    'crackle',
    'split-bits-pruned',
    2,
    0.58,
    (x, y) => CRACKLE_NORM * crackleFast2(x, y),
    fastShaders(2, CELLULAR_FAST_CHUNKS, 'crackleFast2(p)', CRACKLE_NORM, 'unsigned'),
  ),
  altVariant(
    'crackle',
    'split-bits-pruned',
    3,
    1.45,
    (x, y, z) => CRACKLE_NORM * crackleFast3(x, y, z),
    fastShaders(3, CELLULAR_FAST_CHUNKS, 'crackleFast3(p)', CRACKLE_NORM, 'unsigned'),
  ),
  // Mosaic cost: shipping VARIANT_COST x measured GPU ratio, 0.96 (2D) and
  // 0.53 (3D) — WebGL+WebGPU medians.
  altVariant(
    'mosaic',
    'split-bits-pruned',
    2,
    0.6,
    (x, y) => mosaicFast2(x, y),
    fastShaders(2, CELLULAR_FAST_CHUNKS, 'mosaicFast2(p)', null),
  ),
  altVariant(
    'mosaic',
    'split-bits-pruned',
    3,
    1.3,
    (x, y, z) => mosaicFast3(x, y, z),
    fastShaders(3, CELLULAR_FAST_CHUNKS, 'mosaicFast3(p)', null),
  ),
  altVariant(
    'worley-manhattan',
    'split-bits-pruned',
    2,
    0.54,
    (x, y) => MANHATTAN2_NORM * manhattanFast2(x, y),
    fastShaders(2, WORLEY_METRICS_FAST_CHUNKS, 'manhattanFast2(p)', MANHATTAN2_NORM, 'unsigned'),
  ),
  altVariant(
    'worley-manhattan',
    'split-bits-pruned',
    3,
    1.5,
    (x, y, z) => MANHATTAN3_NORM * manhattanFast3(x, y, z),
    fastShaders(3, WORLEY_METRICS_FAST_CHUNKS, 'manhattanFast3(p)', MANHATTAN3_NORM, 'unsigned'),
  ),
  altVariant(
    'worley-chebyshev',
    'split-bits-pruned',
    2,
    0.53,
    (x, y) => CHEBYSHEV2_NORM * chebyshevFast2(x, y),
    fastShaders(2, WORLEY_METRICS_FAST_CHUNKS, 'chebyshevFast2(p)', CHEBYSHEV2_NORM, 'unsigned'),
  ),
  altVariant(
    'worley-chebyshev',
    'split-bits-pruned',
    3,
    1.2,
    (x, y, z) => CHEBYSHEV3_NORM * chebyshevFast3(x, y, z),
    fastShaders(3, WORLEY_METRICS_FAST_CHUNKS, 'chebyshevFast3(p)', CHEBYSHEV3_NORM, 'unsigned'),
  ),
]

export const altVariantsFor = (noiseId: string, implementationId: string): AltVariant[] =>
  ALT_VARIANTS.filter(v => v.noiseId === noiseId && v.implementationId === implementationId)
