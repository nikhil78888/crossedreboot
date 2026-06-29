// Safe accessor for the Branch native module. Returns null when the native
// module isn't present (e.g. an OTA reaching a build made before Branch was
// added), so importing/using this never crashes the app — callers just fall
// back to a plain link and skip deep-link handling.
export type BranchParams = Record<string, unknown> | null;

type BranchUniversalObject = {
  generateShortUrl: (
    linkProperties?: Record<string, unknown>,
    controlParams?: Record<string, unknown>
  ) => Promise<{ url: string }>;
};

type BranchLike = {
  subscribe: (
    cb: (event: { error: string | null; params: BranchParams }) => void
  ) => () => void;
  createBranchUniversalObject: (
    canonicalIdentifier: string,
    opts: Record<string, unknown>
  ) => Promise<BranchUniversalObject>;
};

let branch: BranchLike | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  branch = (require("react-native-branch").default ?? null) as BranchLike | null;
} catch {
  branch = null;
}

export { branch };
