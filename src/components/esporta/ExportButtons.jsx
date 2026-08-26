import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { downloadCSV, exportTablePDF } from "@/lib/exportUtils";

export default function ExportButtons({ title, subtitle, columns, data, filename }) {
  const [loading, setLoading] = useState(null);

  const handleCSV = () => {
    setLoading("csv");
    try {
      downloadCSV(filename, data, columns);
    } finally {
      setLoading(null);
    }
  };

  const handlePDF = () => {
    setLoading("pdf");
    try {
      exportTablePDF({ title, subtitle, columns, data, filename });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" onClick={handleCSV} disabled={!!loading}>
        {loading === "csv" ? (
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
        )}
        CSV
      </Button>
      <Button size="sm" variant="outline" onClick={handlePDF} disabled={!!loading}>
        {loading === "pdf" ? (
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 mr-1" />
        )}
        PDF
      </Button>
    </div>
  );
}