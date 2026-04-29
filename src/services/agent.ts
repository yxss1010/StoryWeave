const API_BASE = '/api/agent';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolEvent {
  type: 'tool_start' | 'tool_end';
  name: string;
  input?: Record<string, unknown>;
}

export async function streamChat(
  messages: ChatMessage[],
  bookId: string | null,
  onText: (text: string) => void,
  onToolEvent: (event: ToolEvent) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, bookId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    onError(err.error || `请求失败: ${res.status}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError('无法读取响应流');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      try {
        const data = JSON.parse(jsonStr);
        switch (data.type) {
          case 'text':
            onText(data.content);
            break;
          case 'tool_start':
            onToolEvent({ type: 'tool_start', name: data.name, input: data.input });
            break;
          case 'tool_end':
            onToolEvent({ type: 'tool_end', name: data.name });
            break;
          case 'done':
            onDone();
            break;
          case 'error':
            onError(data.content);
            break;
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
}

export async function checkAgentHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
