interface ShareStoreLoader {
  fetch: (shareId: string) => Promise<unknown>;
}

interface DocumentStoreLoader {
  fetch: (documentSlug: string) => Promise<unknown>;
}

interface ShareAwareClient {
  setShareId: (shareId: string | undefined) => void;
}

interface LoadSharedSceneModelsOptions {
  shareId: string;
  documentSlug?: string;
  shares: ShareStoreLoader;
  documents: DocumentStoreLoader;
  client: ShareAwareClient;
}

/**
 * Loads the models required by the shared scene.
 *
 * @param options shared scene dependencies and route params.
 * @returns a promise that resolves when the share and active document are loaded.
 */
export async function loadSharedSceneModels({
  shareId,
  documentSlug,
  shares,
  documents,
  client,
}: LoadSharedSceneModelsOptions): Promise<void> {
  client.setShareId(shareId);

  await Promise.all([
    shares.fetch(shareId),
    documentSlug ? documents.fetch(documentSlug) : undefined,
  ]);
}
