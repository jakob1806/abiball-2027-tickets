export default function WalletButtons({ appleHref, googleHref }: { appleHref?: string | null; googleHref?: string | null }) {
  if (!appleHref && !googleHref) return null;
  return (
    <div className="row">
      {appleHref && (
        <a className="btn small" href={appleHref}>
          Zu Apple Wallet hinzufügen
        </a>
      )}
      {googleHref && (
        <a className="btn small" href={googleHref} target="_blank" rel="noopener noreferrer">
          Zu Google Wallet hinzufügen
        </a>
      )}
    </div>
  );
}
