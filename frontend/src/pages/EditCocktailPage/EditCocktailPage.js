import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './EditCocktailPage.css';
import { Header } from '../../ui/Header/Header';
import { cocktailsAPI } from '../../api/cocktails';
import { recipesAPI } from '../../api/recipes';
import { uploadAPI } from '../../api/upload';
import { authAPI } from '../../api/auth';
import ImageImg from '../../assets/img.svg';
import DeleteButton from '../../assets/delete.svg';

const EditCocktailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [cocktail, setCocktail] = useState({
    name: '',
    description: '',
    instructions: '',
    image_url: null,
    photo: null,
    photoPreview: null
  });

  // Проверка авторизации и роли
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
              if (profile.role !== 'бармен') {
                setError('Только бармены могут редактировать коктейли');
                setTimeout(() => navigate('/'), 2000);
              }
            } catch (err) {
              console.error('Ошибка загрузки профиля:', err);
            }
          }
        } catch (err) {
          setIsLoggedIn(false);
        }
      } else {
        setError('Необходимо войти в систему');
        setTimeout(() => navigate('/'), 2000);
      }
    };
    checkAuth();
  }, [navigate]);


  // Загрузка данных коктейля и рецептов
  useEffect(() => {
    const loadData = async () => {
      try {
        const cocktailData = await cocktailsAPI.getById(id);
        setCocktail({
          name: cocktailData.name || '',
          description: cocktailData.description || '',
          instructions: cocktailData.instructions || '',
          image_url: cocktailData.image_url || null,
          photo: null,
          photoPreview: cocktailData.image_url ? uploadAPI.getImageUrl(cocktailData.image_url) : null
        });

        // Загружаем рецепты
        const recipesData = await recipesAPI.getByCocktail(id);
        setRecipes(recipesData.map(recipe => ({
          ...recipe,
          ingredients: recipe.ingredients?.map(ing => ({
            ingredient_id: ing.ingredient_id.toString(),
            volume: ing.volume_ml.toString(),
            id: ing.id
          })) || []
        })));
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные коктейля');
      }
    };
    if (id && isLoggedIn && userRole === 'бармен') {
      loadData();
    }
  }, [id, isLoggedIn, userRole]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCocktail(prev => ({
        ...prev,
        photo: file,
        photoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleRemovePhoto = () => {
    setCocktail(prev => ({
      ...prev,
      photo: null,
      photoPreview: null
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCocktail(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let imageUrl = cocktail.image_url;

      // Если выбрано новое изображение, загружаем его
      if (cocktail.photo) {
        const uploadResult = await uploadAPI.uploadCocktailImage(cocktail.photo);
        imageUrl = uploadResult.url;
      } else if (cocktail.image_url) {
        // Если изображение не менялось, но image_url содержит полный URL, извлекаем относительный путь
        // Проверяем, является ли это полным URL
        if (cocktail.image_url.startsWith('http://') || cocktail.image_url.startsWith('https://')) {
          // Извлекаем относительный путь из полного URL
          const urlObj = new URL(cocktail.image_url);
          imageUrl = urlObj.pathname; // Получаем путь типа "/api/v1/upload/cocktails/..."
        } else {
          // Уже относительный путь
          imageUrl = cocktail.image_url;
        }
      }

      // Обновляем коктейль
      await cocktailsAPI.update(id, {
        name: cocktail.name,
        description: cocktail.description,
        instructions: cocktail.instructions,
        image_url: imageUrl
      });

      // Обновляем рецепты с ингредиентами
      for (const recipe of recipes) {
        const validIngredients = recipe.ingredients.filter(
          ing => ing.ingredient_id && ing.volume && parseInt(ing.volume) > 0
        );

        // Обновляем описание рецепта
        await recipesAPI.update(recipe.id, {
          description: recipe.description
        });

        // Обновляем ингредиенты рецепта (удаляем старые и добавляем новые)
        await recipesAPI.updateIngredients(recipe.id, validIngredients.map(ing => ({
          ingredient_id: parseInt(ing.ingredient_id),
          volume_ml: parseInt(ing.volume)
        })));
      }

      alert('Коктейль успешно обновлен!');
      navigate(`/recipe/${id}`);
    } catch (err) {
      console.error('Ошибка обновления коктейля:', err);
      setError('Ошибка при обновлении коктейля: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn || userRole !== 'бармен') {
    return (
      <div className="edit-cocktail-page">
        <Header/>
        <div className="edit-cocktail-container">
          <div className="error-message">{error || 'Доступ запрещен'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-cocktail-page">
      <Header/>
      <div className="edit-cocktail-container">
        <div className="edit-cocktail-content">
          <h1 className="edit-cocktail-title">Редактировать коктейль</h1>
          
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="edit-cocktail-form">
            <div className="form-group">
              <label htmlFor="name">Название коктейля</label>
              <input
                type="text"
                id="name"
                name="name"
                value={cocktail.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Описание</label>
              <textarea
                id="description"
                name="description"
                value={cocktail.description}
                onChange={handleChange}
                rows="4"
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="instructions">Инструкции по приготовлению</label>
              <textarea
                id="instructions"
                name="instructions"
                value={cocktail.instructions}
                onChange={handleChange}
                rows="6"
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label>Фотография коктейля</label>
              <div className="photo-upload-container">
                <input
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="photo-input"
                  style={{ display: 'none' }}
                />
                {cocktail.photoPreview ? (
                  <div className="photo-preview">
                    <label htmlFor="photo" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'block' }}>
                      <img src={cocktail.photoPreview} alt="Preview" className="photo-preview-image" />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="remove-photo-button"
                    >
                      <img src={DeleteButton} alt="Удалить" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="photo" className="photo-upload-label">
                    <img src={ImageImg} alt="Загрузить фото" />
                    <span>Загрузить фото</span>
                  </label>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(`/recipe/${id}`)}
                className="cancel-button"
                disabled={isLoading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditCocktailPage;

