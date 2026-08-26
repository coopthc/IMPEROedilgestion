import { jsPDF } from "jspdf";

/* ============ CSV ============ */

export function toCSV(data, columns) {
  const sep = ";";
  const header = columns.map((c) => c.label).join(sep);
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const val = typeof col.value === "function" ? col.value(item) : item[col.key];
        const str = val != null ? String(val) : "";
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(sep)
  );
  return [header, ...rows].join("\n");
}

export function downloadCSV(filename, data, columns) {
  const csv = toCSV(data, columns);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : filename + ".csv");
}

export function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  triggerDownload(blob, filename.endsWith(".json") ? filename : filename + ".json");
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============ PDF ============ */

export function exportTablePDF({ title, subtitle, columns, data, filename }) {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 18;

  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 6;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitle, margin, y);
    doc.setTextColor(0);
    y += 4;
  }
  y += 4;

  const colWidth = (pageWidth - margin * 2) / columns.length;
  const rowHeight = 7;

  // Header
  doc.setFontSize(9);
  doc.setFillColor(13, 13, 26);
  doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
  doc.setTextColor(255);
  columns.forEach((col, i) => {
    doc.text(String(col.label).substring(0, 28), margin + i * colWidth + 1, y + 5);
  });
  y += rowHeight;
  doc.setTextColor(0);

  // Rows
  doc.setFontSize(8);
  data.forEach((row, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 248);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
    }
    columns.forEach((col, i) => {
      const val = typeof col.value === "function" ? col.value(row) : row[col.key];
      const text = val != null ? String(val).substring(0, 28) : "";
      doc.text(text, margin + i * colWidth + 1, y + 5);
    });
    y += rowHeight;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Generato il ${new Date().toLocaleString("it-IT")} — Pagina ${i}/${pageCount}`,
      margin,
      pageHeight - 8
    );
  }

  doc.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
}

export function exportSchedaPDF({ title, subtitle, sections, filename }) {
  const doc = new jsPDF();
  const margin = 14;
  let y = 20;

  doc.setFontSize(18);
  doc.text(title, margin, y);
  y += 8;

  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text(subtitle, margin, y);
    doc.setTextColor(0);
    y += 6;
  }
  y += 4;

  sections.forEach((section) => {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    section.fields.forEach((field) => {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(String(field.label) + ":", margin, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(String(field.value || "—"), 120);
      doc.text(lines, margin + 50, y);
      y += 7 * lines.length;
    });
    y += 4;
  });

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Generato il ${new Date().toLocaleString("it-IT")}`,
    margin,
    doc.internal.pageSize.getHeight() - 10
  );

  doc.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
}

/* ============ CSV Parser (import) ============ */

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ";" || char === ",") && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}