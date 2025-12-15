import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '../../ui/Header/Header';
import { Button } from '../../ui/Button/Button';
import './IngredientList.css';
import DeleteIcon from '../../assets/delete.svg';
import PlusIcon from '../../assets/plus.svg';
import MinusIcon from '../../assets/minus.svg';
import CloseIcon from '../../assets/close.svg';
import SearchIcon from '../../assets/search.svg';
import FilterIcon from '../../assets/filter.svg';
import DefaultIngredientIcon from '../../assets/ingredient.svg';
import { ingredientsAPI } from '../../api/ingredients';
import { uploadAPI } from '../../api/upload';

const IngredientList = ({ items: initialItems, onItemsChange }) => {
  const [items, setItems] = useState(initialItems);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', volume: '', image_url: null, imageFile: null, imagePreview: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIngredient, setNewIngredient] = useState({ name: '', volume: 0, imageFile: null, imagePreview: null });

  // Синхронизируем items с initialItems при изменении пропсов
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filteredItems = useMemo(() => {
    let result = items;
    
    // Поиск только по названию
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }
    
    // Сортировка
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'volume') {
      result = [...result].sort((a, b) => {
        const volumeA = parseInt(a.volume) || 0;
        const volumeB = parseInt(b.volume) || 0;
        return volumeB - volumeA;
      });
    } else if (sortBy === 'custom') {
      // По умолчанию - без сортировки (как пришли с сервера)
      result = [...result];
    }
    
    return result;
  }, [items, searchQuery, sortBy]);

  const handleAddClick = () => {
    setShowCreateModal(true);
  };

  const handleCreateIngredient = async () => {
    if (!newIngredient.name.trim() || newIngredient.volume <= 0) {
      alert('Заполните название и объем ингредиента');
      return;
    }

    try {
      setIsLoading(true);
      let imageUrl = null;
      
      // Загружаем изображение, если оно выбрано
      if (newIngredient.imageFile) {
        const uploadResult = await uploadAPI.uploadIngredientImage(newIngredient.imageFile);
        imageUrl = uploadResult.url;
      }

      // Создаем ингредиент через API
      const created = await ingredientsAPI.create({
        name: newIngredient.name,
        volume: newIngredient.volume,
        image_url: imageUrl
      });

      // Обновляем список через callback, который перезагрузит данные с сервера
      if (onItemsChange) {
        onItemsChange();
      } else {
        // Если callback не передан, обновляем локально
        const newItem = {
          id: created.id,
          name: created.name,
          volume: `${created.volume} мл`,
          image_url: created.image_url
        };
        setItems(prev => [...prev, newItem]);
      }
      
      // Сбрасываем форму
      setNewIngredient({ name: '', volume: 0, imageFile: null, imagePreview: null });
      setShowCreateModal(false);
    } catch (err) {
      alert('Ошибка создания ингредиента: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (index) => {
    const item = filteredItems[index];
    const realIndex = items.findIndex(i => i.id === item.id);
    if (realIndex === -1) return;
    
    setEditingIndex(realIndex);
    // Извлекаем число из строки "XXX мл"
    const volumeStr = item.volume.replace(' мл', '').trim();
    setEditForm({
      name: item.name,
      volume: parseInt(volumeStr) || 0,
      image_url: item.image_url,
      imageFile: null,
      imagePreview: null
    });
  };

  const handleSaveClick = async (index) => {
    const item = filteredItems[index];
    const realIndex = items.findIndex(i => i.id === item.id);
    if (realIndex === -1) return;
    
    try {
      setIsLoading(true);
      let imageUrl = editForm.image_url;
      
      // Если выбрано новое изображение, загружаем его
      if (editForm.imageFile) {
        const uploadResult = await uploadAPI.uploadIngredientImage(editForm.imageFile);
        imageUrl = uploadResult.url;
      }

      // Обновляем ингредиент через API
      if (item.id) {
        await ingredientsAPI.update(item.id, {
          name: editForm.name,
          volume: editForm.volume,
          image_url: imageUrl
        });

        // Обновляем список через callback, который перезагрузит данные с сервера
        if (onItemsChange) {
          await onItemsChange();
        } else {
          // Если callback не передан, обновляем локально
          const newItems = [...items];
          newItems[realIndex] = {
            ...item,
            name: editForm.name,
            volume: `${editForm.volume} мл`,
            image_url: imageUrl
          };
          setItems(newItems);
        }
      }
      
      setEditingIndex(null);
    } catch (err) {
      alert('Ошибка обновления ингредиента: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClick = () => {
    setEditingIndex(null);
  };

  const handleDeleteClick = async (index) => {
    const item = filteredItems[index];
    const realIndex = items.findIndex(i => i.id === item.id);
    if (realIndex === -1) return;
    
    if (!item.id) {
      // Локальный элемент без ID - просто удаляем
      setItems(prev => prev.filter((_, i) => i !== realIndex));
      if (editingIndex === realIndex) setEditingIndex(null);
      return;
    }

    if (!window.confirm(`Удалить ингредиент "${item.name}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await ingredientsAPI.delete(item.id);
      if (onItemsChange) {
        await onItemsChange();
      } else {
        const newItems = items.filter((_, i) => i !== realIndex);
        setItems(newItems);
      }
      if (editingIndex === realIndex) setEditingIndex(null);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      if (err.response?.status === 400 && errorMessage.includes('used in recipes')) {
        alert('Нельзя удалить ингредиент, который используется в рецептах!');
      } else {
        alert('Ошибка удаления ингредиента: ' + errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e, isNew = false) => {
    const file = e.target.files[0];
    if (file) {
      if (isNew) {
        setNewIngredient(prev => ({ ...prev, imageFile: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewIngredient(prev => ({ ...prev, imagePreview: reader.result }));
        };
        reader.readAsDataURL(file);
      } else {
        // Создаем предпросмотр для редактирования
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditForm(prev => ({ 
            ...prev, 
            imageFile: file,
            imagePreview: reader.result 
          }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleVolumeChange = async (index, delta) => {
    const item = filteredItems[index];
    const realIndex = items.findIndex(i => i.id === item.id);
    if (realIndex === -1 || !item.id) return;
    
    try {
      setIsLoading(true);
      const currentVolume = parseInt(item.volume.replace(' мл', '').trim()) || 0;
      const newVolume = Math.max(0, currentVolume + delta);
      
      // Обновляем через API
      if (delta > 0) {
        await ingredientsAPI.increaseVolume(item.id, delta);
      } else {
        await ingredientsAPI.decreaseVolume(item.id, Math.abs(delta));
      }
      
      // Обновляем список через callback, который перезагрузит данные с сервера
      if (onItemsChange) {
        await onItemsChange();
      } else {
        // Если callback не передан, обновляем локально
        const newItems = [...items];
        newItems[realIndex] = {
          ...item,
          volume: `${newVolume} мл`
        };
        setItems(newItems);
      }
    } catch (err) {
      alert('Ошибка изменения объема: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const toggleFilterMenu = () => {
    setShowFilterMenu(!showFilterMenu);
  };

  const handleSortChange = (sortType) => {
    setSortBy(sortType);
    setShowFilterMenu(false);
  };

  return (
    <div className="ingredient-list">
      
      <div className="list-header">
        <div className="search-container">
          <div className="search-input-wrapper">
            <img src={SearchIcon} alt="Поиск" className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Поиск ингредиентов..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button 
                className="clear-search-btn"
                onClick={clearSearch}
                title="Очистить поиск"
              >
                ×
              </button>
            )}
            
            <button 
              className={`filter-btn ${showFilterMenu ? 'active' : ''}`}
              onClick={toggleFilterMenu}
              title="Фильтры и сортировка"
            >
              <img src={FilterIcon} alt="Фильтр" />
            </button>
          </div>
          
          {showFilterMenu && (
            <div className="filter-menu">
              <div className="filter-menu-header">
                <span>Сортировка</span>
                <button 
                  className="close-filter-menu"
                  onClick={() => setShowFilterMenu(false)}
                >
                  ×
                </button>
              </div>
              <div className="filter-options">
                <button 
                  className={`filter-option ${sortBy === 'custom' ? 'active' : ''}`}
                  onClick={() => handleSortChange('custom')}
                >
                  <div className="filter-option-check">
                    {sortBy === 'custom' && '✓'}
                  </div>
                  <span>По умолчанию</span>
                </button>
                <button 
                  className={`filter-option ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => handleSortChange('name')}
                >
                  <div className="filter-option-check">
                    {sortBy === 'name' && '✓'}
                  </div>
                  <span>По названию (А-Я)</span>
                </button>
                <button 
                  className={`filter-option ${sortBy === 'volume' ? 'active' : ''}`}
                  onClick={() => handleSortChange('volume')}
                >
                  <div className="filter-option-check">
                    {sortBy === 'volume' && '✓'}
                  </div>
                  <span>По объему (убывание)</span>
                </button>
              </div>
              {sortBy !== 'custom' && (
                <button 
                  className="clear-filter-btn"
                  onClick={() => handleSortChange('custom')}
                >
                  Сбросить сортировку
                </button>
              )}
            </div>
          )}
          
          {searchQuery && (
            <div className="search-results-info">
              Найдено: {filteredItems.length} ингредиентов
              {sortBy !== 'custom' && (
                <span className="sort-info">
                  • Сортировка: {sortBy === 'name' ? 'по названию' : 'по объему'}
                </span>
              )}
            </div>
          )}
        </div>
        <Button onClick={handleAddClick} className="add-button">
          Добавить ингредиент
        </Button>
      </div>
      
      <div className="items-container">
        {filteredItems.length === 0 ? (
          <div className="no-results">
            {searchQuery ? 'Ингредиенты не найдены' : 'Нет ингредиентов'}
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const realIndex = items.findIndex(i => i.id === item.id);
            const isEditing = editingIndex === realIndex;
            
            return (
              <div key={realIndex} className="item-card">
                <div className="item-content">
                  {/* Иконка ингредиента */}
                  <div className="item-icon-section">
                    <img 
                      src={item.image_url ? uploadAPI.getImageUrl(item.image_url) : DefaultIngredientIcon} 
                      alt={item.name} 
                      className="item-icon" 
                    />
                  </div>
                  
                  <div className="item-name-and-volume">
                    <div className="item-name-section">
                      <div className="item-name">{item.name}</div>
                      <img 
                        src={DeleteIcon} 
                        alt="Удалить" 
                        className="delete-icon" 
                        onClick={() => handleDeleteClick(index)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="item-volume-under-name">
                      <div className="item-volume">{item.volume}</div>
                    </div>
                  </div>
                  
                  <div className="item-controls-section">
                    <div className="volume-controls-horizontal">
                        <img src={MinusIcon} onClick={() => handleVolumeChange(index, -50)} className="volume-icon" />
                      
                      <div className="volume-label">50 мл</div>

                        <img src={PlusIcon} onClick={() => handleVolumeChange(index, 50)} className="volume-icon" />
                    </div>
                    
                    <div className="edit-button-wrapper">
                      {isEditing ? (
                        <div className="edit-mode-buttons">
                          <button 
                            className="action-btn save-btn"
                            onClick={() => handleSaveClick(index)}
                            title="Сохранить"
                          >
                            ✓
                          </button>
                          <button 
                            className="action-btn cancel-btn"
                            onClick={handleCancelClick}
                            title="Отменить"
                          >
                            <img src={CloseIcon} alt="Отменить" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditClick(index)}
                        >
                          Изменить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Форма редактирования */}
                {isEditing && (
                  <div className="edit-form">
                    <input
                      type="text"
                      className="edit-input"
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Название ингредиента"
                    />
                    <div className="edit-volume-row">
                      <input
                        type="number"
                        className="edit-volume-input"
                        value={editForm.volume}
                        onChange={(e) => handleInputChange('volume', parseInt(e.target.value) || 0)}
                        placeholder="Объем"
                      />
                      <span className="volume-unit">мл</span>
                    </div>
                    <div className="edit-image-upload">
                      <label className="image-upload-label">
                        {editForm.imageFile ? 'Изображение выбрано' : editForm.image_url ? 'Изменить изображение' : 'Загрузить изображение'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, false)}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {editForm.imagePreview && (
                        <img 
                          src={editForm.imagePreview} 
                          alt="Предпросмотр нового изображения" 
                          className="current-image-preview"
                        />
                      )}
                      {!editForm.imagePreview && editForm.image_url && (
                        <img 
                          src={uploadAPI.getImageUrl(editForm.image_url)} 
                          alt="Текущее изображение" 
                          className="current-image-preview"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Модальное окно создания ингредиента */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создать новый ингредиент</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Название ингредиента"
                />
              </div>
              <div className="form-group">
                <label>Объем (мл)</label>
                <input
                  type="number"
                  value={newIngredient.volume}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, volume: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Изображение</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, true)}
                />
                {newIngredient.imagePreview && (
                  <img src={newIngredient.imagePreview} alt="Предпросмотр" className="image-preview" />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">Отмена</button>
              <button onClick={handleCreateIngredient} className="save-btn" disabled={isLoading}>
                {isLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientList;