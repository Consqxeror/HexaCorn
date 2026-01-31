import React from 'react';

function TermsPage() {
  return (
    <div className="page">
      <h1>Terms of Service</h1>
      <section className="card">
        <p className="muted">
          These Terms of Service are provided as a basic template for demonstration and deployment readiness.
        </p>
        <h3>Acceptable Use</h3>
        <p>
          You agree to use this platform only for academic and institutional communication. You must not upload harmful,
          illegal, or copyrighted material without permission.
        </p>
        <h3>Accounts</h3>
        <p>
          You are responsible for maintaining the confidentiality of your login credentials. The institution may suspend
          or deactivate accounts for misuse.
        </p>
        <h3>Content</h3>
        <p>
          Notices, notes, assignments, and syllabus files are provided for educational purposes. Always verify official
          deadlines with your department when required.
        </p>
        <h3>Changes</h3>
        <p>
          The institution may update these terms at any time. Continued use of the platform indicates acceptance of the
          updated terms.
        </p>
      </section>
    </div>
  );
}

export default TermsPage;
