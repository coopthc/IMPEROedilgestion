// Helper per i controlli basati sul ruolo utente
export const isOperaio = (role) => role === "mssg_operaio";

// Widget non disponibili per l'operaio (visione limitata al proprio cantiere)
export const WIDGET_VIETATI_OPERAIO = ["pagamenti", "clienti", "collaboratori", "chat", "backup"];

// Azioni rapide non disponibili per l'operaio
export const AZIONI_VIETATE_OPERAIO = ["voce", "cliente", "collaboratore", "backup"];

// Widget predefiniti per l'operaio
export const DEFAULT_WIDGETS_OPERAIO = [
  "cantieri",
  "appuntamenti",
  "promemoria",
  "settimana",
  "lavorazioni",
  "notifiche",
  "appuntamenti_domani",
  "presenze",
];

export const DEFAULT_QA_OPERAIO = ["promemoria", "appuntamento"];