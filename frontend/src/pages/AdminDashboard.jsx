import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient, assetUrl } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';

function AdminDashboard() {
  const navigate = useNavigate();
  const params = useParams();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [crs, setCrs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [settings, setSettings] = useState({
    collegeName: '',
    collegeLogoPath: '',
    academicYear: '',
    contactEmail: '',
    collegeAddress: '',
    globalAnnouncement: '',
    globalAnnouncementTone: 'info',
    uploadMaxSizeMb: 10,
    uploadAllowedMimeTypes:
      'application/pdf,image/jpeg,image/png,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    maintenanceMode: false,
    maintenanceMessage: '',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [newCr, setNewCr] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    password: '',
    departmentId: '',
    divisionId: '',
  });

  const loadAll = async () => {
    const [statsRes, studRes, crRes, pendingRes, deptRes, divRes, settingsRes] = await Promise.all([
      apiClient.get('/admin/stats'),
      apiClient.get('/admin/students'),
      apiClient.get('/admin/crs'),
      apiClient.get('/admin/cr-requests'),
      apiClient.get('/admin/departments'),
      apiClient.get('/admin/divisions'),
      apiClient.get('/admin/settings'),
    ]);
    setStats(statsRes.data);
    setStudents(studRes.data.students || []);
    setCrs(crRes.data.crs || []);
    setPendingRequests(pendingRes.data.requests || []);
    setDepartments(deptRes.data.departments || []);
    setDivisions(divRes.data.divisions || []);
    setSettings(settingsRes?.data?.settings || { maintenanceMode: false, maintenanceMessage: '' });
  };

  useEffect(() => {
    loadAll().catch((err) => console.error('Failed to load admin data', err));
  }, []);

  const tab = useMemo(() => {
    return params.tab || 'overview';
  }, [params.tab]);

  const setTab = (next) => {
    navigate(`/admin/${encodeURIComponent(next)}`);
  };

  const toggleStudent = async (student) => {
    const nextActive = !student.isActive;
    setConfirmConfig({
      title: nextActive ? 'Activate Student' : 'Deactivate Student',
      message: nextActive
        ? `Activate ${student.fullName}? They will be able to login again.`
        : `Deactivate ${student.fullName}? They will not be able to login until reactivated.`,
      confirmText: nextActive ? 'Activate' : 'Deactivate',
      tone: nextActive ? 'primary' : 'danger',
      onConfirm: async () => {
        await apiClient.patch(`/admin/students/${student.id}/status`, { isActive: nextActive });
        await loadAll();
      },
    });
    setConfirmOpen(true);
  };

  const handleApproveRequest = async (id) => {
    await apiClient.patch(`/admin/cr-requests/${id}/approve`);
    await loadAll();
  };

  const handleRejectRequest = async (id) => {
    setConfirmConfig({
      title: 'Reject CR Request',
      message: 'Reject this CR application? The user will be reverted to Student.',
      confirmText: 'Reject',
      tone: 'danger',
      onConfirm: async () => {
        await apiClient.patch(`/admin/cr-requests/${id}/reject`);
        await loadAll();
      },
    });
    setConfirmOpen(true);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await apiClient.patch('/admin/settings', settings);
      setSettings(res?.data?.settings || settings);
      await loadAll();
    } finally {
      setSettingsSaving(false);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    try {
      const data = new FormData();
      data.append('logo', logoFile);
      const res = await apiClient.post('/admin/settings/logo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSettings(res?.data?.settings || settings);
      setLogoFile(null);
      await loadAll();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleNewCrChange = (e) => {
    const { name, value } = e.target;
    setNewCr((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCr = async (e) => {
    e.preventDefault();
    await apiClient.post('/admin/crs', {
      ...newCr,
      departmentId: Number(newCr.departmentId),
      divisionId: Number(newCr.divisionId),
    });
    setNewCr({
      fullName: '',
      contactNumber: '',
      email: '',
      password: '',
      departmentId: '',
      divisionId: '',
    });
    await loadAll();
  };

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'overview' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={tab === 'cr-requests' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('cr-requests')}
        >
          CR Requests
        </button>
        <button
          type="button"
          className={tab === 'students' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('students')}
        >
          Students
        </button>
        <button
          type="button"
          className={tab === 'crs' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('crs')}
        >
          CRs
        </button>
        <button
          type="button"
          className={tab === 'create-cr' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('create-cr')}
        >
          Create CR
        </button>
      </div>

      {tab === 'overview' &&
        stats && (
          <>
            <section className="stats-row">
              <div className="stat-card">
                <h3>Students</h3>
                <p>{stats.studentsCount}</p>
              </div>
              <div className="stat-card">
                <h3>Class Heads</h3>
                <p>{stats.crCount}</p>
              </div>
              <div className="stat-card">
                <h3>Pending CRs</h3>
                <p>{stats.pendingCrCount}</p>
              </div>
              <div className="stat-card">
                <h3>Total Content</h3>
                <p>{stats.totalContent}</p>
              </div>
            </section>

            <section className="card">
              <h2>System Mode</h2>
              <div className="form">
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.maintenanceMode)}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, maintenanceMode: e.target.checked }))
                    }
                  />
                  Maintenance / Read-only mode
                </label>
                <label>
                  Banner message
                  <input
                    value={settings.maintenanceMessage || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, maintenanceMessage: e.target.value }))
                    }
                    placeholder="Uploads and edits are temporarily disabled..."
                  />
                </label>
                <button type="button" className="btn-primary" onClick={saveSettings} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </section>

            <section className="card">
              <h2>College Settings</h2>
              <div className="form">
                <label>
                  College Name
                  <input
                    value={settings.collegeName || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, collegeName: e.target.value }))}
                    placeholder="Your College Name"
                  />
                </label>
                <label>
                  Academic Year
                  <input
                    value={settings.academicYear || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, academicYear: e.target.value }))}
                    placeholder="2025-2026"
                  />
                </label>
                <label>
                  Contact Email
                  <input
                    value={settings.contactEmail || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="support@college.edu"
                  />
                </label>
                <label>
                  College Address
                  <input
                    value={settings.collegeAddress || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, collegeAddress: e.target.value }))}
                    placeholder="College address"
                  />
                </label>

                <div className="muted">College Logo</div>
                {settings.collegeLogoPath && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      className="brand-logo"
                      src={assetUrl(settings.collegeLogoPath)}
                      alt="College Logo"
                    />
                    <div className="muted">Current logo is set</div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={uploadLogo}
                  disabled={!logoFile || logoUploading}
                >
                  {logoUploading ? 'Uploading...' : 'Upload Logo'}
                </button>

                <button type="button" className="btn-primary" onClick={saveSettings} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving...' : 'Save College Settings'}
                </button>
              </div>
            </section>

            <section className="card">
              <h2>Global Announcement</h2>
              <div className="form">
                <label>
                  Message
                  <input
                    value={settings.globalAnnouncement || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, globalAnnouncement: e.target.value }))}
                    placeholder="Exam form submission starts tomorrow..."
                  />
                </label>
                <label>
                  Tone
                  <select
                    value={settings.globalAnnouncementTone || 'info'}
                    onChange={(e) => setSettings((prev) => ({ ...prev, globalAnnouncementTone: e.target.value }))}
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="danger">Danger</option>
                  </select>
                </label>
                <button type="button" className="btn-primary" onClick={saveSettings} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving...' : 'Publish Announcement'}
                </button>
              </div>
            </section>

            <section className="card">
              <h2>Upload Rules</h2>
              <div className="form">
                <label>
                  Max file size (MB)
                  <input
                    type="number"
                    value={settings.uploadMaxSizeMb ?? 10}
                    onChange={(e) => setSettings((prev) => ({ ...prev, uploadMaxSizeMb: e.target.value }))}
                    min={1}
                    max={100}
                  />
                </label>
                <label>
                  Allowed MIME types (comma-separated)
                  <input
                    value={settings.uploadAllowedMimeTypes || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, uploadAllowedMimeTypes: e.target.value }))
                    }
                    placeholder="application/pdf,image/png"
                  />
                </label>
                <button type="button" className="btn-primary" onClick={saveSettings} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving...' : 'Save Upload Rules'}
                </button>
              </div>
            </section>
          </>
        )}

      {tab === 'create-cr' && (
        <section className="card">
          <h2>Create Class Head (CR)</h2>
          <form className="form" onSubmit={handleCreateCr}>
          <label>
            Full Name
            <input
              name="fullName"
              value={newCr.fullName}
              onChange={handleNewCrChange}
              required
            />
          </label>
          <label>
            Contact Number
            <input
              name="contactNumber"
              value={newCr.contactNumber}
              onChange={handleNewCrChange}
              required
            />
          </label>
          <label>
            Email
            <input name="email" value={newCr.email} onChange={handleNewCrChange} />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={newCr.password}
              onChange={handleNewCrChange}
              required
            />
          </label>
          <label>
            Department
            <select
              name="departmentId"
              value={newCr.departmentId}
              onChange={handleNewCrChange}
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
              value={newCr.divisionId}
              onChange={handleNewCrChange}
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
          <button type="submit" className="btn-primary">
            Create CR
          </button>
          </form>
        </section>
      )}

      {tab === 'cr-requests' && (
        <section>
          <h2>Pending CR Requests</h2>
          <div className="table-wrapper">
            <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Department</th>
                <th>Division</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((req) => (
                <tr key={req.id}>
                  <td>{req.User.fullName}</td>
                  <td>{req.User.contactNumber}</td>
                  <td>{req.Department.name}</td>
                  <td>{req.Division.name}</td>
                  <td>
                    <button className="btn-primary" onClick={() => handleApproveRequest(req.id)}>
                      Approve
                    </button>{' '}
                    <button className="btn-secondary" onClick={() => handleRejectRequest(req.id)}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
              {pendingRequests.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="No pending requests" subtitle="CR applications will appear here." />
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'students' && (
        <section>
          <h2>Students</h2>
          <div className="table-wrapper">
            <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Last Login</th>
                <th>Active</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.fullName}</td>
                  <td>{s.contactNumber}</td>
                  <td>{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : '-'}</td>
                  <td>{s.isActive ? 'Yes' : 'No'}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => toggleStudent(s)}>
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'crs' && (
        <section>
          <h2>Class Heads (CRs)</h2>
          <div className="table-wrapper">
            <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Verified</th>
                <th>Contact</th>
                <th>Department</th>
                <th>Division</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {crs.map((cr) => (
                <tr key={cr.id}>
                  <td>{cr.fullName}</td>
                  <td>{cr.isVerifiedCr ? <span className="badge-small verified">Verified</span> : '-'}</td>
                  <td>{cr.contactNumber}</td>
                  <td>{cr.departmentId}</td>
                  <td>{cr.divisionId}</td>
                  <td>{cr.lastLoginAt ? new Date(cr.lastLoginAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmModal
        open={confirmOpen}
        title={confirmConfig?.title || 'Confirm'}
        message={confirmConfig?.message || 'Are you sure?'}
        confirmText={confirmConfig?.confirmText || 'Confirm'}
        cancelText="Cancel"
        tone={confirmConfig?.tone || 'danger'}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmConfig(null);
        }}
        onConfirm={async () => {
          try {
            await confirmConfig?.onConfirm?.();
          } finally {
            setConfirmOpen(false);
            setConfirmConfig(null);
          }
        }}
      />
    </div>
  );
}

export default AdminDashboard;
