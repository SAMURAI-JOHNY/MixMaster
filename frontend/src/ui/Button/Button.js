import './Button.css';

export const Button = ({ children, variant = 'primary', ...props }) => {
    return (
      <button className={'btn'} {...props}>
          {children}
      </button>
    );
};