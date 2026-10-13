// Sensitive keys that must be blocked to prevent Prototype Pollution attacks
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Flattens a nested object into a single-level object with dot-notation keys.
 * Example:
 *   { user: { profile: { name: "John" } } }
 *   =>
 *   { "user.profile.name": "John" }
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Security Guard: Ignore dangerous prototype pollution properties
    if (FORBIDDEN_KEYS.has(key)) {
      continue;
    }

    const newKey = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length > 0
    ) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[newKey] = String(value);
    }
  }

  return result;
}

/**
 * Unflattens a single-level object with dot-notation keys into a deeply nested object.
 * Secure against Prototype Pollution (__proto__, constructor, prototype).
 * Example:
 *   { "user.profile.name": "John", "user.profile.age": "30" }
 *   =>
 *   { user: { profile: { name: "John", age: "30" } } }
 */
export function unflattenObject(
  flatObj: Record<string, string>,
  sortKeys = true
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const keys = Object.keys(flatObj);
  if (sortKeys) {
    keys.sort((a, b) => a.localeCompare(b));
  }

  for (const flatKey of keys) {
    const value = flatObj[flatKey];
    const parts = flatKey.split('.');

    // Security Guard: Skip keys that attempt prototype pollution
    if (parts.some((p) => FORBIDDEN_KEYS.has(p))) {
      continue;
    }

    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current[part] = value;
      } else {
        if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
    }
  }

  return result;
}
