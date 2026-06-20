import { ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
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
              subtitle={f.online ? "online" : "offline"}
              right={
                <View className="flex-row items-center">
                  <SmallButton label="Play" onPress={() => onPlay(f.id)} />
                  <TouchableOpacity
                    onPress={() => removeFriend(f.id)}
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
}: {
  username: string;
  avatar?: string | null;
  subtitle?: string;
  online?: boolean;
  right?: ReactNode;
}) => (
  <View className="flex-row items-center py-2">
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
    <View className="flex-1 ml-3">
      <Text className="font-[jost600] text-[15px]" numberOfLines={1}>
        {username}
      </Text>
      {!!subtitle && (
        <Text className="font-[jost400] text-xs text-crossed-gray-400">
          {subtitle}
        </Text>
      )}
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
