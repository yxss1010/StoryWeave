import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface BookMetadata {
  id: string;
  title: string;
  cover: string;
  file_path: string;
  last_modified: string;
  created_at: string;
}

export interface OutlineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface OutlineEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface OutlineData {
  nodes: OutlineNode[];
  edges: OutlineEdge[];
}

const DEFAULT_DATA_DIR = path.resolve(process.env.STORYWEAVE_DATA_DIR || path.join(process.cwd(), 'data'));

function getDataDir(): string {
  return DEFAULT_DATA_DIR;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateId(): string {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getBooksFilePath(): string {
  return path.join(getDataDir(), 'books.json');
}

function getOutlineFilePath(bookId: string): string {
  return path.join(getDataDir(), 'outlines', `${bookId}.json`);
}

export function getBookList(): BookMetadata[] {
  const books = readJsonFile<BookMetadata[]>(getBooksFilePath(), []);
  return books.sort(
    (a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
  );
}

export function getBookById(bookId: string): BookMetadata | undefined {
  const books = readJsonFile<BookMetadata[]>(getBooksFilePath(), []);
  return books.find(b => b.id === bookId);
}

export function createBook(title: string, cover: string = ''): BookMetadata {
  const books = readJsonFile<BookMetadata[]>(getBooksFilePath(), []);
  const id = generateId();
  const now = new Date().toISOString();
  const book: BookMetadata = {
    id,
    title,
    cover,
    file_path: `outline_${id}`,
    last_modified: now,
    created_at: now,
  };
  books.push(book);
  writeJsonFile(getBooksFilePath(), books);
  writeJsonFile(getOutlineFilePath(id), { nodes: [], edges: [] });
  return book;
}

export function updateBook(bookId: string, updates: Partial<BookMetadata>): BookMetadata | null {
  const books = readJsonFile<BookMetadata[]>(getBooksFilePath(), []);
  const index = books.findIndex(b => b.id === bookId);
  if (index === -1) return null;
  books[index] = { ...books[index], ...updates, last_modified: new Date().toISOString() };
  writeJsonFile(getBooksFilePath(), books);
  return books[index];
}

export function deleteBook(bookId: string): boolean {
  const books = readJsonFile<BookMetadata[]>(getBooksFilePath(), []);
  const filtered = books.filter(b => b.id !== bookId);
  if (filtered.length === books.length) return false;
  writeJsonFile(getBooksFilePath(), filtered);
  const outlinePath = getOutlineFilePath(bookId);
  if (fs.existsSync(outlinePath)) {
    fs.unlinkSync(outlinePath);
  }
  return true;
}

export function getOutline(bookId: string): OutlineData {
  return readJsonFile<OutlineData>(getOutlineFilePath(bookId), { nodes: [], edges: [] });
}

export function saveOutline(bookId: string, data: OutlineData): void {
  writeJsonFile(getOutlineFilePath(bookId), data);
}

export function addNode(
  bookId: string,
  nodeType: 'volume' | 'act' | 'scene',
  nodeData: Record<string, unknown>
): OutlineNode | null {
  const outline = getOutline(bookId);
  const id = generateId();
  const x = Math.round(300 + Math.random() * 200);
  const y = Math.round(200 + Math.random() * 200);

  const baseData: Record<string, unknown> = {
    title: nodeData.title || `新${nodeType === 'volume' ? '卷' : nodeType === 'act' ? '幕' : '场景'}`,
    type: nodeType,
    change_before: nodeData.change_before || '',
    change_after: nodeData.change_after || '',
  };

  if (nodeType === 'volume') {
    baseData.volume_number = nodeData.volume_number || 1;
    baseData.summary = nodeData.summary || '';
  } else if (nodeType === 'act') {
    baseData.act_number = nodeData.act_number || 1;
    baseData.conflict = nodeData.conflict || '';
    if (nodeData.volume_id) baseData.volume_id = nodeData.volume_id;
  } else {
    baseData.location = nodeData.location || '';
    baseData.characters = nodeData.characters || [];
    if (nodeData.act_id) baseData.act_id = nodeData.act_id;
  }

  const node: OutlineNode = { id, type: 'plotNode', position: { x, y }, data: baseData };
  outline.nodes.push(node);

  if (nodeType === 'act' && nodeData.volume_id) {
    const edgeId = `e-${nodeData.volume_id}-${id}-${Date.now()}`;
    outline.edges.push({ id: edgeId, source: String(nodeData.volume_id), target: id, type: 'smoothstep' });
  }
  if (nodeType === 'scene' && nodeData.act_id) {
    const edgeId = `e-${nodeData.act_id}-${id}-${Date.now()}`;
    outline.edges.push({ id: edgeId, source: String(nodeData.act_id), target: id, type: 'smoothstep' });
  }

  saveOutline(bookId, outline);
  updateBook(bookId, {});
  return node;
}

export function updateNode(bookId: string, nodeId: string, updates: Record<string, unknown>): OutlineNode | null {
  const outline = getOutline(bookId);
  const node = outline.nodes.find(n => n.id === nodeId);
  if (!node) return null;
  node.data = { ...node.data, ...updates };
  saveOutline(bookId, outline);
  updateBook(bookId, {});
  return node;
}

export function deleteNode(bookId: string, nodeId: string): boolean {
  const outline = getOutline(bookId);
  const before = outline.nodes.length;
  outline.nodes = outline.nodes.filter(n => n.id !== nodeId);
  outline.edges = outline.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  if (outline.nodes.length === before) return false;
  saveOutline(bookId, outline);
  updateBook(bookId, {});
  return true;
}

export function connectNodes(bookId: string, sourceId: string, targetId: string): OutlineEdge | null {
  const outline = getOutline(bookId);
  const source = outline.nodes.find(n => n.id === sourceId);
  const target = outline.nodes.find(n => n.id === targetId);
  if (!source || !target) return null;

  const existing = outline.edges.find(e => e.source === sourceId && e.target === targetId);
  if (existing) return existing;

  const edge: OutlineEdge = {
    id: `e-${sourceId}-${targetId}-${Date.now()}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
  };
  outline.edges.push(edge);
  saveOutline(bookId, outline);
  updateBook(bookId, {});
  return edge;
}

export function disconnectNodes(bookId: string, sourceId: string, targetId: string): boolean {
  const outline = getOutline(bookId);
  const before = outline.edges.length;
  outline.edges = outline.edges.filter(e => !(e.source === sourceId && e.target === targetId));
  if (outline.edges.length === before) return false;
  saveOutline(bookId, outline);
  updateBook(bookId, {});
  return true;
}

export function getOutlineTree(bookId: string): Record<string, unknown> {
  const outline = getOutline(bookId);
  const book = getBookById(bookId);
  if (!book) return { error: 'Book not found' };

  const volumes = outline.nodes.filter(n => n.data.type === 'volume');
  const acts = outline.nodes.filter(n => n.data.type === 'act');
  const scenes = outline.nodes.filter(n => n.data.type === 'scene');

  const tree = volumes.map(vol => {
    const volActs = outline.edges
      .filter(e => e.source === vol.id)
      .map(e => acts.find(a => a.id === e.target))
      .filter(Boolean)
      .map(act => {
        const actScenes = outline.edges
          .filter(e => e.source === act!.id)
          .map(e => scenes.find(s => s.id === e.target))
          .filter(Boolean)
          .map(scene => ({
            id: scene!.id,
            title: scene!.data.title,
            location: scene!.data.location,
            characters: scene!.data.characters,
            change_before: scene!.data.change_before,
            change_after: scene!.data.change_after,
          }));

        return {
          id: act!.id,
          title: act!.data.title,
          act_number: act!.data.act_number,
          conflict: act!.data.conflict,
          change_before: act!.data.change_before,
          change_after: act!.data.change_after,
          scenes: actScenes,
        };
      });

    return {
      id: vol.id,
      title: vol.data.title,
      volume_number: vol.data.volume_number,
      summary: vol.data.summary,
      change_before: vol.data.change_before,
      change_after: vol.data.change_after,
      acts: volActs,
    };
  });

  const orphanActs = acts.filter(act =>
    !outline.edges.some(e => e.target === act.id && volumes.some(v => v.id === e.source))
  );
  const orphanScenes = scenes.filter(scene =>
    !outline.edges.some(e => e.target === scene.id && acts.some(a => a.id === e.source))
  );

  return {
    book: { id: book.id, title: book.title },
    tree,
    orphan_acts: orphanActs.map(a => ({ id: a.id, title: a.data.title })),
    orphan_scenes: orphanScenes.map(s => ({ id: s.id, title: s.data.title })),
    stats: {
      total_volumes: volumes.length,
      total_acts: acts.length,
      total_scenes: scenes.length,
      total_edges: outline.edges.length,
    },
  };
}

export function validateOutline(bookId: string): Record<string, unknown> {
  const outline = getOutline(bookId);
  const issues: string[] = [];

  const volumes = outline.nodes.filter(n => n.data.type === 'volume');
  const acts = outline.nodes.filter(n => n.data.type === 'act');
  const scenes = outline.nodes.filter(n => n.data.type === 'scene');

  if (volumes.length === 0) issues.push('大纲中没有卷节点');
  if (acts.length === 0) issues.push('大纲中没有幕节点');
  if (scenes.length === 0) issues.push('大纲中没有场景节点');

  for (const act of acts) {
    const hasParent = outline.edges.some(e => e.target === act.id);
    if (!hasParent) issues.push(`幕「${act.data.title}」没有关联的卷`);
  }

  for (const scene of scenes) {
    const hasParent = outline.edges.some(e => e.target === scene.id);
    if (!hasParent) issues.push(`场景「${scene.data.title}」没有关联的幕`);
  }

  for (const vol of volumes) {
    const childActs = outline.edges.filter(e => e.source === vol.id);
    if (childActs.length === 0) issues.push(`卷「${vol.data.title}」下没有幕`);
  }

  for (const act of acts) {
    const childScenes = outline.edges.filter(e => e.source === act.id);
    if (childScenes.length === 0) issues.push(`幕「${act.data.title}」下没有场景`);
  }

  for (const scene of scenes) {
    if (!scene.data.location) issues.push(`场景「${scene.data.title}」没有设置地点`);
    if (!scene.data.characters || (scene.data.characters as string[]).length === 0) {
      issues.push(`场景「${scene.data.title}」没有设置人物`);
    }
  }

  return {
    valid: issues.length === 0,
    issue_count: issues.length,
    issues,
    stats: {
      volumes: volumes.length,
      acts: acts.length,
      scenes: scenes.length,
    },
  };
}
