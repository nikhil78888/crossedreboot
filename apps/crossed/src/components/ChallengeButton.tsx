import { useState } from "react";
import { Share } from "react-native";
import { Button } from "./Button";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { branch } from "../lib/branch";
import { fmtSolve } from "../app/(home-tabs)/stats";
import { events, trackEvent } from "../lib/track-event";

// "Challenge a friend to beat my time." Creates a challenge from a just-finished
// crossword and opens the native share sheet. The recipient-side ghost race is
// the next increment; the link becomes a Branch link (install-from-link) in L2.
type ChallengeInsert = {
  challengerId: string;
  challengerName: string | null;
  gameVariant: string;
  crosswordsId: string | null;
  difficulty: string | null;
  resolvedClues: unknown;
  solveSeconds: number;
  timeline: unknown;
  puzzle?: unknown;
};

// Variants whose solve can be re-raced as a challenge (sudoku ghost replay TODO).
// TRIVIA disabled (2026-08) — no new trivia challenges while the mode is hidden.
const CHALLENGEABLE = ["CROSSWORD", "WORD_SEARCH"];

// Minimal structural view so we can hit the (not-yet-in-generated-types)
// `challenges` table without `any` or a types-package rebuild.
const challengesTable = supabase as unknown as {
  from: (t: "challenges") => {
    insert: (v: ChallengeInsert) => {
      select: (c: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: unknown;
        }>;
      };
    };
  };
};

export const ChallengeButton = ({ gameId }: { gameId: string }) => {
  const { game } = useGame({ gameId });
  const { myProfile } = useMyProfile();
  const [busy, setBusy] = useState(false);

  if (!game || !myProfile || !CHALLENGEABLE.includes(game.gameVariant))
    return null;
  // The game noun for the share copy, so a challenge reads as the actual game
  // sent (not always "crossword").
  const gameNoun =
    game.gameVariant === "WORD_SEARCH"
      ? "word search"
      : game.gameVariant === "TRIVIA"
      ? "trivia round"
      : "crossword";
  const mine = game.gameState?.[myProfile.id] as
    | { solvedInSeconds?: number; timeline?: unknown }
    | undefined;
  const solvedSeconds = mine?.solvedInSeconds ?? null;
  const solved = solvedSeconds != null;
  // Un-gated: anyone can challenge a friend, solved or not. In a timed race most
  // new users DON'T finish, and they're exactly who we want spreading the game —
  // so a non-solver sends "I couldn't crack it, can you?" instead of nothing.
  // For the beatable number we use their solve time if they solved, else the full
  // duration, so the recipient "wins" by simply solving what the sender couldn't.
  const challengeSeconds = solvedSeconds ?? game.gameDurationInSeconds ?? 180;
  // Inline puzzle to replay (word search / trivia); crossword uses crosswordsId.
  const gs = game.gameState as
    | { __wordsearch?: unknown; __trivia?: unknown }
    | undefined;
  const inlinePuzzle = gs?.__wordsearch ?? gs?.__trivia ?? null;

  const onChallenge = async () => {
    try {
      setBusy(true);
      const { data, error } = await challengesTable
        .from("challenges")
        .insert({
          challengerId: myProfile.id,
          challengerName: myProfile.username,
          gameVariant: game.gameVariant,
          crosswordsId: game.crossword?.id ?? null,
          difficulty: game.difficulty,
          resolvedClues: game.resolvedClues ?? null,
          solveSeconds: challengeSeconds,
          timeline: mine?.timeline ?? null,
          // Only send puzzle for inline variants (the column may not exist until
          // the migration runs; crossword challenges must keep working without it).
          ...(inlinePuzzle ? { puzzle: inlinePuzzle } : {}),
        })
        .select("id")
        .single();
      if (error || !data?.id) throw error ?? new Error("no id");
      let link = `https://crossed.app/c/${data.id}`;
      if (branch) {
        try {
          const buo = await branch.createBranchUniversalObject(
            `challenge/${data.id}`,
            {
              title: `Beat my Crossed ${gameNoun} time!`,
              contentMetadata: { customMetadata: { challengeId: data.id } },
            }
          );
          const res = await buo.generateShortUrl(
            { feature: "challenge", channel: "share" },
            { challengeId: data.id }
          );
          if (res?.url) link = res.url;
        } catch {
          // keep the plain fallback link
        }
      }
      const message = solved
        ? `I finished this Crossed ${gameNoun} in ${fmtSolve(
            challengeSeconds
          )} — think you can beat me? 👉 ${link}`
        : `I couldn't crack this Crossed ${gameNoun}. Bet you can't either 👀 👉 ${link}`;
      await Share.share({ message });
      // The async growth loop firing — a challenge actually sent to a friend.
      trackEvent(events.CHALLENGE_SENT, {
        variant: game.gameVariant,
        solved,
      });
    } catch {
      // best-effort — never block the results screen
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      intent="primary"
      size="xl"
      rounded="full"
      label={
        solved
          ? `⚡ Challenge a friend to beat ${fmtSolve(challengeSeconds)}`
          : "⚡ Dare a friend to solve it"
      }
      isLoading={busy}
      onPress={onChallenge}
    />
  );
};
