"use client";

import Crossword, { useIpuz } from "@jaredreisinger/react-crossword";
import useSWR from "swr";
import { supabase } from "../../../lib/supabase";
import { Switch } from "@headlessui/react";
import { classNames } from "../../../lib/utils";

export const CrosswordView = ({ id }: { id: string }) => {
  const { data: ipuz, mutate: refresh } = useSWR(
    `crossword-${id}`,
    async () => {
      const { data: puzzle } = (await supabase
        .from("crosswords")
        .select()
        .eq("id", id)
        .single()) as any;
      return {
        ...puzzle,
        version: "http://ipuz.org/v2",
        kind: ["http://ipuz.org/crossword#1"],
        dimensions: { height: puzzle?.size, width: puzzle?.size },
        clues: {
          Across: puzzle?.clues?.Across?.map((clue: any) => [
            clue.number,
            clue.clue,
          ]),
          Down: puzzle?.clues?.Down?.map((clue: any) => [
            clue.number,
            clue.clue,
          ]),
        },
      };
    }
  );
  const data = useIpuz(ipuz || null);

  if (!ipuz) {
    return null;
  }

  return (
    <div className="flex space-x-4">
      <div className="flex-1">{data && <Crossword data={data} />}</div>
      <div className="flex-1">
        <Switch
          checked={ipuz.isPublished}
          onChange={async () => {
            await supabase
              .from("crosswords")
              .update({ isPublished: !ipuz.isPublished })
              .eq("id", ipuz.id);
            refresh();
          }}
          className={classNames(
            ipuz.isPublished ? "bg-indigo-600" : "bg-gray-200",
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          )}
        >
          <span className="sr-only">Use setting</span>
          <span
            aria-hidden="true"
            className={classNames(
              ipuz.isPublished ? "translate-x-5" : "translate-x-0",
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            )}
          />
        </Switch>
      </div>
    </div>
  );
};
