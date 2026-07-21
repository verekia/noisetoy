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

import { perlinFast2, perlinFast3 } from './alt/perlin-fast'
import { simplex2 as simplexTrig2, simplex3 as simplexTrig3 } from './alt/simplex-trig'
import { worleyFast2, worleyFast3 } from './alt/worley-fast'
import { clamp01, PERLIN2_NORM, PERLIN3_NORM } from './noises/normalization'

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
   * needs the GLSL/WGSL/TSL backends and a GPU measurement it does not yet
   * have. Either way it provides no registry variants, so `variantIds` is
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
        "A corner hash is one xor-shift and one multiply by 2^32/phi (Knuth multiplicative hashing) with every selection bit read from the TOP of the product, against the shipping implementation's full lowbias32 avalanche per corner. The pre-multiply xor-shift is load-bearing: without it the corner mix is affine in the lattice coordinates and neighbouring gradients correlate in a fixed pattern.",
        'In 2D the xor-shift is hoisted out of the corners (applied to the two x lattice products, corners then combine by xor); the same hoist in 3D failed adjacent-corner chi-square (216 against a 143-df critical of 172), so 3D keeps the per-corner mix of the folded sum, which passes.',
        'The 2D corner dots are factored: with the four diagonal gradients every dot is +-(fx + fy) or +-(fx - fy) up to a per-corner integer shift, so both bases are computed once per sample and a corner is a select, an add and a sign flip. The gradient set matches the shipping gradTable2, which draws the same four diagonals (its slots 4-7 repeat slots 0-3 with the operands swapped).',
        "3D keeps the reference's 12 cube-edge gradient set, chosen by the same integer range split as the shipping gradTable3, reading the low 30 bits so the axis choice stays disjoint from the sign bits at 30/31.",
      ],
      rationale:
        "The current challenger, and the measured FLOOR of the scalar form: a second tuning pass tried a hoisted 3D pre-mix, weighted-sum interpolation, an Estrin-reassociated fade, branchless 2D signs and a bias-trick floor, and every one measured flat or worse over 8-12 interleaved repeats — the FP skeleton (floors, fades, lerps) is ~156 ms of the ~190/~222 ms totals in the bench harness, so the remaining integer work sits latency-hidden behind it. Details in the source header. Measured with `bun run bench:impl`: ~1.3x the shipping perlin3 (stable across runs) and ~1.1x perlin2 (noisy, 1.08-1.27x run to run) on the CPU. Gradient marginals, adjacent-corner joints along each axis and a checkerboard split all sit inside the 95% chi-square criticals, and the assembled field's mean, RMS, extrema and lattice-lag autocorrelation match the shipping perlin to three decimals — but the field is a DIFFERENT DRAW, so promotion would change the pattern every consumer sees. Not promoted because it has no GLSL/WGSL/TSL backends yet and the GPU is unmeasured, and a narrower avalanche is precisely the kind of trade a GPU prices differently.",
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
        "Gradients are Gustavson's own 12 cube-edge vectors, shared with Perlin through gradTable3 in common.ts. This is 2.4x faster in both 2D and 3D on the CPU than the trigonometric construction kept at alt/simplex-trig.ts (`bun run bench:impl`), a modest win because simplex evaluates only 3 or 4 corners, so the skew and corner-ranking arithmetic is a larger share of what remains.\n\nMeasured against Gustavson's actual reference (in a baseline not kept in the repo): speed was a DEAD HEAT, 0.99x in 3D and 1.00x in 2D. That is the opposite of the Perlin result, where the permutation table beat the folded hash by ~8%, and the reason is structural — simplex chains its lookups as perm[ii + perm[jj + perm[kk]]], so the loads are dependent and serialise, while the folded hash computes each corner independently. Amplitude, with the reference's own scale factor applied to ours for comparison: 2D is 1.21x the reference (gradient set alone, same kernel), 3D is 0.38x (the kernel fork below).",
      variantIds: ['simplex-2d', 'simplex-3d'],
    },
    {
      id: 'trig-gradients',
      name: 'Trig unit gradients',
      kind: 'alternative',
      evidence: 'paper-only',
      status: 'superseded',
      archivedAt: 'src/alt/simplex-trig.ts',
      reference: {
        paper: 'Stefan Gustavson, "Simplex noise demystified" (2005), after Ken Perlin (2001)',
        implementation: 'SimplexNoise.java, by Gustavson',
        licence: 'Placed in the public domain by the author',
        url: 'https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf',
      },
      follows: "Ken Perlin's simplex noise (2001) in Stefan Gustavson's 'Simplex noise demystified' (2005) formulation",
      deviations: [
        `${TRIG_GRADIENTS} Gustavson's reference indexes the 12 cube-edge vectors (2D reuses the same table with z dropped).`,
        HASH_NOT_PERMUTATION,
        "The 3D kernel radius is 0.5 where Gustavson's reference uses 0.6. Two lineages exist: the historical (0.6 - r^2)^4, and the corrected (0.5 - r^2)^3 of Gustavson & McEwan 2022, who show 0.6 makes the region of influence too large and leaves the field discontinuous at simplex boundaries. This code pairs 0.5 with exponent 4, which belongs to neither: continuous like the corrected form, but lower amplitude than either, since the exponent was not reduced to compensate. 2D is unaffected — the reference uses 0.5 there too.",
        "The reference's final scale factors (70 in 2D, 32 in 3D) are not applied; normalization is deferred to the display layer and was recalibrated empirically to 90 and 98. That recalibration is partly the unit gradients and partly the kernel-radius fork above, which is exactly why the numbers are so far from the reference ones.",
        'The skew/unskew constants F2/G2/F3/G3, the corner-ranking ladder and the t^4 exponent are the reference ones.',
      ],
      rationale:
        "The repo's original Simplex, kept so the comparison can be re-run. Same gradient trade Perlin made, and it lost the same way: 2.4x on the CPU. The GPU comparison has not been run, and psrdnoise's argument for trigonometric gradients was about GPUs specifically.",
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
        'A cell costs one xor-shift, one multiply by 2^32/phi and one closing xor-shift, with ALL offset axes split out of the single 32-bit product (16+16 bits in 2D, 10+10+10 in 3D) — against the shipping three (2D) or five (3D) chained lowbias32 avalanches per cell. Feature-point positions are therefore quantized to 2^-16 / 2^-10 of a cell; offset uniformity and cross-cell independence measured inside the 95% chi-square criticals over 1M cells.',
        "The neighbourhood search prunes: centre column/plane first, then a neighbouring column or plane only if its boundary distance still beats the current F1. Conservative, so the result is exactly the unpruned minimum (verified, zero mismatches over 600k probes). This is closer to the paper's own algorithm — Worley skips cubes that cannot contain a closer point — than the shipping exhaustive 9/27-cell loop is.",
      ],
      rationale:
        'The current challenger. Measured with `bun run bench:impl`: 2.0x the shipping worley2 and ~3.8x worley3 on the CPU (best and median agreeing) — the win grows with dimension because a pruned 3D plane is nine cells never hashed. The 3D search is written out longhand because routing each plane through a many-argument helper left the speedup at the mercy of a fragile JIT inlining decision, measured swinging between 430 and 550 ms for identical semantics. Field mean/rms/extrema match the shipping worley to three decimals (different draw, same distribution). Not promoted for the same reasons as the Perlin candidate: no GLSL/WGSL/TSL backends yet, and the pruning branches are exactly what a GPU pays divergence for, so the GPU needs its own measurement.',
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
    'Currently beats the shipping implementation on the CPU, but is not promoted: no GPU backends yet, GPU unmeasured.',
}

