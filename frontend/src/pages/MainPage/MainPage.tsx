// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CocktailCard } from '../../ui/CocktailCard/CocktailCard';
import CardImage from '../../assets/ingredient.svg';
import { Button } from '../../ui/Button/Button';
import './MainPage.css';
import { Header } from '../../ui/Header/Header';
import SearchIcon from '../../assets/search.svg';
import FilterIcon from '../../assets/filter.svg';
import { cocktailsAPI } from '../../api/cocktails';
import { authAPI } from '../../api/auth';
import { Seo } from '../../components/Seo/Seo';

const MainPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [cocktails, setCocktails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const searchQuery = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const hasRecipes = searchParams.get('has_recipes') ?? '';
  const sortBy = searchParams.get('sort_by') ?? 'name';
  const sortOrder = searchParams.get('sort_order') ?? 'asc';
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '12');

  // Проверка авторизации и загрузка роли
  useEffect(() => {
    const checkAuth = async () => {
      const savedLogin = localStorage.getItem('isLoggedIn');
      if (savedLogin === 'true') {
        try {
          const tokenCheck = await authAPI.verifyToken();
          if (tokenCheck.valid) {
            setIsLoggedIn(true);
            setUserRole(tokenCheck.role ?? null);
          }
        } catch (err) {
          setIsLoggedIn(false);
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const loadCocktails = async () => {
      try {
        setIsLoading(true);
        const data = await cocktailsAPI.query({
          q: searchQuery || undefined,
          category: category || undefined,
          has_recipes: hasRecipes ? hasRecipes === 'true' : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          page,
          limit,
        });
        const formattedCocktails = data.items.map((cocktail) => ({
          id: cocktail.id,
          name: cocktail.name,
          price: '0', // Цена не хранится в бэкенде, можно добавить позже
          description: cocktail.description || '',
          ingredients: '', // Ингредиенты нужно получать из рецептов
          imageUrl: cocktail.image_url ?? null,
          fallbackImage: CardImage,
        }));
        setCocktails(formattedCocktails);
        setTotal(data.total);
        setPages(data.pages);
      } catch (err) {
        console.error('Ошибка загрузки коктейлей:', err);
        setError('Не удалось загрузить коктейли');
        setCocktails([]);
        setTotal(0);
        setPages(0);
      } finally {
        setIsLoading(false);
      }
    };
    loadCocktails();
  }, [searchQuery, category, hasRecipes, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    cocktailsAPI
      .getCategories()
      .then((res) => setCategories(res.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const handleCocktailClick = (cocktail) => {
    navigate(`/recipe/${cocktail.id}`);
  };

  const handleCreateRecipe = () => {
    navigate('/create-recipe');
  };

  const handleSearchChange = (e) => {
    const next = new URLSearchParams(searchParams);
    next.set('q', e.target.value);
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.set('page', '1');
    setSearchParams(next);
  };

  const toggleFilterMenu = () => {
    setShowFilterMenu(!showFilterMenu);
  };

  const handleSortChange = (sortType) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort_by', sortType);
    next.set('page', '1');
    setSearchParams(next);
    setShowFilterMenu(false);
  };

  const handleSortOrderChange = (order) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort_order', order);
    next.set('page', '1');
    setSearchParams(next);
    setShowFilterMenu(false);
  };

  const handleCategoryChange = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('category', value);
    else next.delete('category');
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleHasRecipesChange = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('has_recipes');
    else next.set('has_recipes', value);
    next.set('page', '1');
    setSearchParams(next);
  };

  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    next.set('page', '1');
    next.set('limit', String(limit));
    setSearchParams(next);
    setShowFilterMenu(false);
  };

  const canonicalPath =
    searchQuery || category || hasRecipes || page > 1 || sortBy !== 'name' || sortOrder !== 'asc'
      ? `/?${searchParams.toString()}`
      : '/';

  return (
    <div className="main-page">
      <Seo
        title="Каталог коктейлей"
        description="MixMaster — каталог коктейлей с поиском, фильтрами и рецептами. Подберите напиток и откройте карточку с ингредиентами."
        canonicalPath={canonicalPath === '/' ? '/' : canonicalPath}
      />
      <Header />

      <main className="main-page-content">
      <div className="main-actions">
        <div className="search-container">
          <div className="search-input-wrapper">
            <img src={SearchIcon} alt="Поиск" className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Поиск коктейлей..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={clearSearch} title="Очистить поиск">
                ×
              </button>
            )}

            <button
              className={`filter-btn ${showFilterMenu ? 'active' : ''}`}
              onClick={toggleFilterMenu}
              title="Фильтры и сортировка"
            >
              <img src={FilterIcon} alt="Фильтр" />
            </button>
          </div>

          {showFilterMenu && (
            <div className="filter-menu">
              <div className="filter-menu-header">
                <span>Сортировка</span>
                <button className="close-filter-menu" onClick={() => setShowFilterMenu(false)}>
                  ×
                </button>
              </div>
              <div className="filter-options">
                <button
                  className={`filter-option ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => handleSortChange('name')}
                >
                  <div className="filter-option-check">{sortBy === 'name' && '✓'}</div>
                  <span>Сортировать по названию</span>
                </button>
                <button
                  className={`filter-option ${sortBy === 'created_at' ? 'active' : ''}`}
                  onClick={() => handleSortChange('created_at')}
                >
                  <div className="filter-option-check">{sortBy === 'created_at' && '✓'}</div>
                  <span>По дате создания</span>
                </button>
                <button
                  className={`filter-option ${sortOrder === 'asc' ? 'active' : ''}`}
                  onClick={() => handleSortOrderChange('asc')}
                >
                  <div className="filter-option-check">{sortOrder === 'asc' && '✓'}</div>
                  <span>Порядок: по возрастанию</span>
                </button>
                <button
                  className={`filter-option ${sortOrder === 'desc' ? 'active' : ''}`}
                  onClick={() => handleSortOrderChange('desc')}
                >
                  <div className="filter-option-check">{sortOrder === 'desc' && '✓'}</div>
                  <span>Порядок: по убыванию</span>
                </button>
              </div>
              <div style={{ marginTop: '8px' }}>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="search-input"
                >
                  <option value="">Все категории</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginTop: '8px' }}>
                <select
                  value={hasRecipes || 'all'}
                  onChange={(e) => handleHasRecipesChange(e.target.value)}
                  className="search-input"
                >
                  <option value="all">Любые</option>
                  <option value="true">Только с рецептами</option>
                  <option value="false">Только без рецептов</option>
                </select>
              </div>
              <button className="clear-filter-btn" onClick={clearAllFilters}>
                Сбросить фильтры
              </button>
            </div>
          )}

          {searchQuery && (
            <div className="search-results-info">
              Найдено: {total} коктейлей
              <span className="sort-info">• Страница: {page}/{Math.max(pages, 1)}</span>
            </div>
          )}
        </div>

        {isLoggedIn && userRole === 'бармен' && (
          <Button onClick={handleCreateRecipe}>Создать рецепт</Button>
        )}
      </div>

      <h1 className="main-page-heading">Каталог коктейлей</h1>

      <div className="cocktails-section">
        {isLoading ? (
          <div className="loading">Загрузка коктейлей...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="cocktails-grid">
            {cocktails.length === 0 ? (
              <div className="no-results">{searchQuery ? 'Коктейли не найдены' : 'Нет коктейлей'}</div>
            ) : (
              cocktails.map((cocktail) => (
                <div
                  key={cocktail.id}
                  onClick={() => handleCocktailClick(cocktail)}
                  className="cocktail-item"
                >
                  <CocktailCard drink={cocktail} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <footer className="main-footer">
        <p>Всего коктейлей: {total}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
          <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            Назад
          </button>
          <span>
            {page} / {Math.max(pages, 1)}
          </span>
          <button disabled={pages === 0 || page >= pages} onClick={() => goToPage(page + 1)}>
            Вперед
          </button>
        </div>
      </footer>
      </main>
    </div>
  );
};

export default MainPage;

