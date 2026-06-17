import { corsair, pool } from "./index";

export async function syncGoogleTokensToCorsair(userId: string) {
  try {
    // Fetch user's Google tokens from better-auth's `account` table
    const result = await pool.query(
      `SELECT "accessToken", "refreshToken", "accessTokenExpiresAt" 
       FROM "account" 
       WHERE "userId" = $1 AND "providerId" = 'google'`,
      [userId]
    );

    if (result.rows.length === 0) {
      console.log(`No Google account found for user ${userId}`);
      return;
    }

    const { accessToken, refreshToken, accessTokenExpiresAt } = result.rows[0];

    // Get the tenant client
    const tenant = corsair.withTenant(userId);

    // Sync to Gmail plugin
    if (accessToken) {
      await tenant.gmail.keys.set_access_token(accessToken);
    }
    if (refreshToken) {
      await tenant.gmail.keys.set_refresh_token(refreshToken);
    }
    if (accessTokenExpiresAt) {
      const expiresAt = new Date(accessTokenExpiresAt).toISOString();
      await tenant.gmail.keys.set_expires_at(expiresAt);
    }

    // Sync to Google Calendar plugin
    if (accessToken) {
      await tenant.googlecalendar.keys.set_access_token(accessToken);
    }
    if (refreshToken) {
      await tenant.googlecalendar.keys.set_refresh_token(refreshToken);
    }
    if (accessTokenExpiresAt) {
      const expiresAt = new Date(accessTokenExpiresAt).toISOString();
      await tenant.googlecalendar.keys.set_expires_at(expiresAt);
    }

    console.log(`Successfully synced Google tokens to Corsair for user ${userId}`);
  } catch (error) {
    console.error(`Failed to sync Google tokens to Corsair for user ${userId}:`, error);
  }
}
