import '../styles/globals.css';
import '../components/components.css';
import { ServerStatusBanner } from '../components/components';

export default function App({ Component, pageProps }) {
  return (
    <>
      <ServerStatusBanner />
      <Component {...pageProps} />
    </>
  );
}
