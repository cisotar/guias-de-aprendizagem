import { useEffect, useState } from "react";
import { useProject } from "./project";

/** Reidrata a store a partir do localStorage no cliente; devolve true quando terminou. */
export function useHydrated() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const unsub = useProject.persist.onFinishHydration(() => setDone(true));
    void useProject.persist.rehydrate();
    return unsub;
  }, []);
  return done;
}
