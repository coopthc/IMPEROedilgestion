import { useState, useRef, useCallback, useEffect } from "react";

export function useSpeechRecognition({ lang = "it-IT", continuous = false, onResult, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const supported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText && onResultRef.current) onResultRef.current(finalText.trim(), interimText);
    };
    rec.onend = () => { setIsListening(false); setInterim(""); };
    rec.onerror = (e) => {
      setIsListening(false);
      setInterim("");
      setError(e.error || "errore");
      if (onErrorRef.current) onErrorRef.current(e.error || "errore");
    };
    rec.start();
    recRef.current = rec;
    setIsListening(true);
  }, [supported, lang, continuous]);

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ignora */ }
      recRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => () => { if (recRef.current) { try { recRef.current.stop(); } catch { /* ignora */ } } }, []);

  return { isListening, interim, error, supported, start, stop };
}