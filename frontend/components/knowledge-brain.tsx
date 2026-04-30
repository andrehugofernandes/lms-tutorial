"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

const INBOUND_SYMBOLS = ["E=mc²", "π", "{ }", "</>", "A", "Ω", "Σ", "∫", "dx", "μ"];
const OUTBOUND_SYMBOLS = ["💡", "🚀", "✨", "🎯", "🔥", "⚡"];

export const KnowledgeBrain = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />

            {/* Inbound Knowledge Particles (Left to Center) */}
            <div className="absolute inset-0 pointer-events-none">
                {isMounted && [...Array(8)].map((_, i) => (
                    <motion.div
                        key={`in-${i}`}
                        initial={{ opacity: 0, x: -100, y: Math.random() * 100 - 50, scale: 0.5 }}
                        animate={{ opacity: [0, 1, 0], x: 0, y: 0, scale: 1 }}
                        transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 3,
                            ease: "easeInOut"
                        }}
                        className="absolute left-0 top-1/2 text-primary font-mono font-bold text-sm md:text-base opacity-70"
                    >
                        {INBOUND_SYMBOLS[Math.floor(Math.random() * INBOUND_SYMBOLS.length)]}
                    </motion.div>
                ))}
            </div>

            {/* Outbound Ideas Particles (Center to Right) */}
            <div className="absolute inset-0 pointer-events-none">
                {isMounted && [...Array(6)].map((_, i) => (
                    <motion.div
                        key={`out-${i}`}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: [0, 1, 0], x: 100 + Math.random() * 50, y: Math.random() * 100 - 50, scale: 1.5 }}
                        transition={{
                            duration: 2.5 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 3,
                            ease: "easeOut"
                        }}
                        className="absolute right-1/4 top-1/2 text-2xl"
                    >
                        {OUTBOUND_SYMBOLS[Math.floor(Math.random() * OUTBOUND_SYMBOLS.length)]}
                    </motion.div>
                ))}
            </div>

            {/* Brain Image */}
            <motion.div 
                className="relative w-48 h-48 md:w-64 md:h-64 z-10"
                animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="w-full h-full overflow-hidden flex items-center justify-center">
                    <Image 
                        src="/custom-brain.png" 
                        alt="Knowledge Processing Brain" 
                        fill 
                        className="object-contain"
                    />
                </div>
            </motion.div>
        </div>
    );
};
