import type { Asset } from "../types/asset";


export async function getAssets(): Promise<Asset[]> {
  const response = await fetch("/api/assets");


  const data: Asset[] = await response.json();


  return data;
}


export async function createAsset(
  asset: Omit<Asset, "id">
): Promise<{ message: string; id: number }> {
  const response = await fetch("/api/assets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(asset),
  });


  const data: { message: string; id: number } = await response.json();


  if (!response.ok) {
    throw new Error(data.message || "Failed to create asset");
  }


  return data;
}

export async function updateAsset(
  asset_id: number,
  asset: Partial<Omit<Asset, "id">>
): Promise<{ message: string }> {
  const response = await fetch(`/api/assets/${asset_id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(asset),
  });


  const data: { message: string } = await response.json();


  if (!response.ok) {
    throw new Error(data.message || "Failed to update asset");
  }


  return data;
}

export async function deleteAsset(
  asset_id: number
): Promise<{ message: string }> {
  const response = await fetch(`/api/assets/${asset_id}`, {
    method: "DELETE",
  });


  const data: { message: string } = await response.json();


  if (!response.ok) {
    throw new Error(data.message || "Failed to delete asset");
  }


  return data;
}