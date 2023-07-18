import { CrosswordView } from "./CrosswordView";

export default function Crossword({ params }: { params: { id: string } }) {
  return <CrosswordView id={params.id} />;
}
