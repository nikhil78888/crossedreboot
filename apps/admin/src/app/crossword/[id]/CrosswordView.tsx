"use client";

import Crossword, { useIpuz } from "@jaredreisinger/react-crossword";
import useSWR from "swr";
import { supabase } from "../../../lib/supabase";

export const CrosswordView = ({ id }: { id: string }) => {
  const { data: ipuz } = useSWR(`crossword-${id}`, async () => {
    const { data: puzzle } = await supabase
      .from("crosswords")
      .select()
      .eq("id", id)
      .single();
    return {
      ...puzzle,
      version: "http://ipuz.org/v2",
      kind: ["http://ipuz.org/crossword#1"],
      dimensions: { height: puzzle?.size, width: puzzle?.size },
      clues: {
        Across: puzzle.clues?.Across.map((clue) => [clue.number, clue.clue]),
        Down: puzzle.clues?.Down.map((clue) => [clue.number, clue.clue]),
      },
    };
  });
  const data = useIpuz(ipuz || null);

  return <div className="flex w-1/2">{data && <Crossword data={data} />}</div>;

  return null;
};
