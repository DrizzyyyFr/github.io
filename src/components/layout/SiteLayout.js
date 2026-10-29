import { profile } from '../../config/profile';
import ArrowIcon from '../icons/ArrowIcon';
import MusicPlayer from '../media/MusicPlayer';
import './SiteLayout.css';

export default function SiteLayout({ children, navigation, currentPage }) {
  return (
    <div className="site-layout">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="identity" href="#/" aria-label={`${profile.name} home`}>
          <span className="identity-mark" aria-hidden="true">am<span>.</span></span>
          <span className="identity-name">{profile.name}</span>
        </a>
        <nav className="site-navigation" aria-label="Main navigation">
          {navigation.map(page => (
            <a key={page.id} href={page.href} aria-current={currentPage === page.id ? 'page' : undefined}>
              {page.label}
            </a>
          ))}
          <a className="external-link" href={profile.github} target="_blank" rel="noreferrer">
            GitHub <ArrowIcon />
          </a>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <span>&copy; {new Date().getFullYear()} {profile.name}</span>
        <span className="footer-role">{profile.role}</span>
      </footer>
      <MusicPlayer />
    </div>
  );
}
