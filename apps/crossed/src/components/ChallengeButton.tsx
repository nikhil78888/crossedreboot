import { useState } from "react";
import { Share } from "react-native";
import { Button } from "./Button";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
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
};

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

  if (!game || !myProfile || game.gameVariant !== "CROSSWORD") return null;
  const mine = game.gameState?.[myProfile.id] as
    | { solvedInSeconds?: number; timeline?: unknown }
    | undefined;
  const solveSeconds = mine?.solvedInSeconds;
  if (solveSeconds == null) return null; // only offer once they've actually solved it

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
        })
        .select("id")
        .single();
      if (error || !data?.id) throw error ?? new Error("no id");
      const link = `https://crossed.app/c/${data.id}`;
      await Share.share({
        message: `I solved this Crossed puzzle in ${fmtSolve(
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
      label={`⚡ Challenge a friend · beat ${fmtSolve(solveSeconds)}`}
      isLoading={busy}
      onPress={onChallenge}
    />
  );
};
