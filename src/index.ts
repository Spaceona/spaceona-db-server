import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { applicationDefault, initializeApp } from "firebase-admin/app";

export const prisma = new PrismaClient();

import { firestore } from "firebase-admin";

const firebaseapp = initializeApp({
  credential: applicationDefault(),
});

const firestoredb = firestore();

const app = new Hono();

app.get("/", (c) => {
  return c.text("Spaceona 1.0.0");
});

function saveToLog(text: string) {
  //file name based on date
  const date = new Date();
  const fileName = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.txt`;
  const folder = "./logs";
  const fs = require("fs");

  //check if folder exists
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }

  //save to log in folder
  fs.appendFile(`${folder}/${fileName}`, text + "\n", function (err: any) {
    if (err) console.log(err);
    console.log("saved to log");
  });
}

app.post("/update/:school/:building/:type/:id/:status/:token", async (c) => {
  let { school, building, type, id, status, token } = c.req.param();

  if (!process.env.AUTH_TOKEN) {
    return c.text("Unauthorized");
  }

  if (token !== process.env.AUTH_TOKEN) {
    return c.text("Unauthorized");
  }

  type = type.toLowerCase();

  if (type !== "washer" && type !== "dryer") {
    return c.text("Invalid machine type");
  }

  if (type == "washer") {
    type = "washingmachines";
  } else if (type == "dryer") {
    type = "dryers";
  }

  //parse status to boolean
  const boolStatus = status === "true" ? true : false;

  const machineId = `${school}-${building}-${type}-${id}`;
  const entry = await prisma.machineLog.create({
    data: {
      machineId,
      isInUse: boolStatus,
    },
  });

  try {
    const docRef = firestoredb.collection("schools").doc(school);

    //print the docuemnt data
    const doc = await docRef.get();

    //find the building where the id matches building
    const buildings = doc.data()?.buildings;

    const buildingIndex = buildings.findIndex(
      (building: any) => building.id === building
    );

    //get the building where id  = "ruef"
    const buildingData = buildings.find(
      (selected: any) => selected.id == building
    );
    const machines = buildingData[type];
    const machine = machines[id];

    //update the machine status
    machine.isInUse = boolStatus;

    //update the building
    buildingData[type][id] = machine;

    //update the buildings array
    buildings[buildingIndex] = buildingData;

    //update the document
    await docRef.update({
      buildings,
    });
  } catch (e) {
    console.log("Error updating document:", e);
    return c.text("Error updating document");
  }

  saveToLog(JSON.stringify(entry));

  // console.log(entry);

  return c.text("OK");
});

const port = (process.env.PORT as unknown as number) || 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
