import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const MainPage = lazy(() => import('./pages/MainPage/MainPage'));
const IngredientsPage = lazy(() => import('./pages/IngredientsPage/IngredientsPage'));
const CreateRecipePage = lazy(() => import('./pages/CreateRecipePage/CreateRecipePage'));
const RecipePage = lazy(() => import('./pages/RecipePage/RecipePage'));
const MyPreparedPage = lazy(() => import('./pages/MyPreparedPage/MyPreparedPage'));
const EditCocktailPage = lazy(() => import('./pages/EditCocktailPage/EditCocktailPage'));
const EditRecipePage = lazy(() => import('./pages/EditRecipePage/EditRecipePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/NotFoundPage'));

function App(): React.ReactElement {
  return (
    <Router>
      <Suspense fallback={<div className="app-suspense-fallback">Загрузка…</div>}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
          <Route path="/create-recipe" element={<CreateRecipePage />} />
          <Route path="/recipe/:id" element={<RecipePage />} />
          <Route path="/edit-cocktail/:id" element={<EditCocktailPage />} />
          <Route path="/edit-recipe/:id" element={<EditRecipePage />} />
          <Route path="/my-prepared" element={<MyPreparedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
