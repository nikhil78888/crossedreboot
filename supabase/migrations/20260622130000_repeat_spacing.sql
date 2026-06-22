-- "Never repeat a puzzle you've played" — option B.
--
-- The primary query in each picker already excludes puzzles the player has
-- played. The only place a repeat can happen is the FALLBACK, which fires once a
-- player has exhausted the whole pool: it used to pick a weighted-random puzzle
-- across everything, so it could hand back one just played. This redefines every
-- picker so the fallback serves the LEAST-RECENTLY-PLAYED puzzle (oldest last
-- play first), maximizing the gap before any repeat. Primary queries are
-- unchanged (still exclude played + keep the size weighting).

-- Solo / friendly crossword.
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

  -- Fallback: player has played everything — serve the one seen longest ago.
  if not found then
    return query
    select c.id, c.size, c.difficulty, c."isPublished", c.source, c.category,
           c.puzzle, c.solution, c.clues, c."createdAt", c."usedWords"
    from public.crosswords c
    where c."isPublished" = true
    order by (
      select max(g."createdAt") from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."crosswordsId" = c.id and gp."profilesId" = profileid
    ) asc nulls first,
    power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
    limit 1;
  end if;
end;
$$;

-- Ranked / tournament crossword (avoid puzzles EITHER player has played).
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
    order by (
      select max(g."createdAt") from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."crosswordsId" = c.id
        and (gp."profilesId" = player_one_id or gp."profilesId" = player_two_id)
    ) asc nulls first,
    power(random(), 1.0 / (case when c.size >= 6 then 1.5 else 1.0 end)) desc
    limit 1;
  end if;
end;
$$;

-- Solo / friendly sudoku.
CREATE OR REPLACE FUNCTION "public"."get_available_sudoku"("profileid" uuid)
RETURNS SETOF "public"."sudokus"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select s.* from public.sudokus s
  where s."isPublished" = true
    and s.id not in (
      select g."sudokusId" from public.games g
      where g."sudokusId" is not null and g.id in (
        select gp."gamesId" from public."gamePlayers" gp
        where gp."profilesId" = profileid
      )
    )
  order by random()
  limit 1;

  if not found then
    return query
    select s.* from public.sudokus s where s."isPublished" = true
    order by (
      select max(g."createdAt") from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."sudokusId" = s.id and gp."profilesId" = profileid
    ) asc nulls first, random()
    limit 1;
  end if;
end;
$$;

-- Ranked / tournament sudoku (avoid puzzles EITHER player has played).
CREATE OR REPLACE FUNCTION "public"."get_available_ranked_sudoku"("player_one_id" uuid, "player_two_id" uuid)
RETURNS SETOF "public"."sudokus"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select s.* from public.sudokus s
  where s."isPublished" = true
    and s.id not in (
      select g."sudokusId" from public.games g
      where g."sudokusId" is not null and g.id in (
        select gp."gamesId" from public."gamePlayers" gp
        where gp."profilesId" = player_one_id or gp."profilesId" = player_two_id
      )
    )
  order by random()
  limit 1;

  if not found then
    return query
    select s.* from public.sudokus s where s."isPublished" = true
    order by (
      select max(g."createdAt") from public.games g
      join public."gamePlayers" gp on gp."gamesId" = g.id
      where g."sudokusId" = s.id
        and (gp."profilesId" = player_one_id or gp."profilesId" = player_two_id)
    ) asc nulls first, random()
    limit 1;
  end if;
end;
$$;
