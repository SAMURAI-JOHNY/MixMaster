import React, { useEffect, useState } from 'react';
import { authAPI } from '../../api/auth';
import { effectiveImageMime, uploadAPI } from '../../api/upload';
import { ResolvedImage } from '../ResolvedImage/ResolvedImage';
import { FileUploadZone } from '../FileUploadZone/FileUploadZone';
import { AttachedFilesList } from '../AttachedFilesList/AttachedFilesList';
import DefaultAvatarIcon from '../../assets/avatar.svg';
import './AuthModal.css';

type LoginUser = {
  username: string;
  role?: string;
  avatar_url?: string;
};

type AuthModalProps = {
  isLoggedIn: boolean;
  username: string;
  onLogin: (user: LoginUser) => void;
  onLogout: () => void;
  onClose: () => void;
  /** Обновить аватар в шапке без перезагрузки страницы */
  onAvatarUpdated?: (storageUrl: string | null) => void;
};

type RegisterFormData = {
  username: string;
  password: string;
  confirmPassword: string;
  role: string;
};

type ProfileFormData = {
  username: string;
  role: string;
};

const AuthModal = ({
  isLoggedIn,
  username: _username,
  onLogin,
  onLogout,
  onClose,
  onAvatarUpdated,
}: AuthModalProps) => {
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userAvatarStorageUrl, setUserAvatarStorageUrl] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [attachmentsRefresh, setAttachmentsRefresh] = useState(0);

  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'любитель',
  });

  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
    username: '',
    role: '',
  });

  // Загрузка аватарки пользователя при открытии профиля
  useEffect(() => {
    if (isLoggedIn) {
      const loadUserProfile = async () => {
        try {
          const profile = await authAPI.getProfile();
          const av = profile.avatar_url ?? null;
          setUserAvatarStorageUrl(av);
          onAvatarUpdated?.(av);
          setProfileUserId(profile.id ?? null);
          if (profile.role) {
            setProfileFormData((prev) => ({ ...prev, role: profile.role as string }));
          }
          if (profile.username) {
            setProfileFormData((prev) => ({ ...prev, username: profile.username as string }));
          }
        } catch (err) {
          console.error('Ошибка загрузки профиля:', err);
        }
      };
      loadUserProfile();
    }
  }, [isLoggedIn, onAvatarUpdated]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const key = name as keyof RegisterFormData;
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleAvatarFileSelected = (file: File) => {
    setError('');
    setAvatar(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setAvatarPreview(typeof result === 'string' ? result : null);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Если выбрана новая аватарка, сначала загружаем её
      if (avatar) {
        try {
          const uploadResult = await uploadAPI.uploadAvatar(avatar);
          await authAPI.updateAvatar(uploadResult.url);
          const profile = await authAPI.getProfile();
          if (profile.id) {
            try {
              await uploadAPI.registerAttachment({
                storage_url: uploadResult.url,
                object_key: uploadResult.object_key,
                entity_type: 'user_avatar',
                entity_id: profile.id,
                original_filename: avatar.name,
                content_type: avatar.type || effectiveImageMime(avatar),
                file_size: avatar.size,
              });
            } catch (regErr) {
              console.warn(regErr);
            }
          }
          const savedUrl = profile.avatar_url ?? uploadResult.url;
          setUserAvatarStorageUrl(savedUrl);
          onAvatarUpdated?.(savedUrl);
          setAttachmentsRefresh((k) => k + 1);
          setAvatar(null);
          setAvatarPreview(null);
        } catch (err: any) {
          setError('Ошибка загрузки аватарки: ' + (err?.message || 'Неизвестная ошибка'));
          setIsLoading(false);
          return;
        }
      }

      // Обновляем профиль (имя пользователя и роль)
      await authAPI.updateProfile({
        username: profileFormData.username,
        role: profileFormData.role,
      });

      alert('Профиль успешно обновлен!');
      window.location.reload();
    } catch (err: any) {
      setError(
        'Ошибка обновления профиля: ' +
          (err?.response?.data?.detail || err?.message || 'Неизвестная ошибка'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        if (formData.username && formData.password) {
          const response = await authAPI.login(formData.username, formData.password);
          if (response.access_token) {
            // Загружаем профиль для получения роли
            try {
              const profile = await authAPI.getProfile();
              onLogin({
                username: formData.username,
                role: profile.role,
              });
            } catch (err) {
              onLogin({
                username: formData.username,
              });
            }
          }
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Пароли не совпадают!');
          setIsLoading(false);
          return;
        }

        if (formData.username && formData.password) {
          // Регистрация без presigned-загрузки: токена ещё нет, upload требует Bearer
          await authAPI.register({
            username: formData.username,
            password: formData.password,
            role: formData.role,
          });

          const response = await authAPI.login(formData.username, formData.password);
          if (response.access_token) {
            try {
              if (avatar) {
                try {
                  const uploadResult = await uploadAPI.uploadAvatar(avatar);
                  await authAPI.updateAvatar(uploadResult.url);
                  let profile = await authAPI.getProfile();
                  if (profile.id) {
                    try {
                      await uploadAPI.registerAttachment({
                        storage_url: uploadResult.url,
                        object_key: uploadResult.object_key,
                        entity_type: 'user_avatar',
                        entity_id: profile.id,
                        original_filename: avatar.name,
                        content_type: avatar.type || effectiveImageMime(avatar),
                        file_size: avatar.size,
                      });
                    } catch (regErr) {
                      console.warn(regErr);
                    }
                    profile = await authAPI.getProfile();
                  }
                  onLogin({
                    username: formData.username,
                    role: profile.role,
                    avatar_url: profile.avatar_url,
                  });
                } catch (err: unknown) {
                  const msg =
                    err instanceof Error ? err.message : 'Неизвестная ошибка';
                  setError('Ошибка загрузки аватарки: ' + msg);
                  const profile = await authAPI.getProfile();
                  onLogin({
                    username: formData.username,
                    role: profile.role,
                    avatar_url: profile.avatar_url,
                  });
                }
              } else {
                const profile = await authAPI.getProfile();
                onLogin({
                  username: formData.username,
                  role: profile.role,
                  avatar_url: profile.avatar_url,
                });
              }
            } catch (err) {
              onLogin({
                username: formData.username,
              });
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Произошла ошибка. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoggedIn) {
    return (
      <div className="auth-modal-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <div className="auth-form">
            <div className="auth-header">
              <h3>Профиль</h3>
              <button className="close-button" onClick={onClose}>
                ×
              </button>
            </div>
            <div className="user-info">
              <div className="avatar-section">
                <div className="avatar-container">
                  <div style={{ marginBottom: 8 }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Предпросмотр" className="user-avatar" />
                    ) : (
                      <ResolvedImage
                        storageUrl={userAvatarStorageUrl}
                        fallbackSrc={DefaultAvatarIcon}
                        alt="Аватар"
                        className="user-avatar"
                      />
                    )}
                  </div>
                  <FileUploadZone
                    label="Сменить аватар"
                    deferUpload
                    resetKey={profileUserId ?? 0}
                    onFileSelected={handleAvatarFileSelected}
                    onError={(msg) => setError(msg)}
                    disabled={isLoading}
                  />
                  <p style={{ fontSize: '12px', color: '#a09080', marginTop: '6px' }}>
                    До {uploadAPI.maxImageMb} МБ: JPEG, PNG, WebP, GIF
                  </p>
                  {profileUserId ? (
                    <AttachedFilesList
                      entityType="user_avatar"
                      entityId={profileUserId}
                      refreshKey={attachmentsRefresh}
                    />
                  ) : null}
                  {avatar && (
                    <div
                      style={{
                        marginTop: '10px',
                        textAlign: 'center',
                        color: '#C8A97E',
                        fontSize: '14px',
                      }}
                    >
                      Выбрано новое изображение
                    </div>
                  )}
                </div>
              </div>
              <div className="profile-form-section">
                <div className="form-group">
                  <label htmlFor="profile-username">Имя пользователя</label>
                  <input
                    type="text"
                    id="profile-username"
                    value={profileFormData.username}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({ ...prev, username: e.target.value }))
                    }
                    className="form-input"
                    placeholder="Имя пользователя"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-role">Роль</label>
                  <select
                    id="profile-role"
                    value={profileFormData.role}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    className="form-select"
                  >
                    <option value="любитель">Любитель</option>
                    <option value="бармен">Бармен</option>
                  </select>
                </div>
                <button
                  onClick={handleProfileUpdate}
                  className="profile-save-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </div>
            <div className="auth-actions">
              <button onClick={onLogout} className="logout-btn">
                Выйти из системы
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-form">
          <div className="auth-header">
            <h3>{isLoginMode ? 'Вход в систему' : 'Регистрация'}</h3>
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          </div>

          {error && (
            <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Имя пользователя</label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Введите имя пользователя"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Введите пароль"
                required
              />
            </div>

            {!isLoginMode && (
              <>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Подтвердите пароль</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Повторите пароль"
                    required={!isLoginMode}
                  />
                </div>

                <div className="form-group">
                  <label>Аватарка (необязательно)</label>
                  <FileUploadZone
                    key={isLoginMode ? 'login' : 'register-avatar'}
                    label="Выбрать изображение"
                    deferUpload
                    resetKey={isLoginMode ? 'l' : 'r'}
                    onFileSelected={handleAvatarFileSelected}
                    onError={(msg) => setError(msg)}
                    disabled={isLoading}
                  />
                  {avatarPreview && (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={avatarPreview}
                        alt="Предпросмотр аватарки"
                        style={{
                          width: '100px',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: '50%',
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="role">Роль</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    disabled={isLoading}
                  >
                    <option value="любитель">Любитель</option>
                    <option value="бармен">Бармен</option>
                  </select>
                </div>
              </>
            )}

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading
                ? 'Загрузка...'
                : isLoginMode
                  ? 'Войти'
                  : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="auth-switch">
            <button
              type="button"
              className="switch-btn"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setAvatar(null);
                setAvatarPreview(null);
                setError('');
              }}
            >
              {isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

