export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new AssertionError(
      `${msg ?? "assertEqual"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertNotNull<T>(value: T | null | undefined, msg?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new AssertionError(msg ?? "Expected non-null, got null/undefined");
  }
}

export function assertGreater(actual: number, min: number, msg?: string): void {
  if (actual <= min) {
    throw new AssertionError(
      `${msg ?? "assertGreater"}: expected ${actual} > ${min}`
    );
  }
}

export function assertGreaterOrEqual(actual: number, min: number, msg?: string): void {
  if (actual < min) {
    throw new AssertionError(
      `${msg ?? "assertGreaterOrEqual"}: expected ${actual} >= ${min}`
    );
  }
}

export function assertTrue(condition: boolean, msg?: string): void {
  if (!condition) {
    throw new AssertionError(msg ?? "Expected true, got false");
  }
}

export function assertFalse(condition: boolean, msg?: string): void {
  if (condition) {
    throw new AssertionError(msg ?? "Expected false, got true");
  }
}

export function assertMatch(str: string, pattern: RegExp, msg?: string): void {
  if (!pattern.test(str)) {
    throw new AssertionError(
      `${msg ?? "assertMatch"}: "${str}" did not match ${pattern}`
    );
  }
}

export function assertContains<T>(
  arr: T[],
  predicate: (item: T) => boolean,
  msg?: string
): void {
  if (!arr.some(predicate)) {
    throw new AssertionError(msg ?? "Expected array to contain a matching element");
  }
}

export function assertLength(arr: unknown[], expected: number, msg?: string): void {
  if (arr.length !== expected) {
    throw new AssertionError(
      `${msg ?? "assertLength"}: expected length ${expected}, got ${arr.length}`
    );
  }
}

export function assertIncludes(str: string, substr: string, msg?: string): void {
  if (!str.toLowerCase().includes(substr.toLowerCase())) {
    throw new AssertionError(
      `${msg ?? "assertIncludes"}: "${str}" does not include "${substr}"`
    );
  }
}
