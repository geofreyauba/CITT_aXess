// Centralized barrel file for all Feather icons used across the aXess app

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
  FiPlus,          // Add / Create / New
  FiEdit,          // Edit
  FiTrash,         // Delete
  FiSend,          // Send message / submit (used in Help & Support)
  FiMail,          // Alternative for contact/email
  FiAlertCircle,   // Warnings / alerts
  FiCheckCircle,   // Success / approved
  FiXCircle,       // Error / reject / close

  // Added icons to support Settings.tsx usage
  FiSun,
  FiMoon,
  FiMonitor,
} from 'react-icons/fi';

export const Icons = {
  // Navigation / Sidebar
  Home: FiHome,
  Key: FiKey,
  FileText: FiFileText,
  BarChart: FiBarChart,
  Settings: FiSettings,
  HelpCircle: FiHelpCircle,
  LogOut: FiLogOut,

  // Header / Common UI
  Search: FiSearch,
  Bell: FiBell,

  // Stats / Dashboard
  Users: FiUsers,
  Lock: FiLock,

  // Misc / Utility
  Info: FiInfo,
  AlertCircle: FiAlertCircle,
  CheckCircle: FiCheckCircle,
  XCircle: FiXCircle,

  // Rooms page actions
  Plus: FiPlus,
  Edit: FiEdit,
  Trash: FiTrash,

  // Forms / Submit / Contact
  Send: FiSend,
  Mail: FiMail,

  // Appearance / theme icons used by Settings.tsx
  // Paintbrush re-uses FiEdit (if you prefer a different icon, replace FiEdit with another import)
  Paintbrush: FiEdit,
  Sun: FiSun,
  Moon: FiMoon,
  Monitor: FiMonitor,
} as const;