'use client';

import React, { useMemo, useCallback, memo, useEffect, useState } from 'react';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import type { Cell, CellId, Message } from '@/types';
import { cn } from '@/lib/utils';

// --- Cell Node Component ---
interface CellNodeProps {
  data: Cell;
}

const CellNode: React.FC<CellNodeProps> = memo(({ data }) => {
  const selectCell = useNetworkStore((state) => state.selectCell);
  const selectedCellId = useNetworkStore((state) => state.selectedCellId);
  const isSelected = selectedCellId === data.id;

  const size = 30 + Math.min(data.age / 2, 30); // Size increases slightly with age

  const handleClick = () => {
    selectCell(data.id);
  };

  // Prevent unnecessary re-renders if cell data hasn't changed relevant properties
  // Note: React.memo does a shallow comparison. If history or db changes often,
  // this might still re-render. Consider passing only necessary props if needed.
  return (
    <div
      className={cn(
        'cell-node',
        data.isAlive ? 'cell-node-alive' : 'cell-node-dead',
        isSelected && 'cell-node-selected'
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${data.position.x - size / 2}px`, // Center the node
        top: `${data.position.y - size / 2}px`, // Center the node
        position: 'absolute', // Position absolutely within the container
      }}
      onClick={data.isAlive ? handleClick : undefined}
      title={`Cell ${data.id}\nAge: ${data.age}\nExpertise: ${data.expertise}\nGoal: ${data.goal}\nStatus: ${data.isAlive ? 'Alive' : 'Dead'}`}
    >
      {data.id.substring(0, 2)} {/* Display first 2 chars of ID */}
    </div>
  );
});
CellNode.displayName = 'CellNode';


// --- Connection Line Component ---
interface ConnectionLineProps {
    source: Cell;
    target: Cell;
    isMessagePath?: boolean; // Highlight for message routes
    isLikedPath?: boolean; // Highlight for liked connections
}

const ConnectionLine: React.FC<ConnectionLineProps> = memo(({ source, target, isMessagePath, isLikedPath }) => {
    if (!source || !target) return null;

    // Adjust endpoints slightly towards center based on size
    const sourceSize = 30 + Math.min(source.age / 2, 30);
    const targetSize = 30 + Math.min(target.age / 2, 30);

    const dx = target.position.x - source.position.x;
    const dy = target.position.y - source.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return null; // Avoid division by zero

    // Calculate offsets to start/end line at the edge of the circle
    const sourceOffsetX = (dx / distance) * (sourceSize / 2);
    const sourceOffsetY = (dy / distance) * (sourceSize / 2);
    const targetOffsetX = (dx / distance) * (targetSize / 2);
    const targetOffsetY = (dy / distance) * (targetSize / 2);

    const x1 = source.position.x + sourceOffsetX;
    const y1 = source.position.y + sourceOffsetY;
    const x2 = target.position.x - targetOffsetX;
    const y2 = target.position.y - targetOffsetY;

    return (
        <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={cn(
                'connection-line',
                isMessagePath && 'message-path',
                isLikedPath && 'stroke-primary opacity-50' // Style for liked connections
            )}
            markerEnd={isMessagePath ? "url(#arrow)" : undefined}
        />
    );
});
ConnectionLine.displayName = 'ConnectionLine';


// --- Network Visualization Component ---
export const NetworkVisualization: React.FC = () => {
    const cells = useNetworkStore((state) => Object.values(state.cells));
    const messages = useNetworkStore((state) => state.messages);
    const getCellById = useNetworkStore((state) => state.getCellById);

    // Optimization: Use versions to trigger re-renders only when necessary cell data changes
    // This creates a dependency array based on cell versions and positions
    const cellDependencies = useMemo(() => {
        return cells.map(c => `${c.id}-${c.version}-${c.position.x}-${c.position.y}-${c.isAlive}-${c.age}`).join(',');
    }, [cells]);

    const messageDependencies = useMemo(() => {
        return messages.map(m => m.id).join(',');
    }, [messages]);

    const nodes = useMemo(() => {
        console.log("Recalculating nodes..."); // Debug log
        return cells.map((cell) => (
          <CellNode key={cell.id} data={cell} />
        ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cellDependencies]); // Re-render only when cell versions/positions/status/age change

    const edges = useMemo(() => {
        console.log("Recalculating edges..."); // Debug log
        const edgeElements: React.ReactNode[] = [];
        const drawnEdges = new Set<string>(); // To avoid drawing duplicate undirected edges

        // --- Liked Connections ---
        cells.forEach(sourceCell => {
            if (!sourceCell.isAlive) return;
            sourceCell.likedCells.forEach(targetId => {
                const targetCell = getCellById(targetId);
                if (targetCell && targetCell.isAlive) {
                    // Ensure edge uniqueness (e.g., "A-B" is the same as "B-A")
                    const edgeId = [sourceCell.id, targetId].sort().join('-');
                    if (!drawnEdges.has(edgeId)) {
                        edgeElements.push(
                            <ConnectionLine
                                key={`like-${edgeId}`}
                                source={sourceCell}
                                target={targetCell}
                                isLikedPath={true}
                            />
                        );
                        drawnEdges.add(edgeId);
                    }
                }
            });
        });


        // --- Message Connections ---
        messages.forEach((msg) => {
            const sourceCell = msg.sourceCellId !== 'user' ? getCellById(msg.sourceCellId) : null;
            let targets: Cell[] = [];

            if (msg.targetCellId === 'broadcast') {
                // For broadcast, draw lines from source to all other alive cells
                if (sourceCell) {
                     targets = cells.filter(c => c.isAlive && c.id !== sourceCell.id);
                }
            } else if (msg.targetCellId !== 'user') {
                const targetCell = getCellById(msg.targetCellId);
                if (targetCell && targetCell.isAlive) {
                     targets.push(targetCell);
                }
            }

            // Handle routes if available
            if (msg.route && msg.route.length > 1) {
                for (let i = 0; i < msg.route.length - 1; i++) {
                    const routeSource = getCellById(msg.route[i]);
                    const routeTarget = getCellById(msg.route[i + 1]);
                    if (routeSource && routeTarget && routeSource.isAlive && routeTarget.isAlive) {
                         edgeElements.push(
                            <ConnectionLine
                                key={`${msg.id}-route-${i}`}
                                source={routeSource}
                                target={routeTarget}
                                isMessagePath={true}
                            />
                        );
                    }
                }
            } else if (sourceCell) {
                // Fallback to direct source-target lines if no route
                targets.forEach(targetCell => {
                    edgeElements.push(
                        <ConnectionLine
                            key={`${msg.id}-${sourceCell.id}-${targetCell.id}`}
                            source={sourceCell}
                            target={targetCell}
                            isMessagePath={true}
                        />
                    );
                });
            }

        });

        return edgeElements;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cellDependencies, messageDependencies, getCellById]); // Re-render when cells or messages change

  return (
    <div className="w-full h-full border rounded-lg bg-card relative overflow-hidden">
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
         {/* Arrow marker definition */}
         <defs>
            <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8" // Offset to position correctly at the end of the line
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
                fill="hsl(var(--accent))" // Use accent color
                >
                <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
         </defs>
        {edges}
      </svg>
      {nodes}
       {/* Tooltip or overlay for cell details can be added here */}
    </div>
  );
};
