"use client";

import Crossword, { useIpuz } from "@jaredreisinger/react-crossword";
import useSWR from "swr";
import { supabase } from "../../../lib/supabase";
import { Switch } from "@headlessui/react";
import { classNames } from "../../../lib/utils";
import { useEffect, useRef } from "react";
import { Ipuz } from "types-and-validators";
import { CluesInputOriginal } from "@jaredreisinger/react-crossword/dist/types";

export const CrosswordView = ({ id }: { id: string }) => {
  const { data: puzzle, mutate: refresh } = useSWR(
    `crossword-${id}`,
    async () => {
      const { data: puzzle } = await supabase
        .from("crosswords")
        .select()
        .eq("id", id)
        .single();
      if (!puzzle) {
        return null;
      }
      const clues = puzzle.clues as Ipuz["clues"];
      return {
        ipuz: {
          version: "http://ipuz.org/v2",
          kind: ["http://ipuz.org/crossword#1"],
          dimensions: { height: puzzle?.size, width: puzzle?.size },
          puzzle: puzzle.puzzle as unknown as Ipuz["puzzle"],
          solution: puzzle.solution,
          clues: {
            Across: clues.Across?.map((clue) => [clue.number, clue.clue]),
            Down: clues.Down?.map((clue) => [clue.number, clue.clue]),
          },
        },
        puzzle,
      };
    }
  );
  console.log(puzzle?.ipuz);
  if (!puzzle) {
    return null;
  }

  return <CrosswordWithData puzzle={puzzle} refresh={refresh} />;
};

const CrosswordWithData = ({
  puzzle,
  refresh,
}: {
  puzzle: any;
  refresh: any;
}) => {
  const data = useIpuz(puzzle.ipuz);
  const cref = useRef(null);

  useEffect(() => {
    if (cref.current) {
      // @ts-expect-error
      cref.current.fillAllAnswers();
    }
  }, []);

  return (
    <div className="flex space-x-4">
      <div className="flex-1">
        {puzzle && <Crossword ref={cref} data={data as CluesInputOriginal} />}
      </div>
      <div className="flex-1">
        <Switch
          checked={puzzle?.puzzle.isPublished}
          onChange={async () => {
            await supabase
              .from("crosswords")
              .update({ isPublished: !puzzle?.puzzle.isPublished })
              .eq("id", puzzle?.puzzle.id);
            refresh();
          }}
          className={classNames(
            puzzle?.puzzle.isPublished ? "bg-indigo-600" : "bg-gray-200",
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          )}
        >
          <span className="sr-only">Use setting</span>
          <span
            aria-hidden="true"
            className={classNames(
              puzzle?.puzzle.isPublished ? "translate-x-5" : "translate-x-0",
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            )}
          />
        </Switch>
      </div>
    </div>
  );
};
