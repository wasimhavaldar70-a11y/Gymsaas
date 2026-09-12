import { FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../lib/supabase.js";
import { UnauthorizedError } from "../lib/errors.js";
import { Permission, ROLE_PERMISSIONS, UserRole } from "@gymcare/shared";

export interface TenantContext {
  organizationId: string;
  branchId?: string;
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

declare module "fastify" {
  interface FastifyRequest {
    tenant?: TenantContext;
    token?: string;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Allow demo bypass ONLY if explicitly enabled via local flag AND strictly not in production
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.ENABLE_DEV_AUTH_BYPASS === "true" &&
      (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder"))
    ) {
      request.tenant = {
        organizationId: "00000000-0000-0000-0000-000000000001",
        branchId: "00000000-0000-0000-0000-000000000011",
        userId: "00000000-0000-0000-0000-000000000999",
        email: "owner@ironpulse.in",
        role: "GYM_OWNER",
        permissions: ROLE_PERMISSIONS["GYM_OWNER"]
      };
      return;
    }
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.substring(7);
  request.token = token;

  // Support scoped test tokens in non-production test suites
  if (process.env.NODE_ENV !== "production" && token.startsWith("mock-role-")) {
    const roleKey = token.replace("mock-role-", "").toUpperCase() as UserRole;
    if (ROLE_PERMISSIONS[roleKey]) {
      request.tenant = {
        organizationId: "00000000-0000-0000-0000-000000000001",
        branchId: "00000000-0000-0000-0000-000000000011",
        userId: "00000000-0000-0000-0000-000000000999",
        email: `${roleKey.toLowerCase()}@test.in`,
        role: roleKey,
        permissions: ROLE_PERMISSIONS[roleKey]
      };
      return;
    }
  }

  // Verify JWT via Supabase Auth
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    throw new UnauthorizedError("Invalid or expired session token");
  }

  // Retrieve user record from public.users to get organization & role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("organization_id, branch_id, role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    throw new UnauthorizedError("User profile is inactive or not assigned to a gym organization");
  }

  const role = profile.role as UserRole;
  const permissions = ROLE_PERMISSIONS[role] || [];

  request.tenant = {
    organizationId: profile.organization_id,
    branchId: profile.branch_id || undefined,
    userId: user.id,
    email: user.email || "",
    role,
    permissions
  };
}
