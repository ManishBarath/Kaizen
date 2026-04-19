import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Auth } from './pages/Auth';
import { MonthlyTracker } from './pages/MonthlyTracker';
import { GoalsTracker } from './pages/GoalsTracker';
import { Whiteboard } from './pages/Whiteboard';
import { DailyJournal } from './pages/DailyJournal';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userId = localStorage.getItem('USER_ID');
  if (!userId) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

function App() {
  // Replace this with your actual Google Client ID if you have one
  const googleClientId = "773276806319-bgep30mjed3dn9dl3m79kum6j864kuoj.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/monthly" replace />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route 
            path="/dashboard" 
            element={<Navigate to="/monthly" replace />}
          />
          
          <Route 
            path="/goals" 
            element={
              <ProtectedRoute>
                <GoalsTracker />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/monthly" 
            element={
              <ProtectedRoute>
                <MonthlyTracker />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/whiteboard" 
            element={
              <ProtectedRoute>
                <Whiteboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/daily" 
            element={
              <ProtectedRoute>
                <DailyJournal />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
