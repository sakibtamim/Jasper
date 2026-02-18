import { HashRouter, Route, Routes } from 'react-router-dom';

import { Layout } from './layout/Layout';
import { About } from './pages/About';
import { Architecture } from './pages/Architecture';
import { Changelog } from './pages/Changelog';
import { Community } from './pages/Community';
import { ForDevelopers } from './pages/ForDevelopers';
import { Home } from './pages/Home';
import { PluginDirectory } from './pages/PluginDirectory';
import { Showcase } from './pages/Showcase';

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="plugins" element={<PluginDirectory />} />
                    <Route path="developers" element={<ForDevelopers />} />
                    <Route path="architecture" element={<Architecture />} />
                    <Route path="showcase" element={<Showcase />} />
                    <Route path="changelog" element={<Changelog />} />
                    <Route path="about" element={<About />} />
                    <Route path="community" element={<Community />} />
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;
