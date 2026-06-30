// Word-search generation/checking now lives in the shared types-and-validators
// package so the server can generate puzzles for ranked matchmaking too. This
// file re-exports it so existing client imports (../lib/word-search) keep working.
export * from "types-and-validators";
