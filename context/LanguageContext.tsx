"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '@/lib/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, ...args: any[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('it');

    useEffect(() => {
        const stored = localStorage.getItem('language') as Language;
        const initial: Language = stored === 'it' || stored === 'en'
            ? stored
            : navigator.language.split('-')[0] === 'en' ? 'en' : 'it';
        setLanguage(initial);
        // Mirror to a cookie so the server-rendered <html lang> matches the user's choice.
        document.cookie = `lang=${initial}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        if (typeof document !== 'undefined' && document.documentElement.lang !== initial) {
            document.documentElement.lang = initial;
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
        document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang;
        }
    };

    const t = (key: string, ...args: any[]): string => {
        const translation = (translations[language] as any)[key];
        if (!translation) return key;
        if (typeof translation === 'function') {
            return translation(...args);
        }
        return translation;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
