import { useEffect, useState } from "react";
import type { Asset } from "./types/asset";
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  login,
  logout,
  getCurrentUser,
  NetworkError,
  type User,
} from "./services/assetService";


function getStatusBadgeClass(status: string): string {
  if (status === "使用中") {
    return "status-badge status-active";
  }

  if (status === "閒置") {
    return "status-badge status-idle";
  }

  if (status === "維修中") {
    return "status-badge status-maintenance";
  }

  return "status-badge";
}




function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);




  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);




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
    const checkAuth = async () => {
      try {
        const data = await getCurrentUser();
        setCurrentUser(data.user);
      } catch (error) {
        console.error(error);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };




    checkAuth();
  }, []);




  useEffect(() => {
    if (currentUser) {
      loadAssets();
    }
  }, [currentUser]);




  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setLoginLoading(true);




    try {
      const data = await login(username, password);
      setCurrentUser(data.user);
      setPassword("");
    } catch (error) {
      console.error(error);
      setLoginError(error instanceof Error ? error.message : "Failed to login");
    } finally {
      setLoginLoading(false);
    }
  };




  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    } finally {
      setCurrentUser(null);
    }
  };




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




  if (authLoading) {
    return <p>Loading...</p>;
  }




  if (!currentUser) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">Asset Management System</h1>
          <p className="login-subtitle">Welcome Back</p>




          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>




            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>




            <button type="submit" className="login-button" disabled={loginLoading}>
              {loginLoading ? "Logging in..." : "Login"}
            </button>




            {loginError && <p className="login-error">{loginError}</p>}
          </form>




          <p className="login-footer">Internal Asset Management Portal</p>
        </div>
      </div>
    );
  }




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
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-header-title">Asset Management System</span>
        </div>



        <div className="app-header-right">
          <span className="app-header-user">{currentUser.username}</span>
          <button type="button" className="logout-button" onClick={handleLogout}>
            登出
          </button>
        </div>
      </header>



      <main className="app-main">
        <div className="dashboard-header">
          <h2 className="dashboard-title">Asset Dashboard</h2>
          <p className="dashboard-subtitle">Manage and monitor company assets</p>
        </div>



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




        <div className="toolbar-section">
          <h3 className="toolbar-title">Assets</h3>
          <p className="toolbar-subtitle">Search and filter your assets</p>


          <div className="search-toolbar">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assets..."
              className="search-input"
              aria-label="Search assets"
            />


            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="filter-select"
              aria-label="Filter by status"
            >
              <option value="">全部</option>
              <option value="使用中">使用中</option>
              <option value="閒置">閒置</option>
              <option value="維修中">維修中</option>
            </select>


            <button type="button" className="search-button" onClick={loadAssets}>
              搜尋
            </button>
          </div>
        </div>




        {assets.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No assets found</p>
            <p className="empty-state-subtitle">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="asset-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Asset Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.id}</td>
                    <td>{asset.name}</td>
                    <td>
                      <span className={getStatusBadgeClass(asset.status)}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="action-button edit-button"
                        onClick={() => handleEditClick(asset)}
                      >
                        {editingId === asset.id ? "編輯中" : "編輯"}
                      </button>

                      <button
                        type="button"
                        className="action-button delete-button"
                        onClick={() => handleDeleteClick(asset.id)}
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}




export default App;