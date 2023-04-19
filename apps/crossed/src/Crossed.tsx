import { Pressable, Text, View, Share, Alert } from "react-native";
import { useCurrentUser } from "./hooks/use-current-user";
import { useCurrentGame } from "./hooks/use-current-game";
import { CrosswordProvider } from "./Crossword";

export const Crossed = () => {
  const { currentUser } = useCurrentUser();
  const {
    currentGame,
    currentGameId,
    loadingCurrentGame,
    refreshingCurrentGame,
    startSoloGame,
    startGameWithAFriend,
  } = useCurrentGame();

  if (!currentUser || loadingCurrentGame || refreshingCurrentGame) {
    return null;
  }

  if (!currentGame || !currentGameId) {
    return (
      <View className="flex-1 items-center justify-center">
        <Pressable
          onPress={startSoloGame}
          className="h-10 px-2 items-center justify-center bg-blue-200"
        >
          <Text>Play Solo</Text>
        </Pressable>
        <Pressable
          onPress={startGameWithAFriend}
          className="h-10 px-2 items-center justify-center bg-blue-200 mt-2"
        >
          <Text>Play With a Fried</Text>
        </Pressable>
      </View>
    );
  }

  const inviteFriend = async () => {
    const shared = await Share.share({
      title: "Let's play",
      message: `crossed://?gameId=${currentGameId}`,
    });
    if (shared.action === Share.dismissedAction) {
      Alert.alert("Please invite a friend to play");
      return;
    }
  };

  if (
    currentGame.game_type === "FRIENDLY" &&
    currentGame.players.length === 1
  ) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Game Ready</Text>
        <Pressable
          onPress={inviteFriend}
          className="h-10 px-2 items-center justify-center bg-blue-200 mt-2"
        >
          <Text>Invite a Fried</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CrosswordProvider
      currentGame={currentGame}
      currentUser={currentUser}
      currentGameId={currentGameId}
    />
  );
};
