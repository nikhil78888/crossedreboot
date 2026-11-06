import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { View, Text } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordGrid } from "../components/Crossword";
import { SudokuGrid } from "../components/Sudoku";
import { ScrollView } from "react-native-gesture-handler";
import { useMyProfile } from "../hooks/use-my-profile";
import { NewGameButtons } from "../components/NewGameButtons";
import { Button } from "../components/Button";
import { PlayerAnswerButton } from "../components/CrosswordResults";
import { classNames } from "../lib/utils";

// Answer panels for the variants that aren't grid-backed crosswords/sudoku.
// They read the solution straight out of gameState, so they work for ranked,
// friendly, story AND daily-duel games without touching each game component
// (the old screen fell through to an empty CrosswordGrid for these variants,
// which rendered as a tiny dot — the bug people hit trying to see answers).
const Section = ({ children }: { children: React.ReactNode }) => (
  <View className="mt-5 rounded-2xl bg-crossed-gray-50 px-4 py-4">{children}</View>
);
const Heading = ({ children }: { children: React.ReactNode }) => (
  <Text className="font-[jost700] text-lg text-crossed-gray-900">{children}</Text>
);

const VariantAnswers = ({
  game,
  playerId,
}: {
  game: NonNullable<ReturnType<typeof useGame>["game"]>;
  playerId?: string;
}) => {
  const gs = (game.gameState ?? {}) as Record<string, unknown> & {
    __wordsy?: { answer?: string };
    __categories?: { groups?: { category: string; words: string[] }[] };
    __wordsearch?: { words?: string[]; grid?: string[][]; theme?: string };
    __trivia?: { questions?: { q: string; choices: string[]; answer: number }[] };
  };

  if (game.gameVariant === "WORDSY") {
    const answer = (gs.__wordsy?.answer ?? "").toUpperCase();
    const guesses =
      (playerId
        ? (gs[playerId] as { guesses?: string[] } | undefined)?.guesses
        : undefined) ?? [];
    return (
      <View className="px-5">
        <Section>
          <Heading>The word was</Heading>
          <Text
            className="mt-2 font-[jost700] text-crossed-blue-450"
            style={{ fontSize: 40, letterSpacing: 6 }}
          >
            {answer}
          </Text>
        </Section>
        {guesses.length > 0 && (
          <Section>
            <Heading>Your guesses</Heading>
            {guesses.map((g, i) => (
              <Text
                key={i}
                className="mt-1 font-[jost600] text-crossed-gray-700"
                style={{ fontSize: 20, letterSpacing: 4 }}
              >
                {g.toUpperCase()}
              </Text>
            ))}
          </Section>
        )}
      </View>
    );
  }

  if (game.gameVariant === "CATEGORIES") {
    const groups = gs.__categories?.groups ?? [];
    return (
      <View className="px-5">
        <Section>
          <Heading>The four groups</Heading>
          {groups.map((grp, i) => (
            <View key={i} className="mt-3">
              <Text className="font-[jost600] text-sm text-crossed-blue-450">
                {grp.category}
              </Text>
              <Text className="font-[jost700] text-base text-crossed-gray-900">
                {grp.words.map((w) => w.toUpperCase()).join("  ·  ")}
              </Text>
            </View>
          ))}
        </Section>
      </View>
    );
  }

  if (game.gameVariant === "WORD_SEARCH") {
    const words = gs.__wordsearch?.words ?? [];
    const grid = gs.__wordsearch?.grid ?? [];
    return (
      <View className="px-5">
        {grid.length > 0 && (
          <Section>
            <Heading>The grid</Heading>
            <View className="mt-2">
              {grid.map((row, r) => (
                <Text
                  key={r}
                  className="font-[jost600] text-crossed-gray-700"
                  style={{ fontSize: 16, letterSpacing: 3 }}
                >
                  {row.join(" ")}
                </Text>
              ))}
            </View>
          </Section>
        )}
        <Section>
          <Heading>Words to find</Heading>
          <Text className="mt-2 font-[jost600] text-base text-crossed-gray-900">
            {words.map((w) => w.toUpperCase()).join("   ")}
          </Text>
        </Section>
      </View>
    );
  }

  if (game.gameVariant === "TRIVIA") {
    const qs = gs.__trivia?.questions ?? [];
    return (
      <View className="px-5">
        <Section>
          <Heading>Answers</Heading>
          {qs.map((q, i) => (
            <View key={i} className="mt-3">
              <Text className="font-[jost600] text-sm text-crossed-gray-700">
                {i + 1}. {q.q}
              </Text>
              <Text className="font-[jost700] text-base text-crossed-blue-450">
                {q.choices?.[q.answer] ?? ""}
              </Text>
            </View>
          ))}
        </Section>
      </View>
    );
  }

  return (
    <View className="px-5">
      <Section>
        <Heading>Answers aren&apos;t available for this game.</Heading>
      </Section>
    </View>
  );
};

