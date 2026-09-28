// Maps validated camelCase input onto DB columns for INSERT/UPDATE builders.
// Keys left undefined are skipped (so PATCH only touches sent fields), and
// booleans become MySQL TINYINT 0/1. Column names come only from the
// caller's fixed `fields` map — never from user input.
export function toColumns(input: object, fields: Record<string, string>) {
  const columns: string[] = [];
  const params: Array<string | number | null> = [];
  for (const [key, column] of Object.entries(fields)) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) {
      columns.push(column);
      params.push(typeof value === "boolean" ? (value ? 1 : 0) : (value as string | number | null));
    }
  }
  return { columns, params };
}

export function insertSql(table: string, columns: string[]) {
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
}

export function updateSql(table: string, columns: string[]) {
  return `UPDATE ${table} SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`;
}
