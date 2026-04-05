// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../ui/Header/Header';
import CocktailImg from '../../assets/ingredient.svg';
import PlusIcon from '../../assets/plus.svg';
import MinusIcon from '../../assets/minus.svg';
import EditIcon from '../../assets/edit.svg';
import DeleteIcon from '../../assets/delete.svg';
import './RecipePage.css';
import { cocktailsAPI } from '../../api/cocktails';
import { recipesAPI } from '../../api/recipes';
import { preparedCocktailsAPI } from '../../api/preparedCocktails';
import { ResolvedImage } from '../../components/ResolvedImage/ResolvedImage';
import { authAPI } from '../../api/auth';

const RecipePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [cocktail, setCocktail] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [portions, setPortions] = useState(1);
  const [isCheckingIngredients, setIsCheckingIngredients] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPrepared, setIsPrepared] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Проверка авторизации
  useEffect(() => {
    const checkAuth = async () => {
      const savedLogin = localStorage.getItem('isLoggedIn');
      if (savedLogin === 'true') {
        try {
          const tokenCheck = await authAPI.verifyToken();
          setIsLoggedIn(tokenCheck.valid);
          if (tokenCheck.valid) {
            try {
              const profile = await authAPI.getProfile();
              setUserRole(profile.role);
            } catch (err) {
              console.error('Ошибка загрузки профиля:', err);
            }
          }
        } catch (err) {
          setIsLoggedIn(false);
        }
      }
    };
    checkAuth();
  }, []);

  // Загрузка данных коктейля и рецептов
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const cocktailData = await cocktailsAPI.getById(id);
        setCocktail(cocktailData);

        // Загружаем рецепты для этого коктейля
        const recipesData = await recipesAPI.getByCocktail(id);
        setRecipes(recipesData);

        if (recipesData.length > 0) {
          setSelectedRecipe(recipesData[0]);
        }
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  // Проверяем, был ли коктейль приготовлен (если пользователь авторизован)
  useEffect(() => {
    const checkPrepared = async () => {
      if (isLoggedIn && id) {
        try {
          const preparedCheck = await preparedCocktailsAPI.checkIfPrepared(id);
          setIsPrepared(preparedCheck.is_prepared);
        } catch (err) {
          console.error('Ошибка проверки приготовления:', err);
        }
      }
    };
    checkPrepared();
  }, [id, isLoggedIn]);

  // Функция для пересчета ингредиентов
  const calculateIngredients = () => {
    if (!selectedRecipe || !selectedRecipe.ingredients || selectedRecipe.ingredients.length === 0) return [];
    return selectedRecipe.ingredients.map((ingredient) => {
      const volume = (ingredient.volume_ml || ingredient.volume || 0) * portions;
      const name =
        ingredient.ingredient?.name || ingredient.name || `Ингредиент ${ingredient.ingredient_id}`;
      return { name, volume, unit: 'мл' };
    });
  };

  const ingredients = selectedRecipe ? calculateIngredients() : [];

  const handleIncrementPortion = () => {
    setPortions((prev) => prev + 1);
  };

  const handleDecrementPortion = () => {
    if (portions > 1) {
      setPortions((prev) => prev - 1);
    }
  };

  const handleRecipeChange = (e) => {
    const selectedId = parseInt(e.target.value);
    const recipe = recipes.find((r) => r.id === selectedId);
    setSelectedRecipe(recipe);
  };

  const handleCheckIngredients = async () => {
    if (!selectedRecipe || !isLoggedIn) {
      if (!isLoggedIn) {
        alert('Необходимо войти в систему для проверки ингредиентов');
      }
      return;
    }

    try {
      setIsCheckingIngredients(true);
      const checkResult = await preparedCocktailsAPI.checkIngredients(selectedRecipe.id, portions);

      if (!checkResult.available) {
        const missingList = checkResult.missing_ingredients
          .map(
            (ing) =>
              `${ing.ingredient_name}: требуется ${ing.required_volume}мл, доступно ${ing.available_volume}мл`,
          )
          .join('\n');
        alert(
          `Недостаточно ингредиентов для ${portions} ${portions === 1 ? 'батча' : 'батчей'}:\n${missingList}`,
        );
      } else {
        alert(`Все ингредиенты в наличии для ${portions} ${portions === 1 ? 'батча' : 'батчей'}!`);
      }
    } catch (err) {
      console.error('Ошибка проверки ингредиентов:', err);
      alert('Ошибка при проверке ингредиентов: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsCheckingIngredients(false);
    }
  };

  const handlePrepareCocktail = async () => {
    if (!selectedRecipe || !isLoggedIn) {
      if (!isLoggedIn) {
        alert('Необходимо войти в систему для приготовления коктейля');
      }
      return;
    }

    if (
      !window.confirm(
        `Приготовить коктейль "${cocktail.name}" в количестве ${portions} ${
          portions === 1 ? 'батча' : 'батчей'
        }? Ингредиенты будут списаны.`,
      )
    ) {
      return;
    }

    try {
      setIsPreparing(true);
      const result = await preparedCocktailsAPI.prepareCocktail(selectedRecipe.id, portions);

      if (result.success) {
        const preparedCheck = await preparedCocktailsAPI.checkIfPrepared(id);
        setIsPrepared(preparedCheck.is_prepared);
        alert(result.message || 'Коктейль успешно приготовлен! Ингредиенты списаны.');
        window.location.reload();
      } else {
        alert(result.message || 'Ошибка при приготовлении коктейля');
      }
    } catch (err) {
      console.error('Ошибка приготовления:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      if (err.response?.status === 400) {
        const missingList =
          err.response?.data?.missing_ingredients
            ?.map(
              (ing) =>
                `${ing.ingredient_name}: требуется ${ing.required_volume}мл, доступно ${ing.available_volume}мл`,
            )
            .join('\n') || '';
        alert(`Недостаточно ингредиентов:\n${missingList || errorMsg}`);
      } else {
        alert('Ошибка при приготовлении коктейля: ' + errorMsg);
      }
    } finally {
      setIsPreparing(false);
    }
  };

  const handleCheckStock = () => {
    navigate('/ingredients');
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return;

    if (
      !window.confirm(
        `Вы уверены, что хотите удалить рецепт "${selectedRecipe.type || 'Рецепт'}"?`,
      )
    ) {
      return;
    }

    try {
      await recipesAPI.delete(selectedRecipe.id);
      alert('Рецепт успешно удален');
      window.location.reload();
    } catch (err) {
      console.error('Ошибка удаления рецепта:', err);
      alert('Ошибка при удалении рецепта: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteCocktail = async () => {
    if (
      !window.confirm(
        `Вы уверены, что хотите удалить коктейль "${cocktail.name}"? Все связанные рецепты также будут удалены. Это действие нельзя отменить.`,
      )
    ) {
      return;
    }

    try {
      await cocktailsAPI.delete(id);
      alert('Коктейль успешно удален');
      navigate('/');
    } catch (err) {
      console.error('Ошибка удаления коктейля:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      alert('Ошибка при удалении коктейля: ' + errorMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="recipe-page">
        <Header />
        <div className="recipe-container">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error || !cocktail) {
    return (
      <div className="recipe-page">
        <Header />
        <div className="recipe-container">
          <div>{error || 'Коктейль не найден'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-page">
      <Header />
      <div className="recipe-container">
        <div className="recipe-header-section">
          <div className="recipe-text-content">
            <div className="cocktail-title-row">
              <h1 className="recipe-title">{cocktail.name}</h1>
              {isLoggedIn && userRole === 'бармен' && (
                <div className="cocktail-actions">
                  <button
                    onClick={() => navigate(`/edit-cocktail/${id}`)}
                    className="cocktail-action-btn edit-cocktail-btn"
                    title="Редактировать коктейль"
                  >
                    <img src={EditIcon} alt="Редактировать" />
                  </button>
                  <button
                    onClick={handleDeleteCocktail}
                    className="cocktail-action-btn delete-cocktail-btn"
                    title="Удалить коктейль"
                  >
                    <img src={DeleteIcon} alt="Удалить" />
                  </button>
                </div>
              )}
            </div>
            <p className="cocktail-description">{cocktail.description || 'Описание отсутствует'}</p>
          </div>
          <div className="recipe-image-content">
            <ResolvedImage
              storageUrl={cocktail.image_url}
              fallbackSrc={CocktailImg}
              alt={cocktail.name}
              className="cocktail-image"
            />
          </div>
        </div>

        <div className="divider"></div>

        <div className="recipe-content">
          <section className="recipe-main">
            <div className="section-title-row">
              <h2 className="section-title">Рецепт</h2>
              {isLoggedIn && userRole === 'бармен' && selectedRecipe && (
                <div className="recipe-actions">
                  <button
                    onClick={() => navigate(`/edit-recipe/${selectedRecipe.id}`)}
                    className="recipe-action-btn edit-recipe-btn"
                    title="Редактировать рецепт"
                  >
                    <img src={EditIcon} alt="Редактировать" />
                  </button>
                  <button
                    onClick={handleDeleteRecipe}
                    className="recipe-action-btn delete-recipe-btn"
                    title="Удалить рецепт"
                  >
                    <img src={DeleteIcon} alt="Удалить" />
                  </button>
                </div>
              )}
            </div>

            {recipes.length > 0 ? (
              <div className="recipe-selector">
                <label htmlFor="recipe-select" className="recipe-select-label">
                  Выберите вариант рецепта:
                </label>
                <select
                  id="recipe-select"
                  className="recipe-select"
                  value={selectedRecipe?.id || ''}
                  onChange={handleRecipeChange}
                >
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.type || `Рецепт ${recipe.id}`}
                    </option>
                  ))}
                </select>
                {selectedRecipe?.description && (
                  <p className="recipe-description">{selectedRecipe.description}</p>
                )}
              </div>
            ) : (
              <div>Рецепты для этого коктейля отсутствуют</div>
            )}
          </section>

          <section>
            <h2 className="section-title">Ингредиенты</h2>
            <div className="recipe-columns">
              <div className="ingredients-column">
                {ingredients.length > 0 ? (
                  <table className="ingredients-table">
                    <tbody>
                      {ingredients.map((ingredient, index) => (
                        <tr key={index}>
                          <td className="ingredient-name">
                            {ingredient.name || `Ингредиент ${index + 1}`}
                          </td>
                          <td className="ingredient-volume">
                            {ingredient.volume} {ingredient.unit || 'мл'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div>Ингредиенты не указаны</div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="section-title">Инструкция по приготовлению</h2>
            <div>
              <p className="preparation-text">
                {selectedRecipe?.description || cocktail.instructions || 'Инструкции по приготовлению отсутствуют'}
              </p>
            </div>
          </section>

          <section>
            <h2 className="section-title">Информация о коктейле</h2>
            <div className="cocktail-info">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">ABV</span>
                  <span className="info-value">{selectedRecipe?.id === 3 ? '0' : '120'}%</span>
                </div>
                <div className="calories-text">
                  <div className="calories-label">Калорийность</div>
                  <div className="calories-value">250 ккал</div>
                </div>
              </div>
            </div>
          </section>

          <section>
            {isPrepared && <div className="prepared-badge">✓ Этот коктейль уже был приготовлен</div>}
            <div className="portions-control">
              <div className="portion-controls-group">
                <img src={MinusIcon} onClick={handleDecrementPortion} alt="Уменьшить" />
                <span className="portions-count">{portions} батч</span>
                <img src={PlusIcon} onClick={handleIncrementPortion} alt="Увеличить" />
              </div>
              <div className="action-buttons-group">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={handleCheckIngredients}
                      disabled={!selectedRecipe || isCheckingIngredients}
                      className="recipe-action-button check-button"
                    >
                      {isCheckingIngredients ? 'Проверка...' : 'Проверить ингредиенты'}
                    </button>
                    <button
                      onClick={handlePrepareCocktail}
                      disabled={!selectedRecipe || isPreparing}
                      className="recipe-action-button prepare-button"
                    >
                      {isPreparing ? 'Приготовление...' : 'Приготовить коктейль'}
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '10px', color: '#C8A97E', fontSize: '14px' }}>
                    Войдите в систему для приготовления коктейля
                  </div>
                )}
                <button onClick={handleCheckStock} className="recipe-action-button stock-button">
                  Проверить остатки
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RecipePage;

