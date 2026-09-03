"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { saveAgentConfigAction, type AgentConfigState } from "@/lib/admin-actions";
import type { AgentConfigView } from "@/lib/agent-config";
import { CheckCircle2, Eye, EyeOff, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

function SecretField({
  name,
  label,
  configured,
  saved,
  placeholder,
}: {
  name: "openaiApiKey" | "cronSecret" | "resendApiKey";
  label: string;
  configured: boolean;
  saved: boolean;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  const clearName = `clear${name[0].toUpperCase()}${name.slice(1)}`;
  return (
    <div>
      <Field
        label={label}
        hint={configured ? `已配置${saved ? "（后台保存）" : "（环境变量）"}；留空不会修改。` : "尚未配置。"}
      >
        <div className="relative">
          <TextInput
            name={name}
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            placeholder={configured ? "••••••••••••••••" : placeholder}
            className="pr-11"
          />
          <button
            type="button"
            aria-label={visible ? "隐藏密钥" : "显示密钥"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition hover:text-artifact"
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      {saved ? (
        <label className="mt-2 inline-flex items-center gap-2 text-[12px] text-muted">
          <input name={clearName} type="checkbox" className="accent-idea" />
          清除后台保存值{configured ? "并回退到环境变量" : ""}
        </label>
      ) : null}
    </div>
  );
}

export function AgentConfigForm({ configuration }: { configuration: AgentConfigView }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AgentConfigState, FormData>(
    saveAgentConfigAction,
    {},
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-idea">
            <ShieldCheck className="h-4 w-4" /> 运行配置
          </div>
          <h2 className="mt-2 text-[20px] font-medium tracking-[-0.025em]">Agent 与通知服务</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            后台配置优先于环境变量。密钥提交后不会再次回显，只展示是否已配置。
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-active">
          <CheckCircle2 className="h-3.5 w-3.5" /> 仅管理员可修改
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Field label="OpenAI Base URL" hint="兼容 OpenAI API 的服务地址，建议包含 /v1。">
          <TextInput
            name="openaiBaseUrl"
            type="url"
            defaultValue={configuration.openaiBaseUrl}
            placeholder="https://api.openai.com/v1"
          />
        </Field>
        <SecretField
          name="openaiApiKey"
          label="OpenAI API Key"
          configured={configuration.configured.openaiApiKey}
          saved={configuration.saved.openaiApiKey}
          placeholder="sk-..."
        />
        <SecretField
          name="cronSecret"
          label="定时任务密钥"
          configured={configuration.configured.cronSecret}
          saved={configuration.saved.cronSecret}
          placeholder="输入高强度随机密钥"
        />
        <SecretField
          name="resendApiKey"
          label="Resend API Key"
          configured={configuration.configured.resendApiKey}
          saved={configuration.saved.resendApiKey}
          placeholder="re_..."
        />
        <div className="lg:col-span-2">
          <Field label="发件人" hint="必须是 Resend 已验证域名下的地址，可包含显示名称。">
            <TextInput
              name="emailFrom"
              defaultValue={configuration.emailFrom}
              placeholder="Idea Agent <agent@example.com>"
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="text-[12.5px]">
          {state.error ? <span className="text-blocked">{state.error}</span> : null}
          {state.ok ? <span className="text-active">配置已保存并立即生效。</span> : null}
        </div>
        <Button type="submit" tone="idea" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? "保存中…" : "保存配置"}
        </Button>
      </div>
    </form>
  );
}
