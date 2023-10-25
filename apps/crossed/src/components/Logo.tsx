import { Image } from "expo-image";
import { images } from "../lib/images";

export const Logo = () => {
  return (
    <Image
      source={images.name_logo}
      className="h-[112] w-[97]"
      contentFit="contain"
    />
  );
};
