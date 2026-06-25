type StatusBannerProps = {
  notice: string;
  error: string;
  onClose: () => void;
};

export function StatusBanner({ notice, error, onClose }: StatusBannerProps) {
  if (!notice && !error) {
    return null;
  }

  return (
    <div className={error ? 'status-banner error' : 'status-banner'}>
      <span>{error || notice}</span>
      <button type="button" title="关闭提示" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
