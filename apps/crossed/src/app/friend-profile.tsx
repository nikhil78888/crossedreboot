import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar } from "react-native-ui-lib";
import { avatars } from "../lib/images";
import { Button } from "../components/Button";
import { RankBadge } from "../components/RankBadge";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "../hooks/use-my-profile";
import { useFriends } from "../hooks/use-friends";
import { useGameGate } from "../hooks/use-subscription";

type H2H = {
  viewer_wins: number;
  opponent_wins: number;
  ties: number;
  total: number;
};

export default function FriendProfile() {
  const router = useRouter();
  const { id, username, avatar, eloRating } = useLocalSearchParams<{
    id: string;
    username: string;
    avatar: string;
    eloRating: string;
  }>();
  const { myProfile } = useMyProfile();
  const { inviteToGame } = useFriends();
  const { checkCanPlay } = useGameGate();
  const [h2h, setH2h] = useState<H2H | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!myProfile?.id || !id) return;
    let active = true;
    (async () => {
      const { data } = await supabase.rpc("head_to_head", {
        viewer_id: myProfile.id,
        opponent_id: id,
      });
      if (active) {
        setH2h((data?.[0] as H2H) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [myProfile?.id, id]);

  const onPlay = async () => {
    const gate = await checkCanPlay();
    if (!gate.allowed) {
      router.push("/upgrade-to-pro");
      return;
    }
    try {
      setBusy(true);
      const gameId = await inviteToGame(id);
      if (gameId) router.push(`/game?gameId=${gameId}`);
    } finally {
      setBusy(false);
    }
  };

  const wins = h2h?.viewer_wins ?? 0;
  const losses = h2h?.opponent_wins ?? 0;
  const ties = h2h?.ties ?? 0;
  const total = h2h?.total ?? 0;

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <View className="items-center">
        <Avatar
          size={96}
          name={username || "?"}
          source={avatars[avatar as keyof typeof avatars]}
          imageStyle={{ backgroundColor: "white" }}
        />
        <Text className="mt-3 font-[jost700] text-2xl text-crossed-gray-900">
          {username}
        </Text>
        <View className="mt-1 flex-row items-center">
          <RankBadge rating={Number(eloRating) || 1000} />
          <Text className="ml-2 font-[jost600] text-base text-crossed-gray-900">
            {Math.round(Number(eloRating) || 1000)}
          </Text>
        </View>
      </View>

      {/* Head-to-head */}
      <View className="mt-8 rounded-2xl bg-crossed-gray-50 px-5 py-5">
        <Text className="text-center font-[jost700] text-lg text-crossed-gray-900">
          Head-to-Head
        </Text>
        {loading ? (
          <ActivityIndicator className="mt-4" />
        ) : total === 0 ? (
          <Text className="mt-3 text-center font-[jost400] text-crossed-gray-400">
            You haven&apos;t played {username} yet. Challenge them!
          </Text>
        ) : (
          <>
            <View className="mt-4 flex-row justify-around">
              <Stat label="Wins" value={wins} color="#16a34a" />
              <Stat label="Losses" value={losses} color="#dc2626" />
              <Stat label="Ties" value={ties} color="#6b7280" />
            </View>
            <Text className="mt-4 text-center font-[jost400] text-xs text-crossed-gray-400">
              {total} game{total === 1 ? "" : "s"} played together
            </Text>
          </>
        )}
      </View>

      <View className="mt-8">
        <Button
          label="Challenge to a Match"
          intent="primary"
          size="lg"
          rounded="full"
          isLoading={busy}
          onPress={onPlay}
        />
      </View>
      <View className="mt-3">
        <Button
          label="Back"
          intent="secondary"
          size="lg"
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}

const Stat = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View className="items-center">
    <Text className="font-[jost700] text-3xl" style={{ color }}>
      {value}
    </Text>
    <Text className="mt-1 font-[jost500] text-sm text-crossed-gray-400">
      {label}
    </Text>
  </View>
);
