-- CreateTable
CREATE TABLE "gamePlayers" (
    "gamesId" UUID NOT NULL,
    "profilesId" UUID NOT NULL,

    CONSTRAINT "gamePlayers_pkey" PRIMARY KEY ("gamesId","profilesId")
);

-- AddForeignKey
ALTER TABLE "gamePlayers" ADD CONSTRAINT "gamePlayers_gamesId_fkey" FOREIGN KEY ("gamesId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamePlayers" ADD CONSTRAINT "gamePlayers_profilesId_fkey" FOREIGN KEY ("profilesId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
