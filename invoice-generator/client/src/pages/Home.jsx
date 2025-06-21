import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Fast Invoice Generator</span>
          <span className={styles.logoSubtext}>Invoice Generator</span>
        </div>
        <nav className={styles.nav}>
          <button className={styles.navButton} onClick={() => navigate('/invoice-history')}>
            Invoice History
          </button>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Professional Invoice Generation</h1>
          <p>Streamline your expense reporting with our comprehensive invoice generation system</p>
          <button 
            className={styles.primaryButton}
            onClick={() => navigate('/basic-details')}
          >
            Create New Invoice
          </button>
        </div>
        <div className={styles.heroImage}>
          <div className={styles.imagePlaceholder}>
            <div className={styles.invoiceIcon}></div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <h2>Powerful Features</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📝</div>
            <h3>Easy Invoice Creation</h3>
            <p>Create detailed invoices in minutes with our intuitive step-by-step process</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Bill Management</h3>
            <p>Upload, organize, and track your bills with our advanced management system</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💰</div>
            <h3>Expense Tracking</h3>
            <p>Efficiently manage daily allowances and track all expenses in one place</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📄</div>
            <h3>PDF Generation</h3>
            <p>Generate professional, formatted PDF invoices with a single click</p>
          </div>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <h2>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Enter Basic Details</h3>
            <p>Start by providing employee information and tour details</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Add Tour Summary</h3>
            <p>Document your travel itinerary and mode of transportation</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Upload Bills</h3>
            <p>Add your receipts and bills with supporting documentation</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <h3>Generate Invoice</h3>
            <p>Review and generate your professional invoice in PDF format</p>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Ready to Get Started?</h2>
        <p>Create your first invoice in minutes</p>
        <button 
          className={styles.primaryButton}
          onClick={() => navigate('/basic-details')}
        >
          Create New Invoice
        </button>
      </section>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Invoicely Invoice Generator. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home; 