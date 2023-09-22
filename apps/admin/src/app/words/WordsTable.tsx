"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { supabase } from "../../lib/supabase";
import axios from "axios";
import { Switch } from "@headlessui/react";
import { classNames } from "../../lib/utils";

export const WordsTable = () => {
  const searchParams = useSearchParams();
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 0;
  const count = 10;
  const start = page * count;
  const end = start + (count - 1);
  console.log({ start, end });
  const { data, mutate: refresh } = useSWR(["words", page], async () => {
    const { data } = await supabase
      .from("words")
      .select()
      .eq("wordLength", 3)
      .range(start, end);
    return data;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Words
          </h1>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 flex flex-row space-x-2"></div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Word
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Published
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data?.map((word) => (
                    <tr key={word.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        <p className="f-wull truncate w-40">{word.word}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <Switch
                          checked={!word.lastUsed}
                          onChange={async () => {
                            await supabase
                              .from("words")
                              .update({
                                lastUsed: new Date().toUTCString(),
                              })
                              .eq("word", word.word);
                            refresh();
                          }}
                          className={classNames(
                            !word.lastUsed ? "bg-indigo-600" : "bg-gray-200",
                            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                          )}
                        >
                          <span className="sr-only">Use setting</span>
                          <span
                            aria-hidden="true"
                            className={classNames(
                              !word.lastUsed
                                ? "translate-x-5"
                                : "translate-x-0",
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                            )}
                          />
                        </Switch>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          {page > 0 ? (
            <Link
              href={`/words?page=${page - 1}`}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Prev
            </Link>
          ) : (
            <span />
          )}

          <Link
            href={`/words?page=${page + 1}`}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
};
