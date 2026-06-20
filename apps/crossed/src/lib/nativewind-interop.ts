import { cssInterop } from "nativewind";
import {
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native-gesture-handler";
import { Image } from "expo-image";

// NativeWind v4 only auto-applies `className` to built-in React Native
// components. This app imports TouchableOpacity / ScrollView / TextInput /
// FlatList from react-native-gesture-handler, which NativeWind does NOT wrap —
// so `className` on them was silently ignored, breaking styling app-wide after
// the Expo SDK 55 / NativeWind v4 upgrade. Registering them here restores it.
//
// Import this module once, before any screen renders (see app/_layout.tsx).
cssInterop(TouchableOpacity, { className: "style" });
cssInterop(TextInput, { className: "style" });
cssInterop(ScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});
cssInterop(FlatList, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});
// expo-image isn't a built-in RN component either; without this, className
// (e.g. h-5 w-5 on icons) is ignored and icons collapse to zero size.
cssInterop(Image, { className: "style" });
