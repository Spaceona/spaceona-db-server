import {Context, Hono, Next} from "hono";
import { stream, streamText, streamSSE } from 'hono/streaming'
import {lstat, readdir, readFile} from 'node:fs/promises';
import * as path from "node:path";
import {authMiddleware, deviceAuthMiddleware} from "./auth/authMiddleware";

const app = new Hono();

app.use("*",authMiddleware);
app.use("*",deviceAuthMiddleware);
//TODO add a firmware specific auth route that checks if the client key and mac address are valid
app.get('/latest', async (context) => {
    //console.log(await getAllVersions(path.join(__dirname, "../firmware")));
    //console.log(getLatestVersions(await getAllVersions(path.join(__dirname, "../firmware"))));
    const allVersions = await getAllVersions(path.join(__dirname, "../firmware"));
    return context.json({version:getLatestVersions(allVersions)});
});
app.get('/file/:version{^\\d+(-\\d+){2}$}', async (context) => {
    const version = context.req.param("version");
    console.log(version);
    const versionArray:string[] = version.split("-");
    const majorVersion = versionArray[0];
    const minorVersion = versionArray[1];
    const hotfixVersion = versionArray[2];
    const firmwareFolder = path.join(__dirname, "../firmware");
    const majorVersionPath = path.join(firmwareFolder, majorVersion);
    if(!(await lstat(majorVersionPath)).isDirectory()) {
        context.status(400);
        context.json({error: "Firmware not found"});
    }
    const dirResults = await readdir(majorVersionPath);
    const firmwareName = version + ".bin";
    if(!dirResults.includes(firmwareName)){
        context.status(400);
        context.json({error: "Firmware not found"});
    }
    const data = await readFile(path.join(majorVersionPath, firmwareName));
    context.header("Content-Type","application/octet-stream");
    context.header("Content-Length",data.length.toString());
    return stream(context, async (stream) => {
        await stream.write(data);
    })
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



export default app;