import http from "node:http";
import { logger } from "@repo/logger";
import { app as expressApplication } from "./server";
import { setupCorsair } from "corsair";
import { corsair } from "@repo/corsair";

import { env } from "./env";

async function init() {
  try {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      await setupCorsair(corsair, {
        credentials: {
          gmail: {
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            topic_id: env.GOOGLE_GMAIL_TOPIC_ID || (env.NODE_ENV === "development" ? "projects/cruxsee/topics/gmail-dev" : undefined),
          },
          googlecalendar: {
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
          }
        }
      });
      logger.info("Corsair seeded successfully.");
    }

    const server = http.createServer(expressApplication);
    const PORT: number = env.PORT ? +env.PORT : 4000;
    server.listen(PORT, "0.0.0.0", () => {
      logger.info(`http server is running on PORT ${PORT} and binding to 0.0.0.0`);
    });
  } catch (err) {
    logger.error(`Error creating http server`, { err });
    process.exit(1);
  }
}

init();
