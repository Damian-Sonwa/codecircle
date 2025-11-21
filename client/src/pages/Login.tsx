import {useEffect} from 'react';
import {AuthSlider} from '@/components/Auth/AuthSlider';

export const LoginPage = () => {
  useEffect(() => {
    console.log('[LoginPage] ✅ NEW VERSION LOADED - 2024-01-15-refactor-v3');
    const indicator = document.createElement('div');
    indicator.id = 'login-version-check';
    indicator.style.cssText = 'position:fixed;top:20px;left:20px;background:#3b82f6;color:white;padding:12px 16px;border-radius:8px;font-size:12px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-family:monospace;';
    indicator.innerHTML = '✅ NEW VERSION LOADED<br/>v3 - 2024-01-15<br/>Auth-first routing active';
    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 10000); // Remove after 10 seconds
  }, []);
  
  return <AuthSlider defaultView="login" />;
};


