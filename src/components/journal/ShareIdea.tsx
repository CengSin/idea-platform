"use client";
import { useState } from "react";
import { Check, Link2 } from "lucide-react";
export function ShareIdea() {
  const [state, setState] = useState("分享这个想法");
  return <div><button className="journal-share" onClick={async () => {
    try { await navigator.clipboard.writeText(window.location.href); setState("链接已复制"); }
    catch { setState("请复制浏览器地址分享"); }
  }}>{state === "链接已复制" ? <Check size={16} /> : <Link2 size={16} />}{state}</button><span role="status" className="sr-only">{state}</span></div>;
}
