import type { Node, Edge } from '@vue-flow/core';

// 简单的localStorage包装器
const storage = {
  setItem: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  },
  getItem: (key: string) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return null;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  },
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },
  keys: () => {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Error getting localStorage keys:', error);
      return [];
    }
  }
};

/**
 * 保存图数据到localStorage
 * @param nodes 节点数组
 * @param edges 边数组
 */
export async function saveGraph(nodes: Node[], edges: Edge[]): Promise<void> {
  console.log('=== Saving graph ===');
  console.log('Nodes length:', nodes.length);
  console.log('Edges length:', edges.length);
  
  // 保存数据
  const successNodes = storage.setItem('novelGraph_nodes', nodes);
  const successEdges = storage.setItem('novelGraph_edges', edges);
  
  console.log('Save nodes success:', successNodes);
  console.log('Save edges success:', successEdges);
  
  // 验证保存结果
  if (successNodes && successEdges) {
    const savedNodes = storage.getItem('novelGraph_nodes');
    const savedEdges = storage.getItem('novelGraph_edges');
    console.log('Saved nodes length:', savedNodes ? savedNodes.length : 0);
    console.log('Saved edges length:', savedEdges ? savedEdges.length : 0);
    console.log('=== Graph saved successfully ===');
  } else {
    console.error('=== Failed to save graph ===');
  }
}

/**
 * 从localStorage加载图数据
 * @returns 包含nodes和edges的对象
 */
export async function loadGraph(): Promise<{ nodes: Node[]; edges: Edge[] }> {
  console.log('=== Loading graph ===');
  
  const storedNodes = storage.getItem('novelGraph_nodes') || [];
  const storedEdges = storage.getItem('novelGraph_edges') || [];
  
  // 1. 验证 Nodes
  const validNodes = Array.isArray(storedNodes) ? storedNodes.filter((node: any) => 
    node && typeof node === 'object' && node.id && node.type && node.position
  ) : [];
  
  // 2. 验证并修复 Edges (关键修改)
  let validEdges: Edge[] = [];
  
  if (Array.isArray(storedEdges)) {
    validEdges = storedEdges
      // 只校验必须的 source 和 target，不再强制要求 id 存在（防止误删）
      .filter((edge: any) => 
        edge && typeof edge === 'object' && edge.source && edge.target
      )
      // 为缺失 id 的边自动生成一个唯一 ID
      .map((edge: any) => {
        if (!edge.id) {
          edge.id = `e-${edge.source}-${edge.target}-${Date.now()}`;
        }
        return edge as Edge;
      });
  }
  
  console.log('Loaded valid nodes:', validNodes.length);
  console.log('Loaded valid edges:', validEdges.length);
  
  return { nodes: validNodes, edges: validEdges };
}
