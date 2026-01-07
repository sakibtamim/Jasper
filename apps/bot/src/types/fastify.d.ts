import { User } from "../core/db/types.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}
