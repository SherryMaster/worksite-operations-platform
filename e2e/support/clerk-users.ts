type ClerkEmailAddress = {
  email_address: string;
  id: string;
};

type ClerkUser = {
  created_at: number;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  two_factor_enabled: boolean;
};

export type PhaseOneTestUsers = {
  ceoEmailAddress: string;
  foremanEmailAddress: string;
  foremanMfaEnabled: boolean;
};

let usersPromise: Promise<PhaseOneTestUsers> | undefined;

function primaryEmailAddress(user: ClerkUser): string {
  const email =
    user.email_addresses.find(
      (address) => address.id === user.primary_email_address_id,
    ) ?? user.email_addresses[0];

  if (!email) {
    throw new Error("A Phase 1 Clerk test user has no email address.");
  }

  return email.email_address;
}

export function getPhaseOneTestUsers(): Promise<PhaseOneTestUsers> {
  usersPromise ??= (async () => {
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        "CLERK_SECRET_KEY is required for authenticated E2E tests.",
      );
    }

    const response = await fetch("https://api.clerk.com/v1/users?limit=10", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!response.ok) {
      throw new Error(
        `Clerk user lookup failed with status ${response.status}.`,
      );
    }

    const users = ((await response.json()) as ClerkUser[]).sort(
      (left, right) => left.created_at - right.created_at,
    );

    if (users.length < 2) {
      throw new Error("Phase 1 E2E tests require a CEO and a Foreman user.");
    }

    return {
      ceoEmailAddress: primaryEmailAddress(users[0]),
      foremanEmailAddress: primaryEmailAddress(users.at(-1)!),
      foremanMfaEnabled: users.at(-1)!.two_factor_enabled,
    };
  })();

  return usersPromise;
}
