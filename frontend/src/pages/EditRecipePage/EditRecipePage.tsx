// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './EditRecipePage.css';
import { Header } from '../../ui/Header/Header';
import { recipesAPI } from '../../api/recipes';
import { ingredientsAPI } from '../../api/ingredients';
import { authAPI } from '../../api/auth';
import { Seo } from '../../components/Seo/Seo';
import Plus from '../../assets/ingr_button.svg';

const EditRecipePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [recipe, setRecipe] = useState({
    type: 'Свой рецепт',
    description: '',
    cocktail_id: null,
    ingredients: [],
  });

  const loadIngredients = async () => {
    try {
      const data = await ingredientsAPI.getAll();
      setAvailableIngredients(data);
    } catch (err) {
      console.error('Ошибка загрузки ингредиентов:', err);
      if (err.response?.status === 401) {
        setError('Необходимо войти в систему');
        navigate('/');
      }
    }
  };

  // Проверка авторизации и роли
  useEffect(() => {
    const checkAuth = async () => {
      const savedLogin = localStorage.getItem('isLoggedIn');
      if (savedLogin === 'true') {
        try {
          const tokenCheck = await authAPI.verifyToken();
          if (tokenCheck.valid) {
            setIsLoggedIn(true);
            const role = tokenCheck.role ?? null;
            setUserRole(role);

            if (role !== 'бармен') {
              setError('Только бармены могут редактировать рецепты');
              setTimeout(() => navigate('/'), 2000);
              return;
            }

            loadIngredients();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Загрузка данных рецепта
  useEffect(() => {
    const loadRecipe = async () => {
      try {
        const recipeData = await recipesAPI.getById(id);
        const loadedIngredients =
          recipeData.ingredients && recipeData.ingredients.length > 0
            ? recipeData.ingredients.map((ing) => ({
                ingredient_id: ing.ingredient_id.toString(),
                volume: ing.volume_ml.toString(),
              }))
            : [{ ingredient_id: '', volume: '' }];

        setRecipe({
          type: recipeData.type,
          description: recipeData.description,
          cocktail_id: recipeData.cocktail_id,
          ingredients: loadedIngredients,
        });
      } catch (err) {
        console.error('Ошибка загрузки рецепта:', err);
        setError('Не удалось загрузить данные рецепта');
      }
    };
    if (id && isLoggedIn && userRole === 'бармен') {
      loadRecipe();
    }
  }, [id, isLoggedIn, userRole]);

  const handleInputChange = (field, value) => {
    setRecipe((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    setRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    }));
  };

  const handleAddIngredient = () => {
    setRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_id: '', volume: '' }],
    }));
  };

  const handleRemoveIngredient = (index) => {
    setRecipe((prev) => {
      const newIngredients = prev.ingredients.filter((_, i) => i !== index);
      if (newIngredients.length === 0) {
        return {
          ...prev,
          ingredients: [{ ingredient_id: '', volume: '' }],
        };
      }
      return {
        ...prev,
        ingredients: newIngredients,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!recipe.description.trim()) {
        setError('Описание рецепта обязательно');
        setIsLoading(false);
        return;
      }

      const validIngredients = recipe.ingredients.filter(
        (ing) => ing.ingredient_id && ing.volume && parseInt(ing.volume) > 0,
      );

      if (validIngredients.length === 0) {
        setError('Добавьте хотя бы один ингредиент');
        setIsLoading(false);
        return;
      }

      await recipesAPI.update(id, {
        type: recipe.type,
        description: recipe.description,
      });

      await recipesAPI.updateIngredients(
        id,
        validIngredients.map((ing) => ({
          ingredient_id: parseInt(ing.ingredient_id),
          volume_ml: parseInt(ing.volume),
        })),
      );

      alert('Рецепт успешно обновлен!');
      const cocktailId = recipe.cocktail_id;
      if (cocktailId) {
        navigate(`/recipe/${cocktailId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Ошибка обновления рецепта:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      setError('Ошибка при обновлении рецепта: ' + errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn || userRole !== 'бармен') {
    return (
      <div className="edit-recipe-page">
        <Seo title="Редактирование рецепта" noindex description="Служебная страница MixMaster." />
        <Header />
        <div className="edit-recipe-container">
          <div className="error-message">{error || 'Доступ запрещен'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-recipe-page">
      <Seo title="Редактирование рецепта" noindex description="Служебная страница MixMaster." />
      <Header />
      <div className="edit-recipe-container">
        <div className="edit-recipe-content">
          <h1 className="edit-recipe-title">Редактировать рецепт</h1>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="edit-recipe-form">
            <div className="form-group">
              <label htmlFor="description">Описание рецепта</label>
              <textarea
                id="description"
                value={recipe.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows="6"
                required
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label>Ингредиенты</label>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="ingredient-row">
                    <select
                      value={ingredient.ingredient_id}
                      onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="">Выберите ингредиент</option>
                      {availableIngredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Объем (мл)"
                      value={ingredient.volume}
                      onChange={(e) => handleIngredientChange(index, 'volume', e.target.value)}
                      className="form-input volume-input"
                      min="1"
                      required
                    />

                    <button type="button" onClick={() => handleRemoveIngredient(index)} className="remove-ingredient-btn">
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ color: '#616161', padding: '10px' }}>
                  Нет ингредиентов. Добавьте ингредиенты ниже.
                </div>
              )}

              <button type="button" onClick={handleAddIngredient} className="add-ingredient-btn">
                <img src={Plus} alt="Добавить" />
                Добавить ингредиент
              </button>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="cancel-button"
                disabled={isLoading}
              >
                Отмена
              </button>
              <button type="submit" className="submit-button" disabled={isLoading}>
                {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditRecipePage;

