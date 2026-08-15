import type { Asset } from "../types/asset";

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

const UNAVAILABLE_STATUS_CODES = [502, 503, 504];

async function request<T>(
  url: string,
  options: RequestInit | undefined,
  defaultErrorMessage: string
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new NetworkError("Unable to connect to server");
  }

  if (UNAVAILABLE_STATUS_CODES.includes(response.status)) {
    throw new NetworkError("Unable to connect to server");
  }

  let data: T;

  try {
    data = await response.json();
  } catch (error) {
    if (!response.ok) {
      throw new Error(defaultErrorMessage);
    }
    throw error;
  }

  if (!response.ok) {
    const message = (data as { message?: string })?.message;
    throw new Error(message || defaultErrorMessage);
  }

  return data;
}

export async function getAssets(search?: string, status?: string): Promise<Asset[]> {
  const params = new URLSearchParams();

  if (search && search.trim()) {
    params.set("search", search.trim());
  }

  if (status && status.trim()) {
    params.set("status", status.trim());
  }

  const queryString = params.toString();
  const url = queryString ? `/api/assets?${queryString}` : "/api/assets";

  return request<Asset[]>(url, undefined, "Failed to load assets");
}

export async function createAsset(
  asset: Omit<Asset, "id">
): Promise<{ message: string; id: number }> {
  return request<{ message: string; id: number }>(
    "/api/assets",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(asset),
    },
    "Failed to create asset"
  );
}

export async function updateAsset(
  asset_id: number,
  asset: Partial<Omit<Asset, "id">>
): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/assets/${asset_id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(asset),
    },
    "Failed to update asset"
  );
}

export async function deleteAsset(
  asset_id: number
): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/assets/${asset_id}`,
    {
      method: "DELETE",
    },
    "Failed to delete asset"
  );
}

export { NetworkError };