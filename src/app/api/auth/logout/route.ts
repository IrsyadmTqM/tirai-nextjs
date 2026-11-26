import { appendAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/dal";
import { destroySession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assertSameOrigin, handle } from "@/lib/http";

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await getCurrentUser();
    await destroySession();
    if (user) {
      await appendAudit(await getDb(), {
        actorId: user.id,
        action: "auth.logout",
        resourceType: "user",
        resourceId: user.id,
      });
    }
    return Response.json({ ok: true });
  });
}
