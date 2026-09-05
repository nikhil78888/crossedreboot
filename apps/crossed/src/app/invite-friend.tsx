import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Image } from "expo-image";
import { avatars } from "../lib/images";
import { useMyProfile } from "../hooks/use-my-profile";
import { useVariant } from "../hooks/use-variant";
import { useGameGate } from "../hooks/use-subscription";
import { events, trackEvent } from "../lib/track-event";
import { WaitingSpinner } from "../components/WaitingSpinner";
import { branch } from "../lib/branch";

export default function InviteFriend() {
  const params = useLocalSearchParams();
  const paramGameId = params.gameId as string | undefined;
  const autoShare = params.autoShare;
  const create = params.create;
  const router = useRouter();
  const navigation = useNavigation();
  const { variant } = useVariant();
  const { checkCanPlay } = useGameGate();
  const { myProfile } = useMyProfile();

  // gameId may arrive as a param (old flow) or be created here on the fly (new
  // one-tap friendly flow), so it lives in state.
  const [gameId, setGameId] = useState<string | undefined>(paramGameId);
  const { game, abortGame, createFriendlyGame } = useGame({ gameId });
  const gamePlayState = game?.playState;

  const creating = useRef(false);
  const autoShared = useRef(false);
  const leaving = useRef(false); // suppress the abort prompt on programmatic exits

  // New friendly flow: no game passed in → create one now (random difficulty),
  // so the difficulty picker is skipped and we land straight on this waiting
  // screen. The screen's own spinner covers the create round-trip.
  useEffect(() => {
    if (gameId || create !== "1" || creating.current) return;
    creating.current = true;
    (async () => {
      try {
        const gate = await checkCanPlay();
        if (!gate.allowed) {
          trackEvent(events.GATE_BLOCKED, { mode: "FRIENDLY", variant });
          leaving.current = true;
          router.replace("/upgrade-to-pro");
          return;
        }
        const difficulty = Math.random() < 0.5 ? "REGULAR" : "HARD";
        trackEvent(events.DIFFICULTY_SELECTED, {
          mode: "FRIENDLY",
          variant,
          difficulty,
        });
        const id = await createFriendlyGame({ variant, difficulty });
        if (id) setGameId(id as string);
        else {
          Alert.alert("Something went wrong", "Please try again.");
          leaving.current = true;
          router.replace("/home");
        }
      } catch {
        Alert.alert("Something went wrong", "Please try again.");
        leaving.current = true;
        router.replace("/home");
      }
    })();
  }, [gameId, create, checkCanPlay, createFriendlyGame, variant, router]);

  // Route out when the game state changes (opponent joined / game ended).
  useEffect(() => {
    if (leaving.current) return;
    if (navigation.isFocused()) {
      switch (gamePlayState) {
        case "COMPLETED":
          leaving.current = true;
          Alert.alert("The game has ended");
          router.replace("/home");
          break;
        case "ABORTED":
          leaving.current = true;
          Alert.alert("The game was aborted");
          router.replace("/home");
          break;
        case "PLAYING":
          leaving.current = true;
          router.replace(`/game?gameId=${gameId}`);
          break;
        default:
          break;
      }
    }
  }, [gameId, gamePlayState, router, navigation]);

  const inviteFriend = async ({ auto = false }: { auto?: boolean } = {}) => {
    // Prefer a Branch link: it opens the app for existing users AND sends a
    // friend WITHOUT the app to the App Store, then drops them into this game
    // after they sign up (deferred deep link → setPendingJoinGame in _layout).
    // Fall back to the raw scheme link (existing-users-only) if Branch is absent.
    let link = `crossed://join-game?gameId=${gameId}`;
    if (branch) {
      try {
        const buo = await branch.createBranchUniversalObject(`game/${gameId}`, {
          title: "Play me on Crossed!",
          contentMetadata: {
            customMetadata: { joinGameId: String(gameId) },
          },
        });
        const res = await buo.generateShortUrl(
          { feature: "invite", channel: "share" },
          { joinGameId: String(gameId) }
        );
        if (res?.url) link = res.url;
      } catch {
        // keep the plain scheme fallback
      }
    }
    const shared = await Share.share({
      title: "Let's play",
      message: `Race me on Crossed 👉 ${link}`,
    });
    // On the auto path (share sheet popped on arrival) don't nag if they
    // dismiss — they're on the waiting screen with a manual button to retry.
    if (shared.action === Share.dismissedAction && !auto) {
      Alert.alert("Please invite a friend to play");
      return;
    }
  };

  // Arriving with autoShare=1: pop the share sheet as soon as the game exists,
  // so "Send a Link" actually sends a link, then stay on this waiting screen.
  useEffect(() => {
    if (autoShared.current) return;
    if (autoShare === "1" && gameId) {
      autoShared.current = true;
      inviteFriend({ auto: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShare, gameId]);

  // Back (gesture / header button / hardware) should QUIT the match, not just
  // leave a dangling waiting game behind. Confirm, abort, then let the nav go.
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      // Allow programmatic exits (game started/ended) and the pre-game state
      // where there's nothing to abort yet.
      if (leaving.current || gamePlayState === "PLAYING" || !gameId) return;
      e.preventDefault();
      Alert.alert("Quit game?", "This ends the match for you and your friend.", [
        { text: "Keep waiting", style: "cancel" },
        {
          text: "Quit",
          style: "destructive",
          onPress: async () => {
            leaving.current = true;
            try {
              await abortGame();
            } catch {
              // proceed with leaving regardless
            }
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsub;
  }, [navigation, gamePlayState, gameId, abortGame]);

  const exitGame = () => {
    Alert.alert("Exit Game?", "Are you sure?", [
      { text: "Keep waiting", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: async () => {
          leaving.current = true;
          try {
            await abortGame();
          } catch {
            // ignore
          }
          router.replace("/home");
        },
      },
    ]);
  };

  if (!myProfile) {
    return null;
  }

  const friendlyAvatar = Object.keys(avatars).find(
    (a) => myProfile.avatar !== a
  ) as keyof typeof avatars;

  return (
    <View className="flex-1 items-center px-4 bg-white">
      <View className="mt-4 flex-row items-center">
        <WaitingSpinner />
        <Text className="text-base font-[jost600] ml-2">
          Waiting for opponent
        </Text>
      </View>
      <View className="mt-6">
        <View
          className="h-[180px] w-[180px] border-black/20 rounded-full items-center justify-center"
          style={{ borderWidth: StyleSheet.hairlineWidth }}
        >
          <View className="p-5 bg-gray-100 rounded-full">
            <Image
              source={avatars[friendlyAvatar]}
              className="h-[60px] w-[60px]"
            />
          </View>
        </View>
      </View>
      <View className="mt-6">
        <Button
          intent="primary"
          size="base"
          label="Invite a friend"
          rounded={"full"}
          onPress={() => inviteFriend()}
        />
      </View>
      <View className="absolute bottom-8 inset-x-4">
        <Button
          intent="secondary"
          size="lg"
          label="Go back home"
          onPress={exitGame}
        />
      </View>
    </View>
  );
}
