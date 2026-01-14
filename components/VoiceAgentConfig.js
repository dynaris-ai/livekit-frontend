import { useMemo, useState } from 'react';
import { apiClient } from '../lib/api-client';

const DEFAULTS = {
  user_id: 'user123',
  agent_type: 'inbound',
  greeting_instruction: '',
  system_instructions: '',
  elevenlabs_voice_id: '',
  transfer_to: '',
  max_call_duration_minutes: 30,
  silence_timeout_seconds: 10,
  silence_max_retries: 2,
  silence_check_interval: 1,
  tools: [],
};

const Field = ({ label, hint, children }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  );
};

const Card = ({ title, description, children }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description ? <p className="text-sm text-gray-600 mt-1">{description}</p> : null}
      </div>
      {children}
    </div>
  );
};

export const VoiceAgentConfig = () => {
  const [form, setForm] = useState(DEFAULTS);
  const [toolDraft, setToolDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'error', message: string }

  const canSave = useMemo(() => {
    return Boolean(form.user_id?.trim()) && Boolean(form.agent_type?.trim());
  }, [form.user_id, form.agent_type]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const addTool = () => {
    const next = toolDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (next.length === 0) return;

    update({
      tools: Array.from(new Set([...(form.tools || []), ...next])),
    });
    setToolDraft('');
  };

  const removeTool = (tool) => {
    update({ tools: (form.tools || []).filter((t) => t !== tool) });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setResult(null);

    try {
      const { user_id, agent_type, ...config } = form;
      await apiClient.updateVoiceAgentConfig(user_id, agent_type, config);
      setResult({ type: 'success', message: 'Configuration saved.' });
    } catch (err) {
      setResult({ type: 'error', message: err?.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const inputBase =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Configuration</h1>
            <p className="text-sm text-gray-600 mt-1">Per-user settings stored in your database.</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setForm(DEFAULTS);
                setToolDraft('');
                setResult(null);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className="px-5 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? <div className="spinner"></div> : null}
              Save Configuration
            </button>
          </div>
        </div>

        {result ? (
          <div
            className={`mt-5 rounded-lg border p-4 ${
              result.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {result.message}
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Field label="User ID" hint="Used to load/store per-user configuration.">
            <input
              className={inputBase}
              value={form.user_id}
              onChange={(e) => update({ user_id: e.target.value })}
              placeholder="user123"
            />
          </Field>

          <Field label="Agent Type" hint="Which agent profile to configure (e.g., inbound/outbound).">
            <select
              className={inputBase}
              value={form.agent_type}
              onChange={(e) => update({ agent_type: e.target.value })}
            >
              <option value="inbound">inbound</option>
              <option value="outbound">outbound</option>
            </select>
          </Field>
        </div>
      </div>

      <Card title="Greeting & Instructions" description="Control how the agent greets and the high-level system behavior.">
        <div className="grid md:grid-cols-2 gap-6">
          <Field label="greeting_instruction" hint="Short greeting spoken to the user at the start.">
            <textarea
              className={`${inputBase} min-h-[110px]`}
              value={form.greeting_instruction}
              onChange={(e) => update({ greeting_instruction: e.target.value })}
              placeholder="Hello! How can I help today?"
            />
          </Field>

          <Field label="system_instructions" hint="System-level instructions for agent behavior.">
            <textarea
              className={`${inputBase} min-h-[110px]`}
              value={form.system_instructions}
              onChange={(e) => update({ system_instructions: e.target.value })}
              placeholder="Be concise, helpful, and confirm details when ambiguous."
            />
          </Field>
        </div>
      </Card>

      <Card title="Voice Settings" description="Configure TTS voice selection.">
        <div className="grid md:grid-cols-2 gap-6">
          <Field label="elevenlabs_voice_id" hint="ElevenLabs voice id used by the agent.">
            <input
              className={inputBase}
              value={form.elevenlabs_voice_id}
              onChange={(e) => update({ elevenlabs_voice_id: e.target.value })}
              placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
            />
          </Field>
        </div>
      </Card>

      <Card title="Call Management" description="Control call duration and transfer behavior.">
        <div className="grid md:grid-cols-2 gap-6">
          <Field label="transfer_to" hint="Where to transfer the call (optional).">
            <input
              className={inputBase}
              value={form.transfer_to}
              onChange={(e) => update({ transfer_to: e.target.value })}
              placeholder="e.g. +15551234567 or queue:sales"
            />
          </Field>

          <Field label="max_call_duration_minutes" hint="Maximum call time before terminating.">
            <input
              type="number"
              min="1"
              max="600"
              className={inputBase}
              value={form.max_call_duration_minutes}
              onChange={(e) => update({ max_call_duration_minutes: Number(e.target.value) })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Silence Handling" description="Configure silence detection and retry behavior.">
        <div className="grid md:grid-cols-3 gap-6">
          <Field label="silence_timeout_seconds" hint="Seconds of silence before a prompt/retry.">
            <input
              type="number"
              min="1"
              max="600"
              className={inputBase}
              value={form.silence_timeout_seconds}
              onChange={(e) => update({ silence_timeout_seconds: Number(e.target.value) })}
            />
          </Field>

          <Field label="silence_max_retries" hint="How many silence prompts before ending/escalating.">
            <input
              type="number"
              min="0"
              max="50"
              className={inputBase}
              value={form.silence_max_retries}
              onChange={(e) => update({ silence_max_retries: Number(e.target.value) })}
            />
          </Field>

          <Field label="silence_check_interval" hint="How often to check for silence (seconds).">
            <input
              type="number"
              min="1"
              max="60"
              className={inputBase}
              value={form.silence_check_interval}
              onChange={(e) => update({ silence_check_interval: Number(e.target.value) })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Tool Selection" description="Choose which tools the agent may call.">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              className={`${inputBase} flex-1`}
              value={toolDraft}
              onChange={(e) => setToolDraft(e.target.value)}
              placeholder="Add tools (comma-separated), e.g. calendar.create, crm.lookup"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTool();
                }
              }}
            />
            <button
              type="button"
              onClick={addTool}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
            >
              Add
            </button>
          </div>

          {form.tools?.length ? (
            <div className="flex flex-wrap gap-2">
              {form.tools.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-sm text-gray-800"
                >
                  <span className="font-mono">{tool}</span>
                  <button
                    type="button"
                    onClick={() => removeTool(tool)}
                    className="text-gray-500 hover:text-gray-900"
                    aria-label={`Remove tool ${tool}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No tools selected.</p>
          )}
        </div>
      </Card>
    </form>
  );
};

