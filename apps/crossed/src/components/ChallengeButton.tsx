import { useState } from "react";
import { Share } from "react-native";
import { Button } from "./Button";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { branch } from "../lib/branch";
import { fmtSolve } from "../app/(home-tabs)/stats";

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
const CHALLENGEABLE = ["CROSSWORD", "WORD_SEARCH", "TRIVIA"];

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
  const solveSeconds = mine?.solvedInSeconds;
  if (solveSeconds == null) return null; // only offer once they've actually solved it
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
          solveSeconds,
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
      await Share.share({
        message: `I finished this Crossed ${gameNoun} in ${fmtSolve(
          solveSeconds
        )} — think you can beat me? 👉 ${link}`,
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
      label={`⚡ Challenge a friend to beat ${fmtSolve(solveSeconds)}`}
      isLoading={busy}
      onPress={onChallenge}
    />
  );
};
