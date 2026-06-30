// Trivia bank + generation now lives in the shared types-and-validators package
// so the server can build ranked quizzes too. Re-exported here so existing
// client imports (../lib/trivia) keep working.
export * from "types-and-validators";
