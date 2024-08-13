import {Context, Hono, Next} from "hono";
import {jwtVerify, SignJWT} from "jose";
import {CURRENT_VERSION} from "../index"
import {authDeviceRequest, authDeviceTokenSchema, authRequestDeviceSchema} from "./authHelpers";
// Define your authentication middleware



export const authMiddleware = async (c: Context, next: Next) => {
  const token = getTokenFromHeader(c);
  if(token === undefined) {
    c.status(401);
    return c.json({message:"unauthorized"});
  }

  if(process.env.JWT_SECRET === undefined) {
    c.status(500);
    return c.json({message:"something went wrong try again later!"});
    //TODO send notification that the server has a bad config
  }

  try {
    const {payload, protectedHeader} = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    if(payload.data === undefined) {
      c.status(401);
      return c.json({message:"unauthorized"});
    }
  } catch(err) {
    c.status(401);
    return c.json({message:"unauthorized"});
  }
  await next();
};

export const deviceAuthMiddleware = async (c: Context, next: Next) => {
  const token = getTokenFromHeader(c);
  if(token === undefined) {
    c.status(401);
    return c.json({message:"unauthorized"});
  }

  try {
    const {payload, protectedHeader} =  await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
  if(payload.data === undefined || payload.data === null) {
      c.status(401);
      return c.json({message:"unauthorized"});
    }
    console.log(payload.data);
    if(authDeviceTokenSchema.safeParse(payload.data).success === false) {
      c.status(401);
      return c.json({message:"unauthorized"});
    }
  } catch(err) {
    c.status(401);
    return c.json({message:"unauthorized"});
  }
  await next();
}

export const userAuthMiddleware = async (c: Context, next: Next) => {
  await next();
}

function getTokenFromHeader(c:Context) {
  const authHeader = c.req.header("Authorization");
  if(authHeader === undefined){
    return undefined
  }
  const token = authHeader.split(" ")[1];
  if(token === undefined){
    return undefined
  }
  return token
}



/*
EXAMPLE:
    /metrics?token=abc123
*/
