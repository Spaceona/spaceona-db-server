import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { firestore } from "firebase-admin";
import metrics from "./metrics";
import data from "./update";
import dump from "./dump";

const firebaseapp = initializeApp({
  credential: applicationDefault(),
});

export const firestoredb = firestore();
export const prisma = new PrismaClient();

let firebasereadcount = 0;

export function incFirebasereadcount() {
  firebasereadcount++;
}

setInterval(() => {
  console.log(`Total Firestore reads since server start: ${firebasereadcount}`);
}, 10000);

const app = new Hono();

app.get("/", (c) => {
  return c.text("Spaceona 1.1.4");
});

app.route("/update", data);
app.route("/metrics", metrics);
app.route("/dump", dump);

const port = (process.env.PORT as unknown as number) || 3000;

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running on port ${port}`);
