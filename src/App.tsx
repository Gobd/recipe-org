import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { HomePage } from '@/components/HomePage';
import { RecipePage } from '@/components/RecipePage';
import '@/index.css';

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipe/:id" element={<RecipePage />} />
      </Routes>
    </Router>
  );
}

export default App;
