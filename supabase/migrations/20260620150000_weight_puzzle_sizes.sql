-- Bias puzzle selection toward larger boards (6x6+) and add real randomization.
-- The old functions had no ORDER BY before LIMIT 1, so they kept serving the
-- same early 5x5s. Now we pick with weighted-random sampling
-- (Efraimidis-Spirakis: key = random()^(1/weight), take the largest), giving
-- size >= 6 a 1.5x weight. With the current pool (~345 minis, ~100 big) that's
-- roughly ~30% big puzzles. Tune the 1.5 up/down to taste.

CREATE OR REPLACE FUNCTION "public"."get_available_crossword"("profileid" "uuid")
RETURNS TABLE("id" "uuid", "size" integer, "difficulty" integer, "isPublished" boolean, "source" "public"."CrosswordSource", "category" "public"."CrosswordCategory", "puzzle" "text"[], "solution" "text"[], "clues" "jsonb", "createdAt" timestamp without time zone, "usedWords" "text"[])
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select c.id, c.size, c.difficulty, c."isPublished", c.source, c.category,
         c.puzzle, c.solution, c.clues, c."createdAt", c."usedWords"
  from public.crosswords c
  where c."isPublished" = true
    and c.id not in (
      select g."crosswordsId" from public.games g
      where g.id in (
        select gp."gamesId" from public."gamePlayers" gp
        where gp."profilesId" = profileid
      )
    )
  order by power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
  limit 1;

  -- Fallback: player has played everything still available — pick any published.
  if not found then
    return query
    select c.id, c.size, c.difficulty, c."isPublished", c.source, c.category,
           c.puzzle, c.solution, c.clues, c."createdAt", c."usedWords"
    from public.crosswords c
    where c."isPublished" = true
    order by power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
    limit 1;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_available_ranked_crossword"("player_one_id" "uuid", "player_two_id" "uuid")
RETURNS SETOF "public"."crosswords"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select c.* from public.crosswords c
  where c."isPublished" = true
    and c.id not in (
      select g."crosswordsId" from public.games g
      where g.id in (
        select gp."gamesId" from public."gamePlayers" gp
        where gp."profilesId" = player_one_id or gp."profilesId" = player_two_id
      )
    )
  order by power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
  limit 1;

  if not found then
    return query
    select c.* from public.crosswords c
    where c."isPublished" = true
    order by power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
    limit 1;
  end if;
end;
$$;
