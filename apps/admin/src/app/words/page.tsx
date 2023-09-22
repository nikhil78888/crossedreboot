import { WordsTable } from "./WordsTable";

export const metadata = {
  title: "Words",
};

export default function Words() {
  return (
    <div>
      <main>
        <WordsTable />
      </main>
    </div>
  );
}
