import React, { createContext, useContext, useState } from 'react';

const TreatmentContext = createContext();

export const TreatmentProvider = ({ children }) => {
  // Structure: { id: 'patientId', minimized: boolean } or null
  const [activeTreatment, setActiveTreatment] = useState(null);

  const startTreatment = (patientId) => {
    setActiveTreatment({ id: patientId, minimized: false });
  };

  const minimizeTreatment = () => {
    setActiveTreatment(prev => prev ? { ...prev, minimized: true } : null);
  };

  const maximizeTreatment = () => {
    setActiveTreatment(prev => prev ? { ...prev, minimized: false } : null);
  };

  const closeTreatment = () => {
    // Optional: Add confirmation if unsaved changes exist
    if (window.confirm("Are you sure you want to close this session? Any unsaved chart data might be lost.")) {
      setActiveTreatment(null);
    }
  };

  return (
    <TreatmentContext.Provider value={{ activeTreatment, startTreatment, minimizeTreatment, maximizeTreatment, closeTreatment }}>
      {children}
    </TreatmentContext.Provider>
  );
};

export const useTreatment = () => useContext(TreatmentContext);