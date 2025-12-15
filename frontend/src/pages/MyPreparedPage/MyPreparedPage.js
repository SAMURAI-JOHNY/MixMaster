import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../ui/Header/Header';
import { Button } from '../../ui/Button/Button';
import { preparedCocktailsAPI } from '../../api/preparedCocktails';
import { authAPI } from '../../api/auth';
import { uploadAPI } from '../../api/upload';
import './MyPreparedPage.css';

const MyPreparedPage = () => {
  const navigate = useNavigate();
  const [preparedCocktails, setPreparedCocktails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const savedLogin = localStorage.getItem('isLoggedIn');
      if (savedLogin === 'true') {
        try {
          const tokenCheck = await authAPI.verifyToken();
          if (tokenCheck.valid) {
            setIsLoggedIn(true);
            loadPreparedCocktails();
          } else {
            navigate('/');
          }
        } catch (err) {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const loadPreparedCocktails = async () => {
    try {
      setIsLoading(true);
      const data = await preparedCocktailsAPI.getMyPreparedCocktails();
      setPreparedCocktails(data);
    } catch (err) {
      console.error('Ошибка загрузки приготовленных коктейлей:', err);
      setError('Не удалось загрузить список приготовленных коктейлей');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCocktailClick = (cocktailId) => {
    navigate(`/recipe/${cocktailId}`);
  };

  if (!isLoggedIn) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="my-prepared-page">
        <Header />
        <div className="my-prepared-container">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-prepared-page">
      <Header />
      <div className="my-prepared-container">
        <div className="my-prepared-header">
          <h1>Мои приготовленные коктейли</h1>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {preparedCocktails.length === 0 ? (
          <div className="empty-state">
            <p>Вы еще не приготовили ни одного коктейля</p>
            <Button onClick={() => navigate('/')}>
              Перейти к коктейлям
            </Button>
          </div>
        ) : (
          <div className="prepared-cocktails-grid">
            {preparedCocktails.map((item) => (
              <div 
                key={item.id} 
                className="prepared-cocktail-card"
                onClick={() => handleCocktailClick(item.cocktail_id)}
              >
                <div className="prepared-cocktail-image">
                  {item.cocktail_image_url ? (
                    <img 
                      src={uploadAPI.getImageUrl(item.cocktail_image_url)} 
                      alt={item.cocktail_name}
                    />
                  ) : (
                    <div className="no-image">Нет изображения</div>
                  )}
                </div>
                <div className="prepared-cocktail-info">
                  <h3>{item.cocktail_name}</h3>
                  <p className="prepared-date">
                    Приготовлен: {new Date(item.prepared_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPreparedPage;

