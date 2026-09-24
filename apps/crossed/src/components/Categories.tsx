import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { CategoriesPuzzle, CategoryGroup } from "types-and-validators";
import { FriendlyCrosswordHeader } from "./FriendlyCrosswordHeader";
import colors from "../lib/colors";

// Four bands for the four solved groups.
const GROUP_COLORS = ["#f0c33c", "#6aa84f", "#4a90d9", "#a56bd6"];

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

// Categories — an original group-the-words game. 16 words hide four secret
// groups of four; pick four you think belong together and submit. Solve all four
// before the clock, with only so many wrong guesses allowed. Puzzle lives inline
// on the game (gameState.__categories).
export const CategoriesGrid = ({
  gameId,
  hintable,
}: {
  gameId: string;
  hintable?: boolean;
}) => {
  const { game, finishGame } = useGame({ gameId });
  const { myProfile } = useMyProfile();
  const { width: screenW } = useWindowDimensions();
  // Explicit 4-column grid: compute each tile's width from the real screen width
  // (px-3 padding on each side = 12px, 3 gaps of 7px between 4 columns) instead
  // of relying on percentage width + flex-wrap, which was collapsing to a single
  // visible row on device (only 4 of the 16 tiles showed).
  const GAP = 7;
  const tileW = Math.floor((screenW - 24 - GAP * 3) / 4);
  const puzzle = (
    game?.gameState as { __categories?: CategoriesPuzzle } | undefined
  )?.__categories;

  const [solved, setSolved] = useState<CategoryGroup[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState<number | null>(null);
  const [hintWords, setHintWords] = useState<string[]>([]);
  const [flashWrong, setFlashWrong] = useState(false);
  const finishedRef = useRef(false);
  const gsRef = useRef(game?.gameState);
  useEffect(() => {
    gsRef.current = game?.gameState;
  }, [game?.gameState]);

  const startAtMs = useMemo(() => {
    const s = game?.startedAt ?? game?.createdAt;
    return s ? new Date(`${s}Z`).getTime() : null;
  }, [game?.startedAt, game?.createdAt]);
  const elapsedNow = () =>
    startAtMs ? Math.max(0, Math.round((Date.now() - startAtMs) / 1000)) : 0;

  // Init mistakes + restore saved progress.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !puzzle) return;
    hydratedRef.current = true;
    const mine = myProfile?.id
      ? (
          game?.gameState as Record<
            string,
            { solvedCats?: CategoryGroup[]; mistakesLeft?: number } | undefined
          >
        )?.[myProfile.id]
      : undefined;
    setSolved(mine?.solvedCats ?? []);
    setMistakesLeft(mine?.mistakesLeft ?? puzzle.mistakes);
  }, [puzzle, game?.gameState, myProfile?.id]);

  const persist = (
    nextSolved: CategoryGroup[],
    nextMistakes: number
  ) => {
    if (!myProfile) return;
    supabase
      .from("games")
      .update({
        gameState: {
          ...(gsRef.current ?? {}),
          [myProfile.id]: {
            solvedCats: nextSolved,
            mistakesLeft: nextMistakes,
          },
        } as never,
      })
      .eq("id", gameId)
      .then();
  };

  const win = (nextSolved: CategoryGroup[]) => {
    if (!myProfile || finishedRef.current) return;
    finishedRef.current = true;
    void (async () => {
      await supabase
        .from("games")
        .update({
          gameState: {
            ...(gsRef.current ?? {}),
            [myProfile.id]: {
              solvedCats: nextSolved,
              solvedInSeconds: elapsedNow(),
            },
          } as never,
        })
        .eq("id", gameId);
      finishGame();
    })();
  };

  const lose = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    finishGame(); // no solvedInSeconds → loss
  };

  if (!puzzle || !myProfile || mistakesLeft === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="font-[jost500] text-crossed-gray-400">Loading…</Text>
      </View>
    );
  }

  const solvedWords = new Set(solved.flatMap((g) => g.words));
  const remaining = puzzle.tiles.filter((w) => !solvedWords.has(w));

  const toggle = (word: string) => {
    if (finishedRef.current) return;
    if (selected.includes(word)) {
      setSelected(selected.filter((w) => w !== word));
    } else if (selected.length < 4) {
      setSelected([...selected, word]);
    }
  };

  const submit = () => {
    if (finishedRef.current || selected.length !== 4) return;
    const match = puzzle.groups.find(
      (g) => !solved.includes(g) && sameSet(g.words, selected)
    );
    if (match) {
      const nextSolved = [...solved, match];
      setSolved(nextSolved);
      setSelected([]);
      setHintWords([]);
      if (nextSolved.length >= 4) {
        // Only the winning write — win() persists solvedCats + solvedInSeconds.
        // A separate persist() here would race it and could clobber
        // solvedInSeconds, making a solved game read as "ran out of time".
        win(nextSolved);
      } else {
        persist(nextSolved, mistakesLeft);
      }
    } else {
      const left = mistakesLeft - 1;
      setMistakesLeft(left);
      setSelected([]);
      setFlashWrong(true);
      setTimeout(() => setFlashWrong(false), 500);
      persist(solved, left);
      if (left <= 0) lose();
    }
  };

  const revealHint = () => {
    const g = puzzle.groups.find((gr) => !solved.includes(gr));
    if (g) setHintWords(g.words);
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24 }}
    >
      <View className="mb-2">
        <FriendlyCrosswordHeader gameId={gameId} />
      </View>

      <View className="mb-2 flex-row items-center justify-between px-1">
        <Text className="font-[jost700] text-[15px] text-crossed-gray-700">
          Make four groups of four
        </Text>
        <Text className="font-[jost700] text-[15px] text-crossed-gray-500">
          Mistakes left: {mistakesLeft}
        </Text>
      </View>

      {/* Solved group bands */}
      {solved.map((g, i) => (
        <View
          key={g.category}
          className="mx-1 mb-2 items-center rounded-xl px-3 py-2"
          style={{ backgroundColor: GROUP_COLORS[i % 4] }}
        >
          <Text className="font-[jost700] text-[13px] uppercase tracking-wide text-white">
            {g.category}
          </Text>
          <Text className="font-[jost600] text-[14px] text-white">
            {g.words.join(", ")}
          </Text>
        </View>
      ))}

      {/* Remaining tiles — explicit 4-column grid so all 16 always show. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
        {remaining.map((w) => {
          const isSel = selected.includes(w);
          const isHint = hintWords.includes(w);
          return (
            <Pressable
              key={w}
              onPress={() => toggle(w)}
              style={{
                width: tileW,
                minHeight: 58,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                paddingHorizontal: 4,
                backgroundColor: isSel
                  ? colors["crossed-blue"]["450"]
                  : isHint
                  ? "#ddd6fe"
                  : colors["crossed-gray"]["100"],
              }}
            >
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: "jost700",
                  fontSize: 13,
                  textAlign: "center",
                  color: isSel ? "white" : isHint ? "#5b21b6" : "#111827",
                }}
              >
                {w}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-center justify-center" style={{ gap: 10 }}>
        {hintable && !finishedRef.current && (
          <Pressable
            onPress={revealHint}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 9999,
              paddingHorizontal: 16,
              paddingVertical: 11,
              backgroundColor: "#7c3aed",
            }}
          >
            <Text style={{ fontSize: 15 }}>💡</Text>
            <Text
              style={{
                marginLeft: 6,
                fontFamily: "jost700",
                fontSize: 13,
                color: "white",
              }}
            >
              Hint
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={submit}
          disabled={selected.length !== 4}
          style={{
            borderRadius: 9999,
            paddingHorizontal: 28,
            paddingVertical: 11,
            opacity: selected.length === 4 ? 1 : 0.4,
            backgroundColor: flashWrong
              ? "#dc2626"
              : colors["crossed-blue"]["450"],
          }}
        >
          <Text className="font-[jost700] text-[15px] text-white">Submit</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};
