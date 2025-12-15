import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CocktailCard } from '../../ui/CocktailCard/CocktailCard';
import CardImage from '../../assets/ingredient.svg';
import { Button } from '../../ui/Button/Button';
import './MainPage.css';
import { Header } from '../../ui/Header/Header';
import SearchIcon from '../../assets/search.svg';
import FilterIcon from '../../assets/filter.svg';
import { cocktailsAPI } from '../../api/cocktails';
import { authAPI } from '../../api/auth';
import { uploadAPI } from '../../api/upload';

const MainPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [cocktails, setCocktails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Проверка авторизации и загрузка роли
  useEffect(() => {
    const checkAuth = async () => {
      const savedLogin = localStorage.getItem('isLoggedIn');
      if (savedLogin === 'true') {
        try {
          const tokenCheck = await authAPI.verifyToken();
          if (tokenCheck.valid) {
            setIsLoggedIn(true);
            const profile = await authAPI.getProfile();
            setUserRole(profile.role);
          }
        } catch (err) {
          setIsLoggedIn(false);
        }
      }
    };
    checkAuth();
  }, []);

  // Загрузка коктейлей с бэкенда
  useEffect(() => {
    const loadCocktails = async () => {
      try {
        setIsLoading(true);
        const data = await cocktailsAPI.getAll();
        // Преобразуем данные для отображения
        const formattedCocktails = data.map(cocktail => ({
          id: cocktail.id,
          name: cocktail.name,
          price: '0', // Цена не хранится в бэкенде, можно добавить позже
          description: cocktail.description || '',
          ingredients: '', // Ингредиенты нужно получать из рецептов
          image: cocktail.image_url ? uploadAPI.getImageUrl(cocktail.image_url) : CardImage
        }));
        setCocktails(formattedCocktails);
      } catch (err) {
        console.error('Ошибка загрузки коктейлей:', err);
        setError('Не удалось загрузить коктейли');
        setCocktails([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCocktails();
  }, []);

  const filteredCocktails = useMemo(() => {
    let result = cocktails;
    
    // Поиск только по названию
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(cocktail => 
        cocktail.name.toLowerCase().includes(query)
      );
    }
    
    // Сортировка
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'custom') {
      // По умолчанию - без сортировки (как пришли с сервера)
      result = [...result];
    }
    
    return result;
  }, [searchQuery, sortBy, cocktails]);

  const handleCocktailClick = (cocktail) => {
    navigate(`/recipe/${cocktail.id}`);
  };

  const handleCreateRecipe = () => {
    navigate('/create-recipe');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const toggleFilterMenu = () => {
    setShowFilterMenu(!showFilterMenu);
  };

  const handleSortChange = (sortType) => {
    setSortBy(sortType);
    setShowFilterMenu(false);
  };

  return (
    <div className="main-page">
      <Header/>
      
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
              <button 
                className="clear-search-btn"
                onClick={clearSearch}
                title="Очистить поиск"
              >
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
                <button 
                  className="close-filter-menu"
                  onClick={() => setShowFilterMenu(false)}
                >
                  ×
                </button>
              </div>
              <div className="filter-options">
                <button 
                  className={`filter-option ${sortBy === 'custom' ? 'active' : ''}`}
                  onClick={() => handleSortChange('custom')}
                >
                  <div className="filter-option-check">
                    {sortBy === 'custom' && '✓'}
                  </div>
                  <span>По умолчанию</span>
                </button>
                <button 
                  className={`filter-option ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => handleSortChange('name')}
                >
                  <div className="filter-option-check">
                    {sortBy === 'name' && '✓'}
                  </div>
                  <span>По названию (А-Я)</span>
                </button>
              </div>
              {sortBy !== 'custom' && (
                <button 
                  className="clear-filter-btn"
                  onClick={() => handleSortChange('custom')}
                >
                  Сбросить сортировку
                </button>
              )}
            </div>
          )}
          
          {searchQuery && (
            <div className="search-results-info">
              Найдено: {filteredCocktails.length} коктейлей
              {sortBy !== 'custom' && (
                <span className="sort-info">
                  • Сортировка: {sortBy === 'name' ? 'по названию' : 'по цене'}
                </span>
              )}
            </div>
          )}
        </div>
        
        {isLoggedIn && userRole === 'бармен' && (
          <Button onClick={handleCreateRecipe}>
            Создать рецепт
          </Button>
        )}
      </div>

      <div className="cocktails-section">
        {isLoading ? (
          <div className="loading">Загрузка коктейлей...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="cocktails-grid">
            {filteredCocktails.length === 0 ? (
              <div className="no-results">
                {searchQuery ? 'Коктейли не найдены' : 'Нет коктейлей'}
              </div>
            ) : (
              filteredCocktails.map((cocktail) => (
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
        <p>Всего коктейлей: {filteredCocktails.length}</p>
      </footer>
    </div>
  );
};

export default MainPage;