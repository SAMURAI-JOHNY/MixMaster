import './CocktailCard.css';
import { Button } from '../Button/Button';

export const CocktailCard = ({ drink }) => {
    const handleOrder = () => {
      alert(`Заказан: ${drink.name} за ${drink.price} ₽`);
    };

  return (
      <div className="drink-card">
        <div className="drink-card__image-wrapper">
          <img 
            src={drink.image} 
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