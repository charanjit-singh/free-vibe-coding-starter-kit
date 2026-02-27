import { toRouteHandler } from "@better-upload/server/adapters/next";
import type { Router } from "@better-upload/server";

async function getRouter(): Promise<Router> {
  const { route, RejectUpload } = await import("@better-upload/server");
  const { aws } = await import("@better-upload/server/clients");
  const { presignGetObject } = await import("@better-upload/server/helpers");
  const { auth } = await import("@/lib/auth");

  const s3 = aws();

  return {
    client: s3,
    bucketName: process.env.BETTER_UPLOAD_BUCKET || "my-bucket",
    routes: {
      avatar: route({
        fileTypes: ["image/*"],
        maxFileSize: 1024 * 1024 * 2, // 2MB
        onBeforeUpload: async ({ req, file }) => {
          const session = await auth.api.getSession({
            headers: req.headers,
          });

          if (!session?.user) {
            throw new RejectUpload("Unauthorized");
          }

          const ext = file.name.split(".").pop() || "jpg";
          const key = `avatars/${session.user.id}/${Date.now()}.${ext}`;

          return {
            objectInfo: { key },
          };
        },
        onAfterSignedUrl: async ({ file, metadata }) => {
          const key = file.objectInfo?.key;
          if (!key) return {};

          const publicUrl = process.env.BETTER_UPLOAD_PUBLIC_URL;
          if (publicUrl) {
            const url = `${publicUrl.replace(/\/$/, "")}/${key}`;
            return { metadata: { ...metadata, url } };
          }

          const bucket = process.env.BETTER_UPLOAD_BUCKET || "my-bucket";
          const url = await presignGetObject(s3, {
            bucket,
            key,
            expiresIn: 60 * 60 * 24 * 365, // 1 year for avatars
          });
          return { metadata: { ...metadata, url } };
        },
      }),
    },
  };
}

export async function POST(req: Request) {
  const router = await getRouter();
  const { POST } = toRouteHandler(router);
  return POST(req);
}
