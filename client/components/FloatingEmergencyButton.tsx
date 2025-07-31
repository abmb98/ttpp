import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { aggressiveFirebaseRecovery } from '@/lib/firebase';

export const FloatingEmergencyButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Monitor for Firebase fetch errors
    const originalFetch = window.fetch;
    let errorCounter = 0;

    window.fetch = (...args) => {
      return originalFetch(...args).catch(error => {
        if (error.message?.includes('Failed to fetch')) {
          errorCounter++;
          setErrorCount(errorCounter);
          
          // Show emergency button after 2 fetch failures
          if (errorCounter >= 2) {
            setIsVisible(true);
          }
        }
        throw error;
      });
    };

    // Monitor console errors for Firebase issues
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Failed to fetch') && message.includes('firebase')) {
        errorCounter++;
        setErrorCount(errorCounter);
        setIsVisible(true);
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.fetch = originalFetch;
      console.error = originalConsoleError;
    };
  }, []);

  const handleEmergencyFix = async () => {
    if (confirm(
      '🚨 RÉCUPÉRATION D\'URGENCE\n\n' +
      `${errorCount} erreurs de connexion détectées.\n\n` +
      'Cette action va effacer tout le cache et redémarrer l\'application.\n\n' +
      'Continuer ?'
    )) {
      await aggressiveFirebaseRecovery();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <Button
        onClick={handleEmergencyFix}
        className="bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse"
        size="sm"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        🚨 ERREUR CRITIQUE ({errorCount})
      </Button>
    </div>
  );
};
