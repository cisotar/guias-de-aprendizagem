"use client";

import { useState } from "react";
import { CalendarSearch, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getYear, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadHolidays } from "@/lib/holidays/load";
import { UFS } from "@/lib/holidays/normalize";
import { fullDate } from "@/lib/dates";
import { useProject } from "@/store/project";
import { Block, fieldClass } from "./Block";

const SCOPE_LABEL = { national: "Nacional", state: "Estadual", municipal: "Municipal", manual: "Manual" } as const;

export function HolidaysBlock() {
  const { holidays, location, terms, documents } = useProject();
  const setLocation = useProject((s) => s.setLocation);
  const merge = useProject((s) => s.mergeHolidays);
  const add = useProject((s) => s.addHoliday);
  const remove = useProject((s) => s.removeHoliday);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState({ date: "", name: "" });

  async function search() {
    const used = terms.filter((t) => t.start && t.end && documents.some((d) => d.curriculum.term === t.number));
    const years = new Set<number>(
      used.length ? used.flatMap((t) => [getYear(parseISO(t.start)), getYear(parseISO(t.end))]) : [new Date().getFullYear()],
    );
    setLoading(true);
    try {
      const all = [];
      for (const year of years) {
        all.push(...(await loadHolidays(year, location.uf)));
      }
      merge(all);
      toast.success(`${all.length} feriados encontrados`);
    } catch {
      toast.error("Não foi possível buscar agora. Os feriados já salvos foram mantidos.");
    } finally {
      setLoading(false);
    }
  }

  function addManual() {
    if (!manual.date || !manual.name.trim()) return;
    add({ date: manual.date, name: manual.name.trim(), scope: "manual", source: "manual" });
    setManual({ date: "", name: "" });
  }

  return (
    <Block title="Feriados">
      <p className="text-[13px] leading-[18px] text-muted-foreground">
        Por enquanto os feriados só ficam guardados; ainda não mudam o cronograma.
      </p>
      <div className="grid grid-cols-[88px_1fr] gap-2">
        <div>
          <Label htmlFor="uf" className="text-[13px]">UF</Label>
          <select id="uf" className={fieldClass} value={location.uf} onChange={(e) => setLocation({ uf: e.target.value })}>
            {UFS.map((uf) => <option key={uf}>{uf}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="city" className="text-[13px]">Município</Label>
          <Input id="city" className="h-10" value={location.city} onChange={(e) => setLocation({ city: e.target.value })} />
        </div>
      </div>
      <Button variant="outline" className="h-10 w-full" onClick={search} disabled={loading}>
        <CalendarSearch aria-hidden /> {loading ? "Buscando…" : "Buscar feriados"}
      </Button>
      <p className="text-[13px] leading-[18px] text-muted-foreground">
        Feriados municipais não têm fonte gratuita confiável: cadastre-os abaixo.
      </p>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="h-date" className="text-[13px]">Data</Label>
            <input id="h-date" type="date" className={fieldClass} value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="h-name" className="text-[13px]">Nome</Label>
            <Input id="h-name" className="h-10" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          </div>
        </div>
        <Button variant="outline" className="h-10 w-full" onClick={addManual}>
          <Plus aria-hidden /> Adicionar feriado
        </Button>
      </div>
      {holidays.length > 0 && (
        <ul className="max-h-60 space-y-1 overflow-y-auto text-[13px] leading-[18px]">
          {holidays.map((h) => (
            <li key={`${h.date}|${h.name}`} className="flex items-start gap-2">
              <span className="tabular-nums">{fullDate(h.date)}</span>
              <span className="flex-1">
                {h.name} <span className="text-muted-foreground">({SCOPE_LABEL[h.scope]})</span>
              </span>
              {h.scope === "manual" && (
                <button
                  type="button"
                  aria-label={`Remover ${h.name}`}
                  className="grid size-6 place-items-center rounded focus-visible:ring-3 focus-visible:ring-ring/50"
                  onClick={() => remove(h)}
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
