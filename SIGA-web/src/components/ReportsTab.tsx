import React from 'react';
import { FacultiesTab } from './FacultiesTab';

interface ReportsTabProps {
  facultades: any[];
}

/**
 * ReportsTab component displaying Reportes y Consultas por Unidad Académica / Dependencia
 */
export const ReportsTab: React.FC<ReportsTabProps> = ({ facultades }) => {
  return <FacultiesTab facultades={facultades} />;
};
