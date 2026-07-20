// Tileable white noise: cell coordinates are wrapped modulo an integer period
// in x and y before hashing, so the field repeats every `px` x `py` cells.
// This wrapping is deliberately kept out of the core implementation.

import { hash2, hash3, imod, to01 } from '../common'

export const white2Tileable = (x: number, y: number, px: number, py: number): number =>
  to01(hash2(imod(Math.floor(x), px), imod(Math.floor(y), py)))

export const white3Tileable = (x: number, y: number, z: number, px: number, py: number): number =>
  to01(hash3(imod(Math.floor(x), px), imod(Math.floor(y), py), Math.floor(z)))
