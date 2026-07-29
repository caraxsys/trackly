export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

export function toJsonValue(value: unknown): JsonValue | undefined {
  const seen = new WeakSet<object>();

  function visit(candidate: unknown): JsonValue | undefined {
    if (
      candidate === null ||
      typeof candidate === 'string' ||
      typeof candidate === 'boolean'
    ) {
      return candidate;
    }

    if (typeof candidate === 'number') {
      return Number.isFinite(candidate) ? candidate : undefined;
    }

    if (typeof candidate !== 'object' || candidate === null) {
      return undefined;
    }

    if (seen.has(candidate)) return undefined;
    seen.add(candidate);

    if (Array.isArray(candidate)) {
      const result: JsonValue[] = [];
      for (const item of candidate) {
        const safeItem = visit(item);
        if (safeItem === undefined) return undefined;
        result.push(safeItem);
      }
      return result;
    }

    if (!isPlainObject(candidate)) return undefined;

    const result: { [key: string]: JsonValue } = {};
    for (const [key, item] of Object.entries(candidate)) {
      const safeItem = visit(item);
      if (safeItem === undefined) return undefined;
      result[key] = safeItem;
    }
    return result;
  }

  return visit(value);
}
