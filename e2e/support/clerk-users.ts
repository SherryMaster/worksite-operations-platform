import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

type ClerkUser = {
  two_factor_enabled: boolean;
};

type ClerkSignInToken = {
  token: string;
};

export type PhaseOneTestUser = {
  signInTicket: string;
  mfaEnabled: boolean;
};

function getRoleClerkUserIds(role: "CEO" | "FOREMAN"): string[] {
  const linkedPoolerPath = "supabase/.temp/pooler-url";
  const databaseUrl =
    process.env.SUPABASE_DB_URL ??
    (existsSync(linkedPoolerPath)
      ? readFileSync(linkedPoolerPath, "utf8").trim()
      : undefined);

  if (!databaseUrl || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error(
      "Authenticated E2E tests require the linked database and SUPABASE_DB_PASSWORD.",
    );
  }

  const result = spawnSync(
    "psql",
    [
      databaseUrl,
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      `select clerk_user_id
       from public.application_users
       where role = '${role}' and is_active
       order by
         case
           when role = 'FOREMAN' and exists (
             select 1
             from public.foreman_project_assignments
             where foreman_project_assignments.foreman_user_id =
               application_users.id
               and foreman_project_assignments.starts_on <=
                 (now() at time zone 'Asia/Kuala_Lumpur')::date
               and (
                 foreman_project_assignments.ends_on is null
                 or foreman_project_assignments.ends_on >
                   (now() at time zone 'Asia/Kuala_Lumpur')::date
               )
           ) then 0
           else 1
         end,
         created_at;`,
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: process.env.SUPABASE_DB_PASSWORD,
      },
      stdio: "pipe",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Application user lookup failed: ${result.stderr.toString().trim()}`,
    );
  }

  return result.stdout
    .toString()
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function clerkRequest(
  path: string,
  secretKey: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function getPhaseOneTestUser(
  role: "CEO" | "FOREMAN",
): Promise<PhaseOneTestUser> {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "CLERK_SECRET_KEY is required for authenticated E2E tests.",
    );
  }

  const clerkUserIds = getRoleClerkUserIds(role);

  for (const clerkUserId of clerkUserIds) {
    const userResponse = await clerkRequest(`/users/${clerkUserId}`, secretKey);

    if (userResponse.status === 404) continue;

    if (!userResponse.ok) {
      throw new Error(
        `Clerk ${role} lookup failed with status ${userResponse.status}.`,
      );
    }

    const clerkUser = (await userResponse.json()) as ClerkUser;
    const tokenResponse = await clerkRequest("/sign_in_tokens", secretKey, {
      method: "POST",
      body: JSON.stringify({
        user_id: clerkUserId,
        expires_in_seconds: 300,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(
        `Clerk ${role} sign-in token creation failed with status ${tokenResponse.status}.`,
      );
    }

    const token = (await tokenResponse.json()) as ClerkSignInToken;

    return {
      signInTicket: token.token,
      mfaEnabled: clerkUser.two_factor_enabled,
    };
  }

  throw new Error(
    `Authenticated E2E tests require an active ${role} linked to an existing Clerk user.`,
  );
}
