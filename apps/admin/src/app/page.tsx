import { CrosswordsTable } from "./CrosswordsTable";

export const metadata = {
  title: "Crossed.",
};

export default function Crosswords() {
  return (
    <div>
      <main>
        <CrosswordsTable />
      </main>
    </div>
  );
}
