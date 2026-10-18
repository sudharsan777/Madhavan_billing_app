/**
 * Dashboard Screen — Full-Screen Page
 *
 * This is a normal Expo Router screen (NOT a Modal).
 * Navigate to it with router.push('/dashboard').
 */
import React from 'react';
import SalesDashboard from '../components/SalesDashboard';

export default function DashboardScreen() {
  return <SalesDashboard showBack={true} />;
}
