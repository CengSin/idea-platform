"use client";

import React from "react";
import Link from "@/components/ui/NavigationLink";
import type { PublicIdea, PublicActivityItem } from "@/lib/public-catalog";
import { ExploreHero } from "@/components/journal/ExploreHero";
import { HappeningNow } from "@/components/journal/HappeningNow";
import { ExploreCatalog } from "@/components/journal/ExploreCatalog";

export function Author({ idea }: { idea: PublicIdea }) {
  const content = (
    <>
      <span
        className="journal-avatar"
        style={idea.authorAccent ? { backgroundColor: idea.authorAccent, color: "#ffffff" } : undefined}
      >
        {idea.authorInitials || idea.authorName.slice(0, 1).toUpperCase()}
      </span>
      <span>
        {idea.authorName}
        <small>{idea.isImportedProblem ? "收录了已有网站" : "分享了一个想法"}</small>
      </span>
    </>
  );
  return idea.authorId ? (
    <Link className="journal-author" href={`/explore/people/${encodeURIComponent(idea.authorId)}`}>
      {content}
    </Link>
  ) : (
    <div className="journal-author">{content}</div>
  );
}

export function IdeaJournal({
  ideas,
  activities = [],
  workspace = false,
}: {
  ideas: PublicIdea[];
  activities?: PublicActivityItem[];
  workspace?: boolean;
}) {
  return (
    <div className="explore-main-flow">
      {}
      <ExploreHero ideas={ideas} workspace={workspace} />

      {}
      {activities.length > 0 && <HappeningNow activities={activities} />}

      {}
      <ExploreCatalog ideas={ideas} workspace={workspace} />
    </div>
  );
}
