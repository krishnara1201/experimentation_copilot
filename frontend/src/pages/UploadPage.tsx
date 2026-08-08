import Card from '../components/ui/Card';

export default function UploadPage() {
  return (
    <Card>
      <h1 className="mb-2 text-lg font-semibold">Upload analysis data</h1>
      <p className="text-sm text-slate-600">
        CSV upload isn't available yet — the backend doesn't expose an upload endpoint. This page is a
        placeholder for when that lands.
      </p>
    </Card>
  );
}
