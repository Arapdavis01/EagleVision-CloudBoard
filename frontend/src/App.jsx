import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<h1 style={{ color: 'white', padding: 20 }}>App Loaded Successfully</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
