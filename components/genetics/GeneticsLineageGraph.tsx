"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import dagre from '@dagrejs/dagre';
import { Network } from 'lucide-react';
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Genetics, LineageEdge } from '@/lib/db';

interface GeneticsLineageGraphProps {
  genetics: Genetics[];
  lineageEdges: LineageEdge[];
  selectedId?: string;
  onSelect: (geneticsId: string) => void;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 64;

const TYPE_COLORS: Record<Genetics['type'], string> = {
  Indica: '#2f8f79',
  Sativa: '#1aa167',
  Hybrid: '#2b7fb8',
  Unknown: '#65706d',
};

const RELATION_COLOR: Record<LineageEdge['relationType'], string> = {
  parent: '#65706d',
  cross: '#1aa167',
  child: '#2b7fb8',
};

// React Flow controls ship with a light theme by default; align them with the
// organic surface so the buttons stay inside the app palette.
const CONTROLS_THEME_CSS = `
  .genetics-flow-controls {
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 12px 30px rgba(0,0,0,0.24);
  }
  .genetics-flow-controls .react-flow__controls-button {
    background: rgba(13,21,27,0.92);
    border-bottom: 1px solid rgba(255,255,255,0.10);
    color: #a7f3d0;
  }
  .genetics-flow-controls .react-flow__controls-button:hover {
    background: rgba(52,255,154,0.10);
  }
  .genetics-flow-controls .react-flow__controls-button svg {
    fill: #a7f3d0;
  }
`;

interface LayoutPosition {
  x: number;
  y: number;
}

/** Computes a top-down layered layout for the full lineage graph via dagre. */
function computeLayout(genetics: Genetics[], edges: LineageEdge[]): Map<string, LayoutPosition> {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'TB', nodesep: 45, ranksep: 90, marginx: 40, marginy: 40 });
  graph.setDefaultEdgeLabel(() => ({}));

  const knownIds = new Set(genetics.map(entry => entry.id));
  genetics.forEach(entry => {
    graph.setNode(entry.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach(edge => {
    if (knownIds.has(edge.parentGeneticsId) && knownIds.has(edge.childGeneticsId)) {
      graph.setEdge(edge.parentGeneticsId, edge.childGeneticsId);
    }
  });

  dagre.layout(graph);

  const positions = new Map<string, LayoutPosition>();
  genetics.forEach(entry => {
    const node = graph.node(entry.id);
    if (node) {
      positions.set(entry.id, { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 });
    }
  });
  return positions;
}

function buildNodeLabel(entry: Genetics) {
  return (
    <div className="flex flex-col gap-0.5 text-left leading-tight">
      <span className="truncate text-sm font-medium text-foreground">{entry.name}</span>
      <span className="truncate text-[11px] text-muted-foreground">{entry.breeder || 'Unknown breeder'}</span>
    </div>
  );
}

function GraphCanvas({ genetics, lineageEdges, selectedId, onSelect }: GeneticsLineageGraphProps) {
  const { setCenter, fitView } = useReactFlow();
  // The registry opens in focus mode so the first view is readable. Users can
  // still exit to the full tree from the focus pill or by clicking the pane.
  const [focusedId, setFocusedId] = useState<string | null>(selectedId || null);

  useEffect(() => {
    if (!selectedId) return;
    setFocusedId(current => current || selectedId);
  }, [selectedId]);

  // Clear focus if the focused genetics is no longer part of the dataset.
  useEffect(() => {
    if (focusedId && !genetics.some(entry => entry.id === focusedId)) {
      setFocusedId(null);
    }
  }, [focusedId, genetics]);

  // Restrict the dataset to the direct neighbourhood of the focused genetics.
  const focusedNeighbourhood = useMemo(() => {
    if (!focusedId) return null;
    const ids = new Set<string>([focusedId]);
    for (const edge of lineageEdges) {
      if (edge.childGeneticsId === focusedId) ids.add(edge.parentGeneticsId);
      if (edge.parentGeneticsId === focusedId) ids.add(edge.childGeneticsId);
    }
    return ids;
  }, [focusedId, lineageEdges]);

  const activeGenetics = useMemo(
    () => (focusedNeighbourhood ? genetics.filter(entry => focusedNeighbourhood.has(entry.id)) : genetics),
    [genetics, focusedNeighbourhood],
  );

  const activeEdges = useMemo(() => {
    if (!focusedId) return lineageEdges;
    return lineageEdges.filter(
      edge => edge.parentGeneticsId === focusedId || edge.childGeneticsId === focusedId,
    );
  }, [lineageEdges, focusedId]);

  const focusedName = useMemo(
    () => (focusedId ? genetics.find(entry => entry.id === focusedId)?.name ?? null : null),
    [focusedId, genetics],
  );

  const positions = useMemo(() => computeLayout(activeGenetics, activeEdges), [activeGenetics, activeEdges]);

  const nodes = useMemo<Node[]>(() => {
    return activeGenetics.map(entry => {
      const position = positions.get(entry.id) ?? { x: 0, y: 0 };
      const isSelected = entry.id === selectedId;
      const isFocusRoot = entry.id === focusedId;
      const accent = TYPE_COLORS[entry.type] ?? TYPE_COLORS.Unknown;
      const highlighted = isSelected || isFocusRoot;
      return {
        id: entry.id,
        position,
        data: { label: buildNodeLabel(entry) },
        type: 'default',
        style: {
          width: NODE_WIDTH,
          background: highlighted ? 'rgba(26,161,103,0.14)' : 'rgba(13,21,27,0.92)',
          border: `1px solid ${highlighted ? '#1aa167' : 'rgba(255,255,255,0.12)'}`,
          borderLeft: `4px solid ${accent}`,
          borderRadius: 18,
          padding: '8px 12px',
          boxShadow: highlighted ? '0 0 0 2px rgba(26,161,103,0.22), 0 12px 28px rgba(0,0,0,0.24)' : '0 8px 22px rgba(0,0,0,0.22)',
          cursor: 'pointer',
        },
      };
    });
  }, [activeGenetics, positions, selectedId, focusedId]);

  const knownIds = useMemo(() => new Set(activeGenetics.map(entry => entry.id)), [activeGenetics]);

  const edges = useMemo<Edge[]>(() => {
    return activeEdges
      .filter(edge => knownIds.has(edge.parentGeneticsId) && knownIds.has(edge.childGeneticsId))
      .map(edge => {
        const touchesSelected =
          edge.parentGeneticsId === selectedId || edge.childGeneticsId === selectedId;
        const color = touchesSelected ? '#1aa167' : RELATION_COLOR[edge.relationType];
        return {
          id: edge.id,
          source: edge.parentGeneticsId,
          target: edge.childGeneticsId,
          type: 'smoothstep',
          animated: touchesSelected,
          style: { stroke: color, strokeWidth: touchesSelected ? 2 : 1.3 },
        };
      });
  }, [knownIds, activeEdges, selectedId]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      onSelect(node.id);
      setFocusedId(node.id);
    },
    [onSelect],
  );

  // Double-click focuses the genetics to its direct parents and children only.
  const handleNodeDoubleClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      setFocusedId(node.id);
      onSelect(node.id);
    },
    [onSelect],
  );

  const exitFocus = useCallback(() => {
    setFocusedId(prev => {
      // Re-fit to the full tree only when actually leaving focus mode.
      if (prev) {
        window.setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 60);
      }
      return null;
    });
  }, [fitView]);

  // Leaving focus mode via Escape returns to the full family tree.
  useEffect(() => {
    if (!focusedId) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusedId(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focusedId]);

  // Fit the focused neighbourhood into view whenever focus mode toggles. The
  // delay lets React Flow mount/measure the reduced node set before fitting.
  useEffect(() => {
    if (!focusedId) return;
    const timer = window.setTimeout(() => fitView({ padding: 0.25, duration: 500 }), 120);
    return () => window.clearTimeout(timer);
  }, [focusedId, fitView]);

  // In the full tree, smoothly center on the selected genetics on selection change.
  useEffect(() => {
    if (focusedId || !selectedId) return;
    const position = positions.get(selectedId);
    if (!position) return;
    setCenter(position.x + NODE_WIDTH / 2, position.y + NODE_HEIGHT / 2, { zoom: 1.1, duration: 600 });
  }, [positions, selectedId, focusedId, setCenter]);

  return (
    <>
      <style>{CONTROLS_THEME_CSS}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={exitFocus}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background color="rgba(96,111,108,0.32)" gap={22} />
        <Controls showInteractive={false} className="genetics-flow-controls" />
        {focusedId && (
          <Panel position="top-center">
            <button
              type="button"
              onClick={exitFocus}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0d151b]/88 px-4 py-1.5 text-sm text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-colors hover:border-emerald-300/[0.25] hover:bg-emerald-300/10"
            >
              <Network className="h-4 w-4" />
              <span>
                Focus: <span className="font-medium text-foreground">{focusedName}</span> · full tree
              </span>
            </button>
          </Panel>
        )}
      </ReactFlow>
    </>
  );
}

export default function GeneticsLineageGraph(props: GeneticsLineageGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
