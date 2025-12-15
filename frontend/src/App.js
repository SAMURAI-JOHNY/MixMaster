import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage/MainPage';
import IngredientsPage from './pages/IngredientsPage/IngredientsPage';
import CreateRecipePage from './pages/CreateRecipePage/CreateRecipePage';
import RecipePage from './pages/RecipePage/RecipePage';
import MyPreparedPage from './pages/MyPreparedPage/MyPreparedPage';
import EditCocktailPage from './pages/EditCocktailPage/EditCocktailPage';
import EditRecipePage from './pages/EditRecipePage/EditRecipePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/ingredients" element={<IngredientsPage />} />
        <Route path="/create-recipe" element={<CreateRecipePage />} />
        <Route path="/recipe/:id" element={<RecipePage />} />
        <Route path="/edit-cocktail/:id" element={<EditCocktailPage />} />
        <Route path="/edit-recipe/:id" element={<EditRecipePage />} />
        <Route path="/my-prepared" element={<MyPreparedPage />} />
      </Routes>
    </Router>
  );
}

export default App;