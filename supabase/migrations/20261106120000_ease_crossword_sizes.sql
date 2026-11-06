-- Make crosswords feel "slightly hard for an average person" rather than
-- brutal. The dominant difficulty lever is GRID SIZE: a 7x7–10x10 fully-checked
-- board with crossword-ese fill is punishing no matter how easy the clues are,
-- while a 5x5/6x6 mini is the sweet spot most people enjoy.
--
-- The previous weighting (20260620150000) biased selection TOWARD big boards
-- (size >= 6 got a 1.5x weight, ~30% big puzzles). Flip it to favor minis.
--
-- Weighted-random top-1 selection (Efraimidis-Spirakis: key = random()^(1/w),
-- take the largest) picks each row with probability ∝ its weight. With weights
--   size <= 5 -> 2.0,  size = 6 -> 1.6,  size = 7 -> 0.7,  size >= 8 -> 0.3
-- and the current published pool (5:~923, 6:~389, 7:~325, 8-10:~1640) that lands
-- roughly ~77% minis (<=6), ~7% 7x7, ~15% big boards — mostly approachable, with
-- a larger board as an occasional change-up. Tune the constants to taste; raise
-- the 0.3 to serve more big boards, lower it to serve fewer.

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
  order by power(
    random(),
    1.0 / (case when c.size <= 5 then 2.0
                when c.size = 6 then 1.6
                when c.size = 7 then 0.7
                else 0.3 end)
  ) desc
  limit 1;

  -- Fallback: player has played everything still available — pick any published.
  if not found then
    return query
    select c.id, c.size, c.difficulty, c."isPublished", c.source, c.category,
           c.puzzle, c.solution, c.clues, c."createdAt", c."usedWords"
    from public.crosswords c
    where c."isPublished" = true
    order by power(
      random(),
      1.0 / (case when c.size <= 5 then 2.0
                  when c.size = 6 then 1.6
                  when c.size = 7 then 0.7
                  else 0.3 end)
    ) desc
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
  order by power(
    random(),
    1.0 / (case when c.size <= 5 then 2.0
                when c.size = 6 then 1.6
                when c.size = 7 then 0.7
                else 0.3 end)
  ) desc
  limit 1;

  if not found then
    return query
    select c.* from public.crosswords c
    where c."isPublished" = true
    order by power(
      random(),
      1.0 / (case when c.size <= 5 then 2.0
                  when c.size = 6 then 1.6
                  when c.size = 7 then 0.7
                  else 0.3 end)
    ) desc
    limit 1;
  end if;
end;
$$;
