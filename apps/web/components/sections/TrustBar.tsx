"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const trustItems = [
  { text: "Licensed & Insured" },
  { text: "Commercial & Residential" },
  { text: "Veteran-Owned Business" },
  { text: "Financing Available" },
  { text: "15+ Years Experience" },
];

export default function TrustBar() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section
      id="trust-bar"
      className="relative bg-[#141414] border-t border-[#C6A15B]/30 border-b border-b-[#2A2A2A]"
    >
      {/* Gold top border accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent" />

      {/* Desktop layout */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex items-center justify-center flex-wrap gap-0"
        >
          {trustItems.map((item, i) => (
            <React.Fragment key={item.text}>
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2.5 px-6 py-5"
              >
                <ShieldCheck
                  size={16}
                  className="text-[#C6A15B] flex-shrink-0"
                  strokeWidth={2}
                />
                <span className="text-sm font-medium text-[#F9FAFB] whitespace-nowrap tracking-wide">
                  {item.text}
                </span>
              </motion.div>
              {i < trustItems.length - 1 && (
                <div className="w-[1px] h-8 bg-[#2A2A2A] flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      {/* Mobile marquee */}
      <div className="sm:hidden overflow-hidden py-4">
        <motion.div
          className="flex gap-0 items-center"
          animate={{ x: [0, -600] }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop",
          }}
          style={{ width: "max-content" }}
        >
          {[...trustItems, ...trustItems].map((item, i) => (
            <div
              key={`${item.text}-${i}`}
              className="flex items-center gap-2 px-6 flex-shrink-0"
            >
              <ShieldCheck
                size={14}
                className="text-[#C6A15B] flex-shrink-0"
                strokeWidth={2}
              />
              <span className="text-sm font-medium text-[#F9FAFB] whitespace-nowrap">
                {item.text}
              </span>
              <span className="ml-4 text-[#2A2A2A]">|</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
