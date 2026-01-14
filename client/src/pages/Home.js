import React from 'react';
import { Link } from 'react-router-dom';
import { FaTruck, FaUsers, FaSignInAlt, FaShippingFast, FaMapMarkedAlt, FaUserTie, FaPhone, FaEnvelope, FaMapMarkerAlt, FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';
import './home.css';
import '../styles/DesignSystem.css';

const Home = () => {
  return (
    <div className="home-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <span>CALL US: (800) 123-4567</span>
          </div>
          <div className="top-bar-right">
            <span>CLIENT / CARRIER</span>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <header className="home-header">
        <nav className="home-nav">
          <div className="home-logo">
            <img 
              src={process.env.PUBLIC_URL + '/images/logo.png.webp'} 
              alt="Company Logo" 
              className="company-logo"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="logo-fallback" style={{display: 'none'}}>
              <FaTruck className="logo-icon" />
              <h1>E-TRUCKING</h1>
            </div>
          </div>
          <div className="nav-links">
            <a href="#home">HOME</a>
            <a href="#about">ABOUT US</a>
            <a href="#services">SERVICES</a>
            <a href="#testimonials">TESTIMONIALS</a>
            <a href="#blog">BLOG</a>
            <a href="#contact">CONTACT</a>
          </div>
          <Link to="/login" className="quote-btn">
            GET STARTED
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <img 
            src="/images/truck-background.jpg" 
            alt="Trucking Operations" 
            className="hero-bg-image"
            onLoad={() => console.log('Truck background image loaded successfully')}
            onError={(e) => {
              console.log('Primary image failed to load, trying fallback');
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div className="hero-bg-fallback" style={{display: 'none'}}>
            <img 
              src="/images/truck-hero.jpg" 
              alt="Trucking Operations Fallback" 
              className="hero-bg-image"
              onLoad={() => console.log('Fallback truck image loaded successfully')}
              onError={(e) => {
                console.log('Fallback image also failed to load');
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hero-bg-gradient" style={{display: 'none'}}>
              <div className="gradient-overlay"></div>
            </div>
          </div>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">E-TRUCKING MANAGEMENT SYSTEM</h1>
          <p className="hero-subtitle">Streamline your trucking operations with our comprehensive management solution. Track, manage, and optimize your fleet like never before.</p>
          <Link to="/login" className="hero-cta-btn">
            GET STARTED
          </Link>
        </div>
        <div className="hero-services">
          <span>FLEET MANAGEMENT - DRIVER TRACKING - DELIVERY OPTIMIZATION - ROUTE PLANNING</span>
        </div>
      </section>

      {/* Transportation Services Section */}
      <section className="services-section">
        <div className="services-content">
          <div className="services-text">
            <h2 className="services-title">
              COMPREHENSIVE<br />
              FLEET MANAGEMENT SOLUTIONS
            </h2>
            <div className="services-description">
              <p>
                Our E-Trucking management system is designed to help transportation companies streamline their operations, reduce costs, and improve service quality. With comprehensive tools for managing vehicles, staff, clients, and deliveries.
              </p>
              <p>
                Whether you're a small fleet owner or a large logistics company, our flexible system adapts to your needs and scales with your business growth. Track real-time locations, manage driver schedules, and optimize delivery routes.
              </p>
            </div>
          </div>
          <div className="services-image">
            <img 
              src={process.env.PUBLIC_URL + '/images/truck-hero.jpg'} 
              alt="Professional Trucking Fleet" 
              className="truck-3d-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="truck-image-fallback" style={{display: 'none'}}>
              <FaTruck size={120} className="truck-icon-fallback" />
              <p>Professional Fleet Management</p>
            </div>
          </div>
        </div>
        
        <div className="services-features">
          <div className="feature-block">
            <div className="feature-icon">
              <div className="icon-hourglass"></div>
            </div>
            <h3>SAVE TIME</h3>
            <p>Automate scheduling, optimize routes, and streamline operations to reduce manual work and increase efficiency across your entire fleet.</p>
          </div>
          <div className="feature-block">
            <div className="feature-icon">
              <div className="icon-calculator"></div>
            </div>
            <h3>REDUCE COSTS</h3>
            <p>Track fuel consumption, monitor maintenance schedules, and optimize delivery routes to significantly reduce operational expenses.</p>
          </div>
          <div className="feature-block">
            <div className="feature-icon">
              <div className="icon-person"></div>
            </div>
            <h3>INCREASE RELIABILITY</h3>
            <p>Real-time tracking, automated notifications, and comprehensive reporting ensure reliable service delivery and customer satisfaction.</p>
          </div>
        </div>
      </section>

      {/* Dedicated Section */}
      <section className="dedicated-section">
        <div className="dedicated-content">
          <div className="dedicated-text">
            <h2>DEDICATED AND DRIVEN TO DELIVER</h2>
            <p>Our E-Trucking platform provides comprehensive fleet management tools that help transportation companies deliver exceptional service. From real-time GPS tracking to automated dispatch systems, we ensure your deliveries are always on time and your customers are always satisfied.</p>
          </div>
          <div className="dedicated-map">
            <img 
              src={process.env.PUBLIC_URL + '/images/truck-background.jpg'} 
              alt="Global Logistics Network" 
              className="world-map-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="map-fallback" style={{display: 'none'}}>
              <FaMapMarkedAlt size={80} className="map-icon-fallback" />
              <p>Global Logistics Network</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <h2>TESTIMONIALS</h2>
        <div className="testimonial-content">
          <p>"The E-Trucking system has revolutionized our fleet operations. We've seen a 30% improvement in delivery efficiency and our drivers love the real-time tracking features. It's made managing our 50-truck fleet so much easier."</p>
          <div className="testimonial-author">MICHAEL RODRIGUEZ, FLEET MANAGER</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-column">
            <h3>E-TRUCKING</h3>
            <p>Professional fleet management solutions for modern transportation companies. Streamline operations, reduce costs, and improve service quality with our comprehensive platform.</p>
            <div className="social-icons">
              <FaFacebook />
              <FaTwitter />
              <FaInstagram />
            </div>
          </div>
          <div className="footer-column">
            <h3>NEWSLETTER</h3>
            <p>Subscribe to our newsletter and we will keep you informed about us.</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Your email" />
              <button className="newsletter-btn">
                <FaEnvelope />
              </button>
            </div>
          </div>
          <div className="footer-column">
            <h3>CONTACT US</h3>
            <div className="contact-info">
              <div className="contact-item">
                <FaMapMarkerAlt />
                <span>48 South Service Road Melville, NY 11747</span>
              </div>
              <div className="contact-item">
                <FaPhone />
                <span>800-123-4567</span>
              </div>
              <div className="contact-item">
                <FaEnvelope />
                <span>support@e-trucking.com</span>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Copyright © 2025 E-Trucking Management System. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;