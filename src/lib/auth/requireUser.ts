import { NextResponse } from "next/server";
import { getAuth } from "./server";

/**
 * The one ownership check (SPEC.md §7 "Access control"). Every route that
 * touches user tables calls this first and filters every query on the id it
 * returns — never on an id taken from the request body.
 */
export async function requireUser(
  unauthorizedMessage = "Sign in to sync your saved phrases.",
): Promise<
  { userId: string; response?: never } | { userId?: never; response: NextResponse }
> {
  const { data: session } = await getAuth().getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: { code: "unauthorized", message: unauthorizedMessage } },
        { status: 401 },
      ),
    };
  }
  return { userId };
}
