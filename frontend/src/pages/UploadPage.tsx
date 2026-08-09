import { UploadCloud } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function UploadPage() {
  return (
    <EmptyState
      icon={<UploadCloud className="h-5 w-5" />}
      title="Upload analysis data"
      description="CSV upload isn't available yet — the backend doesn't expose an upload endpoint. This page is a placeholder for when that lands."
    />
  );
}
