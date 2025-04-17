import React from 'react';
import styles from './Table.module.css';

const Table = ({ 
  children, 
  className = '', 
  striped = false,
  hover = true,
  bordered = false,
  compact = false,
  ...props 
}) => {
  const tableClasses = [
    styles.table,
    striped ? styles.striped : '',
    hover ? styles.hover : '',
    bordered ? styles.bordered : '',
    compact ? styles.compact : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.tableWrapper}>
      <table className={tableClasses} {...props}>
        {children}
      </table>
    </div>
  );
};

const TableHead = ({ children, className = '', ...props }) => {
  return (
    <thead className={`${styles.thead} ${className}`} {...props}>
      {children}
    </thead>
  );
};

const TableBody = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`${styles.tbody} ${className}`} {...props}>
      {children}
    </tbody>
  );
};

const TableRow = ({ children, className = '', ...props }) => {
  return (
    <tr className={`${styles.tr} ${className}`} {...props}>
      {children}
    </tr>
  );
};

const TableCell = ({ children, className = '', header = false, ...props }) => {
  const Component = header ? 'th' : 'td';
  return (
    <Component className={`${styles.td} ${className}`} {...props}>
      {children}
    </Component>
  );
};

Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;

export default Table; 