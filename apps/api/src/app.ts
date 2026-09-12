import fastify from "fastify";
import { IncomingMessage } from "http";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import crypto from "crypto";
import { config } from "./config.js";
import { AppError } from "./lib/errors.js";

// Import Controllers
import { healthRoutes } from "./modules/health/health.controller.js";
import { authRoutes } from "./modules/auth/auth.controller.js";
import { branchRoutes } from "./modules/branches/branches.controller.js";
import { memberRoutes } from "./modules/members/members.controller.js";
import { attendanceRoutes } from "./modules/attendance/attendance.controller.js";
import { membershipRoutes } from "./modules/memberships/memberships.controller.js";
import { paymentRoutes } from "./modules/payments/payments.controller.js";
import { invoiceRoutes } from "./modules/invoices/invoices.controller.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.controller.js";
import { trainerRoutes } from "./modules/trainers/trainers.controller.js";
import { workoutRoutes } from "./modules/workouts/workouts.controller.js";
import { dietRoutes } from "./modules/diets/diets.controller.js";
import { leadRoutes } from "./modules/leads/leads.controller.js";
import { reportRoutes } from "./modules/reports/reports.controller.js";
import { settingsRoutes } from "./modules/settings/settings.controller.js";

export function buildApp() {
  const app = fastify({
    genReqId: (req: IncomingMessage) => {
      const headerVal = req.headers["x-request-id"];
      if (Array.isArray(headerVal)) return headerVal[0];
      return headerVal || crypto.randomUUID();
    },
    logger: {
      level: config.NODE_ENV === "development" ? "info" : "warn",
      transport:
        config.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname"
              }
            }
          : undefined
    }
  });

  // Security Plugins
  app.register(helmet, {
    contentSecurityPolicy: false
  });

  app.register(cors, {
    origin: [config.CORS_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
  });

  app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1", "localhost"]
  });

  // Global Centralized Error Handler
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          request_id: requestId
        }
      });
    }

    // Unhandled or internal errors
    request.log.error({ err: error, requestId }, "Unhandled Internal Server Error");

    return reply.status(500).send({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        request_id: requestId
      }
    });
  });

  // Register Routes
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(branchRoutes, { prefix: "/api/v1/branches" });
  app.register(memberRoutes, { prefix: "/api/v1/members" });
  app.register(attendanceRoutes, { prefix: "/api/v1/attendance" });
  app.register(membershipRoutes, { prefix: "/api/v1/memberships" });
  app.register(paymentRoutes, { prefix: "/api/v1/payments" });
  app.register(invoiceRoutes, { prefix: "/api/v1/invoices" });
  app.register(dashboardRoutes, { prefix: "/api/v1/dashboard" });
  app.register(trainerRoutes, { prefix: "/api/v1/trainers" });
  app.register(workoutRoutes, { prefix: "/api/v1/workouts" });
  app.register(dietRoutes, { prefix: "/api/v1/diets" });
  app.register(leadRoutes, { prefix: "/api/v1/leads" });
  app.register(reportRoutes, { prefix: "/api/v1/reports" });
  app.register(settingsRoutes, { prefix: "/api/v1/settings" });

  return app;
}
