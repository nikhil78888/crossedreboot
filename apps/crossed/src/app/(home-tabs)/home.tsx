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
import { NewGameButtons } from "../../components/NewGameButtons";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { useMyProfile } from "../../hooks/use-my-profile";
import { useGameGate } from "../../hooks/use-subscription";
import { events, trackEvent } from "../../lib/track-event";
import { supabase } from "../../lib/supabase";
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
  const { game } = useGame({
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
  const { checkCanPlay } = useGameGate();
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
  // Whether this player still owes us their intro game. "pending" means we don't
  // know yet — we render a spinner rather than the dashboard, so a brand-new
  // player never sees the dashboard flash before the intro appears.
  const [introState, setIntroState] = useState<"pending" | "new" | "existing">(
    peekPendingIntro() ? "new" : "pending"
  );

  // Durable new-user intro. The in-memory pendingIntro flag above is lost if the
  // app reloads between signup and reaching Home (e.g. a fresh install applying
  // its first OTA), which silently skips the intro. So ALSO show the warm-up to
  // any signed-in player who hasn't joined a single game yet — the true "brand
  // new" signal — so the intro reliably pops up for new users. Once they've
  // played anything, the count is > 0 and this never fires again.
  useEffect(() => {
    if (introState !== "pending") return;
    if (peekPendingChallenge()) {
      setIntroState("existing"); // a challenge deep link supersedes the intro
      return;
    }
    if (!myProfile?.id) return; // still loading the profile; stay on the spinner
    let active = true;
    (async () => {
      const { count, error } = await supabase
        .from("gamePlayers")
        .select("gamesId", { count: "exact", head: true })
        .eq("profilesId", myProfile.id);
      if (!active) return;
      // On an error we can't prove they're new — fall through to the dashboard
      // rather than trapping an existing player behind the intro.
      setIntroState(!error && (count ?? 0) === 0 ? "new" : "existing");
    })();
    return () => {
      active = false;
    };
  }, [introState, myProfile?.id]);

  // Send brand-new players to the intro as a FULL-SCREEN route. Rendering it
  // inside this tab left the tab bar visible, so they could tap Stats or
  // Leaderboard and skip the warm-up entirely.
  useEffect(() => {
    if (introState !== "new") return;
    consumePendingIntro();
    router.replace("/intro-prompt");
  }, [introState, router]);

  useEffect(() => {
    if (!myProfile?.id || challengeLaunched.current) return;
    const challengeId = consumePendingChallenge();
    if (challengeId) {
      consumePendingIntro(); // a challenge supersedes the generic intro
      challengeLaunched.current = true;
      setLaunchingChallenge(true);
      setIntroState("existing");
      router.replace(`/challenge?id=${challengeId}`);
    }
  }, [myProfile?.id, router]);

  // Hold the spinner until we know whether this is a brand-new player (and while
  // the redirect to /intro-prompt lands). Rendering the dashboard first is what
  // produced the flash before the intro appeared.
  if (
    launchingChallenge ||
    loadingCurrentGameId ||
    (currentGameId && !game) ||
    introState !== "existing"
  ) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-white">
        <ActivityIndicator />
      </View>
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
              // Joining a tournament is playing games — same daily free limit.
              const gate = await checkCanPlay();
              if (!gate.allowed) {
                trackEvent(events.GATE_BLOCKED, { mode: "TOURNAMENT_INVITE" });
                router.push("/upgrade-to-pro");
                return;
              }
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
