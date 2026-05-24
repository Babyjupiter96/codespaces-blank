"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import {
  Award,
  Clock,
  MessageSquare,
  Shield,
  TrendingUp,
  Star,
  type LucideIcon,
} from "lucide-react";

interface Reason {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
}

const reasons: Reason[] = [
  {
    icon: Award,
    number: "01",
    title: "Uncompromising Quality Standards",
    description:
      "Every project undergoes rigorous quality checks at each phase. We use premium materials and time-tested techniques that deliver results built to outlast the generations who will use them.",
  },
  {
    icon: Clock,
    number: "02",
    title: "On-Time, Every Time",
    description:
      "Our 98% on-time delivery record is the result of meticulous scheduling, proactive logistics, and a team that treats your timeline as non-negotiable. Delays cost money — we don't allow them.",
  },
  {
    icon: MessageSquare,
    number: "03",
    title: "Clear Communication Throughout",
    description:
      "Weekly progress updates, a dedicated project manager, and 24-hour response times mean you're never left wondering about your investment. Transparency is our policy, not an afterthought.",
  },
  {
    icon: Shield,
    number: "04",
    title: "Licensed, Bonded & Fully Insured",
    description:
      "Graystone holds all required Arizona ROC licenses, full general liability coverage, and workers' compensation insurance. You're protected at every stage of construction.",
  },
  {
    icon: TrendingUp,
    number: "05",
    title: "Transparent Budgeting",
    description:
      "Our detailed, itemized proposals leave nothing to interpretation. No hidden fees, no surprise change orders. What we quote is what you pay — and we stand behind that commitment.",
  },
  {
    icon: Star,
    number: "06",
    title: "Premium Execution & Finish",
    description:
      "The final 10% of a project is where ordinary contractors cut corners. Graystone's finish work is what our clients remember — and what earns us referrals for life.",
  },
];

export default function WhyGraystone() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="why-graystone" className="relative section-padding bg-[#111111] overflow-hidden">
      {/* Large background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span
          className="font-display text-[12vw] font-800 text-[#1A1A1A] whitespace-nowrap select-none leading-none"
          style={{ letterSpacing: "0.15em" }}
        >
          GRAYSTONE
        </span>
      </div>

      {/* Subtle gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-[#C6A15B]/5 to-transparent pointer-events-none blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 md:mb-16"
        >
          <span className="text-[11px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold">
            Why Choose Us
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-700 text-[#F9FAFB] mt-3 mb-4">
            The Graystone Difference
          </h2>
          <p className="text-[#6B7280] max-w-2xl mx-auto text-base">
            Six pillars that separate a good contractor from a great one — and why Arizona&apos;s most discerning clients choose Graystone repeatedly.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-[#C6A15B]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#C6A15B]" />
            <div className="h-[1px] w-12 bg-[#C6A15B]" />
          </div>
        </motion.div>

        {/* Reasons grid */}
        <div ref={ref} className="space-y-4">
          {reasons.map((reason, i) => {
            const Icon = reason.icon;
            const isEven = i % 2 === 0;

            return (
              <motion.div
                key={reason.number}
                initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                className="group flex flex-col sm:flex-row items-start gap-6 p-6 md:p-8 border border-[#2A2A2A] bg-[#141414] rounded-sm hover:border-[#C6A15B]/40 hover:bg-[#161616] transition-all duration-300"
              >
                {/* Number */}
                <div className="flex-shrink-0 font-display text-4xl md:text-5xl font-700 text-[#2A2A2A] group-hover:text-[#C6A15B]/20 transition-colors duration-300 leading-none w-16 text-center">
                  {reason.number}
                </div>

                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-sm bg-[#C6A15B]/10 flex items-center justify-center group-hover:bg-[#C6A15B]/20 transition-colors duration-300 mt-0.5">
                  <Icon size={22} className="text-[#C6A15B]" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#F9FAFB] text-lg mb-2 group-hover:text-[#C6A15B] transition-colors duration-300">
                    {reason.title}
                  </h3>
                  <p className="text-[#6B7280] text-sm sm:text-base leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Closing stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { value: "98%", label: "On-Time Delivery Rate" },
            { value: "Zero", label: "Unresolved Claims" },
            { value: "A+", label: "BBB Rating" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="text-center border border-[#2A2A2A] bg-[#141414] rounded-sm py-8 px-6 hover:border-[#C6A15B]/30 transition-all duration-300"
            >
              <div className="font-display text-4xl font-700 text-gradient-gold mb-2">
                {stat.value}
              </div>
              <div className="text-[#6B7280] text-sm tracking-wider uppercase font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
