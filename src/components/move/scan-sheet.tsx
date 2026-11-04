"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { t } from "@/i18n";

interface Detector {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** Camera QR scanner using the native BarcodeDetector where available. */
export function ScanSheet({ open, onOpenChange, onResult }: { open: boolean; onOpenChange: (o: boolean) => void; onResult: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- capability check needs the browser
      setError(t("move.scanUnsupported"));
      return;
    }
    setError(null);
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (stopped || !video.current) return;
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]?.rawValue) return onResult(codes[0].rawValue);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError(t("move.scanUnsupported"));
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [open, onResult]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("move.scan")} description={error ?? t("move.scanHint")}>
      {!error && <video ref={video} className="aspect-square w-full rounded-2xl bg-black object-cover" muted playsInline aria-label={t("move.scanHint")} />}
    </Sheet>
  );
}
