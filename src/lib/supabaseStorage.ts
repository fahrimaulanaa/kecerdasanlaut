const bucket = "file";

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Konfigurasi Supabase Storage belum lengkap.");
  }
  return { url: url.replace(/\/$/, ""), secretKey };
}

export async function uploadFileToSupabase(
  path: string,
  body: ArrayBuffer,
  contentType: string
): Promise<void> {
  const { url, secretKey } = getConfig();
  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${encodePath(path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        apikey: secretKey,
        "Content-Type": contentType || "application/octet-stream",
        "x-upsert": "false",
      },
      body,
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase upload gagal (${response.status}): ${detail}`);
  }
}

export async function createSupabaseSignedUrl(path: string): Promise<string> {
  const { url, secretKey } = getConfig();
  const response = await fetch(
    `${url}/storage/v1/object/sign/${bucket}/${encodePath(path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        apikey: secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 7 }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.signedURL !== "string") {
    throw new Error(`Supabase download URL gagal (${response.status}).`);
  }
  if (data.signedURL.startsWith("http")) return data.signedURL;
  if (data.signedURL.startsWith("/storage/v1/")) {
    return `${url}${data.signedURL}`;
  }
  return `${url}/storage/v1${data.signedURL.startsWith("/") ? "" : "/"}${data.signedURL}`;
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
