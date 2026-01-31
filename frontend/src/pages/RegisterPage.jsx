import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient, assetUrl } from '../api/client';

function RegisterPage() {
  const [branding, setBranding] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [form, setForm] = useState({
    fullName: '',
    departmentId: '',
    divisionId: '',
    semester: '',
    contactNumber: '',
    email: '',
    password: '',
    applyAsCR: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .get('/meta/system')
      .then((res) => setBranding(res?.data?.branding || null))
      .catch(() => setBranding(null));

    const loadMeta = async () => {
      try {
        const [deptRes, divRes] = await Promise.all([
          apiClient.get('/meta/departments'),
          apiClient.get('/meta/divisions'),
        ]);
        setDepartments(deptRes.data.departments || []);
        setDivisions(divRes.data.divisions || []);
      } catch (err) {
        console.error('Failed to load meta', err);
      }
    };
    loadMeta();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (e) => {
    const { name, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        departmentId: Number(form.departmentId),
        divisionId: Number(form.divisionId),
        semester: form.semester,
        email: form.email || undefined,
        applyAsCR: form.applyAsCR,
      };
      await apiClient.post('/auth/register', payload);
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {branding?.collegeLogoPath && (
            <img
              className="brand-logo"
              src={assetUrl(branding.collegeLogoPath)}
              alt="College Logo"
            />
          )}
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{branding?.collegeName || 'HexaCorn'}</div>
            {branding?.academicYear && <div className="muted">Academic Year: {branding.academicYear}</div>}
          </div>
        </div>
        <h1>Student Registration</h1>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Full Name
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Department
            <select
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              required
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Division
            <select
              name="divisionId"
              value={form.divisionId}
              onChange={handleChange}
              required
            >
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Semester / Year
            <select name="semester" value={form.semester} onChange={handleChange} required>
              <option value="">Select semester/year</option>
              <option value="FY">FY (First Year)</option>
              <option value="SY">SY (Second Year)</option>
              <option value="TY">TY (Third Year)</option>
              <option value="SEM1">Semester 1</option>
              <option value="SEM2">Semester 2</option>
              <option value="SEM3">Semester 3</option>
              <option value="SEM4">Semester 4</option>
              <option value="SEM5">Semester 5</option>
              <option value="SEM6">Semester 6</option>
            </select>
          </label>
          <label>
            Contact Number
            <input
              type="text"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Email (optional)
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          {error && <div className="error-text">{error}</div>}
          <label className="inline-flex gap-2 items-center">
            <input
              type="checkbox"
              name="applyAsCR"
              checked={form.applyAsCR}
              onChange={handleCheckbox}
            />
            Apply as Class Representative (CR)
          </label>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="muted">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
