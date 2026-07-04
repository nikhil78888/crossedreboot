import { ActivityIndicator, View, Text, Linking } from "react-native";

// External feedback form (Typeform).
export const FEEDBACK_URL = "https://form.typeform.com/to/DUbfDOEn";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ShareAppButton } from "../../components/ShareAppButton";
import { useCurrentGame } from "../../hooks/use-current-game";
import { useGame } from "../../hooks/use-game";
import {
  consumePendingIntro,
  peekPendingIntro,
  consumePendingChallenge,
  peekPendingChallenge,
} from "../../lib/intro-flag";
import { Button } from "../../components/Button";
import { ChallengeResultsBanner } from "../../components/ChallengeResultsBanner";
import { IntroGamePrompt } from "../../components/IntroGamePrompt";
import { NewGameButtons } from "../../components/NewGameButtons";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { useMyProfile } from "../../hooks/use-my-profile";
import { usePushRegistration } from "../../hooks/use-push-registration";
import { NotificationOptInBanner } from "../../components/NotificationOptInBanner";
import { getRank } from "../../lib/rank";
import { ratingForVariant } from "../../lib/variant-rating";
import { useFriends } from "../../hooks/use-friends";
import { useVariant } from "../../hooks/use-variant";
import {
  useTournament,
  useTournamentInvites,
} from "../../hooks/use-tournament";

