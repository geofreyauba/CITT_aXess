// src/pages/HelpSupport.tsx
import React, { useState } from 'react';
import { Icons } from '../components/icons';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: 'general' | 'rooms' | 'requests' | 'reports' | 'account';
}

const faqs: FAQ[] = [
  {
    id: 1,
    category: 'general',
    question: 'How do I navigate the dashboard?',
    answer: 'The dashboard displays key metrics including total users, rooms, requests, and reports. Use the sidebar menu to navigate between different sections: Dashboard, Rooms, Requests, Reports, Settings, and Help & Support.'
  },
  {
    id: 2,
    category: 'rooms',
    question: 'How do I add a new room?',
    answer: 'Navigate to the Rooms page and click the "Add Room" button in the top right. Fill in the room details including name, code, floor, location, and any additional notes. Click "Save" to create the room.'
  },
  {
    id: 3,
    category: 'rooms',
    question: 'Can I edit room details after creation?',
    answer: 'Yes! Hover over any room card to reveal the edit and delete buttons. Click the edit icon to modify room details. You can also click on a room card to view its details and then click "Edit".'
  },
  {
    id: 4,
    category: 'requests',
    question: 'How do room requests work?',
    answer: 'Users can request access to available rooms. As an admin, you can view all pending requests, approve or deny them, and track the request history. Approved requests grant the user access for the specified time period.'
  },
  {
    id: 5,
    category: 'requests',
    question: 'What are the different room statuses?',
    answer: 'Rooms can have the following statuses: Available (green) - ready for use, Occupied (red) - currently in use, Requested (orange) - pending approval, and Maintenance (gray) - temporarily unavailable.'
  },
  {
    id: 6,
    category: 'reports',
    question: 'How do I manage reports?',
    answer: 'Navigate to the Reports page to view all submitted reports. You can filter by status, priority, and date range. Click "Details" to view full information, "Assign" to mark as in progress, "Resolve" to close the report, or "Dismiss" to archive it.'
  },
  {
    id: 7,
    category: 'reports',
    question: 'Can I export report data?',
    answer: 'Yes! Use the "Export" button at the top of the Reports page to download a CSV file of all reports matching your current filters. This is useful for analysis or record-keeping.'
  },
  {
    id: 8,
    category: 'account',
    question: 'How do I change my password?',
    answer: 'Click on your profile avatar in the top right corner, then select "Account Settings". Navigate to the Security tab where you can update your password and enable two-factor authentication.'
  },
  {
    id: 9,
    category: 'general',
    question: 'What permissions do I have as an admin?',
    answer: 'As an admin, you have full access to all features including managing rooms, approving/denying requests, handling reports, configuring system settings, and viewing all analytics and user data.'
  },
  {
    id: 10,
    category: 'general',
    question: 'How often is the dashboard data updated?',
    answer: 'Dashboard statistics update in real-time. Charts and graphs refresh automatically every 30 seconds to show the latest data. You can also manually refresh by clicking the refresh icon.'
  }
];