export default function ViewAnswers() {
  const { gameId, playerId }: { gameId?: string; playerId?: string } =
    useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const { game } = useGame({ gameId });
  const { myProfile } = useMyProfile();

  useLayoutEffect(() => {
    if (!playerId) {
      navigation.setOptions({ headerTitle: "Answers" });
      return;
    }
    const playerProfile = game?.players.find(
      (profile) => profile.id === playerId
    );
    navigation.setOptions({
      headerTitle: `Answers of ${playerProfile?.username}`,
    });
  }, [playerId, navigation, game?.players]);

  if (!gameId || !game || !myProfile) {
    return null;
  }

  const opponent = game.players.find((p) => p.id !== myProfile.id);
  const isGridGame =
    game.gameVariant === "SUDOKU" || game.gameVariant === "CROSSWORD";

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {game.gameVariant === "SUDOKU" ? (
        <SudokuGrid gameId={gameId as string} showResults={{ playerId }} />
      ) : game.gameVariant === "CROSSWORD" ? (
        <CrosswordGrid gameId={gameId as string} showResults={{ playerId }} />
      ) : (
        <VariantAnswers game={game} playerId={playerId || myProfile.id} />
      )}
      <View className="flex-1 px-5">
        {game.gameType !== "SOLO" && isGridGame && (
          <View className="flex-1">
            <View className={classNames("mt-5 flex-row space-x-4")}>
              {playerId !== myProfile.id && (
                <View className="flex-1">
                  <PlayerAnswerButton
                    player={myProfile}
                    game={game}
                    onPress={() => router.setParams({ playerId: myProfile.id })}
                  />
                </View>
              )}
              {playerId !== opponent?.id && (
                <View className="flex-1">
                  {opponent && (
                    <PlayerAnswerButton
                      player={opponent}
                      game={game}
                      onPress={() =>
                        router.setParams({ playerId: opponent.id })
                      }
                    />
                  )}
                </View>
              )}
            </View>
            {playerId && (
              <View className="mt-5">
                <Button
                  intent={"primary"}
                  size={"xl"}
                  label="View Puzzle Answers"
                  rounded={"full"}
                  onPress={() => router.setParams({ gameId, playerId: "" })}
                />
              </View>
            )}
          </View>
        )}
        <View className="mt-5 flex-row">
          <View>
            <View className="absolute bottom-0 inset-x-0 h-3.5 bg-crossed-yellow-200" />
            <Text className="font-[jost600] text-xl text-cr-gray-800">
              Start a New Match!
            </Text>
          </View>
        </View>
        <View className="mt-2">
          <NewGameButtons />
        </View>
        <View className="mt-6">
          <Button
            intent="primary"
            mode={"outline"}
            size={"lg"}
            rounded={"full"}
            label="Go Home"
            onPress={() => router.push("/home")}
          />
        </View>
      </View>
    </ScrollView>
  );
}
