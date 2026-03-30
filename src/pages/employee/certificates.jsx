import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiAward, FiDownload, FiCheckCircle, FiClock } from 'react-icons/fi';
import { getToken, getUser, certificatesAPI } from '../../lib/api';
import { Layout, Loading, ProgressRing, Badge, useToast, EmptyState } from '../../components/components';

function CertCard({ cert, onDownload }) {
  const issued = !!(cert.credential_id || cert.status === 'issued');
  const courseTitle = cert.course?.title || cert.course || 'Certificate Title';
  const issuedDate = cert.issued_at || cert.issuedAt;
  const credId     = cert.credential_id || cert.credentialId;

  return (
    <div className={`cert-card-full ${issued ? 'issued' : 'in-progress'}`}>
      <div className="cert-card-header">
        <div className={`cert-icon-large ${issued ? 'gold' : 'gray'}`}>
          {issued ? '🏆' : <FiClock size={22} color="var(--text-dim)" />}
        </div>
        {issued ? <Badge color="green">Issued</Badge> : <Badge color="amber">In Progress</Badge>}
      </div>
      <div className="cert-card-body">
        <div className="cert-title-full">{issued ? courseTitle + ' Completion' : courseTitle}</div>
        <div className="cert-course-full">{issued ? 'Professional Certification' : 'Currently Learning'}</div>
        {issued ? (
          <>
            <div className="cert-issued-date">Issued {new Date(issuedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div className="cert-id-code">{credId}</div>
          </>
        ) : (
          <div className="cert-progress-row">
            <ProgressRing value={cert.progress || 0} size={56} color="var(--brand)" />
            <div className="cert-progress-info">
              <div className="cert-progress-label">{cert.progress || 0}% Complete</div>
              <div className="cert-progress-sub">Keep learning to earn this certificate</div>
            </div>
          </div>
        )}
      </div>
      {issued && (
        <button className="btn btn-primary btn-sm" onClick={() => onDownload(cert)} style={{ alignSelf: 'flex-start' }}>
          <FiDownload size={13} /> Download PDF
        </button>
      )}
    </div>
  );
}

export default function Certificates() {
  const router = useRouter();
  const [certs, setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (u?.role !== 'employee') { router.push('/dashboard'); return; }
    certificatesAPI.getMy().then(setCerts).catch(() => setCerts([])).finally(() => setLoading(false));
  }, []);

  const handleDownload = (cert) => {
    if (cert.pdf_url) return window.open(cert.pdf_url, '_blank');
    window.open(`/certificates/${cert.id}`, '_blank');
  };
  const issued      = certs.filter(c => c.credential_id || c.status === 'issued');
  const inProgress  = certs.filter(c => !c.credential_id && c.status !== 'issued');

  return (
    <Layout>
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <h1 className="page-header-title">Certificates</h1>
            <p className="page-header-desc">Your earned and in-progress certifications.</p>
          </div>
          {issued.length === 0 && inProgress.length === 0 && (
            <EmptyState 
              icon={<FiAward size={32} />} 
              title="No certificates yet" 
              description="Complete courses to earn professional certifications." 
            />
          )}

          {issued.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="section-heading"><h2>Earned Certificates ({issued.length})</h2></div>
              <div className="grid-2">
                {issued.map(c => <CertCard key={c.id} cert={c} onDownload={handleDownload} />)}
              </div>
            </div>
          )}
          {inProgress.length > 0 && (
            <div>
              <div className="section-heading"><h2>In Progress ({inProgress.length})</h2></div>
              <div className="grid-2">
                {inProgress.map(c => <CertCard key={c.id} cert={c} onDownload={handleDownload} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
