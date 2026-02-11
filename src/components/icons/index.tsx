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
  FiSend,          // Send message / submit
  FiMail,          // Email / contact
  FiAlertCircle,   // Warnings / alerts
  FiCheckCircle,   // Success / approved
  FiXCircle,       // Error / reject / close

  // Added icons to support Settings.tsx usage
  FiSun,
  FiMoon,
  FiMonitor,

  // Sidebar collapse/expand toggle icons
  FiChevronLeft,
  FiChevronRight,

  // Help & Support page
  FiPhone,
  FiMapPin,

  // Reports page specific icons
  FiCalendar,
  FiClock,
  FiUser,
  FiFilter,
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
  Paintbrush: FiEdit,
  Sun: FiSun,
  Moon: FiMoon,
  Monitor: FiMonitor,

  // Sidebar toggle icons
  ChevronLeft: FiChevronLeft,
  ChevronRight: FiChevronRight,

  // Help & Support specific
  Phone: FiPhone,
  MapPin: FiMapPin,

  // Reports page specific
  Calendar: FiCalendar,
  Clock: FiClock,
  User: FiUser,
  Filter: FiFilter,
} as const;