import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import WorkersPage from './pages/WorkersPage';
import QueuesPage from './pages/QueuesPage';
import StatsPage from './pages/StatsPage';
import CachePage from './pages/CachePage';
import LogsPage from './pages/LogsPage';

export default function App() {
    return (
        <BrowserRouter basename="/react-dashboard">
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/workers" replace />} />
                    <Route path="workers" element={<WorkersPage />} />
                    <Route path="queues" element={<QueuesPage />} />
                    <Route path="stats" element={<StatsPage />} />
                    <Route path="cache" element={<CachePage />} />
                    <Route path="logs" element={<LogsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
