import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { supabase } from "../lib/supabase";
import { WordsyPuzzle, scoreWordsyGuess } from "types-and-validators";
import { FriendlyCrosswordHeader } from "./FriendlyCrosswordHeader";
import colors from "../lib/colors";

const ROWS_KEYS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const C_GREEN = "#16a34a";
const C_YELLOW = "#d4a017";
const C_GRAY = "#9aa4b0";

// Wordsy — an original guess-the-word game. Guess the hidden word; each guess is
// colored green (right letter, right spot), yellow (in the word, wrong spot) or
// grey (not in the word). Solve before the clock (win) or run out of guesses
// (loss). Puzzle lives inline on the game (gameState.__wordsy).
export const WordsyGrid = ({
  gameId,
  hintable,
}: {
  gameId: string;
  hintable?: boolean;
}) => {
  const { game, finishGame, opponent } = useGame({ gameId });
  const { myProfile } = useMyProfile();
  const { width: screenW } = useWindowDimensions();
  // Full-size keyboard: 10 keys fill the row like a normal phone keyboard.
  const KB_GAP = 5;
  const KB_PAD = 4;
  const keyW = Math.floor((screenW - KB_PAD * 2 - KB_GAP * 9) / 10);
  const actionW = Math.floor(keyW * 1.5);
  const puzzle = (
    game?.gameState as { __wordsy?: WordsyPuzzle } | undefined
  )?.__wordsy;

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [hints, setHints] = useState<number[]>([]); // revealed answer positions
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

  // Restore saved guesses (resume after background/kill).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !myProfile?.id || !game?.gameState) return;
    hydratedRef.current = true;
    const mine = (
      game.gameState as Record<string, { guesses?: string[] } | undefined>
    )[myProfile.id];
    if (mine?.guesses?.length) setGuesses(mine.guesses);
  }, [game?.gameState, myProfile?.id]);

  const persist = (next: string[]) => {
    if (!myProfile) return;
    supabase
      .from("games")
      .update({
        gameState: {
          ...(gsRef.current ?? {}),
          [myProfile.id]: { guesses: next },
        } as never,
      })
      .eq("id", gameId)
      .then();
  };

  const win = (finalGuesses: string[]) => {
    if (!myProfile || finishedRef.current) return;
    finishedRef.current = true;
    void (async () => {
      await supabase
        .from("games")
        .update({
          gameState: {
            ...(gsRef.current ?? {}),
            [myProfile.id]: {
              guesses: finalGuesses,
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
    finishGame(); // no solvedInSeconds → the result screen reads it as a loss
  };

  if (!puzzle || !myProfile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="font-[jost500] text-crossed-gray-400">Loading…</Text>
      </View>
    );
  }

  const { answer, length, maxGuesses } = puzzle;

  const submit = () => {
    if (finishedRef.current || current.length !== length) return;
    const guess = current.toUpperCase();
    const next = [...guesses, guess];
    setGuesses(next);
    setCurrent("");
    if (guess === answer) {
      persist(next);
      win(next);
      return;
    }
    if (next.length >= maxGuesses) {
      persist(next);
      lose();
      return;
    }
    persist(next);
  };

  const onKey = (k: string) => {
    if (finishedRef.current) return;
    if (current.length < length) setCurrent(current + k);
  };
  const onBackspace = () => setCurrent(current.slice(0, -1));

  const revealHint = () => {
    // Reveal one not-yet-revealed answer position in the hint strip.
    for (let i = 0; i < length; i++) {
      if (!hints.includes(i)) {
        setHints([...hints, i]);
        return;
      }
    }
  };

  // Best status per key across all guesses, for keyboard coloring.
  const keyStatus: Record<string, number> = {};
  for (const g of guesses) {
    const sc = scoreWordsyGuess(g, answer);
    for (let i = 0; i < g.length; i++) {
      keyStatus[g[i]] = Math.max(keyStatus[g[i]] ?? -1, sc[i]);
    }
  }
  const keyColor = (k: string) => {
    const s = keyStatus[k];
    if (s === 2) return C_GREEN;
    if (s === 1) return C_YELLOW;
    if (s === 0) return C_GRAY;
    return colors["crossed-gray"]["100"];
  };
  const keyText = (k: string) => (keyStatus[k] >= 0 ? "white" : "#111827");

  const cell = 46;
  const rows = Array.from({ length: maxGuesses }, (_, r) => r);

  return (
    <View className="flex-1 bg-white px-3 pt-2">
      <View className="mb-2">
        <FriendlyCrosswordHeader gameId={gameId} />
      </View>

      {hints.length > 0 && (
        <Text className="mb-1 text-center font-[jost700] text-[15px] tracking-[4px] text-crossed-blue-450">
          {Array.from({ length }, (_, i) =>
            hints.includes(i) ? answer[i] : "_"
          ).join(" ")}
        </Text>
      )}

      <View className="items-center">
        {rows.map((r) => {
          const guess = guesses[r];
          const isCurrent = r === guesses.length && !finishedRef.current;
          const sc = guess ? scoreWordsyGuess(guess, answer) : null;
          return (
            <View key={r} className="my-1 flex-row" style={{ gap: 6 }}>
              {Array.from({ length }, (_, c) => {
                const ch = guess ? guess[c] : isCurrent ? current[c] ?? "" : "";
                const bg = sc
                  ? sc[c] === 2
                    ? C_GREEN
                    : sc[c] === 1
                    ? C_YELLOW
                    : C_GRAY
                  : "white";
                return (
                  <View
                    key={c}
                    style={{
                      width: cell,
                      height: cell,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: sc ? 0 : 2,
                      borderColor: colors["crossed-gray"]["200"],
                      borderRadius: 6,
                      backgroundColor: bg,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "jost700",
                        fontSize: 22,
                        color: sc ? "white" : "#111827",
                      }}
                    >
                      {ch}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      {hintable && !finishedRef.current && (
        <View className="mt-3 items-center">
          <Pressable
            onPress={revealHint}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 9999,
              paddingHorizontal: 16,
              paddingVertical: 8,
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
              Reveal a Letter
            </Text>
          </Pressable>
        </View>
      )}

      {/* Keyboard — full width, like the normal phone keyboard */}
      <View className="mt-auto pb-3" style={{ paddingHorizontal: KB_PAD }}>
        {ROWS_KEYS.map((row, ri) => (
          <View
            key={ri}
            className="mb-2 flex-row justify-center"
            style={{ gap: KB_GAP }}
          >
            {ri === 2 && (
              <Pressable
                onPress={submit}
                style={{
                  width: actionW,
                  height: 58,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 7,
                  backgroundColor: colors["crossed-blue"]["450"],
                }}
              >
                <Text className="font-[jost700] text-[13px] text-white">
                  ENTER
                </Text>
              </Pressable>
            )}
            {row.split("").map((k) => (
              <Pressable
                key={k}
                onPress={() => onKey(k)}
                style={{
                  width: keyW,
                  height: 58,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 7,
                  backgroundColor: keyColor(k),
                }}
              >
                <Text
                  style={{
                    fontFamily: "jost700",
                    fontSize: 20,
                    color: keyText(k),
                  }}
                >
                  {k}
                </Text>
              </Pressable>
            ))}
            {ri === 2 && (
              <Pressable
                onPress={onBackspace}
                style={{
                  width: actionW,
                  height: 58,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 7,
                  backgroundColor: colors["crossed-gray"]["200"],
                }}
              >
                <Text className="font-[jost700] text-[20px]">⌫</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};
