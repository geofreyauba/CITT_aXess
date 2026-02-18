// src/pages/Register.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X, Fingerprint } from 'lucide-react';
import { authAPI } from '../lib/api';
import { startRegistration } from '@simplewebauthn/browser';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration complete state
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Fingerprint registration state
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fingerprintSuccess, setFingerprintSuccess] = useState(false);

  // Basic fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'student' | 'non_student'>('student');
  const [institution, setInstitution] = useState('MUST');
  const [membership, setMembership] = useState('');

  // Student fields
  const [campus, setCampus] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');

  // Non-student fields
  const [educationBackground, setEducationBackground] = useState('');

  // Files
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [residenceProofFile, setResidenceProofFile] = useState<File | null>(null);
  const [centerFormFile, setCenterFormFile] = useState<File | null>(null);

  // Password visibility & strength
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const [requirements, setRequirements] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });

  useEffect(() => {
    setShowRequirements(password.length > 0);
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isPasswordStrong) {
      setError('Password does not meet strength requirements');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', password);
    formData.append('accountType', accountType);
    formData.append('institution', institution);
    formData.append('membership', membership.trim() || 'None');

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
      const response = await authAPI.register(formData);
      // Registration successful — show fingerprint option
      setRegistrationComplete(true);
      setRegisteredEmail(response.email || email);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FINGERPRINT REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════
  const handleRegisterFingerprint = async () => {
    if (!registeredEmail) return;

    setFingerprintLoading(true);
    setError(null);

    try {
      // Step 1: Get challenge from server
      const options = await authAPI.webauthnRegisterStart(registeredEmail);

      // Step 2: Trigger browser's fingerprint prompt
      const credential = await startRegistration(options);

      // Step 3: Send credential to server for verification
      const result = await authAPI.webauthnRegisterFinish(registeredEmail, credential);

      if (result.success) {
        setFingerprintSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Fingerprint registration error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Fingerprint registration was cancelled or timed out.');
      } else if (err.name === 'NotSupportedError') {
        setError('Fingerprint authentication is not supported on this device.');
      } else {
        setError(err.message || 'Failed to register fingerprint. You can skip this step.');
      }
    } finally {
      setFingerprintLoading(false);
    }
  };

  const handleSkipFingerprint = () => {
    navigate('/login');
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SUCCESS SCREEN (after registration)
  // ═══════════════════════════════════════════════════════════════════════
  if (registrationComplete) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: fingerprintSuccess ? '#d1fae5' : '#ede9fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            {fingerprintSuccess ? (
              <Check size={32} color="#10b981" />
            ) : (
              <Fingerprint size={32} color="#6366f1" />
            )}
          </div>

          <h1 className="auth-title" style={{ marginBottom: '12px' }}>
            {fingerprintSuccess ? 'All Set!' : 'Registration Successful!'}
          </h1>

          {fingerprintSuccess ? (
            <>
              <p style={{ color: '#10b981', marginBottom: '16px', fontWeight: 500 }}>
                ✓ Fingerprint registered successfully!
              </p>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                Redirecting to login...
              </p>
            </>
          ) : (
            <>
              <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
                Your account is pending admin approval.
                <br />
                <strong>Optional:</strong> Register your fingerprint now for faster sign-in.
              </p>

              {error && (
                <div style={{
                  padding: '12px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={handleRegisterFingerprint}
                  disabled={fingerprintLoading}
                  style={{
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: fingerprintLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    opacity: fingerprintLoading ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <Fingerprint size={20} />
                  {fingerprintLoading ? 'Setting up...' : 'Register Fingerprint'}
                </button>

                <button
                  onClick={handleSkipFingerprint}
                  disabled={fingerprintLoading}
                  style={{
                    padding: '14px 24px',
                    background: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: fingerprintLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Skip for Now
                </button>
              </div>

              <p style={{ marginTop: '16px', fontSize: '13px', color: '#9ca3af' }}>
                You can register your fingerprint later from your profile.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REGISTRATION FORM
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '560px' }}>
        <h1 className="auth-title">aXess — Create Account</h1>

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
                position: 'absolute',
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
                    {req.met ? <Check size={16} color="#10b981" /> : <X size={16} color="#ef4444" />}
                    <span style={{ color: req.met ? '#10b981' : '#6b7280' }}>{req.label}</span>
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
                position: 'absolute',
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

          <label>Institution</label>
          <input type="text" className="auth-input" value={institution} onChange={e => setInstitution(e.target.value)} />

          <label>Membership Type</label>
          <input type="text" className="auth-input" value={membership} onChange={e => setMembership(e.target.value)} />

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