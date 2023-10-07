"use client";

import Crossword, { useIpuz } from "@jaredreisinger/react-crossword";
import useSWR from "swr";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    if (cref.current) {
      // @ts-expect-error
      cref.current.fillAllAnswers();
    }
  }, []);

  const words = puzzle.puzzle.usedWords;

  return (
    <div className="flex space-x-4">
      <div className="flex-1">
        <div className="flex items-center space-x-16 pb-4">
          <Switch
            checked={puzzle?.puzzle.isPublished}
            onChange={async () => {
              if (!puzzle.puzzle.isPublished) {
                await supabase
                  .from("words")
                  .update({ lastUsed: new Date().toISOString() })
                  .in("word", puzzle.puzzle.usedWords);
              }
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
            <span
              aria-hidden="true"
              className={classNames(
                puzzle?.puzzle.isPublished ? "translate-x-5" : "translate-x-0",
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              )}
            />
          </Switch>
          <button
            onClick={async () => {
              try {
                await supabase
                  .from("crosswords")
                  .delete()
                  .eq("id", puzzle.puzzle.id);
                router.back();
              } catch (error) {
                alert("Oops! Something went wrong.");
              }
            }}
            className="block rounded-md bg-red-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Delete
          </button>
        </div>
        <div className="flex">
          {puzzle && <Crossword ref={cref} data={data as CluesInputOriginal} />}
        </div>
      </div>
      <div className="w-80">
        {words && <WordList words={words} crosswordId={puzzle.puzzle.id} />}
      </div>
    </div>
  );
};

const WordList = ({
  words,
  crosswordId,
}: {
  words: string[];
  crosswordId: string;
}) => {
  const { data: uniqueWords, mutate: refresh } = useSWR(
    `words-${crosswordId}`,
    async () => {
      const { data } = await supabase.from("words").select().in("word", words);
      const uniqueWords = data?.reduce((prev, wordRow) => {
        if (prev.find((w) => w.word === wordRow.word)) {
          return [...prev];
        }
        return [...prev, wordRow];
      }, []);
      return uniqueWords;
    }
  );

  return (
    <div className="space-y-2">
      {uniqueWords?.map((w) => (
        <div className="flex items-center justify-between" key={w.id}>
          <span>{w.word}</span>
          <Switch
            checked={!w.lastUsed}
            onChange={async () => {
              await supabase
                .from("words")
                .update({ lastUsed: new Date().toISOString() })
                .eq("word", w.word);
              refresh();
            }}
            className={classNames(
              !w.lastUsed ? "bg-indigo-600" : "bg-gray-200",
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            )}
          >
            <span
              aria-hidden="true"
              className={classNames(
                !w.lastUsed ? "translate-x-5" : "translate-x-0",
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              )}
            />
          </Switch>
        </div>
      ))}
    </div>
  );
};
