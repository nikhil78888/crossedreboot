"use client";

import Crossword, { useIpuz } from "@jaredreisinger/react-crossword";
import useSWR from "swr";
import { supabase } from "../../../lib/supabase";
import { Switch } from "@headlessui/react";
import { classNames } from "../../../lib/utils";
import { useEffect, useRef } from "react";

export const CrosswordView = ({ id }: { id: string }) => {
  const { data: puzzle, mutate: refresh } = useSWR(
    `crossword-${id}`,
    async () => {
      const { data: puzzle } = (await supabase
        .from("crosswords")
        .select()
        .eq("id", id)
        .single()) as any;
      return {
        ipuz: {
          version: "http://ipuz.org/v2",
          kind: ["http://ipuz.org/crossword#1"],
          dimensions: { height: puzzle?.size, width: puzzle?.size },
          puzzle: puzzle.puzzle,
          solution: puzzle.solution,
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
        },
        puzzle,
      };
    }
  );
  const data = useIpuz(puzzle?.ipuz || null);
  const cref = useRef(null);

  useEffect(() => {
    if (data && cref.current) {
      const timeout = setTimeout(() => {
        cref.current.fillAllAnswers();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [data]);

  if (!data) {
    return null;
  }

  return (
    <div className="flex space-x-4">
      <div className="flex-1">
        {puzzle && (
          <Crossword
            ref={cref}
            data={data}
            onLoadedCorrect={() => {
              console.log("loaded");
            }}
          />
        )}
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
