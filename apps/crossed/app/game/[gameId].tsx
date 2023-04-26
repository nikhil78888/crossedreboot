import { useSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Share, Text, View } from "react-native";
import { useGame } from "../../hooks/use-game";
import { CrosswordProvider } from "../../components/Crossword";
import { useCurrentUser } from "../../hooks/use-current-user";
import { PrimaryButton } from "../../components/PrimaryButton";
import { gamesCollection } from "../../firebase-collection";
import { CrosswordHeader } from "../../components/CrosswordHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Game() {
  const { gameId, join } = useSearchParams();
  const { game } = useGame({ gameId: gameId as string | undefined });
  const { user, profile } = useCurrentUser();
  const { top } = useSafeAreaInsets();

  if (!user || !game) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const inviteFriend = async () => {
    const shared = await Share.share({
      title: "Let's play",
      message: `crossed://game/${gameId}?join=true`,
    });
    if (shared.action === Share.dismissedAction) {
      Alert.alert("Please invite a friend to play");
      return;
    }
    if (shared.action === Share.sharedAction) {
      gamesCollection
        .doc(gameId as string)
        .update({ play_state: "WAITING_FOR_OPPONENT" });
    }
  };

  const startMatch = () => {
    gamesCollection.doc(gameId as string).update({
      play_state: "PLAYING",
      players: [...game.players, user.uid],
      startedAt: new Date().toISOString(),
      player_handles: {
        ...game.player_handles,
        [user.uid]: profile?.username,
      },
    });
  };

  return (
    <View className={`flex-1`} style={{ paddingTop: top }}>
      {game.game_type === "FRIENDLY" && (
        <CrosswordHeader gameId={gameId as string} />
      )}
      <CrosswordProvider
        currentGame={game}
        currentGameId={gameId as string}
        currentUser={user}
      />
      {game.play_state === "CREATED" && (
        <View className="absolute h-full w-full bg-white/90">
          <View className="flex-1 items-center justify-center px-8">
            <PrimaryButton onPress={inviteFriend}>
              <View className="flex-1 items-center justify-center">
                <Text className="text-white">Invite a Friend</Text>
              </View>
            </PrimaryButton>
          </View>
        </View>
      )}
      {game.play_state === "WAITING_FOR_OPPONENT" && (
        <View className="absolute h-full w-full bg-white/90">
          <View className="flex-1 items-center justify-center px-8">
            {join === "true" ? (
              <PrimaryButton onPress={startMatch}>
                <View className="flex-1 items-center justify-center">
                  <Text className="text-white">Start Match</Text>
                </View>
              </PrimaryButton>
            ) : (
              <Text>Waiting for opponent...</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
