import React from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UserNotRegisteredError() {
  const handleLogout = () => {
    base44.auth.logout(window.location.origin + '/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full p-8 bg-card rounded-[12px] border border-border">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-destructive/15">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Accesso non autorizzato</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Il tuo account non è abilitato all'uso di questa applicazione.
            Contatta l'amministratore per richiedere l'accesso o per riattivare
            il tuo profilo.
          </p>
          <div className="p-4 bg-secondary/30 rounded-md text-[13px] text-muted-foreground text-left space-y-1.5 mb-6">
            <p>Se ritieni sia un errore, puoi:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verificare di aver effettuato il login con l'account corretto</li>
              <li>Contattare l'amministratore dell'app</li>
              <li>Provare a uscire e rientrare</li>
            </ul>
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            Esci dall'account
          </Button>
        </div>
      </div>
    </div>
  );
}