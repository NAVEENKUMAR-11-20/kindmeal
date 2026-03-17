import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Heart, LogIn, User,
  UserPlus, Utensils, Truck, HandHeart,
  Building2, Star, ArrowRight, Mail, Phone, MapPin
} from 'lucide-react';

// ─── animation helpers ────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay },
});

const FadeUp = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── data ─────────────────────────────────────────────────────────────────────
const steps = [
  { num: '01', icon: UserPlus, title: 'Register', desc: 'Create a free account as a Food Provider or Orphanage in minutes.' },
  { num: '02', icon: Utensils, title: 'Share or Request', desc: 'Providers list surplus food. Orphanages browse and request donations.' },
  { num: '03', icon: Truck, title: 'Deliver & Feed', desc: 'Food is collected and delivered to those who need it most.' },
];

const stats = [
  { value: '0+', label: 'Meals Donated', icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
  { value: '0+', label: 'People Helped', icon: User, color: 'text-green-600', bg: 'bg-green-50' },
  { value: '0+', label: 'Active Food Providers', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50' },
  { value: '0+', label: 'Partner Orphanages', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50' },
];

const gallery = [
  { url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80', alt: 'Volunteers distributing food' },
  { url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80', alt: 'Food donation boxes' },
  { url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80', alt: 'People helping homeless' },
  { url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=600&q=80', alt: 'Smiling children receiving meals' },
];

// ─── component ────────────────────────────────────────────────────────────────
const Home = () => {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ══════════ NAVBAR ══════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-xl">
              <Heart className="h-6 w-6 text-green-600 fill-green-600" />
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">
              Kind<span className="text-green-600">Meal</span>
            </span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-xl transition-all"
            >
              Home
            </Link>
            <Link
              to="/map"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
            >
              <MapPin className="h-4 w-4" />
              Map View
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          </div>

          {/* Login CTA */}
        <Link
          to="/login"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-lg shadow-green-600/30 hover:-translate-y-0.5 transition-all"
        >
          <LogIn className="h-4 w-4" /> Login
        </Link>
      </div>
    </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1593113630400-ea4288922559?w=1600&q=80')" }}
        />
        {/* Dark + green gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-900/70 to-green-900/60" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 text-green-300 px-4 py-2 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm">
            <Heart className="h-4 w-4 fill-green-400 text-green-400" />
            Fighting food waste, one meal at a time
          </motion.div>

          <motion.h1 {...fadeUp(0.1)} className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Don't Waste Food.<br />
            <span className="text-green-400">Share Hope.</span>
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Your extra meal can become someone's only meal.
            Join KindMeal and help deliver food to orphanages and people in need.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-2xl shadow-xl shadow-green-500/40 hover:-translate-y-1 transition-all text-base"
            >
              <HandHeart className="h-5 w-5" /> Donate Food
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/30 backdrop-blur-sm hover:-translate-y-1 transition-all text-base"
            >
              <Building2 className="h-5 w-5" /> Join as Orphanage
            </Link>
          </motion.div>

          {/* Scroll hint */}
          <motion.div {...fadeUp(0.5)} className="mt-16 flex flex-col items-center gap-2 text-gray-400 text-sm">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2">
              <div className="w-1 h-2 bg-white/60 rounded-full" />
            </motion.div>
            Scroll to learn more
          </motion.div>
        </div>
      </section>

      {/* ══════════ AWARENESS ══════════ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Our Mission</span>
              <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-6 leading-tight">
                Why KindMeal<br />Exists
              </h2>
              <div className="space-y-4 text-gray-600 text-base leading-relaxed">
                <p>Every day, tons of perfectly good food are wasted while many people sleep hungry.</p>
                <p>KindMeal connects food providers, restaurants, and households with orphanages and NGOs who need food.</p>
                <p className="font-semibold text-gray-800">Together we can reduce food waste and feed more people.</p>
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 mt-8 text-green-600 font-semibold hover:text-green-700 group">
                Get started today <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🍎', text: '1/3 of all food produced globally is wasted' },
                  { icon: '😢', text: '800M people go to bed hungry every night' },
                  { icon: '🤝', text: 'Simple connections can change lives' },
                  { icon: '💚', text: 'Your surplus = someone\'s survival' },
                ].map((c, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <span className="text-3xl mb-3 block">{c.icon}</span>
                    <p className="text-sm font-medium text-gray-700">{c.text}</p>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <FadeUp>
            <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Simple Process</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">How It Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto mb-16">Three simple steps to connect food with the people who need it most.</p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <FadeUp key={i} delay={i * 0.12}>
                <div className="relative bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <span className="absolute top-6 right-6 text-5xl font-black text-gray-100 group-hover:text-green-100 transition-colors select-none">{s.num}</span>
                  <div className="h-14 w-14 bg-green-100 group-hover:bg-green-500 rounded-2xl flex items-center justify-center mb-6 transition-colors">
                    <s.icon className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ IMPACT STATS ══════════ */}
      <section className="py-24 bg-gradient-to-br from-green-600 to-green-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?w=1600&q=80')", backgroundSize: 'cover' }} />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <FadeUp>
            <p className="text-green-200 font-semibold text-sm uppercase tracking-widest mb-3">Real Impact</p>
            <h2 className="text-4xl font-extrabold text-white mb-4">Our Numbers Speak</h2>
            <p className="text-green-200 text-lg mb-16 italic">"Small acts of kindness can create big changes in the world."</p>
          </FadeUp>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 hover:bg-white/20 transition-colors">
                  <div className={`h-12 w-12 ${s.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <p className="text-3xl font-black text-white mb-1">{s.value}</p>
                  <p className="text-green-200 text-sm font-medium">{s.label}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ GALLERY ══════════ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeUp className="text-center mb-14">
            <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Stories of Kindness</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">Making a Difference</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Every photo tells a story of compassion, community, and hope.</p>
          </FadeUp>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gallery.map((img, i) => (
              <FadeUp key={i} delay={i * 0.08}>
                <div className="overflow-hidden rounded-3xl aspect-square group shadow-md hover:shadow-xl transition-shadow">
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <FadeUp>
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-[2.5rem] p-12 md:p-16">
              <span className="text-5xl block mb-6">🍛</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                Be the Reason<br />Someone Eats<span className="text-green-600"> Today</span>
              </h2>
              <p className="text-gray-600 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                A single meal can make a difference.<br />
                Join KindMeal and turn surplus food into hope.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-600/30 hover:-translate-y-1 transition-all"
                >
                  <HandHeart className="h-5 w-5" /> Start Donating
                </Link>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-green-700 font-bold rounded-2xl border-2 border-green-300 hover:border-green-500 hover:-translate-y-1 transition-all"
                >
                  <UserPlus className="h-5 w-5" /> Register Now
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="bg-gray-900 text-gray-400 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-gray-800">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-green-900 p-2 rounded-xl">
                  <Heart className="h-5 w-5 text-green-400 fill-green-400" />
                </div>
                <span className="font-bold text-lg text-white">Kind<span className="text-green-400">Meal</span></span>
              </div>
              <p className="text-sm leading-relaxed">
                Together we can end food waste and fight hunger.
                Every meal shared is a life touched.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-green-400 transition-colors">Home</Link></li>
                <li><Link to="/login" className="hover:text-green-400 transition-colors">Login / Register</Link></li>
                <li><Link to="/map" className="hover:text-green-400 transition-colors">Map View</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-green-400" /> hello@kindmeal.org</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-green-400" /> +1 800 KIND MEAL</li>
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-400" /> Serving communities worldwide</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 text-center text-sm flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} KindMeal. All rights reserved.</p>
            <p className="flex items-center gap-1">Made with <Heart className="h-3.5 w-3.5 text-red-400 fill-red-400" /> for humanity</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
