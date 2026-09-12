import { FastifyRequest, FastifyReply } from "fastify";
import { Permission, hasPermission } from "@gymcare/shared";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

export function requirePermission(requiredPermission: Permission) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.tenant) {
      throw new UnauthorizedError();
    }

    const isAllowed = hasPermission(request.tenant.permissions, requiredPermission);

    if (!isAllowed) {
      throw new ForbiddenError(`You lack the required permission: '${requiredPermission}'`);
    }
  };
}
