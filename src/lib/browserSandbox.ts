/**
 * Runs untrusted JavaScript in a sandboxed iframe.
 *
 * The iframe uses `sandbox="allow-scripts"` without `allow-same-origin`, so the
 * code executes in an opaque origin: no DOM access to the host page, no cookies,
 * no storage, and no access to the user's Supabase session. The frame is torn
 * down on completion or timeout, which also stops infinite loops.
 */

export interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

const TIMEOUT_MS = 5000;
const MAX_OUTPUT_LENGTH = 50_000;

const RUNNER = `
<!doctype html><html><body><script>
  var outputs = [];
  var format = function (v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (v instanceof Error) return v.name + ': ' + v.message;
    if (typeof v === 'object') { try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); } }
    return String(v);
  };
  var push = function (prefix, args) {
    if (outputs.length < 1000) outputs.push(prefix + Array.prototype.map.call(args, format).join(' '));
  };
  console.log = function () { push('', arguments); };
  console.error = function () { push('ERROR: ', arguments); };
  console.warn = function () { push('WARN: ', arguments); };
  console.info = function () { push('INFO: ', arguments); };
  console.table = function (d) { push('', [d]); };

  window.addEventListener('message', function (event) {
    var data = event.data || {};
    if (data.type !== 'run') return;
    var reply = function (payload) {
      parent.postMessage({ type: 'result', id: data.id, outputs: outputs, ...payload }, '*');
    };
    try {
      var fn = new Function('input', '"use strict";' + data.code);
      Promise.resolve(fn(data.input || ''))
        .then(function () { reply({ success: true }); })
        .catch(function (err) { reply({ success: false, error: String((err && err.message) || err) }); });
    } catch (err) {
      reply({ success: false, error: String((err && err.message) || err) });
    }
  });
  parent.postMessage({ type: 'ready' }, '*');
<\/script></body></html>
`;

/** Strips the most common TypeScript annotations so TS snippets can run as JS. */
export const stripTypeScript = (code: string): string =>
  code
    .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
    .replace(/\bas\s+\w+/g, '')
    .replace(/:\s*(string|number|boolean|any|void|object|unknown|never)(\[\])?\s*([=,)\{;])/g, '$3');

export const runInBrowserSandbox = (code: string, input?: string): Promise<SandboxResult> => {
  const startTime = Date.now();

  return new Promise<SandboxResult>((resolve) => {
    const id = `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = RUNNER;

    let settled = false;
    const finish = (result: SandboxResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
      resolve({
        ...result,
        output: result.output.length > MAX_OUTPUT_LENGTH
          ? `${result.output.slice(0, MAX_OUTPUT_LENGTH)}\n… output truncated`
          : result.output,
      });
    };

    const timer = setTimeout(() => {
      finish({
        success: false,
        output: '',
        error: `Execution timeout (${TIMEOUT_MS / 1000} seconds)`,
        executionTime: Date.now() - startTime,
      });
    }, TIMEOUT_MS);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as { type?: string; id?: string; outputs?: string[]; success?: boolean; error?: string };
      if (data?.type === 'ready') {
        iframe.contentWindow?.postMessage({ type: 'run', id, code, input: input || '' }, '*');
        return;
      }
      if (data?.type !== 'result' || data.id !== id) return;
      const output = (data.outputs || []).join('\n');
      finish({
        success: !!data.success,
        output: data.success ? (output || '(No output)') : output,
        error: data.error,
        executionTime: Date.now() - startTime,
      });
    };

    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
};
