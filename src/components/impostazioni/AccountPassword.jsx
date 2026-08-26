import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, Mail, Lock } from "lucide-react";

export default function AccountPassword() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const handleChange = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({ title: "Le password non coincidono", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "La nuova password deve avere almeno 6 caratteri", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.auth.changePassword({
        userId: user.id,
        currentPassword: currentPw,
        newPassword: newPw,
      });
      toast({ title: "Password aggiornata" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast({ title: "Errore: verifica la password attuale", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRecover = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      await base44.auth.resetPasswordRequest(user.email);
      toast({ title: "Email di recupero inviata", description: user.email });
    } catch {
      toast({ title: "Errore invio email", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" /> Account e sicurezza
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cambia la tua password o richiedi un'email di recupero.
        </p>
      </div>

      {/* Cambio password */}
      <form onSubmit={handleChange} className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Cambio password
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Password attuale</Label>
            <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nuova password</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Conferma nuova</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1" />}
            Aggiorna password
          </Button>
        </div>
      </form>

      <div className="pt-4 border-t border-border">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
          <Mail className="w-3.5 h-3.5" /> Recupero password
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Se hai dimenticato la password, ricevi un'email con il link per
          reimpostarla al tuo indirizzo {user?.email}.
        </p>
        <Button variant="outline" size="sm" onClick={handleRecover} disabled={sending}>
          {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}
          Invia email di recupero
        </Button>
      </div>
    </div>
  );
}