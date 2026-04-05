// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateRecipePage.css';
import { Header } from '../../ui/Header/Header';
import { Button } from '../../ui/Button/Button';
import ImageImg from '../../assets/img.svg';
import DeleteButton from '../../assets/delete.svg';
import { cocktailsAPI } from '../../api/cocktails';
import { ingredientsAPI } from '../../api/ingredients';
import { recipesAPI } from '../../api/recipes';
import { ResolvedImage } from '../../components/ResolvedImage/ResolvedImage';
import { FileUploadZone } from '../../components/FileUploadZone/FileUploadZone';
import { uploadAPI } from '../../api/upload';
import { authAPI } from '../../api/auth';
import { Seo } from '../../components/Seo/Seo';
import Plus from '../../assets/ingr_button.svg';

const CreateRecipePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [recipe, setRecipe] = useState({
    name: '',
    calories: '',
    description: '',
    preparation: '',
    photoStorageUrl: null,
    photoObjectKey: null,
    ingredients: [{ ingredient_id: '', volume: '' }],
    photoPreview: null,
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
              setError('Только бармены могут создавать рецепты');
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

  const handleInputChange = (field, value) => {
    setRecipe((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCocktailPhotoUploaded = (result, file) => {
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setRecipe((prev) => ({
        ...prev,
        photoStorageUrl: result.url,
        photoObjectKey: result.object_key ?? null,
        photoPreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setRecipe((prev) => ({
      ...prev,
      photoStorageUrl: null,
      photoObjectKey: null,
      photoPreview: null,
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...recipe.ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value,
    };
    setRecipe((prev) => ({
      ...prev,
      ingredients: updatedIngredients,
    }));
  };

  const addIngredient = () => {
    setRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_id: '', volume: '' }],
    }));
  };

  const removeIngredient = (index) => {
    if (recipe.ingredients.length > 1) {
      setRecipe((prev) => ({
        ...prev,
        ingredients: prev.ingredients.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe.name.trim()) {
      setError('Введите название коктейля');
      return;
    }

    if (!recipe.description.trim()) {
      setError('Введите описание рецепта');
      return;
    }

    if (recipe.ingredients.some((ing) => !ing.ingredient_id || !ing.volume)) {
      setError('Выберите все ингредиенты и укажите их объемы');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let cocktail;
      try {
        const cocktails = await cocktailsAPI.search({ name: recipe.name });
        if (cocktails.length > 0) {
          cocktail = cocktails[0];
          if (recipe.photoStorageUrl) {
            await cocktailsAPI.update(cocktail.id, {
              name: recipe.name,
              description: recipe.description,
              instructions: recipe.preparation,
              image_url: recipe.photoStorageUrl,
            });
            cocktail = { ...cocktail, image_url: recipe.photoStorageUrl };
          }
        } else {
          cocktail = await cocktailsAPI.create({
            name: recipe.name,
            description: recipe.description,
            instructions: recipe.preparation,
            image_url: recipe.photoStorageUrl,
          });
        }
      } catch (err) {
        throw new Error('Ошибка при создании коктейля: ' + (err.response?.data?.detail || err.message));
      }

      if (recipe.photoStorageUrl) {
        try {
          await uploadAPI.registerAttachment({
            storage_url: recipe.photoStorageUrl,
            object_key: recipe.photoObjectKey,
            entity_type: 'cocktail',
            entity_id: cocktail.id,
          });
        } catch (regErr) {
          console.warn('Регистрация вложения:', regErr);
        }
      }

      const recipeIngredients = [];
      for (const ing of recipe.ingredients) {
        const volume = parseInt(ing.volume);
        if (isNaN(volume) || volume <= 0) {
          const ingredient = availableIngredients.find((i) => i.id === parseInt(ing.ingredient_id));
          const ingredientName = ingredient ? ingredient.name : 'неизвестный';
          throw new Error(`Неверный объем для ингредиента "${ingredientName}"`);
        }

        if (!ing.ingredient_id) {
          throw new Error('Пожалуйста, выберите все ингредиенты из списка');
        }

        recipeIngredients.push({
          ingredient_id: parseInt(ing.ingredient_id),
          volume_ml: volume,
        });
      }

      await recipesAPI.create({
        type: 'Свой рецепт',
        description: recipe.description,
        cocktail_id: cocktail.id,
        ingredients: recipeIngredients,
      });

      alert('Рецепт успешно создан!');
      navigate('/');
    } catch (err) {
      console.error('Ошибка сохранения рецепта:', err);
      setError(err.message || 'Произошла ошибка при сохранении рецепта');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn || userRole !== 'бармен') {
    return (
      <div className="create-recipe-page">
        <Seo title="Создание рецепта" description="Служебная страница MixMaster для барменов." noindex />
        <Header />
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            margin: '20px',
            borderRadius: '8px',
            border: '1px solid #ff6b6b',
          }}
        >
          {error || 'Только бармены могут создавать рецепты'}
        </div>
      </div>
    );
  }

  return (
    <div className="create-recipe-page">
      <Seo title="Создание рецепта" description="Служебная страница MixMaster для барменов." noindex />
      <Header />
      {error && (
        <div
          style={{
            color: 'red',
            padding: '10px',
            margin: '10px',
            backgroundColor: '#ffe6e6',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}
      <div className="create-recipe-content">
        <h1 className="create-recipe-title">Новый рецепт</h1>
        <section className="photo-section">
          <div className="photo-upload-container">
            {recipe.photoPreview || recipe.photoStorageUrl ? (
              <div className="photo-preview">
                {recipe.photoPreview ? (
                  <img
                    src={recipe.photoPreview}
                    alt="Предпросмотр"
                    className="photo-preview-image"
                  />
                ) : (
                  <ResolvedImage
                    storageUrl={recipe.photoStorageUrl}
                    fallbackSrc={ImageImg}
                    alt="Предпросмотр"
                    className="photo-preview-image"
                  />
                )}
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="remove-photo-button"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M13.3335 4L3.3335 14M3.3335 4L13.3335 14"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="photo-upload-area">
                <div className="upload-placeholder">
                  <img src={ImageImg} alt="Загрузить изображение" />
                </div>
                <FileUploadZone
                  label="Выбрать изображение коктейля"
                  upload={(f) => uploadAPI.uploadCocktailImage(f)}
                  onSuccess={handleCocktailPhotoUploaded}
                  onError={(msg) => setError(msg)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </section>

        <section className="basic-info-section">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Название</label>
              <input
                type="text"
                value={recipe.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="form-input"
                placeholder="Введите название"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Калорийность</label>
              <input
                type="text"
                value={recipe.calories}
                onChange={(e) => handleInputChange('calories', e.target.value)}
                className="form-input"
                placeholder="ккал"
              />
            </div>
          </div>
        </section>

        <section className="description-section">
          <label className="form-label">Описание напитка</label>
          <textarea
            value={recipe.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="form-textarea"
            placeholder="Опишите вкус и особенности коктейля"
            rows="3"
          />
        </section>

        <section className="preparation-section">
          <label className="form-label">Описание приготовления</label>
          <textarea
            value={recipe.preparation}
            onChange={(e) => handleInputChange('preparation', e.target.value)}
            className="form-textarea"
            placeholder="Опишите шаги приготовления"
            rows="4"
          />
        </section>

        <section className="ingredients-section">
          <div className="section-header">
            <h2 className="section-title">Ингредиенты</h2>
            <img onClick={addIngredient} src={Plus} alt="Добавить ингредиент" />
          </div>

          <table className="ingredients-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Объём на 1 батч, мл</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ingredient, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={ingredient.ingredient_id}
                      onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)}
                      className="form-input-without"
                      style={{ width: '100%', padding: '8px', background: '#0A0A0A', color: 'white', border: 'none' }}
                    >
                      <option value="">Выберите ингредиент</option>
                      {availableIngredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={ingredient.volume}
                      onChange={(e) => handleIngredientChange(index, 'volume', e.target.value)}
                      className="form-input volume-input"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  <td>
                    <img
                      src={DeleteButton}
                      onClick={() => removeIngredient(index)}
                      className="table-action-button"
                      alt="Удалить"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="create-recipe-actions">
          <Button onClick={handleSaveRecipe} disabled={isLoading}>
            {isLoading ? 'Сохранение...' : 'Сохранить рецепт'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateRecipePage;

