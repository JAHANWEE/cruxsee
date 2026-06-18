import { Router } from "express";
import { generateOAuthUrl, processOAuthCallback } from "corsair/oauth";
import { corsair, pool } from "@repo/corsair";
import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";
import { logger } from "@repo/logger";

export const corsairRouter = Router();

const BASE_URL = process.env.BASE_URL || "http://localhost:4000";
const REDIRECT_URI = `${BASE_URL}/api/corsair/callback`;

const PLUGIN_SCOPES: Record<string, string[]> = {
  gmail: ["https://mail.google.com/"],
  googlecalendar: ["https://www.googleapis.com/auth/calendar"],
};

// GET /api/corsair/connect?plugin=gmail
corsairRouter.get("/connect", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const plugin = req.query.plugin as string;
  if (!plugin || !PLUGIN_SCOPES[plugin]) {
    res.status(400).json({ error: "Invalid plugin" });
    return;
  }

  try {
    const { url, state } = await generateOAuthUrl(corsair, plugin, {
      tenantId: session.user.id,
      redirectUri: REDIRECT_URI,
      scopes: PLUGIN_SCOPES[plugin],
    });

    // Force same Google account + offline access for long-lived refresh token
    const oauthUrl = new URL(url);
    oauthUrl.searchParams.set("login_hint", session.user.email);
    oauthUrl.searchParams.set("access_type", "offline");
    oauthUrl.searchParams.set("prompt", "consent");

    // Store state in cookie (simple, no DB needed for short-lived OAuth state)
    res.cookie("corsair_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600_000, // 10 minutes
    });

    res.redirect(oauthUrl.toString());
  } catch (err: any) {
    logger.error("Corsair connect failed", { error: err.message, plugin, userId: session.user.id });
    res.status(500).json({ error: "Failed to initiate connection" });
  }
});

// GET /api/corsair/callback?code=...&state=...
corsairRouter.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const storedState = req.cookies?.corsair_oauth_state;

  if (!code || !state) {
    res.status(400).send("Missing code or state");
    return;
  }
  if (!storedState || storedState !== state) {
    res.status(400).send("Invalid state — please try again");
    return;
  }

  try {
    await processOAuthCallback(corsair, { code, state, redirectUri: REDIRECT_URI });
    res.clearCookie("corsair_oauth_state");

    // Close popup and notify parent (scoped origin, not wildcard)
    const origin = process.env.FRONTEND_URL || "http://localhost:3000";
    res.send(`<html><body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa;">
      <div style="text-align: center; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
        <div style="width: 48px; height: 48px; border-radius: 24px; background: #10B981; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 style="margin: 0 0 8px;">Successfully Connected</h2>
        <p style="margin: 0 0 16px; color: #52525B;">Your account is now securely linked.</p>
        <p style="color: #A1A1AA; font-size: 0.875rem;">This window will close automatically...</p>
        <script>
          window.opener?.postMessage({ type: "corsair-connected" }, "${origin}");
          setTimeout(() => window.close(), 1500);
        </script>
      </div>
    </body></html>`);
  } catch (err: any) {
    logger.error("OAuth callback failed", { error: err.message });
    res.clearCookie("corsair_oauth_state");
    const origin = process.env.FRONTEND_URL || "http://localhost:3000";
    res.send(`<html><body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa;">
      <div style="text-align: center; padding: 40px;">
        <h2>Connection failed</h2>
        <p style="color: #52525B;">${err.message}</p>
        <script>
          window.opener?.postMessage({ type: "corsair-error" }, "${origin}");
          setTimeout(() => window.close(), 3000);
        </script>
      </div>
    </body></html>`);
  }
});

// GET /api/corsair/status — check which plugins are connected
corsairRouter.get("/status", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Fast path: check if accounts exist in DB
    const result = await pool.query(
      `SELECT i.name FROM corsair_accounts a JOIN corsair_integrations i ON a.integration_id = i.id WHERE a.tenant_id = $1`,
      [session.user.id]
    );
    const rows = result.rows || [];
    const connected = rows.map((r: any) => r.name);

    const status: Record<string, boolean> = {
      gmail: connected.includes("gmail"),
      googlecalendar: connected.includes("googlecalendar"),
    };

    // Lightweight verify if accounts exist
    if (status.gmail) {
      try {
        await corsair.withTenant(session.user.id).gmail.api.labels.list({});
      } catch {
        status.gmail = false;
      }
    }
    if (status.googlecalendar) {
      try {
        await corsair.withTenant(session.user.id).googlecalendar.api.calendar.getAvailability({
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 86400000).toISOString(),
        });
      } catch {
        status.googlecalendar = false;
      }
    }

    res.json(status);
  } catch (err: any) {
    // If corsair tables don't exist yet, return not connected
    res.json({ gmail: false, googlecalendar: false });
  }
});
