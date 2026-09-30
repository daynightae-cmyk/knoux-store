export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    h ^= input.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededUnit(index: number, seed: number): number {
  return mulberry32(hashString(`${seed}:${index}`))();
}

export function fibonacciSphere(
  count: number,
  radius: number,
  seed: number,
): Float32Array {
  const random = mulberry32(seed);
  const output = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const denominator = Math.max(1, count - 1);
    const y = 1 - (index / denominator) * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;
    const jitter = 0.94 + random() * 0.12;
    output[index * 3] = Math.cos(theta) * radial * radius * jitter;
    output[index * 3 + 1] = y * radius * jitter;
    output[index * 3 + 2] = Math.sin(theta) * radial * radius * jitter;
  }
  return output;
}
