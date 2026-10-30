const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Human-friendly, unambiguous demo reference. Not a security token. */
export function createDemoReference(
  random: () => number = defaultRandom,
  length = 6,
): string {
  let output = "";
  for (let index = 0; index < length; index += 1) {
    const value = Math.floor(random() * REFERENCE_ALPHABET.length);
    output += REFERENCE_ALPHABET[Math.min(value, REFERENCE_ALPHABET.length - 1)];
  }
  return `DEMO-${output}`;
}

function defaultRandom(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return (buffer[0] ?? 0) / 4_294_967_296;
  }
  return Math.random();
}

export function normalizeDemoReference(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidDemoReference(value: string): boolean {
  return /^DEMO-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(
    normalizeDemoReference(value),
  );
}
