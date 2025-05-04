

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

  // Determine class based on alive status and active/sleeping status
   let statusClass = '';
   if (!data.isAlive) {
     statusClass = 'cell-node-dead';
   } else if (data.status === 'sleeping') {
     statusClass = 'cell-node-sleeping';
   } else {
     statusClass = 'cell-node-alive'; // Active and alive
   }


  return (
    <div
      className={cn(
        'cell-node relative', // Added relative positioning
        statusClass, // Apply the determined status class
        isSelected && 'cell-node-selected'
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${data.position.x - size / 2}px`, // Center the node
        top: `${data.position.y - size / 2}px`, // Center the node
        position: 'absolute', // Position absolutely within the container
      }}
      onClick={data.isAlive ? handleClick : undefined} // Allow clicking sleeping cells
      title={`Cell ${data.id}\nAge: ${data.age}\nStatus: ${data.isAlive ? data.status : 'Dead'}\nExpertise: ${data.expertise}\nGoal: ${data.goal}`}
    >
      {data.id.substring(0, 2)} {/* Display first 2 chars of ID */}
       {/* Indicator Dot */}
       {data.indicatorColor && (
          <div
            className="absolute top-0 right-0 w-2 h-2 rounded-full border border-background"
            style={{ backgroundColor: data.indicatorColor, transform: 'translate(30%, -30%)' }} // Position outside slightly
            title={`Indicator: ${data.indicatorColor}`}
          />
        )}
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
    // Only draw if both cells exist (could be dead or sleeping)
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

    // Style connection based on target status if it's not a message path
     let connectionStyle = 'connection-line'; // Default
     if (!isMessagePath) {
       if (!target.isAlive || target.status === 'sleeping') {
         connectionStyle += ' opacity-30'; // Dim connections to dead/sleeping cells
       }
     }


    return (
        <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={cn(
                connectionStyle, // Use dynamic style
                isMessagePath && 'message-path',
                isLikedPath && !isMessagePath && 'stroke-primary opacity-50', // Liked path only if not message path
                 // Dim liked path if target is sleeping/dead and not a message
                 isLikedPath && (!target.isAlive || target.status === 'sleeping') && !isMessagePath && 'opacity-20'
            )}
            markerEnd={isMessagePath ? "url(#arrow)" : undefined}
        />
    );
});
ConnectionLine.displayName = 'ConnectionLine';

// --- Movement Trail Component ---
interface MovementTrailProps {
  positions: { x: number; y: number }[];
}

const MovementTrail: React.FC<MovementTrailProps> = memo(({ positions }) => {
  if (positions.length < 2) return null;

  const points = positions.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <polyline
      points={points}
      className="fill-none stroke-muted-foreground opacity-30"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
});
MovementTrail.displayName = 'MovementTrail';


// --- Network Visualization Component ---
export const NetworkVisualization: React.FC = () => {
    const cells = useNetworkStore((state) => Object.values(state.cells).filter((c): c is Cell => !!c)); // Filter out undefined cells
    const messages = useNetworkStore((state) => state.messages);
    const getCellById = useNetworkStore((state) => state.getCellById);

    // Optimization: Include status and indicator color in dependencies
    const cellDependencies = useMemo(() => {
        return cells.map(c => `${c.id}-${c.version}-${c.position.x}-${c.position.y}-${c.isAlive}-${c.status}-${c.age}-${c.positionHistory.length}-${c.indicatorColor}`).join(',');
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
    }, [cellDependencies]); // Re-render only when cell versions/positions/status/age/indicator change

     const movementTrails = useMemo(() => {
        console.log("Recalculating movement trails...");
        return cells
            // Only show trails for alive AND active cells
            .filter(cell => cell.isAlive && cell.status === 'active' && cell.positionHistory && cell.positionHistory.length > 1)
            .map(cell => (
                <MovementTrail key={`trail-${cell.id}`} positions={cell.positionHistory} />
            ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cellDependencies]); // Re-render when cell positions change

    const edges = useMemo(() => {
        console.log("Recalculating edges..."); // Debug log
        const edgeElements: React.ReactNode[] = [];
        const drawnEdges = new Set<string>(); // To avoid drawing duplicate undirected edges

        // --- Liked Connections ---
        cells.forEach(sourceCell => {
            // Only draw likes from alive cells (can like sleeping/dead cells)
            if (!sourceCell.isAlive) return;
            sourceCell.likedCells.forEach(targetId => {
                const targetCell = getCellById(targetId);
                if (targetCell) { // Draw connection even if target is dead/sleeping
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

            // Handle routes if available
            if (msg.route && msg.route.length > 1) {
                for (let i = 0; i < msg.route.length - 1; i++) {
                    const routeSource = getCellById(msg.route[i]);
                    const routeTarget = getCellById(msg.route[i + 1]);
                    // Draw route hop if both source and target exist (target could be sleeping/dead but was intended)
                    if (routeSource && routeTarget) {
                         edgeElements.push(
                            <ConnectionLine
                                key={`${msg.id}-route-${i}`}
                                source={routeSource}
                                target={routeTarget}
                                isMessagePath={true}
                            />
                        );
                    } else {
                         console.warn(`Skipping route segment draw: ${routeSource?.id} -> ${routeTarget?.id} (one or both missing)`);
                    }
                }
            }
            // Handle direct/broadcast if NO route was successfully drawn/intended
            else {
                if (msg.targetCellId === 'broadcast') {
                    // Broadcast only comes FROM an active cell (or user)
                    if (sourceCell?.isAlive && sourceCell.status === 'active') {
                         // Broadcast goes TO all other alive cells (active or sleeping)
                         targets = cells.filter(c => c.isAlive && c.id !== sourceCell.id);
                    } else if (msg.sourceCellId === 'user') {
                        // User broadcast goes to all alive cells
                        targets = cells.filter(c => c.isAlive);
                    }
                } else if (msg.targetCellId !== 'user') {
                    const targetCell = getCellById(msg.targetCellId);
                    // Can target a sleeping/dead cell directly
                    if (targetCell) {
                         targets.push(targetCell);
                    }
                }

                // Draw direct lines if source exists (even if sleeping/dead, maybe it sent right before dying?)
                if (sourceCell) {
                    targets.forEach(targetCell => {
                        // Ensure target still exists before drawing
                        if(getCellById(targetCell.id)) {
                            edgeElements.push(
                                <ConnectionLine
                                    key={`${msg.id}-${sourceCell.id}-${targetCell.id}`}
                                    source={sourceCell}
                                    target={targetCell}
                                    isMessagePath={true}
                                />
                            );
                        }
                    });
                } else if (msg.sourceCellId === 'user') {
                     // Draw from a nominal "user" position (e.g., corner) if source is user
                     const userPosition = { x: 10, y: 10 }; // Example user position
                     const pseudoUserCell: Partial<Cell> = { id: 'user', position: userPosition, age: 0 };
                     targets.forEach(targetCell => {
                        if (getCellById(targetCell.id)) {
                             edgeElements.push(
                                <ConnectionLine
                                    key={`${msg.id}-user-${targetCell.id}`}
                                    source={pseudoUserCell as Cell} // Cast needed
                                    target={targetCell}
                                    isMessagePath={true}
                                />
                            );
                        }
                     });
                }
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
         {/* Render movement trails first so they are behind other elements */}
         {movementTrails}
        {edges}
      </svg>
      {nodes}
       {/* Tooltip or overlay for cell details can be added here */}
    </div>
  );
};


