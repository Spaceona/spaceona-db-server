import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { firestore } from "firebase-admin";
import metrics from "./metrics";
import data from "./update";

const firebaseapp = initializeApp({
  credential: applicationDefault(),
});

export const firestoredb = firestore();
export const prisma = new PrismaClient();

const app = new Hono();

app.get("/", (c) => {
  return c.text("Spaceona 1.1.4");
});

app.route("/update", data);
app.route("/metrics", metrics);

const port = (process.env.PORT as unknown as number) || 3000;

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running on port ${port}`);
