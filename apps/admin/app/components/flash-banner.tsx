type FlashBannerProps = {
  notice?: string;
  error?: string;
};

export function FlashBanner({ notice, error }: FlashBannerProps) {
  if (!notice && !error) {
    return null;
  }

  return (
    <section
      className={`flash-banner ${error ? 'flash-banner--error' : 'flash-banner--notice'}`.trim()}
    >
      <p>{error ?? notice}</p>
    </section>
  );
}
