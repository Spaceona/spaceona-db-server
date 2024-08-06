import {Hono} from "hono";
import {CURRENT_VERSION} from "../index";
import {
    genToken,
    authDeviceRequest,
    isValidDevice,
    authDeviceTokenData,
    isValidUser,
    authRequestUser, authUserTokenData
} from "./authHelpers";

export const authRoute = new Hono();

authRoute.post("/device",async (context) => {

    const body:authDeviceRequest = await context.req.json();

    if(isValidDevice(body) === false) {
        context.status(400);
        return context.json({error:"could not authenticate device"})
    }

    const token = await genToken<authDeviceTokenData>({
        apiVersion:CURRENT_VERSION,
        firmwareVersion:body.firmwareVersion,
        mac:body.mac
    });

    if(token === undefined) {
        return context.json({error:"could not authenticate device"});
    }
    console.log(token);
    return context.json({message:"Authenticated", jwt:token});
})

authRoute.post("/user",async (context) => {

    const body:authRequestUser = await context.req.json();

    if(isValidUser(body) === false) {
        return context.json({error:"could not authenticate user"})
    }

    const token = await genToken<authUserTokenData>({
        apiVersion:CURRENT_VERSION,
        email:body.email
    });

    if(token === undefined) {
        return context.json({error:"could not authenticate device"});
    }
    console.log(token);
    return context.json({message:"Authenticated", jwt:token});
})

export default authRoute;