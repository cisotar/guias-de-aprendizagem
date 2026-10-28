"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/store/project";
import { Block } from "./Block";

export function TeacherBlock() {
  const name = useProject((s) => s.teacher.name);
  const setName = useProject((s) => s.setTeacherName);
  const school = useProject((s) => s.teacher.school ?? "");
  const setSchool = useProject((s) => s.setTeacherSchool);
  return (
    <Block title="Professor">
      <div className="space-y-1.5">
        <Label htmlFor="teacher-name">Nome</Label>
        <Input id="teacher-name" className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="teacher-school">Escola</Label>
        <Input id="teacher-school" className="h-10" value={school} onChange={(e) => setSchool(e.target.value)} />
      </div>
    </Block>
  );
}
