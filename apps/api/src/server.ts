import * as Sentry from "@sentry/node";
import { json, urlencoded } from "body-parser";
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import { HttpError } from "http-errors";
import { apiRouter } from "./api.routes";

export const createServer = () => {
  const app = express();
  Sentry.init({
    dsn: "https://6515992aebeb4e6190e26ce7ae8cb084@o4505122115551232.ingest.sentry.io/4505582704001024",
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({
        tracing: true,
      }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({
        app,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!,
  });
  app
    .disable("x-powered-by")
    .use(Sentry.Handlers.requestHandler())
    .use(Sentry.Handlers.tracingHandler())
    .use(morgan("dev"))
    .use(urlencoded({ extended: true }))
    .use(json())
    .use(cors())
    .use("/api", apiRouter)
    .get("/healthz", (req, res) => {
      return res.json({ ok: true });
    })
    .use(Sentry.Handlers.errorHandler())
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
