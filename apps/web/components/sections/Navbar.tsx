"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Projects", href: "#projects" },
  { label: "About", href: "#why-graystone" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLinkClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#111111]/90 backdrop-blur-xl border-b border-[#2A2A2A] shadow-[0_4px_32px_rgba(0,0,0,0.6)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <motion.a
              href="#"
              className="flex flex-col group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <span className="font-display text-xl md:text-2xl font-700 text-[#F9FAFB] tracking-[0.12em] leading-none">
                GRAYSTONE
              </span>
              <div className="flex items-center gap-2">
                <div className="h-[1px] w-full bg-gradient-to-r from-[#C6A15B] to-transparent" />
              </div>
              <span className="text-[10px] tracking-[0.25em] text-[#C6A15B] font-medium uppercase mt-0.5">
                Contracting LLC
              </span>
            </motion.a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} />
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:block">
              <Button
                variant="gold"
                size="default"
                onClick={() => handleLinkClick("#contact")}
                className="text-sm tracking-wider font-semibold uppercase"
              >
                Request Estimate
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <motion.button
              className="md:hidden relative z-50 p-2 text-[#F9FAFB] hover:text-[#C6A15B] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle mobile menu"
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={24} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-xl flex flex-col items-center justify-center"
          >
            {/* Decorative lines */}
            <div className="absolute inset-0 architectural-grid opacity-20" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent" />

            <nav className="flex flex-col items-center gap-2 w-full max-w-sm px-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: i * 0.07 }}
                  className="w-full"
                >
                  <button
                    onClick={() => handleLinkClick(link.href)}
                    className="w-full text-center py-4 text-2xl font-display text-[#F9FAFB] hover:text-[#C6A15B] transition-colors duration-200 border-b border-[#2A2A2A] hover:border-[#C6A15B]/30"
                  >
                    {link.label}
                  </button>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: navLinks.length * 0.07 }}
                className="w-full mt-6"
              >
                <Button
                  variant="gold"
                  size="lg"
                  onClick={() => handleLinkClick("#contact")}
                  className="w-full text-base tracking-wider font-semibold uppercase"
                >
                  Request Estimate
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="relative group text-sm font-medium text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors duration-200 py-1"
    >
      {label}
      <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#C6A15B] group-hover:w-full transition-all duration-300 ease-out" />
    </a>
  );
}
