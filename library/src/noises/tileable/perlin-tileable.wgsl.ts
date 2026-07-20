// WGSL counterpart of perlin-tileable.ts. Requires COMMON_WGSL and PERLIN_WGSL
// (for perlinGrad2 / perlinGrad3).

export const PERLIN_TILEABLE_WGSL = /* wgsl */ `
fn perlin2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let px = i32(per.x);
  let py = i32(per.y);
  let x0 = bitcast<u32>(imod(i32(i.x), px)) * LATTICE_HX;
  let x1 = bitcast<u32>(imod(i32(i.x) + 1, px)) * LATTICE_HX;
  let y0 = bitcast<u32>(imod(i32(i.y), py)) * LATTICE_HY;
  let y1 = bitcast<u32>(imod(i32(i.y) + 1, py)) * LATTICE_HY;
  let g00 = gradTable2(lowbias32(x0 + y0), f);
  let g10 = gradTable2(lowbias32(x1 + y0), f - vec2f(1.0, 0.0));
  let g01 = gradTable2(lowbias32(x0 + y1), f - vec2f(0.0, 1.0));
  let g11 = gradTable2(lowbias32(x1 + y1), f - vec2f(1.0, 1.0));
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}

fn perlin3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let px = i32(per.x);
  let py = i32(per.y);
  let x0 = bitcast<u32>(imod(i32(i.x), px)) * LATTICE_HX;
  let x1 = bitcast<u32>(imod(i32(i.x) + 1, px)) * LATTICE_HX;
  let y0 = bitcast<u32>(imod(i32(i.y), py)) * LATTICE_HY;
  let y1 = bitcast<u32>(imod(i32(i.y) + 1, py)) * LATTICE_HY;
  let z0 = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let z1 = z0 + LATTICE_HZ;
  let g000 = gradTable3(lowbias32(x0 + y0 + z0), f);
  let g100 = gradTable3(lowbias32(x1 + y0 + z0), f - vec3f(1.0, 0.0, 0.0));
  let g010 = gradTable3(lowbias32(x0 + y1 + z0), f - vec3f(0.0, 1.0, 0.0));
  let g110 = gradTable3(lowbias32(x1 + y1 + z0), f - vec3f(1.0, 1.0, 0.0));
  let g001 = gradTable3(lowbias32(x0 + y0 + z1), f - vec3f(0.0, 0.0, 1.0));
  let g101 = gradTable3(lowbias32(x1 + y0 + z1), f - vec3f(1.0, 0.0, 1.0));
  let g011 = gradTable3(lowbias32(x0 + y1 + z1), f - vec3f(0.0, 1.0, 1.0));
  let g111 = gradTable3(lowbias32(x1 + y1 + z1), f - vec3f(1.0, 1.0, 1.0));
  let nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy);
  let nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
