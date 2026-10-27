"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/store/project";
import { Block } from "./Block";

export function TeacherBlock() {
  const name = useProject((s) => s.teacher.name);
  const setName = useProject((s) => s.setTeacherName);
  return (
    <Block title="Professor">
      <div className="space-y-1.5">
        <Label htmlFor="teacher-name">Nome</Label>
        <Input id="teacher-name" className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </Block>
  );
}
