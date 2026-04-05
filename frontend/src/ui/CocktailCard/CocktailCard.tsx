import React from 'react';

import { ResolvedImage } from '../../components/ResolvedImage/ResolvedImage';
import './CocktailCard.css';

type Drink = {
  id?: number;
  name: string;
  price?: string | number;
  /** Сырой URL хранилища (в т.ч. s3://) или null */
  imageUrl?: string | null;
  fallbackImage: string;
};

export const CocktailCard = ({ drink }: { drink: Drink }) => {
  return (
    <div className="drink-card">
      <div className="drink-card__image-wrapper">
        <ResolvedImage
          storageUrl={drink.imageUrl}
          fallbackSrc={drink.fallbackImage}
          alt={drink.name}
          className="drink-card__image"
        />
      </div>
      <div className="drink-card__content">
        <h3 className="drink-card__title">{drink.name}</h3>
      </div>
    </div>
  );
};

