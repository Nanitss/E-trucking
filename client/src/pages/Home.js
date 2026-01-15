import React from "react";
import { Link } from "react-router-dom";
import {
  FaTruck,
  FaChartLine,
  FaShieldAlt,
  FaMapMarkedAlt,
  FaCheck,
  FaArrowRight,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaInstagram,
} from "react-icons/fa";
import "./home.css";
// Ensure design system variables are loaded
import "../styles/DesignSystem.css";

const Home = () => {
  return (
    <div className="home-container">
      {/* Navigation */}
      <header className="home-header">
        <nav className="home-nav">
          <Link to="/" className="home-logo">
            <div className="logo-icon">
              <FaTruck size={24} color="#2A407C" />
            </div>
            <h1>E-TRUCKING</h1>
          </Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <Link to="/login" className="quote-btn-nav">
              Login to Portal
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div
          className="hero-bg-overlay"
          style={{
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/truck-hero.jpg)`,
          }}
        ></div>
        <div className="hero-content">
          <h1 className="hero-title">The Future of Logistics Is Here</h1>
          <p className="hero-subtitle">
            Streamline your trucking operations with our intelligent management
            system. Real-time tracking, automated dispatch, and comprehensive
            analytics all in one platform.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section" id="features">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaMapMarkedAlt />
            </div>
            <h3>Real-Time Tracking</h3>
            <p>
              Monitor your entire fleet in real-time with our advanced GPS
              integration. Know exactly where your cargo is every second.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaChartLine />
            </div>
            <h3>Smart Analytics</h3>
            <p>
              Data-driven insights to optimize routes, reduce fuel consumption,
              and improve overall operational efficiency.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaShieldAlt />
            </div>
            <h3>Secure & Reliable</h3>
            <p>
              Enterprise-grade security for your data, ensuring your business
              operations run smoothly and securely 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>500+</h3>
            <p>Trucks Managed</p>
          </div>
          <div className="stat-item">
            <h3>10k+</h3>
            <p>Deliveries Completed</p>
          </div>
          <div className="stat-item">
            <h3>98%</h3>
            <p>On-Time Rate</p>
          </div>
          <div className="stat-item">
            <h3>24/7</h3>
            <p>Support Active</p>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="showcase-section">
        <div className="showcase-content">
          <div className="showcase-text">
            <span className="section-label">Why Choose Us</span>
            <h2 className="section-title">
              Complete Control Over Your Logistics
            </h2>
            <p className="section-description">
              Our platform brings all your logistical needs into one intuitive
              dashboard. Say goodbye to spreadsheets and manual tracking.
            </p>
            <div className="feature-list">
              <div className="feature-list-item">
                <FaCheck className="check-icon" />
                <span>Automated Driver Assignment</span>
              </div>
              <div className="feature-list-item">
                <FaCheck className="check-icon" />
                <span>Digital Document Management</span>
              </div>
              <div className="feature-list-item">
                <FaCheck className="check-icon" />
                <span>Client Portal Access</span>
              </div>
              <div className="feature-list-item">
                <FaCheck className="check-icon" />
                <span>Maintenance Scheduling</span>
              </div>
            </div>
          </div>
          <div className="showcase-image">
            <img
              src={`${process.env.PUBLIC_URL}/images/truck-hero.jpg`}
              alt="Dashboard Preview"
              className="app-screenshot"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = "none";
              }}
            />
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Optimize Your Fleet?</h2>
          <p className="cta-text">
            Join hundreds of logistics companies transforming their operations
            with E-Trucking.
          </p>
          <Link
            to="/login"
            className="hero-btn-primary"
            style={{ color: "var(--primary-color)" }}
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="modern-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>E-TRUCKING</h2>
            <p>
              Empowering logistics companies with cutting-edge technology for
              better fleet management.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul className="footer-links">
              <li>
                <a href="#">Features</a>
              </li>
              <li>
                <a href="#">Pricing</a>
              </li>
              <li>
                <a href="#">Case Studies</a>
              </li>
              <li>
                <a href="#">API</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul className="footer-links">
              <li>
                <a href="#">About Us</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
              <li>
                <a href="#">Contact</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <div className="social-icons">
              <FaFacebook />
              <FaTwitter />
              <FaLinkedin />
              <FaInstagram />
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 E-Trucking Management System. All rights reserved.</p>
          <div className="footer-legal">
            <a href="#">Privacy Policy</a> &nbsp;|&nbsp;{" "}
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
