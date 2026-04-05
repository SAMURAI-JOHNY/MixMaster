import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../ui/Header/Header';
import { Seo } from '../../components/Seo/Seo';
import './NotFoundPage.css';

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-page">
      <Seo
        title="Страница не найдена"
        description="Запрашиваемая страница в каталоге MixMaster отсутствует."
        noindex
      />
      <Header />
      <main className="not-found-main">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-text">Такой страницы нет. Вернитесь в каталог или проверьте адрес.</p>
        <Link to="/" className="not-found-link">
          На главную
        </Link>
      </main>
    </div>
  );
};

export default NotFoundPage;
