import React, { useMemo, useState } from 'react';
import { Icons } from '../components/icons';

type AccountType = 'student' | 'non_student' | '';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const isPdf = (f?: File | null) => !!f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

/**
 * Demo-friendly Register page.
 * - If "Use API" is unchecked (default), registration is stored in localStorage demo users,
 *   and the user is automatically logged in (no backend required).
 * - When connecting backend, toggle "Use API" to post to your endpoint.
 */

const Register: React.FC = () => {
  const [useApi, setUseApi] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Student
  const [institution, setInstitution] = useState('');
  const [campus, setCampus] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);

  // Non-student
  const [educationBackground, setEducationBackground] = useState('');
  const [highestEducation, setHighestEducation] = useState('');
  const [nsInstitution, setNsInstitution] = useState('');
  const [nsProgram, setNsProgram] = useState('');
  const [yearCompleted, setYearCompleted] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [educationProofFile, setEducationProofFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const levelOptions = useMemo(() => ['Certificate','Diploma','Bachelor','Master','PhD'], []);
  const highestOptions = useMemo(() => ['Certificate','Diploma','Bachelor','Master','PhD','Other'], []);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const validate = () => {
    clearMessages();
    if (accountType !== 'student' && accountType !== 'non_student') { setError('Select Student or Non-Student'); return false; }
    if (!fullName.trim()) { setError('Full name required'); return false; }
    if (!email.trim()) { setError('Email required'); return false; }
    if (!phone.trim()) { setError('Phone required'); return false; }
    if (!password || password.length < 6) { setError('Password must be at least 6 chars for demo'); return false; }

    if (accountType === 'student') {
      if (!institution.trim()) { setError('Institution required'); return false; }
      if (!regNumber.trim()) { setError('Registration number required'); return false; }
      if (!program.trim()) { setError('Program required'); return false; }
      if (!level) { setError('Level required'); return false; }
      if (!yearOfStudy) { setError('Year of study required'); return false; }
      if (!studentIdFile) { setError('Upload Student ID PDF'); return false; }
      if (!isPdf(studentIdFile)) { setError('Student ID must be PDF'); return false; }
      if (studentIdFile.size > MAX_FILE_BYTES) { setError('Student ID > 5MB'); return false; }
    }

    if (accountType === 'non_student') {
      if (!educationBackground.trim()) { setError('Education background required'); return false; }
      if (!highestEducation) { setError('Highest education required'); return false; }
      if (!nsInstitution.trim()) { setError('Institution required'); return false; }
      if (!nsProgram.trim()) { setError('Program required'); return false; }
      if (!region.trim()) { setError('Region required'); return false; }
      if (!district.trim()) { setError('District required'); return false; }
      if (!nationalIdFile) { setError('Upload National ID PDF'); return false; }
      if (!isPdf(nationalIdFile)) { setError('National ID must be PDF'); return false; }
      if (nationalIdFile.size > MAX_FILE_BYTES) { setError('National ID > 5MB'); return false; }
      if (!educationProofFile) { setError('Upload education proof PDF'); return false; }
      if (!isPdf(educationProofFile)) { setError('Education proof must be PDF'); return false; }
      if (educationProofFile.size > MAX_FILE_BYTES) { setError('Education proof > 5MB'); return false; }
    }

    return true;
  };

  // Demo user storage helpers
  const saveDemoUserAndLogin = (user: any) => {
    const usersJson = localStorage.getItem('demoUsers');
    const users = usersJson ? JSON.parse(usersJson) : [];
    users.push(user);
    localStorage.setItem('demoUsers', JSON.stringify(users));
    // set auth token + currentUser
    localStorage.setItem('authToken', `demo-${Date.now()}`);
    localStorage.setItem('currentUser', JSON.stringify({ name: user.fullName, email: user.email, id: `REG-DEMO-${Date.now()}` }));
    window.location.href = '/dashboard';
  };

  const handleFile = (setter: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setter(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validate()) return;

    if (!useApi) {
      // demo flow: save and login locally
      const user = {
        accountType,
        fullName,
        email,
        phone,
        institution,
        campus,
        regNumber,
        program,
        level,
        yearOfStudy,
        educationBackground,
        highestEducation,
        nsInstitution,
        nsProgram,
        yearCompleted,
        region,
        district,
        ward,
      };
      saveDemoUserAndLogin(user);
      return;
    }

    // Use API when toggle enabled
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('account_type', accountType);
      fd.append('full_name', fullName.trim());
      fd.append('email', email.trim());
      fd.append('phone', phone.trim());
      fd.append('password', password);

      if (accountType === 'student') {
        fd.append('institution', institution.trim());
        fd.append('campus', campus.trim());
        fd.append('registration_number', regNumber.trim());
        fd.append('program', program.trim());
        fd.append('level', level);
        fd.append('year_of_study', yearOfStudy);
        if (studentIdFile) fd.append('student_id_file', studentIdFile, studentIdFile.name);
      } else {
        fd.append('education_background', educationBackground.trim());
        fd.append('highest_education', highestEducation);
        fd.append('institution', nsInstitution.trim());
        fd.append('program', nsProgram.trim());
        fd.append('year_completed', yearCompleted.trim());
        fd.append('region', region.trim());
        fd.append('district', district.trim());
        fd.append('ward', ward.trim());
        if (nationalIdFile) fd.append('national_id_file', nationalIdFile, nationalIdFile.name);
        if (educationProofFile) fd.append('education_proof_file', educationProofFile, educationProofFile.name);
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'Registration failed');
        return;
      }

      setSuccess('Registration successful. Redirecting to login...');
      setTimeout(() => (window.location.href = '/login'), 1200);
    } catch (err) {
      console.error(err);
      setError('Network error — could not reach API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card big">
        <h1 className="auth-title">aXess Dynamic Registration System</h1>
        <p className="auth-sub">Please select account type to continue</p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={useApi} onChange={e => setUseApi(e.target.checked)} />
            Use API (uncheck to use local/demo)
          </label>
          <div style={{ marginLeft: 'auto', color: 'var(--muted-text)', fontSize: 13 }}>
            Demo files must be PDF (you can still select files; they will not be uploaded in demo mode)
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" encType="multipart/form-data" noValidate>
          {error && <div className="form-error" role="alert">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <fieldset className="form-group" aria-required>
            <legend className="form-legend">Account Type</legend>
            <div style={{ display: 'flex', gap: 12 }}>
              <label className={`radio-card ${accountType === 'student' ? 'active' : ''}`}>
                <input type="radio" name="accountType" value="student" checked={accountType === 'student'} onChange={() => setAccountType('student')} />
                <div><strong>Student</strong></div>
                <div className="muted">Register with student credentials</div>
              </label>

              <label className={`radio-card ${accountType === 'non_student' ? 'active' : ''}`}>
                <input type="radio" name="accountType" value="non_student" checked={accountType === 'non_student'} onChange={() => setAccountType('non_student')} />
                <div><strong>Non-Student</strong></div>
                <div className="muted">Industry, guest, staff or other</div>
              </label>
            </div>
          </fieldset>

          <div className="form-grid">
            <label className="form-label">
              Full Name
              <input className="auth-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </label>

            <label className="form-label">
              Email
              <input type="email" className="auth-input" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>

            <label className="form-label">
              Phone Number
              <input className="auth-input" value={phone} onChange={e => setPhone(e.target.value)} required />
            </label>

            <label className="form-label">
              Password
              <input type="password" className="auth-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters for demo" />
            </label>
          </div>

          {/* Student fields */}
          {accountType === 'student' && (
            <>
              <h3 className="section-sub">Student details</h3>
              <div className="form-grid">
                <label className="form-label">
                  Institution Name
                  <input className="auth-input" value={institution} onChange={e => setInstitution(e.target.value)} />
                </label>

                <label className="form-label">
                  Campus (optional)
                  <input className="auth-input" value={campus} onChange={e => setCampus(e.target.value)} />
                </label>

                <label className="form-label">
                  Registration Number / Student ID
                  <input className="auth-input" value={regNumber} onChange={e => setRegNumber(e.target.value)} />
                </label>

                <label className="form-label">
                  Program / Course
                  <input className="auth-input" value={program} onChange={e => setProgram(e.target.value)} />
                </label>

                <label className="form-label">
                  Level of Study
                  <select className="auth-input" value={level} onChange={e => setLevel(e.target.value)}>
                    <option value="">Select</option>
                    {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>

                <label className="form-label">
                  Year of Study
                  <input type="number" min={1} max={10} className="auth-input" value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)} />
                </label>

                <label className="form-label">
                  Upload Student ID (PDF only, max 5MB)
                  <input type="file" accept="application/pdf" onChange={handleFile(setStudentIdFile)} />
                  <div className="form-hint">Used for student verification only. We will not share your document.</div>
                </label>
              </div>
            </>
          )}

          {/* Non-student fields */}
          {accountType === 'non_student' && (
            <>
              <h3 className="section-sub">Non-student details</h3>
              <div className="form-grid">
                <label className="form-label">
                  Education Background (short)
                  <input className="auth-input" value={educationBackground} onChange={e => setEducationBackground(e.target.value)} />
                </label>

                <label className="form-label">
                  Highest Level of Education
                  <select className="auth-input" value={highestEducation} onChange={e => setHighestEducation(e.target.value)}>
                    <option value="">Select</option>
                    {highestOptions.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>

                <label className="form-label">
                  Institution Name
                  <input className="auth-input" value={nsInstitution} onChange={e => setNsInstitution(e.target.value)} />
                </label>

                <label className="form-label">
                  Program / Field of Study
                  <input className="auth-input" value={nsProgram} onChange={e => setNsProgram(e.target.value)} />
                </label>

                <label className="form-label">
                  Year Completed or "Currently Studying"
                  <input className="auth-input" value={yearCompleted} onChange={e => setYearCompleted(e.target.value)} />
                </label>

                <label className="form-label">
                  Region
                  <input className="auth-input" value={region} onChange={e => setRegion(e.target.value)} />
                </label>

                <label className="form-label">
                  District
                  <input className="auth-input" value={district} onChange={e => setDistrict(e.target.value)} />
                </label>

                <label className="form-label">
                  Ward (optional)
                  <input className="auth-input" value={ward} onChange={e => setWard(e.target.value)} />
                </label>

                <label className="form-label">
                  Upload National ID / Passport (PDF only, max 5MB)
                  <input type="file" accept="application/pdf" onChange={handleFile(setNationalIdFile)} />
                </label>

                <label className="form-label">
                  Upload Education Proof (PDF only, max 5MB)
                  <input type="file" accept="application/pdf" onChange={handleFile(setEducationProofFile)} />
                </label>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? 'Submitting...' : (<><Icons.Users size={14} /> Register</>)}
            </button>

            <button type="button" className="cancel-btn" onClick={() => (window.location.href = '/login')}>Back to login</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;