import React from "react";
import CloudBackup from "@/components/esporta/CloudBackup";
import BackupInterno from "@/components/backup/BackupInterno";
import BackupEsterno from "@/components/backup/BackupEsterno";
import RipristinoBackup from "@/components/backup/RipristinoBackup";
import { Cloud } from "lucide-react";

export default function BackupCloud() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Cloud className="w-5 h-5 text-primary" /> Backup e Cloud
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Genera backup completi (CSV, PDF, foto, video), sincronizzali sul cloud e ripristinali quando serve.
        </p>
      </div>

      {/* 1. Configurazione cloud */}
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-primary" /> Configurazione provider cloud
        </h2>
        <CloudBackup />
      </div>

      {/* 2. Backup interno */}
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-primary" /> Backup interno
        </h2>
        <BackupInterno />
      </div>

      {/* 3. Backup esterno */}
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-primary" /> Backup esterno (cloud)
        </h2>
        <BackupEsterno />
      </div>

      {/* 4. Ripristino */}
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-primary" /> Ripristino e download
        </h2>
        <RipristinoBackup />
      </div>
    </div>
  );
}