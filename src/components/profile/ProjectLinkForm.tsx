"use client";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import {
  addProjectLinkAction,
  type ProfileLinkState,
} from "@/lib/actions";
import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

export function ProjectLinkForm() {
  const [state, formAction, pending] = useActionState<ProfileLinkState, FormData>(
    addProjectLinkAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (pending || state.error) return;
    if (state.ok) formRef.current?.reset();
  }, [state, pending]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <TextInput
          name="title"
          placeholder="项目名称"
          required
          className="sm:max-w-[220px]"
        />
        <TextInput
          name="url"
          type="url"
          placeholder="https://github.com/you/project"
          required
          className="flex-1"
        />
        <Button type="submit" tone="idea" className="shrink-0" disabled={pending}>
          <Plus className="h-4 w-4" />
          {pending ? "添加中…" : "添加"}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-[13px] text-blocked">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
