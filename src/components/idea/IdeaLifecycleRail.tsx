"use client";

import React from "react";

export interface IdeaLifecycleRailProps {
  ideaCount?: number;
  buildCount?: number;
  productCount?: number;
  status?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  interactive?: boolean;
  onStageHover?: (stage: "idea" | "build" | "product" | null) => void;
}

export function IdeaLifecycleRail({
  ideaCount = 1,
  buildCount = 0,
  productCount = 0,
  status,
  size = "md",
  className = "",
  interactive = false,
  onStageHover,
}: IdeaLifecycleRailProps) {
  const isDeprecated = status === "deprecated";
  const hasBuild = buildCount > 0;
  const hasProduct = productCount > 0;

  // Sizes configuration
  const sizeStyles = {
    sm: {
      railHeight: "h-[2px]",
      nodeSize: "w-2.5 h-2.5",
      squareSize: "w-2.5 h-2.5",
      fontSize: "text-[10px]",
      countSize: "text-[11px]",
      gap: "gap-0.5",
      spacing: "py-1",
    },
    md: {
      railHeight: "h-[2px]",
      nodeSize: "w-3 h-3",
      squareSize: "w-3 h-3",
      fontSize: "text-[11px]",
      countSize: "text-[12px]",
      gap: "gap-1",
      spacing: "py-1.5",
    },
    lg: {
      railHeight: "h-[2.5px]",
      nodeSize: "w-3.5 h-3.5",
      squareSize: "w-3.5 h-3.5",
      fontSize: "text-[12px]",
      countSize: "text-[13px]",
      gap: "gap-1.5",
      spacing: "py-2",
    },
  }[size];

  return (
    <div
      className={`lifecycle-rail relative w-full select-none overflow-hidden ${sizeStyles.spacing} ${className}`}
      role="region"
      aria-label={`生命周期轨道：想法 ${ideaCount}，实现 ${buildCount}，作品 ${productCount}`}
    >
      {/* 1. Track Nodes & Connecting Lines Row */}
      <div className="flex items-center w-full px-1">
        {/* Node 1: IDEA */}
        <div
          className={`relative z-10 flex shrink-0 items-center justify-center group ${interactive ? "cursor-pointer" : ""}`}
          onMouseEnter={() => onStageHover?.("idea")}
          onMouseLeave={() => onStageHover?.(null)}
        >
          <div
            className={`${sizeStyles.nodeSize} rounded-full transition-transform duration-200 ${
              isDeprecated
                ? "bg-slate-400"
                : "bg-slate-900 group-hover:scale-125 ring-2 ring-slate-100"
            }`}
          />
        </div>

        {/* Line 1: IDEA to BUILD (flex-1 perfectly bounded) */}
        <div className={`relative flex-1 ${sizeStyles.railHeight} overflow-hidden bg-slate-200`}>
          <div
            className={`h-full transition-all duration-300 ${
              hasBuild ? (isDeprecated ? "bg-slate-400 w-full" : "bg-slate-800 w-full") : "w-0"
            }`}
          />
          {hasBuild && !isDeprecated && (
            <div className="lifecycle-rail-flow absolute inset-0 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-60" />
          )}
        </div>

        {/* Node 2: BUILD */}
        <div
          className={`relative z-10 flex shrink-0 items-center justify-center group ${interactive ? "cursor-pointer" : ""}`}
          onMouseEnter={() => onStageHover?.("build")}
          onMouseLeave={() => onStageHover?.(null)}
        >
          <div
            className={`${sizeStyles.nodeSize} rounded-full transition-transform duration-200 ${
              hasBuild
                ? isDeprecated
                  ? "bg-slate-400"
                  : "bg-slate-900 group-hover:scale-125 ring-2 ring-slate-100"
                : "border-2 border-slate-300 bg-white group-hover:border-slate-500"
            }`}
          />
        </div>

        {/* Line 2: BUILD to PRODUCT (flex-1 perfectly bounded) */}
        <div className={`relative flex-1 ${sizeStyles.railHeight} overflow-hidden bg-slate-200`}>
          <div
            className={`h-full transition-all duration-300 ${
              hasProduct ? (isDeprecated ? "bg-slate-400 w-full" : "bg-slate-800 w-full") : "w-0"
            }`}
          />
          {hasProduct && !isDeprecated && (
            <div className="lifecycle-rail-flow absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-60" />
          )}
        </div>

        {/* Node 3: PRODUCT */}
        <div
          className={`relative z-10 flex shrink-0 items-center justify-center group ${interactive ? "cursor-pointer" : ""}`}
          onMouseEnter={() => onStageHover?.("product")}
          onMouseLeave={() => onStageHover?.(null)}
        >
          <div
            className={`${sizeStyles.squareSize} transition-transform duration-200 ${
              hasProduct
                ? isDeprecated
                  ? "bg-slate-400 rotate-45"
                  : "bg-slate-900 group-hover:scale-125 rotate-45 ring-2 ring-slate-100"
                : "border-2 border-slate-300 bg-white group-hover:border-slate-500 rotate-45"
            }`}
          />
        </div>
      </div>

      {/* 2. Labels and Counters Row */}
      <div className="mt-2 flex items-start justify-between w-full">
        {/* IDEA Label (left-aligned) */}
        <div
          className={`flex flex-col items-start ${sizeStyles.gap} ${interactive ? "cursor-pointer" : ""}`}
          onMouseEnter={() => onStageHover?.("idea")}
          onMouseLeave={() => onStageHover?.(null)}
        >
          <span
            className={`font-mono font-semibold tracking-wider ${sizeStyles.fontSize} ${
              isDeprecated ? "text-slate-400" : "text-slate-800"
            }`}
          >
            IDEA
          </span>
          <span
            className={`font-mono font-medium ${sizeStyles.countSize} ${
              isDeprecated ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {ideaCount}
          </span>
        </div>

        {/* BUILD Label (center-aligned) */}
        <div
          className={`flex flex-col items-center ${sizeStyles.gap} ${interactive ? "cursor-pointer" : ""}`}
          onMouseEnter={() => onStageHover?.("build")}
          onMouseLeave={() => onStageHover?.(null)}
        >
          <span
            className={`font-mono font-semibold tracking-wider ${sizeStyles.fontSize} ${
              hasBuild ? "text-slate-800" : "text-slate-400"
            }`}
          >
            BUILD
          </span>
          <span
            className={`font-mono font-medium ${sizeStyles.countSize} ${
              hasBuild ? "text-slate-700 font-semibold" : "text-slate-400"
            }`}
          >
            {buildCount}
          </span>
        </div>

        {/* PRODUCT Label (right-aligned) */}
        <div
          className={`flex flex-col items-end ${sizeStyles.gap} ${interactive ? "cursor-pointer" : ""}`}
          onMouseEnter={() => onStageHover?.("product")}
          onMouseLeave={() => onStageHover?.(null)}
        >
          <span
            className={`font-mono font-semibold tracking-wider ${sizeStyles.fontSize} ${
              hasProduct ? "text-slate-900 font-bold" : "text-slate-400"
            }`}
          >
            PRODUCT
          </span>
          <span
            className={`font-mono font-medium ${sizeStyles.countSize} ${
              hasProduct ? "text-slate-800 font-bold" : "text-slate-400"
            }`}
          >
            {productCount}
          </span>
        </div>
      </div>
    </div>
  );
}
