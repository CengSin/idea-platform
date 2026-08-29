import { clsxJoin } from "@/lib/format";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] tracking-[0.04em] text-muted">{label}</span>
      {children}
      {hint ? <span className="text-[12px] text-muted/80">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-white/6 px-3.5 py-2.5 text-[14px] text-artifact outline-none transition placeholder:text-muted/70 focus:border-idea/50 focus:bg-white/8";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsxJoin(inputClass, props.className)} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsxJoin(inputClass, "min-h-[92px] resize-y leading-relaxed", props.className)}
      {...props}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsxJoin(inputClass, "appearance-none", props.className)}
      {...props}
    />
  );
}
