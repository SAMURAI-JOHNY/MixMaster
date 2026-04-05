import api from './auth';

const API_URL =
  process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:8000/api/v1';
/** Для абсолютных ссылок; в проде с тем же хостом можно не задавать — берётся window.location.origin */
function getApiPublicBase(): string {
  if (process.env.REACT_APP_API_PUBLIC_BASE) {
    return process.env.REACT_APP_API_PUBLIC_BASE.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:8000';
}
const MAX_IMAGE_MB = Number(process.env.REACT_APP_MAX_IMAGE_MB ?? '8');

export type UploadResponse = {
  url: string;
  object_key?: string;
};

export type FileAttachment = {
  id: number;
  object_key: string | null;
  storage_url: string;
  entity_type: string;
  entity_id: number;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_by_user_id: number | null;
  created_at: string;
};

export function parseFastApiDetail(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null || !('detail' in data)) {
    return fallback;
  }
  const d = (data as { detail: unknown }).detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    const parts = d.map((x: { msg?: string }) => x?.msg).filter(Boolean);
    if (parts.length) return parts.join('; ');
  }
  return fallback;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return parseFastApiDetail(data, fallback);
  } catch {
    return fallback;
  }
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function effectiveImageMime(file: File): string {
  const t = (file.type || '').trim().toLowerCase();
  if (t && t !== 'application/octet-stream') return t;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return EXT_TO_MIME[ext] || t || '';
}

function validateImageFileBeforeUpload(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxBytes = MAX_IMAGE_MB * 1024 * 1024;
  const mime = effectiveImageMime(file);
  if (!allowed.includes(mime)) {
    return `Допустимые типы: JPEG, PNG, WebP, GIF (получено: ${file.type || mime || 'неизвестно'})`;
  }
  if (file.size <= 0 || file.size > maxBytes) {
    return `Размер файла: от 1 байт до ${MAX_IMAGE_MB} МБ`;
  }
  return null;
}

export type RegisterAttachmentBody = {
  storage_url: string;
  object_key?: string | null;
  entity_type: 'user_avatar' | 'cocktail' | 'ingredient';
  entity_id: number;
  original_filename?: string | null;
  content_type?: string | null;
  file_size?: number | null;
};

export const uploadAPI = {
  maxImageMb: MAX_IMAGE_MB,

  validateImageFile(file: File): string | null {
    return validateImageFileBeforeUpload(file);
  },

  presignUpload: async (
    folder: 'avatars' | 'cocktails' | 'ingredients',
    file: File,
  ): Promise<{ upload_url: string; object_key: string; storage_url: string; expires_in: number }> => {
    const err = validateImageFileBeforeUpload(file);
    if (err) throw new Error(err);

    const response = await fetch(`${API_URL}/upload/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
      },
      body: JSON.stringify({
        folder,
        file_name: file.name,
        content_type: file.type,
        file_size: file.size,
      }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Ошибка генерации ссылки загрузки'));
    }
    return response.json();
  },

  /** Загрузка через API → S3 (тот же origin, без PUT на :9000 из браузера). */
  uploadWithPresignedUrl: async (
    folder: 'avatars' | 'cocktails' | 'ingredients',
    file: File,
  ): Promise<UploadResponse & { object_key: string }> => {
    const err = validateImageFileBeforeUpload(file);
    if (err) throw new Error(err);

    const path =
      folder === 'avatars'
        ? '/upload/s3/avatar'
        : folder === 'cocktails'
          ? '/upload/s3/cocktail'
          : '/upload/s3/ingredient';
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Ошибка загрузки файла в объектное хранилище'));
    }
    const data = (await response.json()) as { url: string; object_key: string };
    return { url: data.url, object_key: data.object_key };
  },

  registerAttachment: async (body: RegisterAttachmentBody): Promise<FileAttachment> => {
    const response = await fetch(`${API_URL}/upload/attachments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
      },
      body: JSON.stringify({
        storage_url: body.storage_url,
        object_key: body.object_key ?? undefined,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        original_filename: body.original_filename ?? undefined,
        content_type: body.content_type ?? undefined,
        file_size: body.file_size ?? undefined,
      }),
    });
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Нет доступа к регистрации файла');
      }
      throw new Error(await readErrorMessage(response, 'Ошибка привязки файла к сущности'));
    }
    return response.json();
  },

  listAttachments: async (
    entityType: 'user_avatar' | 'cocktail' | 'ingredient',
    entityId: number,
  ): Promise<FileAttachment[]> => {
    const response = await api.get<FileAttachment[]>('/upload/attachments', {
      params: { entity_type: entityType, entity_id: entityId },
    });
    return response.data;
  },

  deleteAttachment: async (attachmentId: number): Promise<void> => {
    await api.delete(`/upload/attachments/${attachmentId}`);
  },

  getPresignedDownloadUrl: async (storageUrl: string): Promise<string> => {
    const response = await fetch(
      `${API_URL}/upload/presign-download?storage_url=${encodeURIComponent(storageUrl)}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
      },
    );
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Нет доступа к файлу');
      }
      throw new Error(await readErrorMessage(response, 'Ошибка генерации ссылки скачивания'));
    }
    const data = await response.json();
    return data.download_url as string;
  },

  /** Публичная или аватарная ссылка для отображения (pre-signed для s3://). */
  resolveDisplayUrl: async (storageUrl: string | null | undefined): Promise<string | null> => {
    if (!storageUrl) return null;
    if (storageUrl.startsWith('http://') || storageUrl.startsWith('https://')) return storageUrl;
    if (storageUrl.startsWith('/api/')) {
      return `${getApiPublicBase()}${storageUrl}`;
    }
    if (storageUrl.startsWith('s3://')) {
      const response = await fetch(
        `${API_URL}/upload/view-url?storage_url=${encodeURIComponent(storageUrl)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
          },
        },
      );
      if (!response.ok) {
        if (response.status === 403) return null;
        return null;
      }
      const data = (await response.json()) as { url: string };
      return data.url ?? null;
    }
    return null;
  },

  /** Синхронный URL только для локальных путей /api/... и http(s); для s3:// вернёт null. */
  getImageUrl: (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('s3://')) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/api/')) {
      return `${getApiPublicBase()}${url}`;
    }
    return null;
  },

  openOrDownload: async (storageUrl: string, filenameHint?: string): Promise<void> => {
    let href: string;
    if (storageUrl.startsWith('s3://')) {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Войдите в систему, чтобы скачать файл');
      }
      href = await uploadAPI.getPresignedDownloadUrl(storageUrl);
    } else {
      const r = await uploadAPI.resolveDisplayUrl(storageUrl);
      if (!r) throw new Error('Не удалось получить ссылку на файл');
      href = r;
    }
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (filenameHint) a.download = filenameHint;
    a.click();
  },

  uploadAvatar: async (file: File): Promise<UploadResponse> => {
    const err = validateImageFileBeforeUpload(file);
    if (err) throw new Error(err);
    return uploadAPI.uploadWithPresignedUrl('avatars', file);
  },

  uploadCocktailImage: async (file: File): Promise<UploadResponse> => {
    const err = validateImageFileBeforeUpload(file);
    if (err) throw new Error(err);
    return uploadAPI.uploadWithPresignedUrl('cocktails', file);
  },

  uploadIngredientImage: async (file: File): Promise<UploadResponse> => {
    const err = validateImageFileBeforeUpload(file);
    if (err) throw new Error(err);
    return uploadAPI.uploadWithPresignedUrl('ingredients', file);
  },
};
