import { z } from "zod";

export const serverEnvironmentSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "Supabase URL must use HTTPS.",
    }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
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
