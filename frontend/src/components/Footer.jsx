import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

function Footer({ branding }) {
  const version = useMemo(() => import.meta.env.VITE_APP_VERSION || '1.0.0', []);
  const support = useMemo(() => import.meta.env.VITE_SUPPORT_CONTACT || 'support@college.edu', []);
  const college = useMemo(() => import.meta.env.VITE_COLLEGE_NAME || 'Your College Name', []);

  return (
    <footer className="app-footer">
      <div className="footer-left">
        <div className="footer-brand">HexaCorn</div>
        <div className="footer-muted">{branding?.collegeName || college}</div>
        {branding?.academicYear && <div className="footer-muted">Academic Year: {branding.academicYear}</div>}
      </div>
      <div className="footer-right">
        <div className="footer-muted">Version: {version}</div>
        <div className="footer-muted">Contact: {branding?.contactEmail || support}</div>
        <div className="footer-muted">
          <Link className="btn-link" to="/terms">
            Terms
          </Link>
          {' · '}
          <Link className="btn-link" to="/privacy">
            Privacy
          </Link>
        </div>
        <div className="footer-muted">© {new Date().getFullYear()}</div>
      </div>
    </footer>
  );
}

export default Footer;
