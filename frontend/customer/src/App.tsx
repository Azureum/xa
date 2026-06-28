import { Navigate, Route, Routes } from "react-router-dom";

import { ChatView } from "./routes/ChatView";

function App() {
  return (
    <Routes>
      <Route path="/b/:businessSlug/:locationSlug" element={<ChatView />} />
      <Route path="*" element={<Navigate to="/b/demo/main" replace />} />
    </Routes>
  );
}

export default App;