const HelpSupport: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | FAQ['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [showContactForm, setShowContactForm] = useState(false);

  const categories = [
    { id: 'all' as const, label: 'All Topics', icon: Icons.FileText },
    { id: 'general' as const, label: 'General', icon: Icons.Home },
    { id: 'rooms' as const, label: 'Rooms', icon: Icons.Key },
    { id: 'requests' as const, label: 'Requests', icon: Icons.BarChart },
    { id: 'reports' as const, label: 'Reports', icon: Icons.FileText },
    { id: 'account' as const, label: 'Account', icon: Icons.Users },
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Support ticket submitted (demo):\n\nFrom: ${contactForm.name}\nEmail: ${contactForm.email}\nSubject: ${contactForm.subject}\nPriority: ${contactForm.priority}\n\nMessage:\n${contactForm.message}`);
    setContactForm({ name: '', email: '', subject: '', message: '', priority: 'medium' });
    setShowContactForm(false);
  };

  return (
    <>
      <h1 className="section-title">Help & Support</h1>

      {/* Quick Actions */}
      <div className="help-quick-actions">
        <div className="quick-action-card" onClick={() => setShowContactForm(true)}>
          <div className="quick-action-icon" style={{ background: 'rgba(79, 70, 229, 0.1)' }}>
            <Icons.Bell size={24} style={{ color: 'var(--soft-blue)' }} />
          </div>
          <h3>Contact Support</h3>
          <p>Get help from our team</p>
        </div>

        <div className="quick-action-card">
          <div className="quick-action-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <Icons.FileText size={24} style={{ color: 'var(--green-success)' }} />
          </div>
          <h3>Documentation</h3>
          <p>Browse user guides</p>
        </div>

        <div className="quick-action-card">
          <div className="quick-action-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <Icons.BarChart size={24} style={{ color: 'var(--orange-accent)' }} />
          </div>
          <h3>Video Tutorials</h3>
          <p>Watch how-to videos</p>
        </div>

        <div className="quick-action-card">
          <div className="quick-action-icon" style={{ background: 'rgba(107, 114, 128, 0.1)' }}>
            <Icons.Info size={24} style={{ color: 'var(--gray-neutral)' }} />
          </div>
          <h3>System Status</h3>
          <p>Check service health</p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="help-section">
        <h2 className="help-section-title">
          <Icons.HelpCircle size={24} />
          Frequently Asked Questions
        </h2>

        {/* Search Bar */}
        <div className="help-search">
          <Icons.Search size={18} />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="help-search-input"
          />
        </div>

        {/* Category Filters */}
        <div className="help-categories">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`help-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <cat.icon size={16} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="faq-list">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map(faq => (
              <div
                key={faq.id}
                className={`faq-item ${expandedFAQ === faq.id ? 'expanded' : ''}`}
                onClick={() => toggleFAQ(faq.id)}
              >
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <Icons.HelpCircle size={20} className={`faq-toggle ${expandedFAQ === faq.id ? 'rotated' : ''}`} />
                </div>
                {expandedFAQ === faq.id && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <Icons.Search size={48} style={{ color: 'var(--gray-neutral)', opacity: 0.5 }} />
              <p>No FAQs match your search. Try different keywords or contact support.</p>
            </div>
          )}
        </div>
      </div>

      {/* Resources Section */}
      <div className="help-section">
        <h2 className="help-section-title">
          <Icons.FileText size={24} />
          Resources & Documentation
        </h2>

        <div className="resources-grid">
          <div className="resource-card">
            <div className="resource-icon">
              <Icons.FileText size={28} />
            </div>
            <h3>Getting Started Guide</h3>
            <p>Learn the basics of using RoomFlow Admin in 10 minutes</p>
            <a href="#" className="resource-link">Read Guide →</a>
          </div>

          <div className="resource-card">
            <div className="resource-icon">
              <Icons.Key size={28} />
            </div>
            <h3>Room Management</h3>
            <p>Best practices for organizing and managing room inventory</p>
            <a href="#" className="resource-link">Read Guide →</a>
          </div>

          <div className="resource-card">
            <div className="resource-icon">
              <Icons.BarChart size={28} />
            </div>
            <h3>Analytics & Reports</h3>
            <p>Understanding your data and generating insights</p>
            <a href="#" className="resource-link">Read Guide →</a>
          </div>

          <div className="resource-card">
            <div className="resource-icon">
              <Icons.Settings size={28} />
            </div>
            <h3>Admin Configuration</h3>
            <p>Advanced settings and customization options</p>
            <a href="#" className="resource-link">Read Guide →</a>
          </div>

          <div className="resource-card">
            <div className="resource-icon">
              <Icons.Lock size={28} />
            </div>
            <h3>Security Best Practices</h3>
            <p>Keep your system and data secure</p>
            <a href="#" className="resource-link">Read Guide →</a>
          </div>

          <div className="resource-card">
            <div className="resource-icon">
              <Icons.Users size={28} />
            </div>
            <h3>User Management</h3>
            <p>Managing roles, permissions, and user accounts</p>
            <a href="#" className="resource-link">Read Guide →</a>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="help-section">
        <h2 className="help-section-title">
          <Icons.Bell size={24} />
          Contact Information
        </h2>

        <div className="contact-info-grid">
          <div className="contact-info-card">
            <Icons.Bell size={24} />
            <h3>Email Support</h3>
            <p>support@roomflow.example.com</p>
            <span className="response-time">Response within 24 hours</span>
          </div>

          <div className="contact-info-card">
            <Icons.HelpCircle size={24} />
            <h3>Live Chat</h3>
            <p>Monday - Friday, 9 AM - 5 PM EAT</p>
            <button className="chat-btn">Start Chat</button>
          </div>

          <div className="contact-info-card">
            <Icons.FileText size={24} />
            <h3>Knowledge Base</h3>
            <p>Browse 100+ articles</p>
            <a href="#" className="kb-link">Visit Knowledge Base →</a>
          </div>

          <div className="contact-info-card">
            <Icons.Info size={24} />
            <h3>System Version</h3>
            <p>RoomFlow Admin v2.4.1</p>
            <span className="version-status">Up to date</span>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="modal-overlay" onClick={() => setShowContactForm(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <h2>Contact Support</h2>
            <p style={{ color: 'var(--gray-neutral)', marginBottom: '1.5rem' }}>
              Fill out the form below and our team will get back to you within 24 hours.
            </p>

            <form onSubmit={handleContactSubmit}>
              <label>
                Your Name
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </label>

              <label>
                Subject
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  required
                />
              </label>

              <label>
                Priority
                <select
                  value={contactForm.priority}
                  onChange={e => setContactForm({ ...contactForm, priority: e.target.value as any })}
                >
                  <option value="low">Low - General question</option>
                  <option value="medium">Medium - Issue affecting work</option>
                  <option value="high">High - Critical system problem</option>
                </select>
              </label>

              <label>
                Message
                <textarea
                  value={contactForm.message}
                  onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Please describe your issue in detail..."
                  rows={6}
                  required
                />
              </label>

              <div className="modal-buttons">
                <button type="button" className="cancel-btn" onClick={() => setShowContactForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  <Icons.Bell size={16} /> Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpSupport;