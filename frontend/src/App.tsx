import { useEffect, useState } from "react";
import type { Asset } from "./types/asset";
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  NetworkError,
} from "./services/assetService";

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("使用中");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const loadAssets = async () => {
    try {
      const data = await getAssets(search, filterStatus);
      setAssets(data);
      setLoadError(null);
      setSyncError(null);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSyncError(null);

    try {
      if (editingId === null) {
        await createAsset({ name, status });
      } else {
        await updateAsset(editingId, {
          name,
          status,
        });
      }
    } catch (error) {
      console.error(error);

      if (error instanceof NetworkError) {
        setSubmitError(error.message);
      } else {
        setSubmitError(
          editingId === null ? "Failed to create asset" : "Failed to update asset"
        );
      }

      return;
    }

    try {
      const data = await getAssets(search, filterStatus);
      setAssets(data);

      setName("");
      setStatus("使用中");
      setEditingId(null);
      setSubmitError(null);
      setSyncError(null);
    } catch (error) {
      console.error(error);
      setSyncError("Asset saved, but failed to refresh the asset list.");
    }
  };

  const handleEditClick = (asset: Asset) => {
    setEditingId(asset.id);
    setName(asset.name);
    setStatus(asset.status);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setStatus("使用中");
    setSubmitError(null);
    setSyncError(null);
  };

  const handleDeleteClick = async (assetId: number) => {
    const confirmed = window.confirm("確定要刪除這個 Asset 嗎？");

    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setSyncError(null);

    try {
      await deleteAsset(assetId);
    } catch (error) {
      console.error(error);

      if (error instanceof NetworkError) {
        setDeleteError(error.message);
      } else {
        setDeleteError("Failed to delete asset");
      }

      return;
    }

    try {
      const data = await getAssets(search, filterStatus);
      setAssets(data);
    } catch (error) {
      console.error(error);
      setSyncError("Asset deleted, but failed to refresh the asset list.");
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (loadError) {
    return (
      <div>
        <p>{loadError}</p>
        <button onClick={loadAssets}>重新載入</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Asset Management System</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
        />

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="使用中">使用中</option>
          <option value="閒置">閒置</option>
          <option value="維修中">維修中</option>
        </select>

        <button type="submit">
          {editingId === null ? "新增資產" : "儲存修改"}
        </button>

        {editingId !== null && (
          <button type="button" onClick={handleCancelEdit}>
            取消編輯
          </button>
        )}

        {submitError && <p>{submitError}</p>}
      </form>

      {syncError && (
        <div>
          <p>{syncError}</p>
          <button type="button" onClick={loadAssets}>
            重新載入
          </button>
        </div>
      )}

      {deleteError && <p>{deleteError}</p>}

      <div>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜尋名稱"
        />

        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
        >
          <option value="">全部</option>
          <option value="使用中">使用中</option>
          <option value="閒置">閒置</option>
          <option value="維修中">維修中</option>
        </select>

        <button type="button" onClick={loadAssets}>
          搜尋
        </button>
      </div>

      {assets.map((asset) => (
        <div key={asset.id}>
          <p>ID: {asset.id}</p>
          <p>Name: {asset.name}</p>
          <p>Status: {asset.status}</p>

          <button onClick={() => handleEditClick(asset)}>
            {editingId === asset.id ? "編輯中" : "編輯"}
          </button>

          <button onClick={() => handleDeleteClick(asset.id)}>
            刪除
          </button>
        </div>
      ))}
    </div>
  );
}

export default App;