export default function Home() {
  const { currentGameId, loadingCurrentGameId } = useCurrentGame();
  const { game, createGuidedMatch } = useGame({
    gameId: currentGameId,
  });
  const { myProfile } = useMyProfile();
  // Register this device for re-engagement push notifications (asks permission
  // once the player has reached the dashboard, i.e. after onboarding).
  usePushRegistration(myProfile?.id);
  const { invites, requests } = useFriends();
  const { tournamentInvites, refreshTournamentInvites } =
    useTournamentInvites();
  const { acceptInvite } = useTournament({ tournamentId: undefined });
  const router = useRouter();
  const navigation = useNavigation();

  const { variant } = useVariant();
  const gamePlayState = game?.playState;
  // Show the rank for whichever variant is selected.
  const variantRating = ratingForVariant(myProfile, variant);
  const rank = getRank(variantRating);

  useEffect(() => {
    if (navigation.isFocused()) {
      switch (gamePlayState) {
        case "PLAYING":
          router.replace(`/game?gameId=${currentGameId}`);
          break;
        case "WAITING_FOR_OPPONENT":
          router.replace(`/invite-friend?gameId=${currentGameId}`);
          break;
        default:
          break;
      }
    }
  }, [currentGameId, gamePlayState, router, navigation]);

  // New-user intro flow. A challenge deep-link (acquisition) still AUTO-launches
  // — it's the user's very first experience. The generic intro is now
  // username-first: we PROMPT a warm-up vs a bot and launch it on tap.
  const challengeLaunched = useRef(false);
  const [launchingChallenge, setLaunchingChallenge] = useState(
    !!peekPendingChallenge()
  );
  const [showIntroPrompt, setShowIntroPrompt] = useState(peekPendingIntro());
  const [introLaunching, setIntroLaunching] = useState(false);

  // Consume the one-shot intro flag on mount: the initial render above already
  // captured it, so clearing it now means a later remount can't yank the player
  // back into onboarding after they've reached the dashboard.
  useEffect(() => {
    if (peekPendingIntro()) consumePendingIntro();
  }, []);

  useEffect(() => {
    if (!myProfile?.id || challengeLaunched.current) return;
    const challengeId = consumePendingChallenge();
    if (challengeId) {
      consumePendingIntro(); // a challenge supersedes the generic intro
      challengeLaunched.current = true;
      setLaunchingChallenge(true);
      setShowIntroPrompt(false);
      router.replace(`/challenge?id=${challengeId}`);
    }
  }, [myProfile?.id, router]);

  const launchIntro = async () => {
    if (introLaunching) return;
    setIntroLaunching(true);
    consumePendingIntro();
    try {
      const id = await createGuidedMatch({ source: "onboarding" });
      if (id) router.replace(`/game?gameId=${id}&guided=1`);
      else {
        setIntroLaunching(false);
        setShowIntroPrompt(false);
      }
    } catch {
      setIntroLaunching(false);
      setShowIntroPrompt(false); // fall through to the dashboard
    }
  };

  if (launchingChallenge || loadingCurrentGameId || (currentGameId && !game)) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  if (showIntroPrompt) {
    return (
      <IntroGamePrompt
        username={myProfile?.username}
        onPlay={launchIntro}
        isLoading={introLaunching}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      className="flex-1 bg-white px-4"
    >
      {/* Personalized header + rank (taps through to the leaderboard) */}
      <View className="mt-3 mb-1 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="font-[jost700] text-[26px] text-crossed-gray-900"
            numberOfLines={1}
          >
            Hi, {myProfile?.username || "there"} 👋
          </Text>
          <Text className="font-[jost400] text-sm text-crossed-gray-400 mt-0.5">
            Ready for a match?
          </Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push("/friends")}
            className="items-center rounded-2xl px-3 py-2 bg-crossed-gray-50 mr-2"
          >
            <Text style={{ fontSize: 28 }}>👥</Text>
            <Text className="font-[jost600] text-xs mt-0.5">Friends</Text>
            {!!requests?.length && (
              <View className="absolute -top-1 -right-1 rounded-full bg-crossed-red-500 min-w-[18px] h-[18px] items-center justify-center px-1">
                <Text className="text-white font-[jost700] text-[10px]">
                  {requests.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/leaderboard")}
            className="items-center rounded-2xl px-3 py-2 bg-crossed-gray-50"
          >
            <Text style={{ fontSize: 28 }}>{rank.emoji}</Text>
            <Text
              className="font-[jost600] text-xs mt-0.5"
              style={{ color: rank.color }}
            >
              {rank.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nudge to enable push notifications (for users who never turned them on) */}
      <NotificationOptInBanner profileId={myProfile?.id} />

      {/* Feedback on challenges you sent: who accepted + who won */}
      <ChallengeResultsBanner />

      {/* Incoming friendly-match invite from a friend */}
      {!!invites?.length && (
        <TouchableOpacity
          onPress={() => router.push(`/join-game?gameId=${invites[0].gameId}`)}
          className="mt-3 rounded-xl bg-crossed-green-100 px-4 py-3 flex-row items-center"
        >
          <Text style={{ fontSize: 22 }}>🎮</Text>
          <Text className="ml-2 flex-1 font-[jost600] text-crossed-gray-900">
            {invites[0].from?.username || "A friend"} invited you to play
          </Text>
          <Text className="font-[jost700] text-crossed-blue-450">Join</Text>
        </TouchableOpacity>
      )}

      {/* Incoming tournament invite from a friend */}
      {!!tournamentInvites.length && (
        <TouchableOpacity
          onPress={async () => {
            try {
              const tid = await acceptInvite(tournamentInvites[0].tournamentId);
              refreshTournamentInvites();
              if (tid) router.push(`/tournament?tournamentId=${tid}`);
            } catch {
              // invite no longer valid (tournament started/full)
              refreshTournamentInvites();
            }
          }}
          className="mt-3 rounded-xl bg-crossed-yellow-200 px-4 py-3 flex-row items-center"
        >
          <Text style={{ fontSize: 22 }}>🏆</Text>
          <Text className="ml-2 flex-1 font-[jost600] text-crossed-gray-900">
            {tournamentInvites[0].fromUsername} invited you to a tournament
          </Text>
          <Text className="font-[jost700] text-crossed-blue-450">Join</Text>
        </TouchableOpacity>
      )}

      <View className="mt-4">
        <NewGameButtons />
      </View>
      <View className="mt-5 w-full">
        <ShareAppButton />
      </View>
      <View className="mt-5">
        <Button
          intent={"secondary"}
          label="Feedback"
          size={"base"}
          onPress={() => Linking.openURL(FEEDBACK_URL)}
        />
      </View>
    </ScrollView>
  );
}
