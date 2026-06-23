import { ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { TextInput, TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Avatar } from "react-native-ui-lib";
import { avatars } from "../lib/images";
import { Button } from "../components/Button";
import colors from "../lib/colors";
import {
  Friend,
  GameInvite,
  UserResult,
  useFriends,
} from "../hooks/use-friends";
import { useGameGate } from "../hooks/use-subscription";
import { RankBadge } from "../components/RankBadge";

export default function Friends() {
  const router = useRouter();
  const {
    friends,
    requests,
    invites,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    inviteToGame,
    searchUsers,
    getRecentOpponents,
  } = useFriends();
  const { checkCanPlay } = useGameGate();

  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [recent, setRecent] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getRecentOpponents().then(setRecent).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchUsers(q));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const onPlay = async (friendId: string) => {
    const gate = await checkCanPlay();
    if (!gate.allowed) {
      router.push("/upgrade-to-pro");
      return;
    }
    const gameId = await inviteToGame(friendId);
    if (gameId) router.push(`/game?gameId=${gameId}`);
  };

  const refreshAdd = async () => {
    if (q.trim()) setResults(await searchUsers(q));
    getRecentOpponents().then(setRecent).catch(() => {});
  };

  return (
    <ScrollView
      className="flex-1 bg-white px-4"
      contentContainerStyle={{ paddingBottom: 48, paddingTop: 8 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Incoming game invites */}
      {!!invites?.length && (
        <Section title="Game Invites">
          {invites.map((inv: GameInvite) => (
            <Row
              key={inv.gameId}
              username={inv.from?.username || "A friend"}
              avatar={inv.from?.avatar}
              right={
                <SmallButton
                  label="Join"
                  onPress={() => router.push(`/join-game?gameId=${inv.gameId}`)}
                />
              }
              subtitle="invited you to a friendly match"
            />
          ))}
        </Section>
      )}

      {/* Friend requests */}
      {!!requests?.length && (
        <Section title={`Requests (${requests.length})`}>
          {requests.map((r) => (
            <Row
              key={r.id}
              username={r.username}
              avatar={r.avatar}
              right={
                <View className="flex-row">
                  <SmallButton
                    label="Accept"
                    onPress={() => acceptRequest(r.id)}
                  />
                  <View className="w-2" />
                  <SmallButton
                    label="Decline"
                    tone="muted"
                    onPress={() => declineRequest(r.id)}
                  />
                </View>
              }
            />
          ))}
        </Section>
      )}

      {/* Friends list */}
      <Section title="Friends">
        {friends === undefined ? (
          <ActivityIndicator className="my-4" />
        ) : friends.length === 0 ? (
          <Text className="font-[jost400] text-crossed-gray-400 py-2">
            No friends yet — add some below!
          </Text>
        ) : (
          friends.map((f: Friend) => (
            <Row
              key={f.id}
              username={f.username}
              avatar={f.avatar}
              online={f.online}
              rating={f.eloRating}
              onPress={() =>
                router.push(
                  `/friend-profile?id=${f.id}&username=${encodeURIComponent(
                    f.username
                  )}&avatar=${f.avatar ?? ""}&eloRating=${Math.round(
                    f.eloRating ?? 1000
                  )}`
                )
              }
              right={
                <View className="flex-row items-center">
                  <SmallButton label="Play" onPress={() => onPlay(f.id)} />
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(
                        "Remove friend?",
                        `Remove ${f.username} from your friends?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => removeFriend(f.id),
                          },
                        ]
                      )
                    }
                    className="ml-2 px-2 py-1"
                  >
                    <Text className="text-crossed-gray-400 text-lg">⋯</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          ))
        )}
      </Section>

      {/* Add friends */}
      <Section title="Add Friends">
        <View className="flex-row items-center rounded-xl bg-crossed-gray-100 px-3 mb-2">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by username"
            autoCapitalize="none"
            className="flex-1 py-3 font-[jost400] text-base"
          />
          {searching && <ActivityIndicator size="small" />}
        </View>
        {results.map((u) => (
          <AddRow key={u.id} user={u} onAdd={sendRequest} onChanged={refreshAdd} />
        ))}

        {!q.trim() && !!recent.length && (
          <>
            <Text className="font-[jost600] text-sm text-crossed-gray-400 mt-3 mb-1">
              Recent opponents
            </Text>
            {recent.map((u) => (
              <AddRow
                key={u.id}
                user={u}
                onAdd={sendRequest}
                onChanged={refreshAdd}
              />
            ))}
          </>
        )}
      </Section>

      <View className="mt-6">
        <Button
          label="Back Home"
          intent="secondary"
          size="lg"
          onPress={() => router.replace("/home")}
        />
      </View>
    </ScrollView>
  );
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View className="mt-5">
    <Text className="font-[jost700] text-[18px] text-crossed-gray-900 mb-2">
      {title}
    </Text>
    {children}
  </View>
);

const Row = ({
  username,
  avatar,
  subtitle,
  online,
  right,
  onPress,
  rating,
}: {
  username: string;
  avatar?: string | null;
  subtitle?: string;
  online?: boolean;
  right?: ReactNode;
  onPress?: () => void;
  rating?: number;
}) => (
  // flex:1 lives on a plain wrapper View (it doesn't apply reliably on the
  // gesture-handler TouchableOpacity), so the name column gets real width.
  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        <View>
          <Avatar
            size={44}
            name={username || "?"}
            source={avatars[avatar as keyof typeof avatars]}
            imageStyle={{ backgroundColor: "white" }}
          />
          {online !== undefined && (
            <View
              className="absolute bottom-0 right-0 rounded-full border-2 border-white"
              style={{
                width: 12,
                height: 12,
                backgroundColor: online
                  ? colors["crossed-green"]["700"]
                  : colors["crossed-gray"]["300"],
              }}
            />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: "jost600", fontSize: 15, color: "#111827" }}
          >
            {username}
          </Text>
          {rating != null ? (
            <RankBadge rating={rating} />
          ) : (
            !!subtitle && (
              <Text className="font-[jost400] text-xs text-crossed-gray-400">
                {subtitle}
              </Text>
            )
          )}
        </View>
      </TouchableOpacity>
    </View>
    {right}
  </View>
);

const AddRow = ({
  user,
  onAdd,
  onChanged,
}: {
  user: UserResult;
  onAdd: (id: string) => Promise<void>;
  onChanged: () => void;
}) => {
  const label =
    user.relation === "friends"
      ? "Friends"
      : user.relation === "pending_out"
      ? "Requested"
      : user.relation === "pending_in"
      ? "Accept"
      : "Add";
  const disabled = user.relation === "friends" || user.relation === "pending_out";
  return (
    <Row
      username={user.username}
      avatar={user.avatar}
      right={
        <SmallButton
          label={label}
          tone={disabled ? "muted" : "primary"}
          onPress={async () => {
            if (disabled) return;
            await onAdd(user.id);
            onChanged();
          }}
        />
      }
    />
  );
};

const SmallButton = ({
  label,
  onPress,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "muted";
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="rounded-full px-4 py-2"
    style={{
      backgroundColor:
        tone === "primary"
          ? colors["crossed-yellow"]["300"]
          : colors["crossed-gray"]["100"],
    }}
  >
    <Text
      className="font-[jost600] text-sm"
      style={{
        color:
          tone === "primary"
            ? colors["crossed-gray"]["900"]
            : colors["crossed-gray"]["400"],
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);
