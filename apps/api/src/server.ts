import { json, urlencoded } from "body-parser";
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import { HttpError } from "http-errors";
import { apiRouter } from "./api.routes";

export const createServer = () => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(urlencoded({ extended: true }))
    .use(json())
    .use(cors())
    .use("/api", apiRouter)
    .get("/healthz", (req, res) => {
      return res.json({ ok: true });
    })
    .use(
      (error: HttpError, req: Request, res: Response, next: NextFunction) => {
        console.log(error.stack);
        // Handle HTTP errors created by http-errors package
        if (error.status && error.statusCode && error.expose) {
          res.status(error.status).json({
            error: {
              errorCode: error.status,
              message: error.message,
              stackTrace: error.stack,
            },
          });
        } else {
          // Handle other types of errors
          res.status(500).json({
            error: {
              errorCode: 500,
              message: error.message,
              stackTrace: error.stack,
            },
          });
          next(error);
        }
      }
    );

  return app;
};
