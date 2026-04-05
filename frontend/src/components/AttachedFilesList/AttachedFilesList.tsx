import React, { useCallback, useEffect, useState } from 'react';
import { uploadAPI, parseFastApiDetail, type FileAttachment } from '../../api/upload';
import './AttachedFilesList.css';

type Entity = 'user_avatar' | 'cocktail' | 'ingredient';

type AttachedFilesListProps = {
  entityType: Entity;
  entityId: number;
  canDelete?: boolean;
  refreshKey?: number;
};

export const AttachedFilesList: React.FC<AttachedFilesListProps> = ({
  entityType,
  entityId,
  canDelete = true,
  refreshKey = 0,
}) => {
  const [items, setItems] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await uploadAPI.listAttachments(entityType, entityId);
      setItems(data);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? parseFastApiDetail(
              (e as { response?: { data?: unknown } }).response?.data,
              'Не удалось загрузить список файлов',
            )
          : 'Не удалось загрузить список файлов';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleView = async (a: FileAttachment) => {
    try {
      await uploadAPI.openOrDownload(a.storage_url, a.original_filename ?? 'image');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка открытия файла';
      setError(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    try {
      await uploadAPI.deleteAttachment(id);
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? parseFastApiDetail(
              (e as { response?: { data?: unknown } }).response?.data,
              'Не удалось удалить файл',
            )
          : 'Не удалось удалить файл';
      setError(msg);
    }
  };

  if (loading) {
    return <div className="attached-files-list attached-files-list--loading">Загрузка списка…</div>;
  }

  return (
    <div className="attached-files-list">
      {error ? <div className="attached-files-list__error">{error}</div> : null}
      {!items.length ? (
        <p className="attached-files-list__empty">Нет зарегистрированных вложений</p>
      ) : (
        <ul className="attached-files-list__ul">
          {items.map((a) => (
            <li key={a.id} className="attached-files-list__li">
              <span className="attached-files-list__name" title={a.storage_url}>
                {a.original_filename || a.object_key || `Файл #${a.id}`}
              </span>
              <span className="attached-files-list__meta">
                {a.content_type}
                {a.size_bytes != null ? ` · ${(a.size_bytes / 1024).toFixed(1)} КБ` : ''}
              </span>
              <div className="attached-files-list__actions">
                <button type="button" onClick={() => handleView(a)}>
                  Открыть
                </button>
                {canDelete ? (
                  <button type="button" onClick={() => handleDelete(a.id)}>
                    Удалить
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
