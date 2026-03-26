import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiDownload, FiPrinter, FiChevronLeft } from 'react-icons/fi';
import { getToken, getUser, certificatesAPI, mockCertificates } from '../../lib/api';

export default function CertificateView() {
  const router = useRouter();
  const { id } = router.query;
  const [cert, setCert] = useState(null);
  const [user, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    certificatesAPI.getMy().then(all => {
      const found = all.find(c => String(c.id) === String(id));
      if (found) setCert(found);
      else {
        const m = mockCertificates.find(c => String(c.id) === String(id));
        if (m) setCert(m);
      }
    }).finally(() => setLoading(false));

    setUserData(getUser());
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontSize: 16, color: '#555' }}>
      Loading Certificate...
    </div>
  );
  if (!cert) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Montserrat, sans-serif', color: '#555' }}>
      Certificate not found.
    </div>
  );

  const shortDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

  return (
    <div className="viewer-wrap">
      <Head>
        <title>Certificate - {cert.course}</title>
      </Head>

      <div className="toolbar no-print">
        <div className="toolbar-branding">
          <img src="/arohak-logo.png" alt="Arohak" className="toolbar-logo" />
        </div>

        <div className="toolbar-inner">
          <button className="tbtn-minimal" onClick={() => router.back()}>
            <FiChevronLeft size={18} /> <span>Back to Dashboard</span>
          </button>

          <div className="toolbar-actions">
            <button className="tbtn-glass" onClick={() => window.print()}>
              <FiPrinter size={16} /> Print
            </button>
            <button className="tbtn-premium" onClick={() => window.print()}>
              <FiDownload size={16} /> Download Certificate
            </button>
          </div>
        </div>
      </div>

      <div className="cert-container animate-fade-in">
        <div className="cert-sheet">
          <div className="cert-card">
            <div className="cert-inner-border" />
            <div className="cert-corners" />

            <div className="badge-wrap">
              <div className="badge-hex">
                <div className="hex-outline" />
                <div className="hex-fill">
                  <div className="badge-icon-circle">
                    <img src="/arohak.jpg" alt="Arohak" className="badge-logo-img" />
                  </div>
                </div>
                <div className="hex-ribbon-modern">
                  <div className="ribbon-center">
                    <span className="ribbon-text-modern">{cert.course}</span>
                  </div>
                  <div className="ribbon-fold-l" />
                  <div className="ribbon-fold-r" />
                </div>
                <div className="hex-sub-modern">PROFESSIONAL<br />CERTIFICATION</div>
              </div>
            </div>

            <div className="cert-type">PROFESSIONAL CERTIFICATION</div>
            <h1 className="cert-title">{cert.course}</h1>

            <div className="issued-label">CONFERRED UPON</div>
            <div className="issued-name">{user?.name || 'Student Name'}</div>

            <p className="cert-desc">
              This certificate is awarded in recognition of the successful completion of the
              <strong> {cert.course} </strong> professional program, demonstrating comprehensive
              knowledge and mastery of industry-standard competencies.
            </p>

            <div className="cert-footer">
              <div className="footer-left">
                <div className="signature-area">
                  <svg viewBox="0 0 170 58" className="sig-svg" xmlns="http://www.w3.org/2000/svg" fill="none">
                    <path d="M6 42 C16 12,30 8,38 28 C42 38,40 46,34 44 C28 42,26 32,32 26 C40 19,52 32,48 44" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M53 40 C60 18,72 14,76 30 C78 38,76 46,70 44 C64 42,62 34,67 28" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M90 12 C94 20,92 30,88 38 C84 46,88 50,94 46" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  <div className="footer-sig-label">Authorized Signature</div>
                </div>
              </div>

              <div className="footer-center">
                <div className="brand-logo-cert">
                  <img src="/arohak-logo.png" alt="Arohak" style={{ height: '40px' }} />
                </div>
              </div>

              <div className="footer-right">
                <div className="qr-container">
                  <svg className="qr-svg" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
                    <rect width="72" height="72" fill="white" />
                    <rect x="4" y="4" width="20" height="20" rx="2" fill="#1a1a1a" />
                    <rect x="7" y="7" width="14" height="14" rx="1" fill="white" />
                    <rect x="10" y="10" width="8" height="8" fill="#1a1a1a" />
                    <rect x="48" y="4" width="20" height="20" rx="2" fill="#1a1a1a" />
                    <rect x="51" y="7" width="14" height="14" rx="1" fill="white" />
                    <rect x="54" y="10" width="8" height="8" fill="#1a1a1a" />
                    <rect x="4" y="48" width="20" height="20" rx="2" fill="#1a1a1a" />
                    <rect x="7" y="51" width="14" height="14" rx="1" fill="white" />
                    <rect x="10" y="54" width="8" height="8" fill="#1a1a1a" />
                    <rect x="28" y="4" width="4" height="4" fill="#1a1a1a" />
                    <rect x="34" y="4" width="4" height="4" fill="#1a1a1a" />
                    <rect x="28" y="58" width="4" height="4" fill="#1a1a1a" />
                    <rect x="40" y="58" width="4" height="4" fill="#1a1a1a" />
                    <rect x="64" y="58" width="4" height="4" fill="#1a1a1a" />
                  </svg>
                </div>
                <div className="meta-text">
                  Issued: {shortDate}<br />ID: {cert.credentialId || 'LMS-000001'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&family=Lato:wght@400;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f2f5; font-family: 'Montserrat', sans-serif; color: #1a1a1a; }

        .viewer-wrap {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 0 80px;
        }

        /* ─── Modern Toolbar ────────────────────────────────────────────────── */
        .toolbar {
          width: 100%;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding: 12px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }

        .toolbar-branding {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .toolbar-logo {
          height: 38px;
          width: auto;
          object-fit: contain;
        }

        .toolbar-inner {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-left: 40px;
        }

        .tbtn-minimal {
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.2s, transform 0.2s;
          padding: 8px 12px;
          border-radius: 8px;
        }
        .tbtn-minimal:hover { color: #1a1a1a; background: rgba(0,0,0,0.04); transform: translateX(-2px); }

        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tbtn-glass {
          background: rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
          color: #333;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .tbtn-glass:hover { background: rgba(0,0,0,0.08); transform: translateY(-1px); }

        .tbtn-premium {
          background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
          color: #fff;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .tbtn-premium:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.2); background: #000; }

        /* ─── Certificate Layout ────────────────────────────────────────────── */
        .cert-container {
          padding-top: 50px;
          padding-bottom: 50px;
          width: 100%;
          display: flex;
          justify-content: center;
          perspective: 1000px;
          overflow-x: auto;
        }
        .cert-sheet { 
          width: 816px; 
          max-width: 95%; 
          aspect-ratio: 816 / 1056;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); 
        }

        .cert-card {
          position: relative;
          background: #fff;
          width: 816px; 
          height: 1056px;
          border-radius: 4px; /* classic certificate sharp-ish corners */
          box-shadow: 0 40px 100px rgba(0,0,0,0.12), 0 10px 40px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 80px 60px 60px;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(107, 92, 231, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(107, 92, 231, 0.03) 0%, transparent 50%);
          margin: 0 auto;
        }

        .cert-inner-border {
          position: absolute;
          inset: 20px;
          border: 1px solid #d4af37; /* Gold touch */
          border-radius: 2px;
          pointer-events: none;
          z-index: 2;
        }
        .cert-inner-border::after {
          content: '';
          position: absolute;
          inset: 4px;
          border: 3px double #d4af37;
          border-radius: 1px;
        }

        .cert-corners {
          position: absolute;
          inset: 15px;
          pointer-events: none;
          z-index: 3;
        }
        .cert-corners::before, .cert-corners::after {
          content: '';
          position: absolute;
          width: 40px;
          height: 40px;
          border: 2px solid #d4af37;
        }
        .cert-corners::before { top: 0; left: 0; border-right: 0; border-bottom: 0; }
        .cert-corners::after { bottom: 0; right: 0; border-left: 0; border-top: 0; }

        .cert-card > *:not(.cert-inner-border):not(.cert-corners) { position: relative; z-index: 10; }

        /* ─── Badge ─────────────────────────────────────────────────────────── */
        .badge-wrap { margin-bottom: 34px; }

        .badge-hex {
          position: relative;
          width: 140px;
          height: 154px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hex-outline {
          position: absolute;
          inset: -4px;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          background: #1a1a1a;
          z-index: 0;
        }

        .hex-fill {
          position: absolute;
          inset: 0;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          background: #fff;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 18px;
        }

        .badge-icon-circle {
          width: 42px;
          height: 42px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid #1a1a1a;
        }

        .badge-logo-img {
          width: 85%;
          height: 85%;
          object-fit: contain;
        }

        .hex-ribbon-modern {
          position: absolute;
          top: 60px;
          left: -40px;
          right: -40px;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ribbon-center {
          background: #7c3aed; /* Vibrant Purple */
          padding: 10px 15px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .ribbon-text-modern {
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          text-align: center;
          line-height: 1.2;
        }

        .ribbon-fold-l, .ribbon-fold-r {
          position: absolute;
          width: 28px;
          height: 32px;
          background: #6D28D9; /* Darker purple for the fold */
          z-index: 1;
          bottom: -8px;
        }

        .ribbon-fold-l {
          left: 10px;
          clip-path: polygon(100% 0%, 0% 0%, 25% 50%, 0% 100%, 100% 100%);
        }

        .ribbon-fold-r {
          right: 10px;
          clip-path: polygon(0% 0%, 100% 0%, 75% 50%, 100% 100%, 0% 100%);
        }

        /* Connecting triangle for the fold depth */
        .ribbon-fold-l::before, 
        .ribbon-fold-r::before {
          content: '';
          position: absolute;
          top: 0;
          width: 0;
          height: 0;
          border-style: solid;
        }
        .ribbon-fold-l::before { left: 100%; border-width: 0 0 8px 8px; border-color: transparent transparent #4C1D95 transparent; }
        .ribbon-fold-r::before { right: 100%; border-width: 0 8px 8px 0; border-color: transparent #4C1D95 transparent transparent; }

        .hex-sub-modern {
          position: absolute;
          top: 110px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.8px;
          color: #1a1a1a;
          text-transform: uppercase;
          line-height: 1.4;
          z-index: 11;
        }

        /* ─── Text Styles ───────────────────────────────────────────────────── */
        .cert-type {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 5px;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .cert-title {
          font-family: 'Playfair Display', serif;
          font-size: 56px;
          font-weight: 700;
          color: #111;
          margin-bottom: 30px;
          text-align: center;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        .issued-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 4px;
          color: #bbb;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .issued-name {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #c0392b; /* Arohak secondary color */
          margin-bottom: 30px;
          text-align: center;
        }

        .cert-desc {
          font-family: 'Lato', sans-serif;
          font-size: 15px;
          color: #555;
          text-align: center;
          max-width: 580px;
          line-height: 1.8;
          margin-bottom: 50px;
        }
        .cert-desc strong { color: #111; font-weight: 700; }

        /* ─── Footer ────────────────────────────────────────────────────────── */
        .cert-footer {
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding-top: 20px;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex: 1;
        }

        .signature-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          border-bottom: 1.5px solid #1a1a1a;
          padding: 0 10px 5px;
          min-width: 160px;
        }

        .sig-svg { width: 140px; height: 48px; }

        .footer-sig-label {
          font-size: 12px;
          color: #666;
          font-weight: 600;
          margin-top: 6px;
        }

        .footer-center { 
          flex: 1;
          display: flex; 
          justify-content: center;
          padding-bottom: 5px;
        }

        .brand-logo-cert { opacity: 0.9; }

        .footer-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .qr-container {
          padding: 6px;
          background: #fff;
          border: 1px solid #eee;
          border-radius: 4px;
        }

        .qr-svg { width: 64px; height: 64px; }

        .meta-text {
          font-size: 10px;
          color: #aaa;
          font-weight: 600;
          text-align: right;
          line-height: 1.5;
          letter-spacing: 0.3px;
        }

        /* ─── Animations ────────────────────────────────────────────────────── */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }

        @media print {
          @page { margin: 0; }
          html, body { 
            width: 100vw !important;
            height: 100vh !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            overflow: hidden; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .viewer-wrap { padding: 0 !important; height: 100vh; min-height: 100vh; width: 100vw; overflow: hidden; }
          .cert-container { padding: 0 !important; height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .cert-sheet { 
            width: 100vw !important; 
            height: 100vh !important; 
            max-width: none !important; 
            max-height: none !important; 
            transform: none !important; 
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cert-card { 
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            border: none !important;
            box-shadow: none !important; 
            border-radius: 0 !important; 
            padding: 60px 80px !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
          }
          .cert-inner-border { inset: 25px !important; border: 1.5px solid #d4af37 !important; visibility: visible !important; }
          .cert-inner-border::after { border: 4px double #d4af37 !important; visibility: visible !important; }

          /* Force display of these elements */
          .hex-fill, .ribbon-center, .ribbon-fold-l, .ribbon-fold-r, .badge-icon-circle {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

