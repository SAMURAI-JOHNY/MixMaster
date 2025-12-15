import React, { useState, useEffect } from 'react';
import { authAPI } from '../../api/auth';
import { uploadAPI } from '../../api/upload';
import './AuthModal.css';

const AuthModal = ({ isLoggedIn, username, onLogin, onLogout, onClose }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'любитель'
  });
  const [profileFormData, setProfileFormData] = useState({
    username: '',
    role: ''
  });

  // Загрузка аватарки пользователя при открытии профиля
  useEffect(() => {
    if (isLoggedIn) {
      const loadUserProfile = async () => {
        try {
          const profile = await authAPI.getProfile();
          if (profile.avatar_url) {
            setUserAvatar(uploadAPI.getImageUrl(profile.avatar_url));
          }
          if (profile.role) {
            setProfileFormData(prev => ({ ...prev, role: profile.role }));
          }
          if (profile.username) {
            setProfileFormData(prev => ({ ...prev, username: profile.username }));
          }
        } catch (err) {
          console.error('Ошибка загрузки профиля:', err);
        }
      };
      loadUserProfile();
    }
  }, [isLoggedIn]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatar) return;
    
    try {
      setIsLoading(true);
      const uploadResult = await uploadAPI.uploadAvatar(avatar);
      await authAPI.updateAvatar(uploadResult.url);
      const imageUrl = uploadAPI.getImageUrl(uploadResult.url);
      setUserAvatar(imageUrl);
      setAvatar(null);
      setAvatarPreview(null);
      // Обновляем страницу для обновления аватарки в Header
      window.location.reload();
    } catch (err) {
      setError('Ошибка загрузки аватарки: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
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
          const imageUrl = uploadAPI.getImageUrl(uploadResult.url);
          setUserAvatar(imageUrl);
          setAvatar(null);
          setAvatarPreview(null);
        } catch (err) {
          setError('Ошибка загрузки аватарки: ' + (err.message || 'Неизвестная ошибка'));
          setIsLoading(false);
          return;
        }
      }
      
      // Обновляем профиль (имя пользователя и роль)
      await authAPI.updateProfile({
        username: profileFormData.username,
        role: profileFormData.role
      });
      
      alert('Профиль успешно обновлен!');
      window.location.reload();
    } catch (err) {
      setError('Ошибка обновления профиля: ' + (err.response?.data?.detail || err.message || 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
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
                role: profile.role
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
          let avatarUrl = null;
          
          // Загружаем аватарку, если она выбрана
          if (avatar) {
            try {
              const uploadResult = await uploadAPI.uploadAvatar(avatar);
              avatarUrl = uploadResult.url;
            } catch (err) {
              setError('Ошибка загрузки аватарки: ' + (err.message || 'Неизвестная ошибка'));
              setIsLoading(false);
              return;
            }
          }
          
          // Регистрируем пользователя с аватаркой и ролью
          await authAPI.register({
            username: formData.username,
            password: formData.password,
            avatar_url: avatarUrl,
            role: formData.role
          });
          
          // После регистрации автоматически входим
          const response = await authAPI.login(formData.username, formData.password);
          if (response.access_token) {
            // Загружаем профиль для получения роли
            try {
              const profile = await authAPI.getProfile();
              onLogin({
                username: formData.username,
                role: profile.role,
                avatar_url: profile.avatar_url
              });
            } catch (err) {
              onLogin({
                username: formData.username
              });
            }
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Произошла ошибка. Попробуйте снова.');
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
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="user-info">
              <div className="avatar-section">
                <div className="avatar-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    id="avatar-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    {userAvatar ? (
                      <img src={userAvatar} alt="Аватар" className="user-avatar" />
                    ) : (
                      <div className="avatar-placeholder">
                        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </label>
                  {avatarPreview && (
                    <div className="avatar-preview">
                      <img src={avatarPreview} alt="Предпросмотр" />
                    </div>
                  )}
                  {avatar && (
                    <div style={{ marginTop: '10px', textAlign: 'center', color: '#C8A97E', fontSize: '14px' }}>
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
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="form-input"
                    placeholder="Имя пользователя"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-role">Роль</label>
                  <select
                    id="profile-role"
                    value={profileFormData.role}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, role: e.target.value }))}
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
            <button className="close-button" onClick={onClose}>×</button>
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
                
                <div className="form-group">
                  <label htmlFor="avatar-register">Аватарка (необязательно)</label>
                  <input
                    id="avatar-register"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isLoading}
                    style={{ marginTop: '5px' }}
                  />
                  {avatarPreview && (
                    <div style={{ marginTop: '10px' }}>
                      <img 
                        src={avatarPreview} 
                        alt="Предпросмотр аватарки" 
                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Загрузка...' : (isLoginMode ? 'Войти' : 'Зарегистрироваться')}
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
              {isLoginMode 
                ? 'Нет аккаунта? Зарегистрироваться' 
                : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;