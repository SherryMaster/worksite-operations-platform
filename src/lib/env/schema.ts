import { z } from "zod";

export const serverEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
      .string()
      .regex(/^pk_(test|live)_.+/, "Use a Clerk test or live publishable key."),
    CLERK_SECRET_KEY: z
      .string()
      .regex(/^sk_(test|live)_.+/, "Use a Clerk test or live secret key."),
    NEXT_PUBLIC_SUPABASE_URL: z
      .url()
      .refine((url) => url.startsWith("https://"), {
        message: "Supabase URL must use HTTPS.",
      }),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  })
  .superRefine((environment, context) => {
    const publishableKind =
      environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_live_")
        ? "live"
        : "test";
    const secretKind = environment.CLERK_SECRET_KEY.startsWith("sk_live_")
      ? "live"
      : "test";

    if (publishableKind !== secretKind) {
      context.addIssue({
        code: "custom",
        message:
          "Clerk publishable and secret keys must use the same environment.",
        path: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
      });
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  environment: Record<string, string | undefined>,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    const missingOrInvalid = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");

    throw new Error(
      `Invalid server environment configuration: ${missingOrInvalid}`,
    );
  }

  return result.data;
}
