// WGSL counterpart of wave-tileable.ts. Requires COMMON_WGSL and WAVE_WGSL
// (reuses waveCorner2/waveCorner3).

export const WAVE_TILEABLE_WGSL = /* wgsl */ `
fn wave2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let px = i32(per.x);
  let py = i32(per.y);
  let x0 = imod(i32(i.x), px);
  let x1 = imod(i32(i.x) + 1, px);
  let y0 = imod(i32(i.y), py);
  let y1 = imod(i32(i.y) + 1, py);
  let s00 = waveCorner2(hash2u(x0, y0), f);
  let s10 = waveCorner2(hash2u(x1, y0), f - vec2f(1.0, 0.0));
  let s01 = waveCorner2(hash2u(x0, y1), f - vec2f(0.0, 1.0));
  let s11 = waveCorner2(hash2u(x1, y1), f - vec2f(1.0, 1.0));
  return mix(mix(s00, s10, ux), mix(s01, s11, ux), uy);
}

fn wave3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let px = i32(per.x);
  let py = i32(per.y);
  let x0 = imod(i32(i.x), px);
  let x1 = imod(i32(i.x) + 1, px);
  let y0 = imod(i32(i.y), py);
  let y1 = imod(i32(i.y) + 1, py);
  let iz = i32(i.z);
  let s000 = waveCorner3(hash3u(x0, y0, iz), f);
  let s100 = waveCorner3(hash3u(x1, y0, iz), f - vec3f(1.0, 0.0, 0.0));
  let s010 = waveCorner3(hash3u(x0, y1, iz), f - vec3f(0.0, 1.0, 0.0));
  let s110 = waveCorner3(hash3u(x1, y1, iz), f - vec3f(1.0, 1.0, 0.0));
  let s001 = waveCorner3(hash3u(x0, y0, iz + 1), f - vec3f(0.0, 0.0, 1.0));
  let s101 = waveCorner3(hash3u(x1, y0, iz + 1), f - vec3f(1.0, 0.0, 1.0));
  let s011 = waveCorner3(hash3u(x0, y1, iz + 1), f - vec3f(0.0, 1.0, 1.0));
  let s111 = waveCorner3(hash3u(x1, y1, iz + 1), f - vec3f(1.0, 1.0, 1.0));
  let nz0 = mix(mix(s000, s100, ux), mix(s010, s110, ux), uy);
  let nz1 = mix(mix(s001, s101, ux), mix(s011, s111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
