// src/pages/HelpSupport.tsx
import React from 'react';
import { Icons } from '../components/icons';

const HelpSupport: React.FC = () => {
  return (
    <>
      <h1 className="section-title">Help & Support</h1>

      <div className="help-grid">
        {/* FAQ Section */}
        <div className="help-card faq-card">
          <div className="card-header">
            <Icons.HelpCircle size={22} />
            <h2>Frequently Asked Questions</h2>
          </div>

          <div className="faq-list">
            <div className="faq-item">
              <h3>How do I request a room key?</h3>
              <p>Go to the Rooms page, click on any room card, then select "Request Key". Fill in the purpose, devices/items you're bringing, and desired time slot. Submit — your request will be reviewed quickly.</p>
            </div>

            <div className="faq-item">
              <h3>What should I do if I lose or damage a key?</h3>
              <p>Report it immediately using the "Report Issue" button on the Rooms page or speak to the Guard at the desk. Replacement fees may apply depending on the situation.</p>
            </div>

            <div className="faq-item">
              <h3>How long can I book a room for?</h3>
              <p>Standard sessions are up to 4 hours. For longer bookings, include justification in the purpose field — coordinator approval is required.</p>
            </div>

            <div className="faq-item">
              <h3>Who is allowed to use the innovation center?</h3>
              <p>Registered MUST students, staff, approved innovators, and verified external collaborators with valid aXess accounts.</p>
            </div>
          </div>
        </div>

        {/* Contact / Ticket Section */}
        <div className="help-card contact-card">
          <div className="card-header">
            <Icons.Bell size={22} />
            <h2>Contact Support</h2>
          </div>

          <form className="contact-form">
            <div className="form-group">
              <label>Subject</label>
              <input type="text" placeholder="e.g. Key not working in Room C-108" required />
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea
                rows={6}
                placeholder="Describe your issue or question in detail..."
                required
              />
            </div>

            <button type="submit" className="primary-btn">
              <Icons.Send size={16} /> Send Message
            </button>
          </form>

          <div className="contact-info">
            <p><strong>Email:</strong> support@axess.must.ac.tz</p>
            <p><strong>Phone (Guard Desk):</strong> +255 700 123 456</p>
            <p><strong>Location:</strong> CITT Building, Ground Floor</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpSupport;