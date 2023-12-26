
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."CrosswordCategory" AS ENUM (
    'general',
    'sports',
    'history',
    'geography',
    'science',
    'politics',
    'movies',
    'television',
    'pop_culture'
);

ALTER TYPE "public"."CrosswordCategory" OWNER TO "postgres";

CREATE TYPE "public"."CrosswordSource" AS ENUM (
    'wizium',
    'aicross'
);

ALTER TYPE "public"."CrosswordSource" OWNER TO "postgres";

CREATE TYPE "public"."GameType" AS ENUM (
    'SOLO',
    'FRIENDLY',
    'RANKED',
    'RANKED_BOT'
);

ALTER TYPE "public"."GameType" OWNER TO "postgres";

CREATE TYPE "public"."PlayState" AS ENUM (
    'WAITING_FOR_OPPONENT',
    'PLAYING',
    'COMPLETED',
    'ABORTED'
);

ALTER TYPE "public"."PlayState" OWNER TO "postgres";

CREATE TYPE "public"."ProfileType" AS ENUM (
    'USER',
    'BOT'
);

ALTER TYPE "public"."ProfileType" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_available_crossword"("profileid" "uuid") RETURNS TABLE("id" "uuid", "size" integer, "difficulty" integer, "isPublished" boolean, "source" "public"."CrosswordSource", "category" "public"."CrosswordCategory", "puzzle" "text"[], "solution" "text"[], "clues" "jsonb", "createdAt" timestamp without time zone, "usedWords" "text"[])
    LANGUAGE "plpgsql"
    AS $$begin
  return query
select
  *
from
  public.crosswords
where
  crosswords."isPublished" = true
  and crosswords.id not in (
    select
      "crosswordsId"
    from
      public."games"
    where
      games.id in (
        select
          "gamesId"
        from
          public."gamePlayers"
        where
          "profilesId" = profileId
      )
  )
union all
select
  *
from
  public.random_crossword
where
  random_crossword."isPublished" = true
limit
  1;

end;
$$;

ALTER FUNCTION "public"."get_available_crossword"("profileid" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."crosswords" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "size" integer NOT NULL,
    "difficulty" integer NOT NULL,
    "isPublished" boolean NOT NULL,
    "source" "public"."CrosswordSource" NOT NULL,
    "category" "public"."CrosswordCategory" NOT NULL,
    "puzzle" "text"[],
    "solution" "text"[],
    "clues" "jsonb" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedWords" "text"[]
);

ALTER TABLE "public"."crosswords" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_available_ranked_crossword"("player_one_id" "uuid", "player_two_id" "uuid") RETURNS SETOF "public"."crosswords"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
select
  *
from
  public.crosswords
where
  crosswords."isPublished" = true
  and crosswords.id not in (
    select
      "crosswordsId"
    from
      public."games"
    where
      games.id in (
        select
          "gamesId"
        from
          public."gamePlayers"
        where
          "profilesId" = player_one_id or "profilesId" = player_two_id
      )
  )
union all
select
  *
from
  public.random_crossword
where
  random_crossword."isPublished" = true
limit
  1;

end;
$$;

ALTER FUNCTION "public"."get_available_ranked_crossword"("player_one_id" "uuid", "player_two_id" "uuid") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);

ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."gamePlayers" (
    "gamesId" "uuid" NOT NULL,
    "profilesId" "uuid" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL
);

ALTER TABLE "public"."gamePlayers" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "crosswordsId" "uuid" NOT NULL,
    "gameType" "public"."GameType" NOT NULL,
    "playState" "public"."PlayState" NOT NULL,
    "gameState" "jsonb",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gameDurationInSeconds" integer NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "winnerId" "uuid"
);

ALTER TABLE "public"."games" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "userId" "text" NOT NULL,
    "country" "text",
    "username" "text" NOT NULL,
    "email" "text",
    "name" "text",
    "avatar" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "eloRating" double precision DEFAULT 1000 NOT NULL,
    "type" "public"."ProfileType" DEFAULT 'USER'::"public"."ProfileType" NOT NULL
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."random_bot_profiles" AS
 SELECT "profiles"."userId",
    "profiles"."country",
    "profiles"."username",
    "profiles"."email",
    "profiles"."name",
    "profiles"."avatar",
    "profiles"."id",
    "profiles"."createdAt",
    "profiles"."eloRating",
    "profiles"."type"
   FROM "public"."profiles"
  WHERE ("profiles"."type" = 'BOT'::"public"."ProfileType")
  ORDER BY ("random"());

