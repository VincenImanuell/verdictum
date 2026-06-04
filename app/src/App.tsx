import { Routes, Route } from "react-router-dom";
import Landing from "./Landing";
import AppView from "./AppView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppView />} />
    </Routes>
  );
}
