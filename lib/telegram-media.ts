export type TelegramFileDownload = {
  bytes: Uint8Array;
  mediaType: string;
  filePath: string;
};

/**
 * Downloads a Telegram file (by `file_id`) using the Bot API. Returns the raw
 * bytes plus a best-effort media type inferred from the Telegram file path.
 */
export async function downloadTelegramFile(
  fileId: string,
): Promise<TelegramFileDownload> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is required to download Telegram files.",
    );
  }

  const fileResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );

  if (!fileResponse.ok) {
    throw new Error(`Telegram getFile failed: ${fileResponse.status}`);
  }

  const filePath = getTelegramFilePath(await fileResponse.json());

  if (!filePath) {
    throw new Error("Telegram did not return a file path for the file.");
  }

  const download = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`,
  );

  if (!download.ok) {
    throw new Error(`Failed to download Telegram file: ${download.status}`);
  }

  const bytes = new Uint8Array(await download.arrayBuffer());

  return {
    bytes,
    mediaType: inferMediaType(filePath),
    filePath,
  };
}

function inferMediaType(filePath: string) {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function getTelegramFilePath(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "result" in body &&
    typeof body.result === "object" &&
    body.result !== null &&
    "file_path" in body.result &&
    typeof body.result.file_path === "string"
  ) {
    return body.result.file_path;
  }

  return null;
}
