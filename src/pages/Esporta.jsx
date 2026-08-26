import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportButtons from "@/components/esporta/ExportButtons";
import DiagrammaCollegamenti from "@/components/esporta/DiagrammaCollegamenti";
import ImportSection from "@/components/esporta/ImportSection";
import { downloadJSON } from "@/lib/exportUtils";
import {
  Download,
  Users,
  Building2,
  HardHat,
  TrendingUp,
  Wallet,
  CalendarDays,
  Calendar,
  Database,
  Loader2,
  Network,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  StickyNote,
  Cloud,
  FolderArchive,
} from "lucide-react";

const STATO_LABEL = {
  bozza: "Bozza",
  attivo: "Attivo",
  sospeso: "Sospeso",
  completato: "Completato",
  chiuso: "Chiuso",
};

const LAV_STATO_LABEL = {
  da_fare: "Da fare",
  in_corso: "In corso",
  completata: "Completata",
  bloccata: "Bloccata",
  annullata: "Annullata",
};

const QUALIFICA_LABELS = {
  capo_cantiere: "Capo cantiere",
  operaio: "Operaio",
  tecnico: "Tecnico",
  amministrazione: "Amministrazione",
  altro: "Altro",
};

const PAG_TIPO_LABEL = { acconto: "Acconto", avanzamento: "Avanzamento", saldo: "Saldo" };
const PAG_STATO_LABEL = { non_pagato: "Non pagato", pagato: "Pagato", parziale: "Parziale" };
const APP_STATO_LABEL = { in_attesa: "In attesa", programmato: "Programmato", proposto: "Proposto", completato: "Completato", annullato: "Annullato" };
const APP_TIPO_LABEL = { interno: "Interno", richiesta: "Richiesta", confermato: "Confermato", admin_fissato: "Admin fissato" };
const CATEGORIA_DOC_LABEL = { contratto: "Contratto", planimetria: "Planimetria", permesso: "Permesso", sicurezza: "Sicurezza", foto: "Foto", video: "Video", fattura: "Fattura", preventivo: "Preventivo", altro: "Altro" };
const AGG_TIPO_LABEL = { aggiornamento: "Aggiornamento", avviso: "Avviso", completamento: "Completamento", problema: "Problema" };

