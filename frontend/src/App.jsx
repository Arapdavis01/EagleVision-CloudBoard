import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AlertProvider>
          <Routes>
            <Route path="*" element={<h1 style={{ color: 'white', padding: 20 }}>Providers OK</h1>} />
          </Routes>
        </AlertProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
