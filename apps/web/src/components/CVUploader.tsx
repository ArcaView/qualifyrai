import { useState } from 'react';
import { parseScoreAPI } from '../lib/api/parsescore-client';

export function CVUploader({ onParsed }: { onParsed?: (result: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const response = await parseScoreAPI.parseCV(file, true);
      setResult(response);
      onParsed?.(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">Upload CV</h2>
      
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={loading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Parsing...' : 'Upload & Parse CV'}
      </button>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 rounded">
          <h3 className="font-bold text-green-800 mb-2">✓ CV Parsed Successfully</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Candidate:</strong> {result.candidate.contact.full_name || 'N/A'}</p>
            <p><strong>Skills:</strong> {result.candidate.skills.length}</p>
            <p><strong>Experience:</strong> {result.candidate.work_experience.length} roles</p>
          </div>
        </div>
      )}
    </div>
  );
}