import express from 'express';
import cors from 'cors';
import * as storage from './storage.js';

const app = express();
const PORT = parseInt(process.env.STORYWEAVE_API_PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/books', (_req, res) => {
  const books = storage.getBookList();
  res.json(books);
});

app.post('/api/books', (req, res) => {
  const { title, cover } = req.body;
  if (!title) {
    res.status(400).json({ error: '标题不能为空' });
    return;
  }
  const book = storage.createBook(title, cover || '');
  res.json(book);
});

app.get('/api/books/:bookId', (req, res) => {
  const book = storage.getBookById(req.params.bookId);
  if (!book) {
    res.status(404).json({ error: '书籍不存在' });
    return;
  }
  res.json(book);
});

app.put('/api/books/:bookId', (req, res) => {
  const book = storage.updateBook(req.params.bookId, req.body);
  if (!book) {
    res.status(404).json({ error: '书籍不存在' });
    return;
  }
  res.json(book);
});

app.delete('/api/books/:bookId', (req, res) => {
  const success = storage.deleteBook(req.params.bookId);
  res.json({ success });
});

app.get('/api/books/:bookId/outline', (req, res) => {
  const book = storage.getBookById(req.params.bookId);
  if (!book) {
    res.status(404).json({ error: '书籍不存在' });
    return;
  }
  const outline = storage.getOutline(req.params.bookId);
  res.json(outline);
});

app.put('/api/books/:bookId/outline', (req, res) => {
  const { nodes, edges } = req.body;
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    res.status(400).json({ error: '无效的大纲数据' });
    return;
  }
  storage.saveOutline(req.params.bookId, { nodes, edges });
  res.json({ success: true });
});

app.get('/api/books/:bookId/outline/tree', (req, res) => {
  const tree = storage.getOutlineTree(req.params.bookId);
  res.json(tree);
});

app.get('/api/books/:bookId/outline/validate', (req, res) => {
  const result = storage.validateOutline(req.params.bookId);
  res.json(result);
});

app.post('/api/books/:bookId/nodes', (req, res) => {
  const { nodeType, ...nodeData } = req.body;
  if (!nodeType || !['volume', 'act', 'scene'].includes(nodeType)) {
    res.status(400).json({ error: '无效的节点类型' });
    return;
  }
  const node = storage.addNode(req.params.bookId, nodeType, nodeData);
  if (!node) {
    res.status(404).json({ error: '书籍不存在' });
    return;
  }
  res.json(node);
});

app.put('/api/books/:bookId/nodes/:nodeId', (req, res) => {
  const node = storage.updateNode(req.params.bookId, req.params.nodeId, req.body);
  if (!node) {
    res.status(404).json({ error: '节点不存在' });
    return;
  }
  res.json(node);
});

app.delete('/api/books/:bookId/nodes/:nodeId', (req, res) => {
  const success = storage.deleteNode(req.params.bookId, req.params.nodeId);
  res.json({ success });
});

app.post('/api/books/:bookId/edges', (req, res) => {
  const { sourceId, targetId } = req.body;
  if (!sourceId || !targetId) {
    res.status(400).json({ error: '缺少源节点或目标节点 ID' });
    return;
  }
  const edge = storage.connectNodes(req.params.bookId, sourceId, targetId);
  if (!edge) {
    res.status(400).json({ error: '连接失败' });
    return;
  }
  res.json(edge);
});

app.delete('/api/books/:bookId/edges', (req, res) => {
  const { sourceId, targetId } = req.body;
  if (!sourceId || !targetId) {
    res.status(400).json({ error: '缺少源节点或目标节点 ID' });
    return;
  }
  const success = storage.disconnectNodes(req.params.bookId, sourceId, targetId);
  res.json({ success });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'storyweave-api' });
});

app.listen(PORT, () => {
  console.log(`StoryWeave API Server running on http://localhost:${PORT}`);
});
