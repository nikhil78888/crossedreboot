import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { getStoryCurrentLevel, startStoryLevel } from "../lib/story";

// Drives the Story Mode home button: shows the level to resume at (refreshed
// whenever Home regains focus, so it updates after you clear levels) and
// launches the current level into the challenge play pipeline.
export const useStory = () => {
  const router = useRouter();
  const [level, setLevel] = useState<number>(1);
  const [launching, setLaunching] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getStoryCurrentLevel().then((l) => active && setLevel(l));
      return () => {
        active = false;
      };
    }, [])
  );

  const playStory = useCallback(async () => {
    if (launching) return;
    setLaunching(true);
    try {
      const current = await getStoryCurrentLevel();
      const started = await startStoryLevel(current);
      if (started) {
        router.push(
          `/challenge?id=${started.id}&story=1&level=${current}`
        );
      }
    } finally {
      setLaunching(false);
    }
  }, [launching, router]);

  return { level, playStory, launching };
};
