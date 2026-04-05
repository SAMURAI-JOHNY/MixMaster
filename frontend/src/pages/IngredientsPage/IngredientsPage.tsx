// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import IngredientList from '../../components/IngredientList/IngredientList';
import styles from './IngredientsPage.css';
import Header from '../../ui/Header/Header';
import { ingredientsAPI } from '../../api/ingredients';
import { authAPI } from '../../api/auth';
import { Seo } from '../../components/Seo/Seo';

const DEFAULT_LIMIT = 20;

const IngredientsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ingredients, setIngredients] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const loadIngredients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
      const limit = Math.min(
        100,
        Math.max(1, Number(searchParams.get('limit') ?? String(DEFAULT_LIMIT))),
      );
      const qRaw = searchParams.get('q')?.trim();
      const minRaw = searchParams.get('min_volume');
      const maxRaw = searchParams.get('max_volume');
      const sortBy = searchParams.get('sort_by') === 'volume' ? 'volume' : 'name';
      const sortOrder = searchParams.get('sort_order') === 'desc' ? 'desc' : 'asc';

      const data = await ingredientsAPI.query({
        q: qRaw || undefined,
        min_volume: minRaw !== null && minRaw !== '' ? parseInt(minRaw, 10) : undefined,
        max_volume: maxRaw !== null && maxRaw !== '' ? parseInt(maxRaw, 10) : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      });

      const formattedIngredients = data.items.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        volume: `${ingredient.volume} мл`,
        image_url: ingredient.image_url,
      }));
      setIngredients(formattedIngredients);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Ошибка загрузки ингредиентов:', err);
      if (err.response?.status === 401) {
        setError('Необходимо войти в систему для просмотра ингредиентов');
        navigate('/');
      } else {
        setError('Не удалось загрузить ингредиенты');
      }
      setIngredients([]);
      setTotal(0);
      setPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      const savedLogin = localStorage.getItem('isLoggedIn');
      if (savedLogin === 'true') {
        try {
          const tokenCheck = await authAPI.verifyToken();
          if (tokenCheck.valid) {
            setIsLoggedIn(true);
            setUserRole(tokenCheck.role ?? null);
          } else {
            setError('Необходимо войти в систему для просмотра ингредиентов');
            setIsLoading(false);
          }
        } catch {
          setError('Необходимо войти в систему для просмотра ингредиентов');
          setIsLoading(false);
        }
      } else {
        setError('Необходимо войти в систему для просмотра ингредиентов');
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadIngredients();
  }, [isLoggedIn, loadIngredients]);

  const listQuery = {
    q: searchParams.get('q') ?? '',
    min_volume: searchParams.get('min_volume') ?? '',
    max_volume: searchParams.get('max_volume') ?? '',
    sort_by: searchParams.get('sort_by') === 'volume' ? 'volume' : 'name',
    sort_order: searchParams.get('sort_order') === 'desc' ? 'desc' : 'asc',
    page: Math.max(1, Number(searchParams.get('page') ?? '1')),
    limit: Math.min(
      100,
      Math.max(1, Number(searchParams.get('limit') ?? String(DEFAULT_LIMIT))),
    ),
    total,
    pages,
  };

  const applyListQuery = (patch, options = {}) => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      const filterKeys = ['q', 'min_volume', 'max_volume', 'sort_by', 'sort_order', 'limit'];
      const shouldResetPage =
        options.resetPage === true ||
        filterKeys.some((k) => Object.prototype.hasOwnProperty.call(patch, k));

      Object.entries(patch).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '') {
          n.delete(key);
        } else {
          n.set(key, String(val));
        }
      });

      if (shouldResetPage && !Object.prototype.hasOwnProperty.call(patch, 'page')) {
        n.set('page', '1');
      }
      return n;
    });
  };

  return (
    <div className={styles.ingredientsPage}>
      <Seo
        title="Склад ингредиентов"
        description="Учёт ингредиентов MixMaster — только для авторизованных пользователей."
        noindex
      />
      <Header />
      <div className={styles.ingredientsPageInner}>
        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#C8A97E' }}>Загрузка ингредиентов...</div>
        ) : error ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#ff6b6b',
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              margin: '20px',
              borderRadius: '8px',
              border: '1px solid #ff6b6b',
            }}
          >
            {error}
          </div>
        ) : isLoggedIn ? (
          <>
            <h1 className={styles.ingredientsPageTitle}>Склад ингредиентов</h1>
            <IngredientList
              items={ingredients}
              listQuery={listQuery}
              applyListQuery={applyListQuery}
              onItemsChange={loadIngredients}
              showAttachmentsList={userRole === 'бармен'}
            />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default IngredientsPage;
