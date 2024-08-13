import {SignJWT} from "jose";
import {z} from "zod";
import {versions} from "../index";

export type authDeviceRequest = {
    mac:string
    firmwareVersion:string
    clientKey:string
}
export const authRequestDeviceSchema = z.object({
    mac:z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/), //regex for a mac address
    firmwareVersion:z.string().regex(/^\d+(-\d+){2}$/), //regex for firmware in format "major-minor-hotfix"
    clientKey:z.string(), //TODO add regex
})

export type authRequestUser = {
    email:string
}
export const authRequestUserSchema = z.object({
    email:z.string().email(),
})


export type authDeviceTokenData = {
    apiVersion:versions
    firmwareVersion:string,
    mac:string
}

export const authDeviceTokenSchema = z.object({
    mac:z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/), //regex for a mac address
    firmwareVersion:z.string().regex(/^\d+(-\d+){2}$/), //regex for firmware in format "major-minor-hotfix"
    apiVersion:z.string(), //TODO add regex
})

export type authUserTokenData = {
    apiVersion:versions
    email:string
    //TODO perhaps include user id
}

export function isValidDevice(body:authDeviceRequest) {
    //TODO use the auth body to validate if this device can be authenticated
    if(authRequestDeviceSchema.safeParse(body).success === false) {
        return false;
    }
    //todo check if valid mac and key
    return true;
}


export function isValidUser(body:authRequestUser) {
    if(authRequestUserSchema.safeParse(body).success === false) {
        return false;
    }
    //todo check if valid email
    return true;
}


export async function genToken<T extends object>(data:T) {
    let expiration = new Date();
    if(process.env.JWT_SECRET === undefined) {
        return undefined;
    }
    expiration.setHours(expiration.getHours()+24)
    return await new SignJWT({data:data})
        .setProtectedHeader({ alg: 'HS256' }) // algorithm
        .setIssuedAt()
        .setExpirationTime(expiration)
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}