import express, { Router, Request, Response } from "express";
import {
  getProfileIdByUid,
  listFriends,
  friendsLeaderboard,
  listRequests,
  searchUsers,
  recentOpponents,
  sendRequest,
  acceptRequest,
  declineRequest,
  removeFriend,
  heartbeat,
  inviteToGame,
  listGameInvites,
} from "./friends.service";

export const friendsRouter: Router = express.Router();

// Resolve the caller's profile id from their verified firebase token.
const withMyId = (
  handler: (myId: string, req: Request, res: Response) => Promise<void>
) => async (req: Request, res: Response) => {
  try {
    const myId = await getProfileIdByUid(req.decodedFirebaseToken.uid);
    if (!myId) {
      res.status(404).send("profile not found");
      return;
    }
    await handler(myId, req, res);
  } catch (error) {
    console.log({ friendsError: error });
    res.status(500).send();
  }
};

friendsRouter.get(
  "/",
  withMyId(async (myId, _req, res) => {
    res.send(await listFriends(myId));
  })
);

friendsRouter.get(
  "/leaderboard",
  withMyId(async (myId, req, res) => {
    const variant = req.query.variant === "SUDOKU" ? "SUDOKU" : "CROSSWORD";
    res.send(await friendsLeaderboard(myId, variant));
  })
);

friendsRouter.get(
  "/requests",
  withMyId(async (myId, _req, res) => {
    res.send(await listRequests(myId));
  })
);

friendsRouter.get(
  "/search",
  withMyId(async (myId, req, res) => {
    res.send(await searchUsers(myId, (req.query.q as string) || ""));
  })
);

friendsRouter.get(
  "/recent-opponents",
  withMyId(async (myId, _req, res) => {
    res.send(await recentOpponents(myId));
  })
);

friendsRouter.post(
  "/request",
  withMyId(async (myId, req, res) => {
    await sendRequest(myId, req.body.targetId);
    res.send({ ok: true });
  })
);

friendsRouter.post(
  "/accept",
  withMyId(async (myId, req, res) => {
    await acceptRequest(myId, req.body.requesterId);
    res.send({ ok: true });
  })
);

friendsRouter.post(
  "/decline",
  withMyId(async (myId, req, res) => {
    await declineRequest(myId, req.body.requesterId);
    res.send({ ok: true });
  })
);

friendsRouter.post(
  "/remove",
  withMyId(async (myId, req, res) => {
    await removeFriend(myId, req.body.friendId);
    res.send({ ok: true });
  })
);

friendsRouter.post(
  "/heartbeat",
  withMyId(async (myId, _req, res) => {
    await heartbeat(myId);
    res.send({ ok: true });
  })
);

friendsRouter.post(
  "/invite-game",
  withMyId(async (myId, req, res) => {
    const gameId = await inviteToGame(myId, req.body.friendId);
    res.send({ gameId });
  })
);

friendsRouter.get(
  "/game-invites",
  withMyId(async (myId, _req, res) => {
    res.send(await listGameInvites(myId));
  })
);
