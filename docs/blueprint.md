# **App Name**: CellConnect

## Core Features:

- Cellular Network Simulation: Simulate a network of interconnected cells, each acting as an independent agent communicating with others to achieve a goal. Each cell owns an age, has a sqlite in memory db at first, and can clone itself. If age above 99 it dies and only can be inspected. Each cell can ask other cells near by for help by asking them about their expertise. Cells can move to come closer to cells they like. Cells can ask user for purpose and functionality. There is a version if a cell changes. There is a central tick function for increasing age. Decisions and message of cells get stored in history table with attribs seq,type, age, text . Each cell has an id and before the cell dies it write the in memory db to a sqlite file db where the name is connected to the cellid
- Network Visualization: Visualize the cellular network, showing cells as nodes and messages as connections between them. User can configure network parameters.
- User Interaction & Messaging: Allow users to send messages to specific cells or broadcast to the entire network, observing how the messages propagate and influence the network's state. The tool will determine the best way to get the message to the destination.

## Style Guidelines:

- Primary color: Dark blue (#222831) to represent the network's depth.
- Secondary color: Light grey (#EEEEEE) for contrast and readability.
- Accent: Teal (#00ADB5) to highlight active cells and message pathways.
- Node-based layout with clear visual hierarchy for cells and connections.
- Use simple, geometric shapes for cell icons to maintain a clean and technical aesthetic.
- Subtle animations to indicate message propagation and cell activity.