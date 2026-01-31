import React from 'react';

function PrivacyPage() {
  return (
    <div className="page">
      <h1>Privacy Policy</h1>
      <section className="card">
        <p className="muted">
          This Privacy Policy is a basic template for demonstration and deployment readiness.
        </p>
        <h3>What we collect</h3>
        <p>
          We store your name, contact number, department, division, semester/year, and login activity (last login time)
          to provide academic content filtering and account security.
        </p>
        <h3>How we use data</h3>
        <p>
          Data is used to authenticate users, personalize content, and support administrative functions such as CR
          approval and system announcements.
        </p>
        <h3>Data retention</h3>
        <p>
          Accounts may be deactivated but typically are not deleted to maintain institutional records, unless required by
          policy.
        </p>
        <h3>Contact</h3>
        <p>
          For questions, contact your institution using the email provided in the footer.
        </p>
      </section>
    </div>
  );
}

export default PrivacyPage;
