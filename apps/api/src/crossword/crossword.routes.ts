// /api/crosswords

import express, { Router } from "express";
import { z } from "zod";
import { validate } from "../lib/validate.middleware";
import { CrosswordCategory } from "database";
import { Crossword } from "types-and-validators";

export const crosswordRouter: Router = express.Router();

const createCrosswordRequestSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({
    category: z.nativeEnum(CrosswordCategory),
  }),
});

crosswordRouter.post<
  Record<string, never>,
  Crossword,
  { category: CrosswordCategory },
  Record<string, never>
>("/", validate(createCrosswordRequestSchema), async (req, res) => {
  res.send();
});
