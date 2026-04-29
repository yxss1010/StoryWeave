import type { Node, Edge } from '@vue-flow/core';

export interface BookMetadata {
  id: string;
  title: string;
  cover: string;
  file_path: string;
  synopsis: string;
  settings: string;
  last_modified: string;
  created_at: string;
}

const API_BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

export async function getBookList(): Promise<BookMetadata[]> {
  return apiFetch<BookMetadata[]>('/books');
}

export async function createNewBook(title: string, cover: string = ''): Promise<BookMetadata> {
  return apiFetch<BookMetadata>('/books', {
    method: 'POST',
    body: JSON.stringify({ title, cover }),
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/books/${bookId}`, {
    method: 'DELETE',
  });
}

export async function loadBookData(filePath: string): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const bookId = extractBookId(filePath);
  return apiFetch<{ nodes: Node[]; edges: Edge[] }>(`/books/${bookId}/outline`);
}

export async function saveBookData(filePath: string, nodes: Node[], edges: Edge[]): Promise<void> {
  const bookId = extractBookId(filePath);
  const safeEdges = edges.map((edge, index) => ({
    ...edge,
    id: edge.id || `auto-edge-${edge.source}-${edge.target}-${index}`,
  }));
  await apiFetch<void>(`/books/${bookId}/outline`, {
    method: 'PUT',
    body: JSON.stringify({ nodes, edges: safeEdges }),
  });
}

export async function updateBookMetadata(bookId: string, updates: Partial<BookMetadata>): Promise<void> {
  await apiFetch<BookMetadata>(`/books/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function getBookDetail(bookId: string): Promise<BookMetadata> {
  return apiFetch<BookMetadata>(`/books/${bookId}`);
}

function extractBookId(filePath: string): string {
  const parts = filePath.split('_');
  return parts[parts.length - 1] || filePath;
}
