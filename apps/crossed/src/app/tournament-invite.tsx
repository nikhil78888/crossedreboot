import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar } from "react-native-ui-lib";
import { avatars } from "../lib/images";
import { Button } from "../components/Button";
import { useFriends } from "../hooks/use-friends";
import { useTournament } from "../hooks/use-tournament";
import colors from "../lib/colors";

export default function TournamentInvite() {
  const router = useRouter();
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const { friends, isLoading } = useFriends();
  const { inviteFriends } = useTournament({ tournamentId });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    if (!selected.size) return;
    try {
      setSending(true);
      await inviteFriends(tournamentId, Array.from(selected));
      router.back();
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
      >
        <Text className="font-[jost700] text-2xl text-crossed-gray-900">
          Invite Friends
        </Text>
        <Text className="mt-1 font-[jost400] text-sm text-crossed-gray-400">
          Tap to select who to invite to your tournament.
        </Text>

        <View className="mt-4">
          {isLoading && !friends ? (
            <ActivityIndicator className="my-6" />
          ) : !friends?.length ? (
            <Text className="font-[jost400] text-crossed-gray-400 py-4">
              No friends yet — add some from the Friends screen first.
            </Text>
          ) : (
            friends.map((f) => {
              const isSel = selected.has(f.id);
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.7}
                  onPress={() => toggle(f.id)}
                  className="flex-row items-center py-2.5"
                >
                  <Avatar
                    size={44}
                    name={f.username || "?"}
                    source={avatars[f.avatar as keyof typeof avatars]}
                    imageStyle={{ backgroundColor: "white" }}
                  />
                  <Text className="flex-1 ml-3 font-[jost600] text-[15px]">
                    {f.username}
                  </Text>
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: 26,
                      height: 26,
                      borderWidth: 2,
                      borderColor: isSel
                        ? colors["crossed-blue"]["450"]
                        : colors["crossed-gray"]["300"],
                      backgroundColor: isSel
                        ? colors["crossed-blue"]["450"]
                        : "transparent",
                    }}
                  >
                    {isSel && (
                      <Text style={{ color: "#fff", fontSize: 14 }}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
      <View className="absolute bottom-8 inset-x-4">
        <Button
          label={
            selected.size
              ? `Invite ${selected.size} friend${selected.size === 1 ? "" : "s"}`
              : "Select friends to invite"
          }
          intent="primary"
          size="lg"
          rounded="full"
          isLoading={sending}
          onPress={send}
        />
      </View>
    </View>
  );
}