export default function Esporta() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [docBackupLoading, setDocBackupLoading] = useState(false);
  const [data, setData] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        clienti,
        cantieri,
        collaboratori,
        lavorazioni,
        pagamenti,
        presenze,
        appuntamenti,
        documenti,
        chatMessages,
        aggiornamenti,
        notifiche,
        promemoria,
        disponibilita,
        giorniBloccati,
        modelliEmail,
        impostazioni,
      ] = await Promise.all([
        base44.entities.Cliente.list(),
        base44.entities.Cantiere.list(),
        base44.entities.Collaboratore.list(),
        base44.entities.Lavorazione.list(),
        base44.entities.Pagamento.list(),
        base44.entities.Presenza.list(),
        base44.entities.Appuntamento.list(),
        base44.entities.Documento.list(),
        base44.entities.ChatMessage.list(),
        base44.entities.Aggiornamento.list(),
        base44.entities.Notifica.list(),
        base44.entities.Promemoria.list(),
        base44.entities.Disponibilita.list(),
        base44.entities.GiornoBloccato.list(),
        base44.entities.ModelloEmail.list(),
        base44.entities.ImpostazioneApp.list(),
      ]);
      setData({
        clienti,
        cantieri,
        collaboratori,
        lavorazioni,
        pagamenti,
        presenze,
        appuntamenti,
        documenti,
        chatMessages,
        aggiornamenti,
        notifiche,
        promemoria,
        disponibilita,
        giorniBloccati,
        modelliEmail,
        impostazioni,
      });
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Calcola costo lavorazioni per ogni cantiere
  const cantieriConCosti = (data.cantieri || []).map((c) => {
    const costoLavorazioni = (data.lavorazioni || [])
      .filter((l) => l.cantiere_id === c.id)
      .reduce((sum, l) => sum + (Number(l.costo) || 0), 0);
    return { ...c, costo_lavorazioni: `€ ${costoLavorazioni.toLocaleString("it-IT")}` };
  });

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const backup = {
        data_esportazione: new Date().toISOString(),
        versione: "2.0",
        cartelle: {
          anagrafiche: {
            clienti: data.clienti || [],
            collaboratori: data.collaboratori || [],
          },
          cantieri: {
            cantieri: data.cantieri || [],
            lavorazioni: data.lavorazioni || [],
            documenti: data.documenti || [],
            aggiornamenti: data.aggiornamenti || [],
          },
          agenda: {
            appuntamenti: data.appuntamenti || [],
            disponibilita: data.disponibilita || [],
            giorni_bloccati: data.giorniBloccati || [],
            promemoria: data.promemoria || [],
          },
          presenze: {
            presenze: data.presenze || [],
          },
          pagamenti: {
            pagamenti: data.pagamenti || [],
          },
          comunicazioni: {
            chat: data.chatMessages || [],
            notifiche: data.notifiche || [],
          },
          sistema: {
            impostazioni: data.impostazioni || [],
            modelli_email: data.modelliEmail || [],
          },
        },
      };
      downloadJSON(`backup-totale-edilgestion-${new Date().toISOString().slice(0, 10)}`, backup);
      toast({ title: "Backup totale generato" });
    } catch {
      toast({ title: "Errore backup", variant: "destructive" });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDocBackup = async () => {
    setDocBackupLoading(true);
    try {
      const cantieri = data.cantieri || [];
      const documenti = data.documenti || [];
      const cartelle = {};
      cantieri.forEach((c) => {
        const docs = documenti
          .filter((d) => d.cantiere_id === c.id)
          .map((d) => ({
            nome: d.nome,
            categoria: CATEGORIA_DOC_LABEL[d.categoria] || d.categoria,
            file_url: d.file_url,
            note: d.note,
            visibile_cliente: d.visibile_cliente,
          }));
        const safeName = (c.nome || "senza-nome").replace(/[\/\\]/g, "-");
        cartelle[safeName] = {
          cantiere_id: c.id,
          cantiere_nome: c.nome,
          n_documenti: docs.length,
          documenti: docs,
        };
      });
      // Documenti senza cantiere
      const orfani = documenti
        .filter((d) => !d.cantiere_id || !cantieri.find((c) => c.id === d.cantiere_id))
        .map((d) => ({
          nome: d.nome,
          categoria: CATEGORIA_DOC_LABEL[d.categoria] || d.categoria,
          file_url: d.file_url,
          note: d.note,
        }));
      if (orfani.length > 0) {
        cartelle["_senza_cantiere"] = { n_documenti: orfani.length, documenti: orfani };
      }
      const backup = {
        data_esportazione: new Date().toISOString(),
        tipo: "backup_documenti_per_cantiere",
        n_cantieri: Object.keys(cartelle).length,
        n_documenti_totali: documenti.length,
        cartelle,
      };
      downloadJSON(`backup-documenti-cantieri-${new Date().toISOString().slice(0, 10)}`, backup);
      toast({ title: "Backup documenti generato" });
    } catch {
      toast({ title: "Errore backup documenti", variant: "destructive" });
    } finally {
      setDocBackupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const exportConfigs = [
    {
      key: "clienti",
      icon: Users,
      title: "Clienti",
      color: "text-blue-400",
      columns: [
        { label: "Nome", key: "nome" },
        { label: "Azienda", key: "azienda" },
        { label: "Email", key: "email" },
        { label: "Telefono", key: "telefono" },
        { label: "Indirizzo", key: "indirizzo" },
        { label: "Città", key: "citta" },
        { label: "CAP", key: "cap" },
        { label: "Provincia", key: "provincia" },
        { label: "P.IVA", key: "piva" },
        { label: "Codice Fiscale", key: "codice_fiscale" },
        { label: "Note", key: "note" },
      ],
      data: data.clienti || [],
    },
    {
      key: "cantieri",
      icon: Building2,
      title: "Cantieri (con budget e costi)",
      color: "text-primary",
      columns: [
        { label: "Nome", key: "nome" },
        { label: "Cliente", key: "cliente_nome" },
        { label: "Responsabile", key: "responsabile_nome" },
        { label: "Indirizzo", key: "indirizzo" },
        { label: "Città", key: "citta" },
        { label: "Stato", value: (c) => STATO_LABEL[c.stato] || c.stato },
        { label: "Budget", value: (c) => (c.budget ? `€ ${c.budget}` : "") },
        { label: "Costo lavorazioni", key: "costo_lavorazioni" },
        { label: "Data inizio", key: "data_inizio" },
        { label: "Data fine", key: "data_fine" },
        { label: "Descrizione", key: "descrizione" },
        { label: "Note interne", key: "note_interne" },
      ],
      data: cantieriConCosti,
    },
    {
      key: "collaboratori",
      icon: HardHat,
      title: "Collaboratori",
      color: "text-green-400",
      columns: [
        { label: "Nome", key: "nome" },
        { label: "Qualifica", value: (c) => QUALIFICA_LABELS[c.qualifica] || c.qualifica },
        { label: "Email", key: "email" },
        { label: "Telefono", key: "telefono" },
        { label: "Costo orario", value: (c) => (c.costo_orario ? `€ ${c.costo_orario}` : "") },
        { label: "Attivo", value: (c) => (c.attivo === false ? "No" : "Sì") },
      ],
      data: data.collaboratori || [],
    },
    {
      key: "lavorazioni",
      icon: TrendingUp,
      title: "Lavorazioni",
      color: "text-orange-400",
      columns: [
        { label: "Cantiere", key: "cantiere_nome" },
        { label: "Titolo", key: "titolo" },
        { label: "Stato", value: (l) => LAV_STATO_LABEL[l.stato] || l.stato },
        { label: "% Prevista", key: "percentuale_prevista" },
        { label: "% Completata", key: "percentuale_completata" },
        { label: "Costo", value: (l) => (l.costo ? `€ ${l.costo}` : "") },
        { label: "Ore previste", key: "ore_previste" },
        { label: "Descrizione", key: "descrizione" },
      ],
      data: data.lavorazioni || [],
    },
    {
      key: "pagamenti",
      icon: Wallet,
      title: "Pagamenti",
      color: "text-yellow-400",
      columns: [
        { label: "Cantiere", key: "cantiere_nome" },
        { label: "Titolo", key: "titolo" },
        { label: "Tipo", value: (p) => PAG_TIPO_LABEL[p.tipo] || p.tipo },
        { label: "Importo", value: (p) => (p.importo ? `€ ${p.importo}` : "") },
        { label: "Percentuale", key: "percentuale" },
        { label: "Stato", value: (p) => PAG_STATO_LABEL[p.stato] || p.stato },
        { label: "Scadenza", key: "data_scadenza" },
        { label: "Pagato il", key: "data_pagamento" },
        { label: "Note", key: "note" },
      ],
      data: data.pagamenti || [],
    },
    {
      key: "presenze",
      icon: CalendarDays,
      title: "Presenze",
      color: "text-purple-400",
      columns: [
        { label: "Collaboratore", key: "collaboratore_nome" },
        { label: "Cantiere", key: "cantiere_nome" },
        { label: "Lavorazione", key: "lavorazione_nome" },
        { label: "Data", key: "data" },
        { label: "Ingresso", key: "ora_ingresso" },
        { label: "Uscita", key: "ora_uscita" },
        { label: "Ore totali", key: "ore_totali" },
        { label: "Straordinarie", key: "ore_straordinarie" },
        { label: "Note", key: "note" },
      ],
      data: data.presenze || [],
    },
    {
      key: "appuntamenti",
      icon: Calendar,
      title: "Appuntamenti",
      color: "text-cyan-400",
      columns: [
        { label: "Titolo", key: "titolo" },
        { label: "Data", key: "data" },
        { label: "Ora", key: "ora" },
        { label: "Durata (min)", key: "durata_minuti" },
        { label: "Cliente", key: "cliente_nome" },
        { label: "Cantiere", key: "cantiere_nome" },
        { label: "Stato", value: (a) => APP_STATO_LABEL[a.stato] || a.stato },
        { label: "Tipo", value: (a) => APP_TIPO_LABEL[a.tipo] || a.tipo },
        { label: "Note", key: "note" },
        { label: "Motivo", key: "motivo" },
      ],
      data: data.appuntamenti || [],
    },
    {
      key: "documenti",
      icon: FileText,
      title: "Documenti",
      color: "text-indigo-400",
      columns: [
        { label: "Cantiere", key: "cantiere_nome" },
        { label: "Nome file", key: "nome" },
        { label: "Categoria", value: (d) => CATEGORIA_DOC_LABEL[d.categoria] || d.categoria },
        { label: "Visibile cliente", value: (d) => (d.visibile_cliente ? "Sì" : "No") },
        { label: "Note", key: "note" },
      ],
      data: data.documenti || [],
    },
    {
      key: "aggiornamenti",
      icon: Bell,
      title: "Aggiornamenti cantieri",
      color: "text-amber-400",
      columns: [
        { label: "Cantiere", key: "cantiere_nome" },
        { label: "Tipo", value: (a) => AGG_TIPO_LABEL[a.tipo] || a.tipo },
        { label: "Titolo", key: "titolo" },
        { label: "Testo", key: "testo" },
        { label: "Autore", key: "autore_nome" },
        { label: "Visibile cliente", value: (a) => (a.visibile_cliente ? "Sì" : "No") },
      ],
      data: data.aggiornamenti || [],
    },
    {
      key: "chat",
      icon: MessageSquare,
      title: "Messaggi chat",
      color: "text-pink-400",
      columns: [
        { label: "Canale", key: "canale" },
        { label: "Cantiere", key: "cantiere_id" },
        { label: "Mittente", key: "mittente_nome" },
        { label: "Ruolo", key: "mittente_ruolo" },
        { label: "Testo", key: "testo" },
      ],
      data: data.chatMessages || [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" /> Esporta / Importa dati
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Esporta i dati del gestionale in CSV o PDF, genera backup completi o importa nuovi record.
        </p>
      </div>

      {/* Backup generale + Backup documenti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/30 rounded-lg p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Backup totale (diviso per cartelle)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tutti i dati: anagrafiche, cantieri, documenti, chat, aggiornamenti,
                impostazioni, modelli email, promemoria, disponibilità, pagamenti e presenze.
              </p>
            </div>
          </div>
          <Button onClick={handleBackup} disabled={backupLoading} size="sm" className="flex-shrink-0">
            {backupLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-1" />
            )}
            Backup JSON
          </Button>
        </div>

        <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/30 rounded-lg p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <FolderArchive className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Backup documenti (per cantiere)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Esporta tutti i documenti organizzati in cartelle per cantiere,
                con nome, categoria, URL e note.
              </p>
            </div>
          </div>
          <Button onClick={handleDocBackup} disabled={docBackupLoading} size="sm" variant="outline" className="flex-shrink-0">
            {docBackupLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <FolderArchive className="w-4 h-4 mr-1" />
            )}
            Backup documenti
          </Button>
        </div>
      </div>

      {/* Export cards */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Esportazioni singole (con descrizioni e note)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exportConfigs.map((cfg) => (
            <div
              key={cfg.key}
              className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{cfg.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {cfg.data.length} record
                  </p>
                </div>
              </div>
              {cfg.data.length > 0 ? (
                <ExportButtons
                  title={cfg.title}
                  subtitle={`${cfg.data.length} record — ${new Date().toLocaleDateString("it-IT")}`}
                  columns={cfg.columns}
                  data={cfg.data}
                  filename={`esportazione-${cfg.key}-${new Date().toISOString().slice(0, 10)}`}
                />
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Nessun dato da esportare
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Diagramma collegamenti */}
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-primary" /> Diagramma collegamenti (PDF)
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Seleziona un cantiere ed esporta in PDF il diagramma con cliente, responsabile,
          collaboratori e documenti collegati (nome e categoria).
        </p>
        <div className="bg-card border border-border rounded-lg p-5">
          <DiagrammaCollegamenti
            cantieri={data.cantieri || []}
            clienti={data.clienti || []}
            collaboratori={data.collaboratori || []}
            documenti={data.documenti || []}
          />
        </div>
      </div>

      {/* Import */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Importa dati da CSV</h2>
        <ImportSection />
      </div>
    </div>
  );
}