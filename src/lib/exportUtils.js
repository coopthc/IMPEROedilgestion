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

export function generateCSVBlob(data, columns) {
  const csv = toCSV(data, columns);
  return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
}

export function generateCSVBlobFromRecords(records, excludeFields = ["id", "created_date", "updated_date", "created_by_id"]) {
  if (!records || records.length === 0) return new Blob([""], { type: "text/csv;charset=utf-8;" });
  const keys = Object.keys(records[0]).filter((k) => !excludeFields.includes(k));
  const columns = keys.map((k) => ({ key: k, label: k }));
  return generateCSVBlob(records, columns);
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

export function exportTablePDF({ title, subtitle, columns, data, filename, silent }) {
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

  if (silent) return doc.output("blob");
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

/* ============ Diagramma collegamenti PDF ============ */

const STATO_CANT_LABEL = { bozza: "Bozza", attivo: "Attivo", sospeso: "Sospeso", completato: "Completato", chiuso: "Chiuso" };
const QUALIFICA_LABEL = { capo_cantiere: "Capo cantiere", operaio: "Operaio", tecnico: "Tecnico", amministrazione: "Amministrazione", altro: "Altro" };
const CATEGORIA_DOC_LABEL = { contratto: "Contratto", planimetria: "Planimetria", permesso: "Permesso", sicurezza: "Sicurezza", foto: "Foto", video: "Video", fattura: "Fattura", preventivo: "Preventivo", altro: "Altro" };

export function exportDiagrammaPDF({ cantiere, cliente, responsabile, collaboratori, documenti, filename, silent }) {
  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  const ensureSpace = (needed) => {
    if (y > pageHeight - needed) { doc.addPage(); y = 20; }
  };

  // Titolo
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Diagramma collegamenti", margin, y);
  y += 8;
  doc.setFontSize(13);
  doc.text(cantiere.nome || "—", margin, y);
  y += 10;

  // Sezione Cantiere
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Cantiere", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const campiCantiere = [
    ["Cliente", cliente ? (cliente.is_azienda ? (cliente.azienda || cliente.nome) : cliente.nome) : "—"],
    ["Responsabile", responsabile?.nome || "—"],
    ["Stato", STATO_CANT_LABEL[cantiere.stato] || cantiere.stato || "—"],
    ["Indirizzo", [cantiere.indirizzo, cantiere.citta, cantiere.cap, cantiere.provincia].filter(Boolean).join(", ") || "—"],
    ["Budget", cantiere.budget ? `€ ${Number(cantiere.budget).toLocaleString("it-IT")}` : "—"],
    ["Data inizio", cantiere.data_inizio || "—"],
    ["Data fine", cantiere.data_fine || "—"],
    ["Descrizione", cantiere.descrizione || "—"],
    ["Note interne", cantiere.note_interne || "—"],
  ];

  campiCantiere.forEach(([label, value]) => {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value), pageWidth - margin - 50);
    doc.text(lines, margin + 45, y);
    y += 6 * lines.length;
  });
  y += 6;

  // Sezione Collaboratori
  ensureSpace(30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Collaboratori (${collaboratori.length})`, margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (collaboratori.length === 0) {
    doc.text("Nessun collaboratore assegnato", margin, y);
    y += 6;
  } else {
    collaboratori.forEach((c, i) => {
      ensureSpace(15);
      const riga = `${i + 1}. ${c.nome} — ${QUALIFICA_LABEL[c.qualifica] || c.qualifica || "—"}`;
      const lines = doc.splitTextToSize(riga, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += 6 * lines.length;
    });
  }
  y += 6;

  // Sezione Documenti
  ensureSpace(30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Documenti collegati (${documenti.length})`, margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (documenti.length === 0) {
    doc.text("Nessun documento collegato", margin, y);
    y += 6;
  } else {
    // Intestazione tabella
    doc.setFont("helvetica", "bold");
    doc.text("Nome", margin, y);
    doc.text("Categoria", margin + 110, y);
    y += 5;
    doc.setDrawColor(200);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
    doc.setFont("helvetica", "normal");

    documenti.forEach((d) => {
      ensureSpace(15);
      const nomeLines = doc.splitTextToSize(String(d.nome || "—"), 100);
      const cat = CATEGORIA_DOC_LABEL[d.categoria] || d.categoria || "—";
      doc.text(nomeLines, margin, y);
      doc.text(String(cat).substring(0, 30), margin + 110, y);
      y += 6 * nomeLines.length;
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Generato il ${new Date().toLocaleString("it-IT")} — Pagina ${i}/${pageCount}`,
      margin,
      pageHeight - 10
    );
  }

  if (silent) return doc.output("blob");
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