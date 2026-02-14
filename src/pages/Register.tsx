// src/pages/Register.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { authAPI } from '../lib/api';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Basic fields ───
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'student' | 'non_student'>('student');
  const [institution, setInstitution] = useState('MUST');
  const [membership, setMembership] = useState('');

  // ─── Student fields ───
  const [campus, setCampus] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');

  // ─── Non-student fields ───
  const [educationBackground, setEducationBackground] = useState('');

  // ─── Files ───
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [residenceProofFile, setResidenceProofFile] = useState<File | null>(null);
  const [centerFormFile, setCenterFormFile] = useState<File | null>(null);

  // ─── Password visibility & strength ───
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);   // ← NEW

  const [requirements, setRequirements] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });

  // Live password validation + show/hide requirements
  useEffect(() => {
    setShowRequirements(password.length > 0);   // ← Only show when typing starts

    const check = {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    setRequirements(check);
  }, [password]);

  const isPasswordStrong = Object.values(requirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && password !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) return setError('Passwords do not match');
    if (!isPasswordStrong) return setError('Password does not meet strength requirements');

    setLoading(true);

    const formData = new FormData();

    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', password);
    formData.append('accountType', accountType);
    formData.append('institution', institution);
    formData.append('membership', membership);

    if (accountType === 'student') {
      formData.append('campus', campus);
      formData.append('regNumber', regNumber);
      formData.append('program', program);
      formData.append('level', level);
      formData.append('yearOfStudy', yearOfStudy);
      if (studentIdFile) formData.append('studentIdFile', studentIdFile);
    } else {
      formData.append('educationBackground', educationBackground);
      if (nationalIdFile) formData.append('nationalIdFile', nationalIdFile);
      if (residenceProofFile) formData.append('educationProofFile', residenceProofFile);
      if (centerFormFile) formData.append('educationProofFile', centerFormFile);
    }

    try {
      await authAPI.register(formData);
      alert('Registration successful! Your account is pending approval.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '560px' }}>
        <h1 className="auth-title">aXess – Create Account</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="form-error">{error}</div>}

          <label>Full Name *</label>
          <input type="text" className="auth-input" value={fullName} onChange={e => setFullName(e.target.value)} required />

          <label>Email Address *</label>
          <input type="email" className="auth-input" value={email} onChange={e => setEmail(e.target.value)} required />

          <label>Phone Number *</label>
          <input type="tel" className="auth-input" value={phone} onChange={e => setPhone(e.target.value)} required />

          <label>Password *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute' as const,
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
              }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Password requirements - hidden until typing starts */}
          {showRequirements && (
            <div style={{ margin: '12px 0 20px 0', fontSize: '13px' }}>
              <p style={{ fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Password must contain:
              </p>
              <div style={{ display: 'grid', gap: '6px' }}>
                {[
                  { label: 'At least 8 characters', met: requirements.minLength },
                  { label: 'One uppercase letter (A-Z)', met: requirements.hasUpper },
                  { label: 'One lowercase letter (a-z)', met: requirements.hasLower },
                  { label: 'One number (0-9)', met: requirements.hasNumber },
                  { label: 'One special character (!@#$%^&*)', met: requirements.hasSpecial },
                ].map((req, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {req.met ? (
                      <Check size={16} color="#10b981" />
                    ) : (
                      <X size={16} color="#ef4444" />
                    )}
                    <span style={{ color: req.met ? '#10b981' : '#6b7280' }}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label>Confirm Password *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              className="auth-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                position: 'absolute' as const,
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
              }}
            >
              {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <label>Account Type *</label>
          <select className="auth-input" value={accountType} onChange={e => setAccountType(e.target.value as any)} required>
            <option value="student">Student</option>
            <option value="non_student">Non-Student / Professional</option>
          </select>

          {accountType === 'student' && (
            <div className="conditional-fields">
              <label>Campus *</label>
              <select className="auth-input" value={campus} onChange={e => setCampus(e.target.value)} required>
                <option value="">Select Campus</option>
                <option value="Mbeya">Mbeya Campus</option>
                <option value="Rukwa">Rukwa Campus</option>
                <option value="Mtwara">Mtwara Campus</option>
                <option value="Other">Other</option>
              </select>

              <label>Registration Number *</label>
              <input type="text" className="auth-input" value={regNumber} onChange={e => setRegNumber(e.target.value)} required />

              <label>Program *</label>
              <select className="auth-input" value={program} onChange={e => setProgram(e.target.value)} required>
                <option value="">Select Program</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Systems">Information Systems</option>
                <option value="Engineering">Engineering</option>
                <option value="Business Administration">Business Administration</option>
                <option value="Other">Other</option>
              </select>

              <label>Level</label>
              <select className="auth-input" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">Select Level</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>

              <label>Year of Study</label>
              <select className="auth-input" value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}>
                <option value="">Select Year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5</option>
              </select>

              <label>Student ID (PDF only) *</label>
              <input type="file" accept="application/pdf" onChange={e => setStudentIdFile(e.target.files?.[0] || null)} required />
            </div>
          )}

          {accountType === 'non_student' && (
            <div className="conditional-fields">
              <label>Education Background</label>
              <textarea className="auth-input" value={educationBackground} onChange={e => setEducationBackground(e.target.value)} rows={3} />

              <label>National ID / Any Registration ID (PDF) *</label>
              <input type="file" accept="application/pdf" onChange={e => setNationalIdFile(e.target.files?.[0] || null)} required />

              <label>Residence Proof (signed by Village Chairman) (PDF) *</label>
              <input type="file" accept="application/pdf" onChange={e => setResidenceProofFile(e.target.files?.[0] || null)} required />

              <label>Registration Form from the Center (PDF) *</label>
              <input type="file" accept="application/pdf" onChange={e => setCenterFormFile(e.target.files?.[0] || null)} required />
            </div>
          )}

          <button
            type="submit"
            className="save-btn"
            disabled={loading || !isPasswordStrong || !passwordsMatch}
            style={{
              opacity: loading || !isPasswordStrong || !passwordsMatch ? 0.6 : 1,
              cursor: loading || !isPasswordStrong || !passwordsMatch ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          Already have an account? <a href="/login" style={{ color: '#6366f1' }}>Sign in</a>
        </p>
      </div>
    </div>
  );
};

export default Register;