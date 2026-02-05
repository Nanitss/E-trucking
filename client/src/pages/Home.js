import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaTruck,
  FaChartLine,
  FaShieldAlt,
  FaMapMarkedAlt,
  FaCheck,
  FaWrapper, // Note: FaWrapper doesn't exist, removing extraneous fallback if any
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaInstagram,
  FaBars,
  FaTimes,
  FaArrowRight,
} from "react-icons/fa";

const Home = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="font-sans text-gray-800 antialiased overflow-x-hidden">
      {/* Navigation */}
      <header
        className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? "bg-white/90 backdrop-blur-md shadow-md py-4" : "bg-transparent py-6"
          }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link
            to="/"
            className={`text-2xl font-extrabold tracking-tight flex items-center gap-2 ${isScrolled ? "text-blue-900" : "text-white"
              }`}
          >
            <img
              src={process.env.PUBLIC_URL + "/images/logo.webp"}
              alt="E-TRUCKING"
              className="h-20 w-auto object-contain"
            />
            <span className={isScrolled ? "text-blue-900" : "text-white"}>E-TRUCKING</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            {["Home", "About", "Features", "Why Us", "Stats", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "")}`}
                className={`text-sm font-medium transition-colors hover:text-blue-500 ${isScrolled ? "text-gray-700" : "text-white/90 hover:text-white"
                  }`}
              >
                {item}
              </a>
            ))}
            <Link
              to="/login"
              className={`px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg transform hover:-translate-y-0.5 ${isScrolled
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white text-blue-900 hover:bg-gray-100"
                }`}
            >
              Login
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden focus:outline-none ${isScrolled ? "text-gray-800" : "text-white"
              }`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 z-40 bg-blue-900/95 backdrop-blur-xl transition-transform duration-300 ease-in-out flex flex-col items-center justify-center space-y-8 ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          style={{ top: "0", left: "0", height: "100vh", width: "100vw" }}
        >
          <button
            className="absolute top-6 right-6 text-white/80 hover:text-white focus:outline-none"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FaTimes size={32} />
          </button>

          {["Home", "About", "Features", "Why Us", "Stats", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "")}`}
              className="text-2xl font-bold text-white hover:text-blue-300 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link
            to="/login"
            className="px-8 py-3 bg-white text-blue-900 rounded-full font-bold text-lg shadow-xl hover:bg-gray-100 transition-all"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Login to Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={`${process.env.PUBLIC_URL}/images/truck-hero.jpg`}
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-black/60"></div>
        </div>

        <div className="container relative z-10 px-6 text-center text-white max-w-4xl mx-auto mt-16">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-500/30 border border-blue-400/30 text-blue-200 text-sm font-semibold mb-6 backdrop-blur-sm animate-fade-in-up">
            REVOLUTIONIZING LOGISTICS
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 animate-fade-in-up animation-delay-150">
            The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Logistics</span> Is Here
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 leading-relaxed max-w-2xl mx-auto animate-fade-in-up animation-delay-300">
            Streamline your trucking operations with our intelligent management system. Real-time tracking, automated dispatch, and comprehensive analytics all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-450">
            <Link
              to="/login"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-bold text-lg backdrop-blur-sm transition-all transform hover:-translate-y-1"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <FaArrowRight className="text-white/50 rotate-90 text-2xl" />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Powerful Features for Modern Fleets</h2>
            <p className="text-gray-600 text-lg">Everything you need to manage your logistics operation efficiently and effectively.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: <FaMapMarkedAlt />,
                title: "Real-Time Tracking",
                desc: "Monitor your entire fleet in real-time with our advanced GPS integration. Know exactly where your cargo is every second.",
                color: "bg-blue-100 text-blue-600"
              },
              {
                icon: <FaChartLine />,
                title: "Smart Analytics",
                desc: "Data-driven insights to optimize routes, reduce fuel consumption, and improve overall operational efficiency.",
                color: "bg-purple-100 text-purple-600"
              },
              {
                icon: <FaShieldAlt />,
                title: "Secure & Reliable",
                desc: "Enterprise-grade security for your data, ensuring your business operations run smoothly and securely 24/7.",
                color: "bg-green-100 text-green-600"
              }
            ].map((feature, idx) => (
              <div key={idx} className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-100 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-6 ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center divide-x-0 md:divide-x divide-white/10">
            {[
              { num: "400+", label: "Trucks Managed" },
              { num: "10k+", label: "Deliveries Completed" },
              { num: "98%", label: "On-Time Rate" },
            ].map((stat, idx) => (
              <div key={idx} className="p-4">
                <div className="text-4xl md:text-5xl font-extrabold text-blue-300 mb-2">{stat.num}</div>
                <div className="text-blue-100 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <span className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block">Why Choose Us</span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                Complete Control Over Your Logistics
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                Our platform brings all your logistical needs into one intuitive dashboard. Say goodbye to spreadsheets and manual tracking, and hello to automated efficiency.
              </p>

              <div className="space-y-4">
                {[
                  "Automated Driver Assignment",
                  "Digital Document Management",
                  "Client Portal Access",
                  "Maintenance Scheduling"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-500 flex items-center justify-center">
                      <FaCheck size={12} />
                    </div>
                    <span className="text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl transform rotate-3 scale-105 opacity-20 blur-lg"></div>
              <img
                src={`${process.env.PUBLIC_URL}/images/truck-hero.jpg`}
                alt="Dashboard Preview"
                className="relative rounded-2xl shadow-2xl border-4 border-white transform transition-transform hover:scale-[1.01]"
                onError={(e) => {
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?q=80&w=2070&auto=format&fit=crop"; // Fallback image
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-24 bg-gradient-to-br from-blue-700 to-blue-900 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-6 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Optimize Your Fleet?</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of logistics companies transforming their operations with E-Trucking.
          </p>
          <Link
            to="/login"
            className="inline-block px-10 py-5 bg-white text-blue-700 rounded-full font-bold text-lg shadow-xl hover:bg-blue-50 hover:scale-105 transition-all"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <Link to="/" className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                <img
                  src={process.env.PUBLIC_URL + "/images/logo.webp"}
                  alt="E-TRUCKING"
                  className="h-10 w-auto object-contain"
                />
                <span className="text-white">E-TRUCKING</span>
              </Link>
              <p className="text-gray-400 leading-relaxed mb-6">
                Empowering logistics companies with cutting-edge technology for better fleet management.
              </p>
              <div className="flex gap-4">
                {[FaFacebook, FaTwitter, FaLinkedin, FaInstagram].map((Icon, idx) => (
                  <a key={idx} href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Product</h4>
              <ul className="space-y-3">
                {["Features", "Pricing", "Case Studies", "API"].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-blue-400 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Company</h4>
              <ul className="space-y-3">
                {["About Us", "Careers", "Blog", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-blue-400 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 mt-1">📍</span>
                  <span>123 Logistics Way, Suite 100, Transport City, TC 90210</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-blue-500">📧</span>
                  <a href="mailto:info@etrucking.com" className="hover:text-blue-400">info@etrucking.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-blue-500">📞</span>
                  <span>(555) 123-4567</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>&copy; 2025 E-Trucking Management System. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