// ---------------------------------------------------------------------------
// Runnable stand-ins for the non-shipping implementations.
//
// A registry variant is the full contract — four languages, tiling, cost
// entry. A non-shipping implementation has none of that, but it still needs to
// be RUNNABLE or the inventory's speed claims cannot be checked outside this
// repo, and the explorer cannot show what an implementation looks like. An
// AltVariant is the minimal runnable slice: the TS samplers, display-mapped
// exactly like the registry variant it stands in for, so previews and
// benchmarks are apples-to-apples with the shipping row.
//
// TS-only on purpose. The moment one of these grows the other three languages
// and a GPU measurement, it stops being an AltVariant and gets PROMOTED.

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
}

// The display norms of the superseded trig Simplex. These are NOT the shipping
// SIMPLEX*_NORMs: the unit gradients and the kernel-radius fork put its
// amplitude elsewhere, and it was calibrated empirically to these values when
// it was the default (see its inventory entry above).
const SIMPLEX_TRIG2_NORM = 90
const SIMPLEX_TRIG3_NORM = 98

const altVariant = (noiseId: string, implementationId: string, dim: 2 | 3, sampleRaw: AltSampleFn): AltVariant => ({
  id: `${noiseId}-${dim}d@${implementationId}`,
  variantId: `${noiseId}-${dim}d`,
  noiseId,
  implementationId,
  dim,
  sampleRaw,
  sample: (x, y, z) => clamp01(sampleRaw(x, y, z)),
})

/**
 * Display mappings mirror the registry: Perlin and Simplex are signed noises
 * mapped 0.5 + 0.5 * norm * raw; Worley's F1 distance is displayed raw.
 */
export const ALT_VARIANTS: AltVariant[] = [
  altVariant('perlin', 'fib-hash', 2, (x, y) => 0.5 + 0.5 * PERLIN2_NORM * perlinFast2(x, y)),
  altVariant('perlin', 'fib-hash', 3, (x, y, z) => 0.5 + 0.5 * PERLIN3_NORM * perlinFast3(x, y, z)),
  altVariant('simplex', 'trig-gradients', 2, (x, y) => 0.5 + 0.5 * SIMPLEX_TRIG2_NORM * simplexTrig2(x, y)),
  altVariant('simplex', 'trig-gradients', 3, (x, y, z) => 0.5 + 0.5 * SIMPLEX_TRIG3_NORM * simplexTrig3(x, y, z)),
  altVariant('worley', 'split-bits-pruned', 2, (x, y) => worleyFast2(x, y)),
  altVariant('worley', 'split-bits-pruned', 3, (x, y, z) => worleyFast3(x, y, z)),
]

export const altVariantsFor = (noiseId: string, implementationId: string): AltVariant[] =>
  ALT_VARIANTS.filter(v => v.noiseId === noiseId && v.implementationId === implementationId)
