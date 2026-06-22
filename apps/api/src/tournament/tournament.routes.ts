import express, { Router } from "express";
import { supabase } from "../lib/supabase";
import {
  acceptTournamentInvite,
  createPrivateTournament,
  inviteToTournament,
  joinTournament,
  listTournamentInvitesForProfile,
  startTournamentByCreator,
} from "./tournament.service";

export const tournamentRouter: Router = express.Router();

// Resolve the caller's profile id from their Firebase token.
const profileIdFor = async (uid: string): Promise<string | null> => {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("userId", uid)
    .single();
  return data?.id ?? null;
};

const variantOf = (body: unknown): "CROSSWORD" | "SUDOKU" =>
  (body as { gameVariant?: string })?.gameVariant === "SUDOKU"
    ? "SUDOKU"
    : "CROSSWORD";

// Join (or rejoin) a public tournament. Returns the tournament id to navigate to.
tournamentRouter.post("/join", async (req, res) => {
  const profileId = await profileIdFor(req.decodedFirebaseToken.uid);
  if (!profileId) {
    res.status(404).send("profile not found");
    return;
  }
  try {
    const tournamentId = await joinTournament(profileId, variantOf(req.body));
    res.send({ tournamentId });
  } catch (error) {
    console.log({ joinTournamentError: error });
    res.status(500).send();
  }
});

// Create a private (friends-only) tournament. Returns its id.
tournamentRouter.post("/create-private", async (req, res) => {
  const profileId = await profileIdFor(req.decodedFirebaseToken.uid);
  if (!profileId) {
    res.status(404).send("profile not found");
    return;
  }
  try {
    const tournamentId = await createPrivateTournament(
      profileId,
      variantOf(req.body)
    );
    res.send({ tournamentId });
  } catch (error) {
    console.log({ createPrivateTournamentError: error });
    res.status(500).send();
  }
});

// Creator invites friends to a private tournament.
tournamentRouter.post("/:id/invite", async (req, res) => {
  const profileId = await profileIdFor(req.decodedFirebaseToken.uid);
  if (!profileId) {
    res.status(404).send("profile not found");
    return;
  }
  try {
    const friendIds: string[] = Array.isArray(req.body?.friendIds)
      ? req.body.friendIds
      : [];
    await inviteToTournament(req.params.id, profileId, friendIds);
    res.send({ ok: true });
  } catch (error) {
    console.log({ inviteToTournamentError: error });
    res.status(400).send();
  }
});

// Accept a tournament invite and get seated.
tournamentRouter.post("/:id/accept", async (req, res) => {
  const profileId = await profileIdFor(req.decodedFirebaseToken.uid);
  if (!profileId) {
    res.status(404).send("profile not found");
    return;
  }
  try {
    const tournamentId = await acceptTournamentInvite(profileId, req.params.id);
    res.send({ tournamentId });
  } catch (error) {
    console.log({ acceptTournamentInviteError: error });
    res.status(400).send();
  }
});

// Creator starts a private tournament now (remaining seats become bots).
tournamentRouter.post("/:id/start", async (req, res) => {
  const profileId = await profileIdFor(req.decodedFirebaseToken.uid);
  if (!profileId) {
    res.status(404).send("profile not found");
    return;
  }
  try {
    await startTournamentByCreator(req.params.id, profileId);
    res.send({ ok: true });
  } catch (error) {
    console.log({ startTournamentError: error });
    res.status(400).send();
  }
});

// Pending tournament invites for the caller.
tournamentRouter.get("/invites", async (req, res) => {
  const profileId = await profileIdFor(req.decodedFirebaseToken.uid);
  if (!profileId) {
    res.status(404).send("profile not found");
    return;
  }
  try {
    const invites = await listTournamentInvitesForProfile(profileId);
    res.send(invites);
  } catch (error) {
    console.log({ listTournamentInvitesError: error });
    res.status(500).send();
  }
});
