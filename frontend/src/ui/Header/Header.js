import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '../../assets/menu.svg';
import CloseIcon from '../../assets/close.svg';
import DefaultAvatarIcon from '../../assets/avatar.svg';
import AuthModal from '../../components/AuthModal/AuthModal.js';
import { authAPI } from '../../api/auth';
import { uploadAPI } from '../../api/upload';
import './Header.css';

export const Header = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [userAvatar, setUserAvatar] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Загрузка состояния из localStorage при монтировании и проверка токена
  useEffect(() => {
    const checkAuth = async () => {
      const savedLogin = localStorage.getItem('isLoggedIn');
      const savedUsername = localStorage.getItem('username');
      if (savedLogin === 'true' && savedUsername) {
        // Проверяем валидность токена
        const tokenCheck = await authAPI.verifyToken();
        if (tokenCheck.valid) {
          setIsLoggedIn(true);
          setUsername(savedUsername);
          // Загружаем профиль для получения аватарки и роли
          try {
            const profile = await authAPI.getProfile();
            if (profile.avatar_url) {
              setUserAvatar(uploadAPI.getImageUrl(profile.avatar_url));
            }
            if (profile.role) {
              setUserRole(profile.role);
            }
          } catch (err) {
            console.error('Ошибка загрузки профиля:', err);
          }
        } else {
          // Токен невалиден, очищаем localStorage
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('username');
          localStorage.removeItem('access_token');
        }
      }
    };
    checkAuth();
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Закрытие меню при клике вне меню
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMenuOpen && !e.target.closest('.dropdown-menu') && !e.target.closest('.menu-button')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleAuthModal = () => {
    setIsAuthModalOpen(!isAuthModalOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleLogin = async (userData) => {
    setIsLoggedIn(true);
    setUsername(userData.username);
    setIsAuthModalOpen(false);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', userData.username);
    // Загружаем профиль для получения роли и аватарки
    try {
      const profile = await authAPI.getProfile();
      if (profile.role) {
        setUserRole(profile.role);
      }
      if (profile.avatar_url) {
        setUserAvatar(uploadAPI.getImageUrl(profile.avatar_url));
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    } finally {
      setIsLoggedIn(false);
      setUsername('');
      setUserAvatar(null);
      setUserRole(null);
      setIsAuthModalOpen(false);
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
      localStorage.removeItem('access_token');
    }
  };

  // Закрытие меню при нажатии Esc
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isMenuOpen]);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button className="menu-button" onClick={toggleMenu}>
            <img src={isMenuOpen ? CloseIcon : MenuIcon} alt="Меню" />
          </button>
          
          {/* Меню */}
          <div className={`dropdown-menu ${isMenuOpen ? 'open' : ''}`}>
            <nav className="menu-nav">
              <button 
                className="menu-item"
                onClick={() => handleNavigation('/')}
              >
                Коктейли
              </button>
              <button 
                className="menu-item"
                onClick={() => handleNavigation('/ingredients')}
              >
                Ингредиенты
              </button>
              {isLoggedIn && userRole === 'бармен' && (
                <button 
                  className="menu-item"
                  onClick={() => handleNavigation('/create-recipe')}
                >
                  Создать рецепт
                </button>
              )}
              {isLoggedIn && (
                <button 
                  className="menu-item"
                  onClick={() => handleNavigation('/my-prepared')}
                >
                  Приготовленные
                </button>
              )}
            </nav>
          </div>
        </div>

        <div className="header-right">
          <button 
            className="avatar-button"
            onClick={toggleAuthModal}
            title={isLoggedIn ? `Профиль (${username})` : "Войти в систему"}
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Аватар" className="user-avatar-img" />
            ) : (
              <img src={DefaultAvatarIcon} alt="Аватар" className="default-avatar" />
            )}
          </button>
        </div>
      </div>

      {isAuthModalOpen && (
        <AuthModal
          isLoggedIn={isLoggedIn}
          username={username}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onClose={toggleAuthModal}
        />
      )}
    </header>
  );
};

export default Header;