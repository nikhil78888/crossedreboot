import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useEffect, useRef } from "react";
import { Avatar } from "react-native-ui-lib";
import { useTournament, TournamentMatch } from "../hooks/use-tournament";
import { useMyProfile } from "../hooks/use-my-profile";
import { avatars } from "../lib/images";
import { Button } from "../components/Button";
import { WaitingSpinner } from "../components/WaitingSpinner";
import colors from "../lib/colors";

const ROUND_LABELS: Record<number, string> = {
  1: "Quarterfinals",
  2: "Semifinals",
  3: "Final",
};

export default function Tournament() {
  const router = useRouter();
  const navigation = useNavigation();
  const { myProfile } = useMyProfile();
  const { tournamentId } = useLocalSearchParams();
  const {
    tournament,
    players,
    matches,
    iAmEliminated,
    iAmCreator,
    isPrivate,
    myActiveGameId,
    humanCount,
    isChampion,
    startNow,
  } = useTournament({ tournamentId: tournamentId as string | undefined });

  // When my live match has a game ready, drop into it — but only ONCE per game.
  // Otherwise, when a finished game's match briefly still reads "PLAYING", this
  // screen and the game screen bounce back and forth (max-update-depth crash).
  const enteredGames = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (
      myActiveGameId &&
      navigation.isFocused() &&
      !enteredGames.current.has(myActiveGameId)
    ) {
      enteredGames.current.add(myActiveGameId);
      router.replace(
        `/game?gameId=${myActiveGameId}&tournamentId=${tournamentId}`
      );
    }
  }, [myActiveGameId, navigation, router, tournamentId]);

  if (!tournament) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  const nameFor = (profileId: string | null) => {
    if (!profileId) return "—";
    const p = players.find((pl) => pl.profilesId === profileId);
    return p?.profile?.username || "Player";
  };

  // ---- FILLING -----------------------------------------------------------
  if (tournament.status === "FILLING") {
    const size = tournament.size ?? 8;
    return (
      <View className="flex-1 bg-white px-5">
        <Text className="mt-6 text-center font-[jost700] text-[24px]">
          Tournament Lobby
        </Text>
        <Text className="mt-2 text-center font-[jost400] text-crossed-gray-400">
          {isPrivate ? "Private tournament · " : ""}
          {humanCount}/{size} joined
        </Text>
        <Text className="mt-1 text-center font-[jost400] text-xs text-crossed-gray-400">
          {isPrivate
            ? "Invite friends, then start whenever you're ready — empty seats become bots."
            : "Empty seats fill with bots near your skill if the field isn't full."}
        </Text>
        <View className="mt-6 flex-row flex-wrap justify-center">
          {Array.from({ length: size }).map((_, i) => {
            const seated = players.filter((p) => !p.isBot)[i];
            return (
              <View key={i} className="m-2 items-center" style={{ width: 70 }}>
                <View
                  className="rounded-full items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    backgroundColor: seated
                      ? colors["crossed-blue"]["50"]
                      : colors["crossed-gray"]["100"],
                  }}
                >
                  {seated ? (
                    <Avatar
                      size={56}
                      name={seated.profile?.username || "?"}
                      source={
                        avatars[seated.profile?.avatar as keyof typeof avatars]
                      }
                      imageStyle={{ backgroundColor: "white" }}
                    />
                  ) : (
                    <Text className="font-[jost600] text-crossed-gray-400">
                      ?
                    </Text>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  className="mt-1 font-[jost400] text-[11px] text-crossed-gray-400"
                >
                  {seated ? seated.profile?.username || "You" : "open"}
                </Text>
              </View>
            );
          })}
        </View>
        {!iAmCreator && (
          <View className="mt-8 flex-row items-center justify-center">
            <WaitingSpinner />
            <Text className="ml-2 font-[jost600] text-sm">
              waiting for the bracket…
            </Text>
          </View>
        )}
        {/* Private tournament creator controls */}
        {isPrivate && iAmCreator && (
          <View className="mt-8">
            <Button
              label="Invite Friends"
              intent={"primary"}
              size={"lg"}
              rounded={"full"}
              onPress={() =>
                router.push(`/tournament-invite?tournamentId=${tournamentId}`)
              }
            />
            <View className="mt-3">
              <Button
                label="Start Tournament Now"
                intent={"primary"}
                mode={"outline"}
                size={"lg"}
                rounded={"full"}
                onPress={async () => {
                  try {
                    await startNow(tournamentId as string);
                  } catch {
                    // ignore; realtime will reflect the start
                  }
                }}
              />
            </View>
          </View>
        )}
        <View className="absolute bottom-8 inset-x-4">
          <Button
            label="Leave"
            intent={"secondary"}
            size={"lg"}
            onPress={() => router.replace("/home")}
          />
        </View>
      </View>
    );
  }

  // ---- COMPLETED ---------------------------------------------------------
  if (tournament.status === "COMPLETED") {
    return (
      <View className="flex-1 bg-white px-5">
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="mt-8 text-center" style={{ fontSize: 56 }}>
            🏆
          </Text>
          <Text className="mt-2 text-center font-[jost700] text-[26px]">
            {isChampion ? "You won the tournament!" : "Tournament Complete"}
          </Text>
          <Text className="mt-1 text-center font-[jost600] text-crossed-yellow-300 text-lg">
            Champion: {nameFor(tournament.winnerId)}
          </Text>
          <View className="mt-6">
            <Bracket matches={matches} nameFor={nameFor} />
          </View>
          <View className="mt-8">
            <Button
              label="Back Home"
              intent={"primary"}
              size={"xl"}
              rounded={"full"}
              onPress={() => router.replace("/home")}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---- IN_PROGRESS (waiting room / bracket) ------------------------------
  return (
    <View className="flex-1 bg-white px-5">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="mt-6 text-center font-[jost700] text-[22px]">
          {iAmEliminated ? "You're out — watch it play out" : "Tournament"}
        </Text>
        <View className="mt-3 flex-row items-center justify-center">
          <WaitingSpinner />
          <Text className="ml-2 font-[jost600] text-sm">
            {iAmEliminated
              ? "waiting for the champion…"
              : "waiting for your next match…"}
          </Text>
        </View>
        <View className="mt-6">
          <Bracket matches={matches} nameFor={nameFor} highlightId={myProfile?.id} />
        </View>
        <View className="mt-8">
          <Button
            label="Leave Tournament"
            intent={"secondary"}
            size={"lg"}
            onPress={() => router.replace("/home")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const Bracket = ({
  matches,
  nameFor,
  highlightId,
}: {
  matches: TournamentMatch[];
  nameFor: (id: string | null) => string;
  highlightId?: string;
}) => {
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort(
    (a, b) => a - b
  );
  return (
    <View>
      {rounds.map((round) => (
        <View key={round} className="mb-5">
          <Text className="font-[jost700] text-base text-crossed-gray-900 mb-2">
            {ROUND_LABELS[round] || `Round ${round}`}
          </Text>
          {matches
            .filter((m) => m.round === round)
            .sort((a, b) => a.matchIndex - b.matchIndex)
            .map((m) => (
              <View
                key={m.id}
                className="mb-2 rounded-xl bg-crossed-gray-50 px-3 py-2"
              >
                <MatchRow
                  label={nameFor(m.playerOneId)}
                  isWinner={!!m.winnerId && m.winnerId === m.playerOneId}
                  isMe={!!highlightId && m.playerOneId === highlightId}
                  status={m.status}
                />
                <View className="h-[1px] bg-crossed-gray-100 my-1" />
                <MatchRow
                  label={nameFor(m.playerTwoId)}
                  isWinner={!!m.winnerId && m.winnerId === m.playerTwoId}
                  isMe={!!highlightId && m.playerTwoId === highlightId}
                  status={m.status}
                />
              </View>
            ))}
        </View>
      ))}
    </View>
  );
};

const MatchRow = ({
  label,
  isWinner,
  isMe,
  status,
}: {
  label: string;
  isWinner: boolean;
  isMe: boolean;
  status: string;
}) => (
  <View className="flex-row items-center justify-between">
    <Text
      numberOfLines={1}
      className="flex-1 font-[jost600] text-[15px]"
      style={{
        color: isWinner
          ? colors["crossed-gray"]["900"]
          : colors["crossed-gray"]["400"],
        fontWeight: isMe ? "700" : "600",
      }}
    >
      {label}
      {isMe ? " (you)" : ""}
    </Text>
    {isWinner ? (
      <Text className="ml-2">✅</Text>
    ) : status === "PLAYING" ? (
      <Text className="ml-2 text-xs text-crossed-gray-400">live</Text>
    ) : null}
  </View>
);
