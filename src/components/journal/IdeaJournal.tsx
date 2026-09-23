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
        <small>分享了一个想法</small>
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
      {/* 1. Hero / Featured Lifecycle */}
      <ExploreHero ideas={ideas} workspace={workspace} />

      {/* 2. Happening Now */}
      {activities.length > 0 && <HappeningNow activities={activities} />}

      {/* 3. Explore Ideas */}
      <ExploreCatalog ideas={ideas} workspace={workspace} />
    </div>
  );
}
