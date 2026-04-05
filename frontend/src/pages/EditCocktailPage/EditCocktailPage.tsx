// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './EditCocktailPage.css';
import { Header } from '../../ui/Header/Header';
import { cocktailsAPI } from '../../api/cocktails';
import { recipesAPI } from '../../api/recipes';
import { ResolvedImage } from '../../components/ResolvedImage/ResolvedImage';
import { FileUploadZone } from '../../components/FileUploadZone/FileUploadZone';
import { AttachedFilesList } from '../../components/AttachedFilesList/AttachedFilesList';
import { uploadAPI } from '../../api/upload';
import { authAPI } from '../../api/auth';
import { Seo } from '../../components/Seo/Seo';
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
  const [attachmentsRefresh, setAttachmentsRefresh] = useState(0);
  const [cocktail, setCocktail] = useState({
    name: '',
    description: '',
    instructions: '',
    image_url: null,
    photo: null,
    photoPreview: null,
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
            const role = tokenCheck.role ?? null;
            setUserRole(role);
            if (role !== 'бармен') {
              setError('Только бармены могут редактировать коктейли');
              setTimeout(() => navigate('/'), 2000);
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
          photoPreview: null,
        });

        const recipesData = await recipesAPI.getByCocktail(id);
        setRecipes(
          recipesData.map((recipe) => ({
            ...recipe,
            ingredients:
              recipe.ingredients?.map((ing) => ({
                ingredient_id: ing.ingredient_id.toString(),
                volume: ing.volume_ml.toString(),
                id: ing.id,
              })) || [],
          })),
        );
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные коктейля');
      }
    };
    if (id && isLoggedIn && userRole === 'бармен') {
      loadData();
    }
  }, [id, isLoggedIn, userRole]);

  const handleRemovePhoto = () => {
    setCocktail((prev) => {
      if (prev.photoPreview && prev.photo) {
        try {
          URL.revokeObjectURL(prev.photoPreview);
        } catch {
          /* ignore */
        }
      }
      return {
        ...prev,
        photo: null,
        photoPreview: null,
        image_url: null,
      };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCocktail((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let imageUrl = cocktail.image_url;
      let uploadedMeta = null;

      if (cocktail.photo) {
        uploadedMeta = await uploadAPI.uploadCocktailImage(cocktail.photo);
        imageUrl = uploadedMeta.url;
      } else if (cocktail.image_url) {
        if (
          cocktail.image_url.startsWith('http://') ||
          cocktail.image_url.startsWith('https://')
        ) {
          const urlObj = new URL(cocktail.image_url);
          imageUrl = urlObj.pathname;
        } else {
          imageUrl = cocktail.image_url;
        }
      }

      await cocktailsAPI.update(id, {
        name: cocktail.name,
        description: cocktail.description,
        instructions: cocktail.instructions,
        image_url: imageUrl,
      });

      if (uploadedMeta?.url) {
        await uploadAPI.registerAttachment({
          storage_url: uploadedMeta.url,
          object_key: uploadedMeta.object_key,
          entity_type: 'cocktail',
          entity_id: parseInt(id, 10),
          original_filename: cocktail.photo?.name,
          content_type: cocktail.photo?.type,
          file_size: cocktail.photo?.size,
        });
        setAttachmentsRefresh((k) => k + 1);
      }

      for (const recipe of recipes) {
        const validIngredients = recipe.ingredients.filter(
          (ing) => ing.ingredient_id && ing.volume && parseInt(ing.volume) > 0,
        );

        await recipesAPI.update(recipe.id, {
          description: recipe.description,
        });

        await recipesAPI.updateIngredients(
          recipe.id,
          validIngredients.map((ing) => ({
            ingredient_id: parseInt(ing.ingredient_id),
            volume_ml: parseInt(ing.volume),
          })),
        );
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
        <Seo title="Редактирование коктейля" noindex description="Служебная страница MixMaster." />
        <Header />
        <div className="edit-cocktail-container">
          <div className="error-message">{error || 'Доступ запрещен'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-cocktail-page">
      <Seo title="Редактирование коктейля" noindex description="Служебная страница MixMaster." />
      <Header />
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
                {cocktail.photo ? (
                  <div className="photo-preview">
                    <img src={cocktail.photoPreview} alt="Preview" className="photo-preview-image" />
                    <button type="button" onClick={handleRemovePhoto} className="remove-photo-button">
                      <img src={DeleteButton} alt="Удалить" />
                    </button>
                  </div>
                ) : cocktail.image_url ? (
                  <div className="photo-preview">
                    <ResolvedImage
                      storageUrl={cocktail.image_url}
                      fallbackSrc={ImageImg}
                      alt="Текущее фото"
                      className="photo-preview-image"
                    />
                    <button type="button" onClick={handleRemovePhoto} className="remove-photo-button">
                      <img src={DeleteButton} alt="Удалить" />
                    </button>
                  </div>
                ) : (
                  <div className="photo-upload-label" style={{ flexDirection: 'column', gap: 12 }}>
                    <img src={ImageImg} alt="Загрузить фото" />
                    <span>Загрузить фото</span>
                  </div>
                )}
                <FileUploadZone
                  label={
                    cocktail.photo || cocktail.image_url ? 'Выбрать другой файл' : 'Выбрать файл'
                  }
                  deferUpload
                  resetKey={`${cocktail.image_url ?? ''}-${Boolean(cocktail.photo)}`}
                  onFileSelected={(file) => {
                    setError('');
                    setCocktail((prev) => ({
                      ...prev,
                      photo: file,
                      photoPreview: URL.createObjectURL(file),
                    }));
                  }}
                  onError={(msg) => setError(msg)}
                  disabled={isLoading}
                />
              </div>
              {id ? (
                <AttachedFilesList
                  entityType="cocktail"
                  entityId={parseInt(id, 10)}
                  refreshKey={attachmentsRefresh}
                />
              ) : null}
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

export default EditCocktailPage;

