import { Ipuz } from "types-and-validators";

export const createIpuz = (wiz: string[]) => {
  const rows = wiz.map((r) => r.replace("\n", "").split(""));
  const cols: string[][] = [];
  for (let i = 0; i < wiz.length; i += 1) {
    const col: string[] = [];
    for (let j = 0; j < rows.length; j += 1) {
      col.push(wiz[j][i]);
    }
    cols.push(col);
  }
  const traversalState = rows.map((r) => {
    return r.map((e) => {
      return { across: false, down: false };
    });
  });
  const clues: Ipuz["clues"] = { Across: [], Down: [] };
  const puzzle: Ipuz["puzzle"] = rows.map((row) => {
    return row.map((cell) => {
      if (cell === "#") {
        return "#";
      }
      return "0";
    });
  });
  const solution = rows.map((row) => {
    return row.map((cell) => {
      if (cell === "#") {
        return null;
      }
      return cell;
    });
  });
  let clueNumber = 1;
  for (let i = 0; i < rows.length; i += 1) {
    const currentRow = rows[i];
    for (let j = 0; j < currentRow.length; j += 1) {
      let shouldIncreaseClueCount = false;
      if (currentRow[j] !== "#") {
        const cellTraversalState = traversalState[i][j];
        if (!cellTraversalState.across) {
          let nextBlockIndex = currentRow.findIndex(
            (x, index) => index > j && x === "#"
          );
          nextBlockIndex =
            nextBlockIndex === -1 ? currentRow.length : nextBlockIndex;
          const word = currentRow.slice(j, nextBlockIndex).join("");
          if (word.length > 2) {
            clues.Across.push({ number: String(clueNumber), clue: word });
            shouldIncreaseClueCount = true;
            puzzle[i][j] = String(clueNumber);
          }
          for (let k = j; k < nextBlockIndex; k += 1) {
            traversalState[i][k].across = true;
          }
        }
        if (!cellTraversalState.down) {
          const currentCol = cols[j];
          let nextBlockIndex = currentCol.findIndex(
            (x, index) => index > i && x === "#"
          );
          nextBlockIndex =
            nextBlockIndex === -1 ? currentCol.length : nextBlockIndex;
          const word = currentCol.slice(i, nextBlockIndex).join("");
          if (word.length > 2) {
            clues.Down.push({ number: String(clueNumber), clue: word });
            puzzle[i][j] = String(clueNumber);
            shouldIncreaseClueCount = true;
          }
          for (let k = i; k < nextBlockIndex; k += 1) {
            traversalState[k][j].down = true;
          }
        }
        if (shouldIncreaseClueCount) {
          clueNumber += 1;
        }
      }
    }
  }
  return { clues, solution, puzzle };
};
