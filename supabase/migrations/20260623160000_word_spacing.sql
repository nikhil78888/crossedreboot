-- ============================================================================
-- WORD-LEVEL REPEAT SPACING
-- Players were seeing the same answer WORDS too often across puzzles. The
-- existing dedup only avoids replaying a whole PUZZLE (and the clue resolver
-- only avoids repeating a (word,clue) PAIR). This makes puzzle SELECTION prefer
-- puzzles whose words the player has NOT seen recently, so a given word doesn't
-- recur for a long stretch of games.
--
-- How: crosswords."usedWords" holds each grid's distinct answer words (backfilled
-- by scripts/backfill-used-words.mjs, populated on generation going forward).
-- "seenClues" logs every word a player has been shown, with a timestamp. We take
-- the player's ~300 most-recently-seen distinct words, sample 150 unplayed
-- puzzles (still weighted toward bigger boards), and serve the one with the
-- fewest words in that recent set. Bounded cost (constant 150-candidate scan),
-- degrades to plain random for new players (empty recent set).
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."get_available_crossword"("profileid" "uuid")
RETURNS TABLE("id" "uuid", "size" integer, "difficulty" integer, "isPublished" boolean, "source" "public"."CrosswordSource", "category" "public"."CrosswordCategory", "puzzle" "text"[], "solution" "text"[], "clues" "jsonb", "createdAt" timestamp without time zone, "usedWords" "text"[])
    LANGUAGE "plpgsql"
    AS $$
declare
  recent text[];
begin
  -- the player's 300 most-recently-seen distinct words
  select array_agg(w) into recent from (
    select sc."word" as w
    from public."seenClues" sc
    where sc."profilesId" = profileid
    group by sc."word"
    order by max(sc."createdAt") desc
    limit 300
  ) t;

  -- primary: among unplayed puzzles, prefer the fewest recently-seen words
  return query
  with sample as (
    select c.id, c.size, c.difficulty, c."isPublished", c.source, c.category,
           c.puzzle, c.solution, c.clues, c."createdAt", c."usedWords"
    from public.crosswords c
    where c."isPublished" = true
      and not exists (
        select 1 from public.games g
        join public."gamePlayers" gp on gp."gamesId" = g.id
        where gp."profilesId" = profileid and g."crosswordsId" = c.id
      )
    order by power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
    limit 150
  )
  select s.id, s.size, s.difficulty, s."isPublished", s.source, s.category,
         s.puzzle, s.solution, s.clues, s."createdAt", s."usedWords"
  from sample s
  order by (select count(*) from unnest(s."usedWords") w where w = any(recent)) asc,
           power(random(), 1.0 / (case when s.size >= 6 then 1.5 else 1.0 end)) desc
  limit 1;

  -- fallback (every puzzle played): least-recently-played, then fewest repeats
  if not found then
    return query
    with sample as (
      select c.id, c.size, c.difficulty, c."isPublished", c.source, c.category,
             c.puzzle, c.solution, c.clues, c."createdAt", c."usedWords"
      from public.crosswords c
      where c."isPublished" = true
      order by (
        select max(g."createdAt") from public.games g
        join public."gamePlayers" gp on gp."gamesId" = g.id
        where g."crosswordsId" = c.id and gp."profilesId" = profileid
      ) asc nulls first
      limit 150
    )
    select s.id, s.size, s.difficulty, s."isPublished", s.source, s.category,
           s.puzzle, s.solution, s.clues, s."createdAt", s."usedWords"
    from sample s
    order by (select count(*) from unnest(s."usedWords") w where w = any(recent)) asc,
             power(random(), 1.0 / (case when s.size >= 6 then 1.5 else 1.0 end)) desc
    limit 1;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_available_ranked_crossword"("player_one_id" "uuid", "player_two_id" "uuid")
RETURNS SETOF "public"."crosswords"
    LANGUAGE "plpgsql"
    AS $$
declare
  recent text[];
begin
  -- the most-recently-seen words across BOTH players
  select array_agg(w) into recent from (
    select sc."word" as w
    from public."seenClues" sc
    where sc."profilesId" in (player_one_id, player_two_id)
    group by sc."word"
    order by max(sc."createdAt") desc
    limit 300
  ) t;

  return query
  with sample as (
    select c.* from public.crosswords c
    where c."isPublished" = true
      and not exists (
        select 1 from public.games g
        join public."gamePlayers" gp on gp."gamesId" = g.id
        where g."crosswordsId" = c.id
          and gp."profilesId" in (player_one_id, player_two_id)
      )
    order by power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
    limit 150
  )
  select s.* from sample s
  order by (select count(*) from unnest(s."usedWords") w where w = any(recent)) asc,
           power(random(), 1.0 / (case when s.size >= 6 then 1.5 else 1.0 end)) desc
  limit 1;

  if not found then
    return query
    with sample as (
      select c.* from public.crosswords c
      where c."isPublished" = true
      order by (
        select max(g."createdAt") from public.games g
        join public."gamePlayers" gp on gp."gamesId" = g.id
        where g."crosswordsId" = c.id
          and gp."profilesId" in (player_one_id, player_two_id)
      ) asc nulls first
      limit 150
    )
    select s.* from sample s
    order by (select count(*) from unnest(s."usedWords") w where w = any(recent)) asc,
             power(random(), 1.0 / (case when s.size >= 6 then 1.5 else 1.0 end)) desc
    limit 1;
  end if;
end;
$$;
