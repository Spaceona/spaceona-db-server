import { serve } from "@hono/node-server";
import { Hono } from "hono";
// import { PrismaClient } from "@prisma/client";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { firestore } from "firebase-admin";
import metrics from "./metrics";
import data from "./update";
import dump from "./dump";
import firmware from "./firmware";
import {authRoute} from "./auth";

const firebaseapp = initializeApp({
  credential: applicationDefault(),
});

export const firestoredb = firestore();
// export const prisma = new PrismaClient();

const app = new Hono();

//to add new versions use the | and add the string afterwards
//(Basically creates a new type for the versions, so we just add new versions to the list)
export type versions = "Spaceona 1.1.6" | "Spaceona 1.2.0"
export const CURRENT_VERSION:versions = "Spaceona 1.2.0";



app.get("/", (c) => {
  return c.text(CURRENT_VERSION);
});

app.get("/test", (c) => {
  return c.text("Spaceona Server Online");
});

app.route("/auth", authRoute);
app.route("/update", data);
app.route("/metrics", metrics);
app.route("/dump", dump);
app.route("/firmware", firmware);

const port = (process.env.PORT as unknown as number) || 3000;

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running on port ${port}`);
