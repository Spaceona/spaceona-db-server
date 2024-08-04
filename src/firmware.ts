import { Hono } from "hono";
import {lstat, readdir} from 'node:fs/promises';
import * as path from "node:path";

const route = new Hono();

route.get('/latest', async (context) => {
    //console.log(await getAllVersions(path.join(__dirname, "../firmware")));
    //console.log(getLatestVersions(await getAllVersions(path.join(__dirname, "../firmware"))));
    const allVersions = await getAllVersions(path.join(__dirname, "../firmware"));
    return context.json({version:getLatestVersions(allVersions)});
});
route.get('/file/:version', async (context) => {

});

async function getAllVersions(basePath: string) {
    const versions:string[] = [];
    const dirResults = await readdir(basePath);
    console.log(dirResults);
    for (const pathName of dirResults) {
        const filePath = path.join(basePath, pathName);
        const fileInfo =  await lstat(filePath);
        if (fileInfo.isDirectory()) {
            versions.push(...await getAllVersions(filePath));
        } else if (fileInfo.isFile()){
            versions.push(pathName.split(".")[0]);
        }
    }
    return versions;
}

function compareVersions(versionA: string, versionB: string): number {
    if (versionA === versionB) {
        return 0;
    }
    const splitA = versionA.split("-");
    const splitB = versionB.split("-");
    if (splitA[0] > splitB[0]) { //A major version is bigger
        return 1;
    }
    if (splitA[1] > splitB[1]) { //A minor version is bigger
        return 1;
    }
    if (splitA[2] > splitB[2]) { //A patch version is bigger
        return 1;
    }
    //If we hit this then A was never bigger so B is bigger
    return -1;
}

function getLatestVersions(versions:string[]) {
    return versions.sort(compareVersions).reverse()[0];
}



export default route;