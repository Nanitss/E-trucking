import React, { useState, useEffect } from "react";
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
  FaBars,
  FaTimes,
} from "react-icons/fa";

const Home = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when clicking a link
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="home-container">
      {/* Navigation */}
      <header className={`home-header ${isScrolled ? "scrolled" : ""}`}>
        <nav className="home-nav">
          <div className={`nav-pill ${isScrolled ? "scrolled" : ""}`}>
            <a href="#" className="nav-link" onClick={closeMobileMenu}>
              Home
            </a>
            <a href="#about" className="nav-link" onClick={closeMobileMenu}>
              About
            </a>
            <a href="#features" className="nav-link" onClick={closeMobileMenu}>
              Features
            </a>
            <a href="#showcase" className="nav-link" onClick={closeMobileMenu}>
              Why Us
            </a>
            <a href="#stats" className="nav-link" onClick={closeMobileMenu}>
              Stats
            </a>
            <a href="#contact" className="nav-link" onClick={closeMobileMenu}>
              Contact
            </a>
            <Link to="/login" className="nav-cta-btn" onClick={closeMobileMenu}>
              Login
            </Link>
          </div>

          {/* Mobile hamburger menu button */}
          <button
            className="mobile-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </nav>

        {/* Mobile menu overlay */}
        <div
          className={`mobile-menu-overlay ${isMobileMenuOpen ? "open" : ""}`}
        >
          <div className="mobile-menu-content">
            <a href="#" className="mobile-nav-link" onClick={closeMobileMenu}>
              Home
            </a>
            <a
              href="#about"
              className="mobile-nav-link"
              onClick={closeMobileMenu}
            >
              About
            </a>
            <a
              href="#features"
              className="mobile-nav-link"
              onClick={closeMobileMenu}
            >
              Features
            </a>
            <a
              href="#showcase"
              className="mobile-nav-link"
              onClick={closeMobileMenu}
            >
              Why Us
            </a>
            <a
              href="#stats"
              className="mobile-nav-link"
              onClick={closeMobileMenu}
            >
              Stats
            </a>
            <a
              href="#contact"
              className="mobile-nav-link"
              onClick={closeMobileMenu}
            >
              Contact
            </a>
            <Link
              to="/login"
              className="mobile-cta-btn"
              onClick={closeMobileMenu}
            >
              Login to Portal
            </Link>
          </div>
        </div>
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
