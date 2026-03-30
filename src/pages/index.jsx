import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getToken, getUser } from '../lib/api';

export async function getServerSideProps({ res }) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return { props: {} };
}

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (u?.role === 'super_admin') router.push('/superadmin/overview');
    else if (u?.role === 'hr_admin' || u?.role === 'manager') router.push('/dashboard');
    else router.push('/employee/dashboard');
  }, []);
  return null;
}
