import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StockingGuide from './pages/StockingGuide';
import NewList from './pages/NewList';
import ActiveList from './pages/ActiveList';
import ShareList from './pages/ShareList';
import History from './pages/History';
import Settings from './pages/Settings';
import { useAppState } from './hooks/useAppState';

export default function App() {
  const { state, loading, updateSettings, addList, updateList, addLog } = useAppState();

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard state={state} />} />
          <Route path="/stocking-guide" element={<StockingGuide />} />
          <Route
            path="/list/new"
            element={<NewList state={state} onAdd={addList} />}
          />
          <Route
            path="/list/:id"
            element={<ActiveList state={state} loading={loading} onUpdate={updateList} onLog={addLog} />}
          />
          <Route
            path="/list/:id/share"
            element={<ShareList state={state} />}
          />
          <Route path="/history" element={<History state={state} />} />
          <Route
            path="/settings"
            element={<Settings state={state} onUpdate={updateSettings} />}
          />
          <Route
            path="*"
            element={
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold mb-2">Page not found</h2>
                <a href="/" className="text-sams hover:underline">← Back to Dashboard</a>
              </div>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
