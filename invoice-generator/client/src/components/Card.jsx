import React from 'react';
import styles from './Card.module.css';

const Card = ({ 
  children, 
  className = '', 
  padding = 'medium',
  shadow = 'medium',
  border = false,
  ...props 
}) => {
  const cardClasses = [
    styles.card,
    styles[`padding-${padding}`],
    styles[`shadow-${shadow}`],
    border ? styles.bordered : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card; 