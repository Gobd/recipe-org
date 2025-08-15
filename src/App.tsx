import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
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
      </Routes>
    </Router>
  );
}

export default App;
