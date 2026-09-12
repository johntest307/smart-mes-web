function escapeCSV(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function exportCSV(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
) {
  const csv = [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function jsonToCSV(
  data: Record<string, unknown>[],
  filename: string,
) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(h => obj[h] as string | number));
  exportCSV(headers, rows, filename);
}
