import React, { useEffect, useRef, useState } from 'react';
import { uploadAPI } from '../../api/upload';
import './FileUploadZone.css';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export type FileUploadZoneProps = {
  label: string;
  accept?: string;
  disabled?: boolean;
  deferUpload?: boolean;
  onFileSelected?: (file: File) => void;
  upload?: (file: File) => Promise<{ url: string; object_key?: string }>;
  onSuccess?: (result: { url: string; object_key?: string }, file: File) => void;
  onError?: (message: string) => void;
  resetKey?: string | number;
};

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  label,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  disabled = false,
  deferUpload = false,
  onFileSelected,
  upload,
  onSuccess,
  onError,
  resetKey = 0,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    setStatus('idle');
    setMessage('');
  }, [resetKey]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validation = uploadAPI.validateImageFile(file);
    if (validation) {
      setStatus('error');
      setMessage(validation);
      onError?.(validation);
      return;
    }

    if (deferUpload) {
      onFileSelected?.(file);
      setStatus('success');
      setMessage('Файл выбран');
      return;
    }

    if (!upload) {
      setStatus('error');
      setMessage('Не задана функция загрузки');
      return;
    }

    setStatus('uploading');
    setMessage('Загрузка…');
    try {
      const result = await upload(file);
      setStatus('success');
      setMessage('Файл загружен');
      onSuccess?.(result, file);
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'Ошибка загрузки';
      setStatus('error');
      setMessage(text);
      onError?.(text);
    }
  };

  return (
    <div className={`file-upload-zone file-upload-zone--${status}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="file-upload-zone__input"
        disabled={disabled || (!deferUpload && status === 'uploading')}
        onChange={handleChange}
        aria-label={label}
      />
      <button
        type="button"
        className="file-upload-zone__btn"
        disabled={disabled || (!deferUpload && status === 'uploading')}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      <span className="file-upload-zone__hint">
        До {uploadAPI.maxImageMb} МБ: JPEG, PNG, WebP, GIF
      </span>
      {message ? <div className="file-upload-zone__status">{message}</div> : null}
    </div>
  );
};
