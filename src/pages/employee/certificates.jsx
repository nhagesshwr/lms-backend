import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiAward, FiDownload, FiCheckCircle, FiClock } from 'react-icons/fi';
import { getToken, certificatesAPI, mockCertificates } from '../../lib/api';
import { Layout, Loading, ProgressRing, Badge, useToast } from '../../components/components';

function CertCard({ cert, onDownload }) {
  const issued = cert.status === 'issued';
  return (
    <div className={`cert-card-full ${issued ? 'issued' : 'in-progress'}`}>
      <div className="cert-card-header">
        <div className={`cert-icon-large ${issued ? 'gold' : 'gray'}`}>
          {issued ? '🏆' : <FiClock size={22} color="var(--text-dim)" />}
        </div>
        {issued ? <Badge color="green">Issued</Badge> : <Badge color="amber">In Progress</Badge>}
      </div>
      <div className="cert-card-body">
        <div className="cert-title-full">{cert.title}</div>
        <div className="cert-course-full">{cert.course}</div>
        {issued ? (
          <>
            <div className="cert-issued-date">Issued {new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div className="cert-id-code">{cert.credentialId}</div>
          </>
        ) : (
          <div className="cert-progress-row">
            <ProgressRing value={cert.progress} size={56} color="var(--brand)" />
            <div className="cert-progress-info">
              <div className="cert-progress-label">{cert.progress}% Complete</div>
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
    certificatesAPI.getMy().then(setCerts).catch(() => setCerts(mockCertificates)).finally(() => setLoading(false));
  }, []);

  const handleDownload = (cert) => {
    window.open(`/certificates/${cert.id}`, '_blank');
  };
  const issued      = certs.filter(c => c.status === 'issued');
  const inProgress  = certs.filter(c => c.status === 'in_progress');

  return (
    <Layout title="Certificates" subtitle="Your earned and in-progress certifications">
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          {issued.length > 0 && (
            <>
              <div className="section-heading"><h2>Earned Certificates ({issued.length})</h2></div>
              <div className="grid-2" style={{ marginBottom: 32 }}>
                {issued.map(c => <CertCard key={c.id} cert={c} onDownload={handleDownload} />)}
              </div>
            </>
          )}
          {inProgress.length > 0 && (
            <>
              <div className="section-heading"><h2>In Progress ({inProgress.length})</h2></div>
              <div className="grid-2">
                {inProgress.map(c => <CertCard key={c.id} cert={c} onDownload={handleDownload} />)}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
