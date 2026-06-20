-- Friends: mutual friend requests + online presence.
-- A friendship is one row; status PENDING until the addressee accepts. "Are A
-- and B friends" = an ACCEPTED row with {requesterId, addresseeId} = {A, B} in
-- either direction. All access goes through the backend (service-role), so RLS
-- is enabled with no anon/authenticated policies (locked down to the backend).

CREATE TABLE IF NOT EXISTS "friendships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requesterId" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "addresseeId" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("requesterId", "addresseeId"),
  CHECK ("requesterId" <> "addresseeId")
);

CREATE INDEX IF NOT EXISTS "friendships_requesterId_idx"
  ON "friendships" ("requesterId");
CREATE INDEX IF NOT EXISTS "friendships_addresseeId_idx"
  ON "friendships" ("addresseeId");

ALTER TABLE "friendships" ENABLE ROW LEVEL SECURITY;

-- Online presence: clients heartbeat this via the backend; "online" = updated
-- within the last couple of minutes.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "lastSeenAt" timestamptz;

-- "Invite a friend to a friendly match": the inviter creates a WAITING friendly
-- game stamped with the invited friend's id; the friend sees it and joins.
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "invitedProfileId" uuid
  REFERENCES "profiles"("id");
