import { useState } from 'react';
import { CVUploader } from '@/components/CVUploader';

export default function ParseScoreTest() {
  const [candidate, setCandidate] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">
            ParseScore API Test
          </h1>
          <a 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </a>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>🧪 Test Mode:</strong> Upload a CV to test the ParseScore API integration
          </p>
        </div>
        
        <CVUploader onParsed={(result) => setCandidate(result.candidate)} />
        
        {candidate && (
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Parsed Candidate Data</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700">Contact Info</h3>
                  <p className="text-sm">Name: {candidate.contact?.full_name || 'N/A'}</p>
                  <p className="text-sm">Email: {candidate.contact?.emails?.[0] || 'N/A'}</p>
                  <p className="text-sm">Phone: {candidate.contact?.phones?.[0] || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Stats</h3>
                  <p className="text-sm">Skills: {candidate.skills?.length || 0}</p>
                  <p className="text-sm">Experience: {candidate.work_experience?.length || 0} roles</p>
                  <p className="text-sm">Education: {candidate.education?.length || 0}</p>
                </div>
              </div>
              
              <details className="bg-gray-50 p-4 rounded">
                <summary className="cursor-pointer font-semibold">
                  View Full JSON
                </summary>
                <pre className="text-xs overflow-auto mt-4 bg-white p-4 rounded border">
                  {JSON.stringify(candidate, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}