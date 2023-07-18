import { CrosswordsTable } from "./CrosswordsTable";

export const metadata = {
  title: "Crossed.",
};

export default function Store() {
  return (
    <div>
      <main>
        <CrosswordsTable />
      </main>
    </div>
  );
}
