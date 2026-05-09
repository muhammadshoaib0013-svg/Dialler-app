import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({ company_name: 'Dialler Pro', primary_color: '#D4AF37', logo_url: null, welcome_message: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tenant/theme')
      .then(res => res.json())
      .then(data => {
        setTheme(data);
        document.documentElement.style.setProperty('--brand-gold', data.primary_color);
        document.documentElement.style.setProperty('--brand-name', `"${data.company_name}"`);
        document.title = `${data.company_name} — Dialler`;
        setLoading(false);
      })
      .catch(e => {
        console.error('Failed to load theme:', e);
        document.documentElement.style.setProperty('--brand-gold', '#D4AF37');
        document.documentElement.style.setProperty('--brand-name', `"Dialler Pro"`);
        setLoading(false);
      });
  }, []);

  if (loading) return null; // Wait for theme to apply before rendering UI

  return (
    <ThemeContext.Provider value={{ theme, companyName: theme.company_name }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
