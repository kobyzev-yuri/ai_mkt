"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: SpeechRecEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function recognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function DictateButton({
  disabled,
  onFinal,
}: {
  disabled?: boolean;
  onFinal: (text: string) => void;
}) {
  const recRef = useRef<SpeechRec | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setSupported(Boolean(recognitionCtor()));
    return () => {
      recRef.current?.stop();
    };
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (listening) {
      stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setHint("Голос — в Chrome или Edge на этом компьютере.");
      return;
    }
    setHint(null);
    const rec = new Ctor();
    rec.lang = "ru-RU";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (ev) => {
      const parts: string[] = [];
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const row = ev.results[i];
        if (row?.isFinal && row[0]?.transcript) parts.push(row[0].transcript.trim());
      }
      const text = parts.join(" ").trim();
      if (text) onFinal(text);
    };
    rec.onerror = () => {
      setHint("Микрофон недоступен или доступ запрещён.");
      stop();
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setHint("Не удалось включить микрофон.");
      recRef.current = null;
    }
  }, [disabled, listening, onFinal, stop]);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || !supported}
        title={supported ? "Сказать заявку вслух" : "Голос доступен в Chrome и Edge"}
        className={`rounded-full border px-4 py-2 text-[13px] ${
          listening
            ? "border-terra/60 bg-terra/10 text-terra"
            : "border-line text-paper hover:border-brass/50 disabled:opacity-40"
        }`}
      >
        {listening ? "Стоп · слушаю" : "Говорить"}
      </button>
      {listening ? <span className="font-mono text-[11px] text-terra">говорите заявку</span> : null}
      {!supported ? <span className="font-mono text-[11px] text-muted">голос — Chrome / Edge</span> : null}
      {hint ? <span className="text-[12px] text-terra">{hint}</span> : null}
    </div>
  );
}
