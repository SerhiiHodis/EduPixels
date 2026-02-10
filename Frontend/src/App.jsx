import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage';
import TopicsPage from './pages/TopicsPage';

/**
 * App - Головний компонент додатку
 * 
 * Налаштування роутингу:
 * - / - Landing Page
 * - /profile - Profile Page
 * - /topics/:id - Topics Page (Course View)
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/topics/:id" element={<TopicsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
