import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { DeweyAdminPage } from '@/components/DeweyAdminPage';
import { DeweyBrowsePage } from '@/components/DeweyBrowsePage';
import { HomePage } from '@/components/HomePage';
import { RecipePage } from '@/components/RecipePage';
import { TagsPage } from '@/components/TagsPage';
import '@/index.css';

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipe/:id" element={<RecipePage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/dewey" element={<DeweyBrowsePage />} />
        <Route path="/dewey-admin" element={<DeweyAdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
