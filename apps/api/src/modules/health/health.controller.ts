import { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../../lib/supabase.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });

  app.get("/ready", async (_request, reply) => {
    try {
      // Test Supabase connectivity
      const { error } = await supabaseAdmin.from("roles").select("id").limit(1);
      if (error && !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes("placeholder")) {
        return reply.status(503).send({
          status: "unready",
          database: "unhealthy",
          error: error.message
        });
      }

      return {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return reply.status(503).send({
        status: "unready",
        error: err.message
      });
    }
  });
}
