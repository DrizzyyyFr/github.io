import { useEffect, useState } from 'react';
import HomePage from './pages/home/HomePage';
import SiteLayout from './components/layout/SiteLayout';
import { navigation, resolvePage } from './config/navigation';

export default function App() {
  const [path, setPath] = useState(() => window.location.hash);

  useEffect(() => {
    const navigate = () => setPath(window.location.hash);
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  const page = resolvePage(path);

  return (
    <SiteLayout navigation={navigation} currentPage={page.id}>
      <HomePage route={page} />
    </SiteLayout>
  );
}
