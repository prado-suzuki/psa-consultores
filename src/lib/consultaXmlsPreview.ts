const ACTOR_ARRAY_MAP: Record<string, string> = { rem: "rems", exped: "expeds", receb: "recebs" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPath(value: unknown, parts: string[]): unknown {
  let current = value;
  for (const part of parts) {
    if (!isRecord(current)) return "";
    current = current[part];
    if (current === null || current === undefined) return "";
  }
  return current;
}

export function getNestedValue(value: unknown, path: string): unknown {
  if (!isRecord(value)) return "";
  const parts = path.split(".");
  if (parts[0] === "produtos" && Array.isArray(value.produtos)) {
    if (parts.length === 1) return value.produtos.length ? `${value.produtos.length} item(s)` : "-";
    const values = value.produtos
      .map((product) => readPath(product, parts.slice(1)))
      .filter((item) => item !== "" && item !== null && item !== undefined)
      .map(String);
    return values.length ? values.join("; ") : "-";
  }
  const pluralKey = ACTOR_ARRAY_MAP[parts[0]];
  if (pluralKey && parts.length >= 2) {
    const singular = value[parts[0]];
    if (isRecord(singular)) return readPath(singular, parts.slice(1));
    const actors = value[pluralKey];
    if (Array.isArray(actors)) {
      const values = actors.map((actor) => readPath(actor, parts.slice(1))).filter((item) => item !== "").map(String);
      return values.length ? values.join("; ") : "";
    }
    return "";
  }
  return readPath(value, parts);
}

export function formatPreviewValue(value: unknown, columnId: string): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      const values = value.filter((item) => item !== null && item !== undefined).map(String).filter(Boolean);
      return values.length ? values.join("; ") : "-";
    }
    if (isRecord(value)) {
      const simple = Object.values(value).filter((item) => item !== null && item !== undefined && typeof item !== "object");
      return simple.length ? simple.join("; ") : JSON.stringify(value);
    }
    return "[objeto]";
  }
  if ((columnId === "dhEmi" || columnId === "dEmi") && value) return new Date(String(value)).toLocaleDateString("pt-BR");
  if (["vProd", "vICMS", "vTPrest", "vRec", "vCarga", "vBC", "vPIS", "vCOFINS", "vAliqProd"].some((part) => columnId.includes(part))) {
    const number = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isNaN(number)) return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
  }
  if (["pICMS", "pRedBC", "pPIS", "pCOFINS"].some((part) => columnId.includes(part))) {
    const number = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isNaN(number)) return `${number.toFixed(2)}%`;
  }
  if (columnId.includes("CNPJ") && typeof value === "string") {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 14) return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  return String(value);
}
