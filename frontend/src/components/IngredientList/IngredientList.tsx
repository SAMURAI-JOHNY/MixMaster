// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button/Button';
import './IngredientList.css';
import DeleteIcon from '../../assets/delete.svg';
import PlusIcon from '../../assets/plus.svg';
import MinusIcon from '../../assets/minus.svg';
import CloseIcon from '../../assets/close.svg';
import SearchIcon from '../../assets/search.svg';
import FilterIcon from '../../assets/filter.svg';
import DefaultIngredientIcon from '../../assets/ingredient.svg';
import { ResolvedImage } from '../ResolvedImage/ResolvedImage';
import { AttachedFilesList } from '../AttachedFilesList/AttachedFilesList';
import { FileUploadZone } from '../FileUploadZone/FileUploadZone';
import { ingredientsAPI } from '../../api/ingredients';
import { uploadAPI } from '../../api/upload';

/**
 * @param {object} props
 * @param {Array} props.items — текущая страница с сервера
 * @param {object} props.listQuery — q, min_volume, max_volume, sort_by, sort_order, page, limit, total, pages
 * @param {function} props.applyListQuery — (patch, options?) => void — обновление URL (query params)
 * @param {function} props.onItemsChange — перезагрузка списка
 */
const IngredientList = ({
  items,
  listQuery,
  applyListQuery,
  onItemsChange,
  showAttachmentsList = false,
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    volume: '',
    image_url: null,
    imageFile: null,
    imagePreview: null,
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [draftMinVol, setDraftMinVol] = useState('');
  const [draftMaxVol, setDraftMaxVol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachmentsRefresh, setAttachmentsRefresh] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalKey, setCreateModalKey] = useState(0);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    volume: 0,
    imageFile: null,
    imagePreview: null,
  });

  useEffect(() => {
    setDraftMinVol(listQuery.min_volume);
    setDraftMaxVol(listQuery.max_volume);
  }, [listQuery.min_volume, listQuery.max_volume]);

  const handleAddClick = () => {
    setCreateModalKey((k) => k + 1);
    setShowCreateModal(true);
  };

  const setImageFileWithPreview = (file, isNew) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isNew) {
        setNewIngredient((prev) => ({
          ...prev,
          imageFile: file,
          imagePreview: reader.result,
        }));
      } else {
        setEditForm((prev) => ({
          ...prev,
          imageFile: file,
          imagePreview: reader.result,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateIngredient = async () => {
    if (!newIngredient.name.trim() || newIngredient.volume <= 0) {
      alert('Заполните название и объем ингредиента');
      return;
    }

    try {
      setIsLoading(true);
      let imageUrl = null;
      let uploadResult = null;

      if (newIngredient.imageFile) {
        uploadResult = await uploadAPI.uploadIngredientImage(newIngredient.imageFile);
        imageUrl = uploadResult.url;
      }

      const created = await ingredientsAPI.create({
        name: newIngredient.name,
        volume: newIngredient.volume,
        image_url: imageUrl,
      });

      if (imageUrl && created.id) {
        try {
          await uploadAPI.registerAttachment({
            storage_url: imageUrl,
            object_key: uploadResult?.object_key,
            entity_type: 'ingredient',
            entity_id: created.id,
            original_filename: newIngredient.imageFile?.name,
            content_type: newIngredient.imageFile?.type,
            file_size: newIngredient.imageFile?.size,
          });
        } catch (regErr) {
          console.warn(regErr);
        }
      }
      setAttachmentsRefresh((k) => k + 1);

      if (onItemsChange) {
        onItemsChange();
      }

      setNewIngredient({ name: '', volume: 0, imageFile: null, imagePreview: null });
      setShowCreateModal(false);
    } catch (err) {
      alert('Ошибка создания ингредиента: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (index) => {
    const item = items[index];
    if (!item) return;

    setEditingIndex(index);
    const volumeStr = item.volume.replace(' мл', '').trim();
    setEditForm({
      name: item.name,
      volume: parseInt(volumeStr, 10) || 0,
      image_url: item.image_url,
      imageFile: null,
      imagePreview: null,
    });
  };

  const handleSaveClick = async (index) => {
    const item = items[index];
    if (!item) return;

    try {
      setIsLoading(true);
      let imageUrl = editForm.image_url;
      let uploadResult = null;

      if (editForm.imageFile) {
        uploadResult = await uploadAPI.uploadIngredientImage(editForm.imageFile);
        imageUrl = uploadResult.url;
      }

      if (item.id) {
        await ingredientsAPI.update(item.id, {
          name: editForm.name,
          volume: editForm.volume,
          image_url: imageUrl,
        });

        if (uploadResult?.url) {
          try {
            await uploadAPI.registerAttachment({
              storage_url: uploadResult.url,
              object_key: uploadResult.object_key,
              entity_type: 'ingredient',
              entity_id: item.id,
              original_filename: editForm.imageFile?.name,
              content_type: editForm.imageFile?.type,
              file_size: editForm.imageFile?.size,
            });
          } catch (regErr) {
            console.warn(regErr);
          }
        }
        setAttachmentsRefresh((k) => k + 1);

        if (onItemsChange) {
          await onItemsChange();
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
    const item = items[index];
    if (!item) return;

    if (!item.id) {
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
      }
      if (editingIndex === index) setEditingIndex(null);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      if (err.response?.status === 400 && String(errorMessage).includes('used in recipes')) {
        alert('Нельзя удалить ингредиент, который используется в рецептах!');
      } else {
        alert('Ошибка удаления ингредиента: ' + errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVolumeChange = async (index, delta) => {
    const item = items[index];
    if (!item?.id) return;

    try {
      setIsLoading(true);

      if (delta > 0) {
        await ingredientsAPI.increaseVolume(item.id, delta);
      } else {
        await ingredientsAPI.decreaseVolume(item.id, Math.abs(delta));
      }

      if (onItemsChange) {
        await onItemsChange();
      }
    } catch (err) {
      alert('Ошибка изменения объема: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    applyListQuery({ q: e.target.value });
  };

  const clearSearch = () => {
    applyListQuery({ q: '' });
  };

  const applyVolumeFilters = () => {
    applyListQuery({
      min_volume: draftMinVol.trim() === '' ? '' : draftMinVol.trim(),
      max_volume: draftMaxVol.trim() === '' ? '' : draftMaxVol.trim(),
    });
    setShowFilterMenu(false);
  };

  const clearVolumeFilters = () => {
    setDraftMinVol('');
    setDraftMaxVol('');
    applyListQuery({ min_volume: '', max_volume: '' });
  };

  const handleSortChange = (sortBy, sortOrder) => {
    applyListQuery({ sort_by: sortBy, sort_order: sortOrder });
    setShowFilterMenu(false);
  };

  const goToPage = (p) => {
    if (p < 1 || (listQuery.pages > 0 && p > listQuery.pages)) return;
    applyListQuery({ page: String(p) });
  };

  const hasActiveFilters =
    Boolean(listQuery.q?.trim()) ||
    Boolean(listQuery.min_volume) ||
    Boolean(listQuery.max_volume);

  return (
    <div className="ingredient-list">
      <div className="list-header">
        <div className="search-container">
          <div className="search-input-wrapper">
            <img src={SearchIcon} alt="Поиск" className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Поиск по названию..."
              value={listQuery.q}
              onChange={handleSearchChange}
            />
            {listQuery.q ? (
              <button className="clear-search-btn" onClick={clearSearch} title="Очистить поиск">
                ×
              </button>
            ) : null}

            <button
              className={`filter-btn ${showFilterMenu ? 'active' : ''}`}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              title="Фильтры и сортировка"
            >
              <img src={FilterIcon} alt="Фильтр" />
            </button>
          </div>

          {showFilterMenu && (
            <div className="filter-menu">
              <div className="filter-menu-header">
                <span>Фильтр по объёму (мл)</span>
                <button className="close-filter-menu" onClick={() => setShowFilterMenu(false)}>
                  ×
                </button>
              </div>
              <div className="filter-options" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  Мин. объём
                  <input
                    type="number"
                    min={0}
                    value={draftMinVol}
                    onChange={(e) => setDraftMinVol(e.target.value)}
                    placeholder="не задано"
                    className="edit-volume-input"
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  Макс. объём
                  <input
                    type="number"
                    min={0}
                    value={draftMaxVol}
                    onChange={(e) => setDraftMaxVol(e.target.value)}
                    placeholder="не задано"
                    className="edit-volume-input"
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="save-btn" onClick={applyVolumeFilters}>
                    Применить объём
                  </button>
                  <button type="button" className="cancel-btn" onClick={clearVolumeFilters}>
                    Сбросить объём
                  </button>
                </div>
              </div>
              <div className="filter-menu-header" style={{ marginTop: 12 }}>
                <span>Сортировка</span>
              </div>
              <div className="filter-options">
                <button
                  className={`filter-option ${listQuery.sort_by === 'name' && listQuery.sort_order === 'asc' ? 'active' : ''}`}
                  onClick={() => handleSortChange('name', 'asc')}
                >
                  <div className="filter-option-check">
                    {listQuery.sort_by === 'name' && listQuery.sort_order === 'asc' ? '✓' : ''}
                  </div>
                  <span>Название А→Я</span>
                </button>
                <button
                  className={`filter-option ${listQuery.sort_by === 'name' && listQuery.sort_order === 'desc' ? 'active' : ''}`}
                  onClick={() => handleSortChange('name', 'desc')}
                >
                  <div className="filter-option-check">
                    {listQuery.sort_by === 'name' && listQuery.sort_order === 'desc' ? '✓' : ''}
                  </div>
                  <span>Название Я→А</span>
                </button>
                <button
                  className={`filter-option ${listQuery.sort_by === 'volume' && listQuery.sort_order === 'asc' ? 'active' : ''}`}
                  onClick={() => handleSortChange('volume', 'asc')}
                >
                  <div className="filter-option-check">
                    {listQuery.sort_by === 'volume' && listQuery.sort_order === 'asc' ? '✓' : ''}
                  </div>
                  <span>Объём по возрастанию</span>
                </button>
                <button
                  className={`filter-option ${listQuery.sort_by === 'volume' && listQuery.sort_order === 'desc' ? 'active' : ''}`}
                  onClick={() => handleSortChange('volume', 'desc')}
                >
                  <div className="filter-option-check">
                    {listQuery.sort_by === 'volume' && listQuery.sort_order === 'desc' ? '✓' : ''}
                  </div>
                  <span>Объём по убыванию</span>
                </button>
              </div>
            </div>
          )}

          <div className="search-results-info">
            Всего: {listQuery.total}
            {hasActiveFilters ? ' (с учётом фильтров)' : ''}
            {listQuery.pages > 0 ? (
              <span className="sort-info">
                {' '}
                • Страница: {listQuery.page}/{listQuery.pages}
              </span>
            ) : null}
          </div>
        </div>
        <Button onClick={handleAddClick} className="add-button">
          Добавить ингредиент
        </Button>
      </div>

      <div className="items-container">
        {items.length === 0 ? (
          <div className="no-results">
            {hasActiveFilters ? 'Ингредиенты не найдены' : 'Нет ингредиентов'}
          </div>
        ) : (
          items.map((item, index) => {
            const isEditing = editingIndex === index;

            return (
              <div key={item.id} className="item-card">
                <div className="item-content">
                  <div className="item-icon-section">
                    <ResolvedImage
                      storageUrl={item.image_url}
                      fallbackSrc={DefaultIngredientIcon}
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
                      <img
                        src={MinusIcon}
                        onClick={() => handleVolumeChange(index, -50)}
                        className="volume-icon"
                        alt=""
                      />

                      <div className="volume-label">50 мл</div>

                      <img
                        src={PlusIcon}
                        onClick={() => handleVolumeChange(index, 50)}
                        className="volume-icon"
                        alt=""
                      />
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
                        <button className="edit-btn" onClick={() => handleEditClick(index)}>
                          Изменить
                        </button>
                      )}
                    </div>
                  </div>
                </div>

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
                        onChange={(e) => handleInputChange('volume', parseInt(e.target.value, 10) || 0)}
                        placeholder="Объем"
                      />
                      <span className="volume-unit">мл</span>
                    </div>

                    <div className="edit-image-upload">
                      <FileUploadZone
                        key={`edit-img-${item.id}`}
                        label={
                          editForm.imageFile
                            ? 'Заменить изображение'
                            : editForm.image_url
                              ? 'Изменить изображение'
                              : 'Загрузить изображение'
                        }
                        deferUpload
                        resetKey={editingIndex}
                        onFileSelected={(file) => setImageFileWithPreview(file, false)}
                        onError={(msg) => alert(msg)}
                      />

                      {editForm.imagePreview && (
                        <img
                          src={editForm.imagePreview}
                          alt="Предпросмотр нового изображения"
                          className="current-image-preview"
                        />
                      )}

                      {!editForm.imagePreview && editForm.image_url && (
                        <ResolvedImage
                          storageUrl={editForm.image_url}
                          fallbackSrc={DefaultIngredientIcon}
                          alt="Текущее изображение"
                          className="current-image-preview"
                        />
                      )}
                    </div>
                    {showAttachmentsList && item.id ? (
                      <AttachedFilesList
                        entityType="ingredient"
                        entityId={item.id}
                        refreshKey={attachmentsRefresh}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {listQuery.pages > 1 ? (
        <footer className="ingredient-list-footer" style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            type="button"
            disabled={listQuery.page <= 1 || isLoading}
            onClick={() => goToPage(listQuery.page - 1)}
          >
            Назад
          </button>
          <span style={{ margin: '0 12px' }}>
            {listQuery.page} / {listQuery.pages}
          </span>
          <button
            type="button"
            disabled={listQuery.page >= listQuery.pages || isLoading}
            onClick={() => goToPage(listQuery.page + 1)}
          >
            Вперёд
          </button>
        </footer>
      ) : null}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создать новый ингредиент</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Название ингредиента"
                />
              </div>
              <div className="form-group">
                <label>Объем (мл)</label>
                <input
                  type="number"
                  value={newIngredient.volume}
                  onChange={(e) =>
                    setNewIngredient((prev) => ({ ...prev, volume: parseInt(e.target.value, 10) || 0 }))
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Изображение</label>
                <FileUploadZone
                  key={createModalKey}
                  label="Выбрать изображение"
                  deferUpload
                  resetKey={createModalKey}
                  onFileSelected={(file) => setImageFileWithPreview(file, true)}
                  onError={(msg) => alert(msg)}
                />
                {newIngredient.imagePreview && (
                  <img src={newIngredient.imagePreview} alt="Предпросмотр" className="image-preview" />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">
                Отмена
              </button>
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
