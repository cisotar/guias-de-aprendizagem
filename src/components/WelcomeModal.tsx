"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const IMAGE_URL = "/api/opening-image";
const SEEN_KEY = "welcome-modal-seen";

/** Imagem de abertura: aparece uma vez por sessão do navegador, centralizada e dentro dos limites da tela. */
export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      // sem sessionStorage: mostra mesmo assim
    }
    // Só abre se a imagem existir; sem arquivo, nada aparece.
    const probe = new Image();
    probe.onload = () => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
      setOpen(true);
    };
    probe.src = IMAGE_URL;
    return () => {
      probe.onload = null;
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent overlayClassName="bg-black/70" className="w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-2rem)] print:hidden">
        <DialogTitle className="sr-only">Boas-vindas</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMAGE_URL} alt="Imagem de abertura" className="block max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] object-contain" />
      </DialogContent>
    </Dialog>
  );
}
