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

export const isCliente = (role) => role === "mssg_cliente";

// Widget non disponibili per il cliente (solo comunicazione e appuntamenti)
export const WIDGET_VIETATI_CLIENTE = [
  "cantieri", "pagamenti", "clienti", "collaboratori", "presenze",
  "settimana", "appuntamenti_domani", "promemoria"
];

// Azioni rapide non disponibili per il cliente
export const AZIONI_VIETATE_CLIENTE = ["voce", "promemoria", "cliente", "collaboratore", "backup"];

// Widget predefiniti per il cliente (dashboard fissa)
export const DEFAULT_WIDGETS_CLIENTE = [
  "appuntamenti", "lavorazioni"
];

// Azioni rapide predefinite per il cliente
export const DEFAULT_QA_CLIENTE = ["appuntamento"];