const BUBBI_EXTRACT_CLOTHES_ENDPOINT =
  "https://api.bubbi.app/api/v3/extract-clothes";

export type BubbiExtractResult = {
  imageUrl: string;
  operationId?: string;
};

/**
 * Calls the Bubbi clothes-extractor API. It runs AI segmentation on the input
 * photo and returns a single transparent-background PNG containing only the
 * detected garments (all items combined, background and person removed).
 *
 * @see https://www.bubbi.app/en/api-documentation
 */
export async function extractClothes(
  file: Uint8Array,
  filename: string,
  contentType: string,
): Promise<BubbiExtractResult> {
  const apiKey = process.env.BUBBI_API_KEY;

  if (!apiKey) {
    throw new Error("BUBBI_API_KEY is not configured.");
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([file as BlobPart], { type: contentType }),
    filename,
  );

  const response = await fetch(BUBBI_EXTRACT_CLOTHES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Bubbi extract-clothes failed: ${response.status} ${detail}`.trim(),
    );
  }

  const json = (await response.json()) as {
    image_url?: string;
    operation_id?: string;
  };

  if (!json.image_url) {
    throw new Error("Bubbi extract-clothes response did not include an image.");
  }

  return {
    imageUrl: json.image_url,
    operationId: json.operation_id,
  };
}
