import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import IngredientList from '../../components/IngredientList/IngredientList';
import styles from './IngredientsPage.css';
import Header from '../../ui/Header/Header';
import { ingredientsAPI } from '../../api/ingredients';
import { authAPI } from '../../api/auth';

const IngredientsPage = () => {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Проверка авторизации
  useEffect(() => {
    const checkAuth = async () => {
      const savedLogin = localStorage.getItem('isLoggedIn');
      if (savedLogin === 'true') {
        try {
          const tokenCheck = await authAPI.verifyToken();
          if (tokenCheck.valid) {
            setIsLoggedIn(true);
            loadIngredients();
          } else {
            setError('Необходимо войти в систему для просмотра ингредиентов');
            setIsLoading(false);
          }
        } catch (err) {
          setError('Необходимо войти в систему для просмотра ингредиентов');
          setIsLoading(false);
        }
      } else {
        setError('Необходимо войти в систему для просмотра ингредиентов');
        setIsLoading(false);
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadIngredients = async () => {
    try {
      setIsLoading(true);
      const data = await ingredientsAPI.getAll();
      // Преобразуем данные для отображения
      const formattedIngredients = data.map(ingredient => ({
        id: ingredient.id,
        name: ingredient.name,
        volume: `${ingredient.volume} мл`,
        image_url: ingredient.image_url
      }));
      setIngredients(formattedIngredients);
    } catch (err) {
      console.error('Ошибка загрузки ингредиентов:', err);
      if (err.response?.status === 401) {
        setError('Необходимо войти в систему для просмотра ингредиентов');
        navigate('/');
      } else {
        setError('Не удалось загрузить ингредиенты');
      }
      setIngredients([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.ingredientsPage}>
      <Header />
      {isLoading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#C8A97E' }}>Загрузка ингредиентов...</div>
      ) : error ? (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          margin: '20px',
          borderRadius: '8px',
          border: '1px solid #ff6b6b'
        }}>
          {error}
        </div>
      ) : isLoggedIn ? (
        <IngredientList items={ingredients} onItemsChange={loadIngredients} />
      ) : null}
    </div>
  );
};

export default IngredientsPage;