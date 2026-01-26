// src/components/icons/index.tsx
// Central place for all icons used in the project

import {
  FiHome,
  FiKey,
  FiFileText,
  FiBarChart,
  FiSettings,
  FiHelpCircle,
  FiLogOut,
  FiSearch,
  FiBell,
  FiUsers,
  FiLock,
  FiInfo,
} from 'react-icons/fi';

export const Icons = {
  // Layout / Navigation
  Home: FiHome,
  Key: FiKey,
  FileText: FiFileText,
  BarChart:   FiBarChart,
  Settings: FiSettings,
  HelpCircle: FiHelpCircle,
  LogOut: FiLogOut,

  // Header
  Search: FiSearch,
  Bell: FiBell,

  // Stats
  Users: FiUsers,
  Lock: FiLock,

  // Misc
  Info: FiInfo,
} as const;