import Link from 'next/link';
import { VoiceAgentConfig } from '../components/VoiceAgentConfig';

export default function ConfigPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 inline-flex items-center gap-2"
          >
            <span aria-hidden="true">←</span>
            Back
          </Link>

          <div className="text-sm text-gray-500">POSTs to http://localhost:8080/voiceagent/config</div>
        </div>

        <VoiceAgentConfig />
      </div>
    </div>
  );
}