ALTER TABLE "public"."random_bot_profiles" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."random_crossword" AS
 SELECT "crosswords"."id",
    "crosswords"."size",
    "crosswords"."difficulty",
    "crosswords"."isPublished",
    "crosswords"."source",
    "crosswords"."category",
    "crosswords"."puzzle",
    "crosswords"."solution",
    "crosswords"."clues",
    "crosswords"."createdAt",
    "crosswords"."usedWords"
   FROM "public"."crosswords"
  ORDER BY ("random"());

ALTER TABLE "public"."random_crossword" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."words" (
    "id" integer NOT NULL,
    "word" "text" NOT NULL,
    "clue" "text",
    "score" integer,
    "wordLength" integer DEFAULT 0 NOT NULL,
    "lastUsed" timestamp(3) without time zone
);

ALTER TABLE "public"."words" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."random_words" AS
 SELECT "words"."id",
    "words"."word",
    "words"."clue",
    "words"."score",
    "words"."wordLength"
   FROM "public"."words"
  ORDER BY ("random"());

ALTER TABLE "public"."random_words" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."words_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."words_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."words_id_seq" OWNED BY "public"."words"."id";

ALTER TABLE ONLY "public"."words" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."words_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."crosswords"
    ADD CONSTRAINT "crosswords_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."gamePlayers"
    ADD CONSTRAINT "gamePlayers_pkey" PRIMARY KEY ("gamesId", "profilesId");

ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."words"
    ADD CONSTRAINT "words_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "profiles_email_key" ON "public"."profiles" USING "btree" ("email");

CREATE INDEX "profiles_userId_idx" ON "public"."profiles" USING "btree" ("userId");

CREATE UNIQUE INDEX "profiles_userId_key" ON "public"."profiles" USING "btree" ("userId");

CREATE UNIQUE INDEX "profiles_username_key" ON "public"."profiles" USING "btree" ("username");

CREATE UNIQUE INDEX "words_word_clue_key" ON "public"."words" USING "btree" ("word", "clue");

ALTER TABLE ONLY "public"."gamePlayers"
    ADD CONSTRAINT "gamePlayers_gamesId_fkey" FOREIGN KEY ("gamesId") REFERENCES "public"."games"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."gamePlayers"
    ADD CONSTRAINT "gamePlayers_profilesId_fkey" FOREIGN KEY ("profilesId") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_crosswordsId_fkey" FOREIGN KEY ("crosswordsId") REFERENCES "public"."crosswords"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users only" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Enable update for users based on userId" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'sub'::"text") = "userId")) WITH CHECK ((("auth"."jwt"() ->> 'sub'::"text") = "userId"));

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_available_crossword"("profileid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_crossword"("profileid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_crossword"("profileid" "uuid") TO "service_role";

GRANT ALL ON TABLE "public"."crosswords" TO "anon";
GRANT ALL ON TABLE "public"."crosswords" TO "authenticated";
GRANT ALL ON TABLE "public"."crosswords" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_available_ranked_crossword"("player_one_id" "uuid", "player_two_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_ranked_crossword"("player_one_id" "uuid", "player_two_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_ranked_crossword"("player_one_id" "uuid", "player_two_id" "uuid") TO "service_role";

GRANT ALL ON TABLE "public"."_prisma_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "service_role";

GRANT ALL ON TABLE "public"."gamePlayers" TO "anon";
GRANT ALL ON TABLE "public"."gamePlayers" TO "authenticated";
GRANT ALL ON TABLE "public"."gamePlayers" TO "service_role";

GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."random_bot_profiles" TO "anon";
GRANT ALL ON TABLE "public"."random_bot_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."random_bot_profiles" TO "service_role";

GRANT ALL ON TABLE "public"."random_crossword" TO "anon";
GRANT ALL ON TABLE "public"."random_crossword" TO "authenticated";
GRANT ALL ON TABLE "public"."random_crossword" TO "service_role";

GRANT ALL ON TABLE "public"."words" TO "anon";
GRANT ALL ON TABLE "public"."words" TO "authenticated";
GRANT ALL ON TABLE "public"."words" TO "service_role";

GRANT ALL ON TABLE "public"."random_words" TO "anon";
GRANT ALL ON TABLE "public"."random_words" TO "authenticated";
GRANT ALL ON TABLE "public"."random_words" TO "service_role";

GRANT ALL ON SEQUENCE "public"."words_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."words_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."words_id_seq" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
