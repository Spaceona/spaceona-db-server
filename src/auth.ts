import {Context, Hono, Next} from "hono";
import {jwtVerify, SignJWT} from "jose";
import {CURRENT_VERSION, versions} from "./index";
// Define your authentication middleware
export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization")
  if(authHeader === undefined){
    c.status(401);
    return c.json({message:"Authorization header is missing"});
  }
  //auth header format: bearer token
  const token = authHeader.split(" ")[1];
  if(token === undefined){
    c.status(401);
    return c.json({message:"unauthorized"});
  }
  if(process.env.JWT_SECRET === undefined) {
    c.status(500);
    return c.json({message:"something went wrong try again later!"});
    //TODO send notification that the server has a bad config
  }
  try {
    const {payload, protectedHeader} = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
  } catch(err) {
    c.status(401);
    return c.json({message:"unauthorized"});
  }
  await next();
};

export const authRoute = new Hono();

//TODO put this somewhere better
export type authRequest = {
  mac:string
  clientKey:string
  firmwareVersion:string
}

export type authBody = {
  apiVersion:versions
  firmwareVersion:string
}


authRoute.post("/authenticate",async (context) => {

  const body:authRequest = await context.req.json();

  if(isValidDevice(body) === false) {
    return context.json({error:"could not authenticate device"})
  }

  const token = await genToken<authBody>({
    apiVersion:CURRENT_VERSION,
    firmwareVersion:body.firmwareVersion
  });

  if(token === undefined) {
    return context.json({error:"could not authenticate device"});
  }
  console.log(token);
  return context.json({message:"Authenticated", jwt:token});
})



function isValidDevice(body:authRequest) {
  //TODO use the auth body to validate if this device can be authenticated
  return true;
}


export async function genToken<T extends object>(data:T) {
  let expiration = new Date();
  if(process.env.JWT_SECRET === undefined) {
    return undefined;
  }
  //expiration.setMinutes(expiration.getMinutes()+1);
  expiration.setHours(expiration.getHours()+24)
  return await new SignJWT({data:data})
      .setProtectedHeader({ alg: 'HS256' }) // algorithm
      .setIssuedAt()
      .setExpirationTime(expiration)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

/*
EXAMPLE:
    /metrics?token=abc123
*/
