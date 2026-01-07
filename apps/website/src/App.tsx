import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./layout/Layout";
import { Home } from "./pages/Home";
import { PluginDirectory } from "./pages/PluginDirectory";
import { ForDevelopers } from "./pages/ForDevelopers";
import { Architecture } from "./pages/Architecture";
import { Showcase } from "./pages/Showcase";
import { Changelog } from "./pages/Changelog";
import { About } from "./pages/About";
import { Community } from "./pages/Community";

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
