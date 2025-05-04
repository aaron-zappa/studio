'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { startAutoTick, stopAutoTick } from '@/hooks/useNetworkStore';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, Bot, BrainCircuit, Clock, HelpCircle, MessageSquare, Plus, Send, Trash2, Zap, Milestone, ListTree, Target, History, User, RefreshCw } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';


export const ControlPanel: React.FC = () => {
  const {
    initializeNetwork,
    setPurpose,
    purpose,
    tick,
    addCell,
    removeCell,
    sendMessage,
    askForHelp,
    selectedCellId,
    selectCell,
    getCellById,
    cells,
  } = useNetworkStore((state) => ({
    initializeNetwork: state.initializeNetwork,
    setPurpose: state.setPurpose,
    purpose: state.purpose,
    tick: state.tick,
    addCell: state.addCell,
    removeCell: state.removeCell,
    sendMessage: state.sendMessage,
    askForHelp: state.askForHelp,
    selectedCellId: state.selectedCellId,
    selectCell: state.selectCell,
    getCellById: state.getCellById,
    cells: state.cells,
  }));
    const { toast } = useToast();

  const [networkSize, setNetworkSize] = useState(10); // Default to 10 initial cells
  const [messageContent, setMessageContent] = useState('');
  const [targetCellId, setTargetCellId] = useState<'broadcast' | 'user' | string>('broadcast');
  const [helpRequestText, setHelpRequestText] = useState('');
  const [isAutoTicking, setIsAutoTicking] = useState(true); // Assume auto-tick starts by default
  const [newPurpose, setNewPurpose] = useState(purpose);
  const [isSettingPurpose, setIsSettingPurpose] = useState(false); // Loading state for purpose setting
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAskingForHelp, setIsAskingForHelp] = useState(false);


  const selectedCell = selectedCellId ? getCellById(selectedCellId) : null;

  // Effect to check initial auto-tick status from the store if needed
  // (Currently assumes it starts on by default)

  useEffect(() => {
    setNewPurpose(purpose); // Sync local state if global purpose changes externally
  }, [purpose]);

  const handleInitialize = () => {
    initializeNetwork(networkSize);
    selectCell(null); // Deselect any cell on re-init
    toast({ title: "Network Initialized", description: `Created ${networkSize} cells.` });
  };

   const handleSetPurpose = async () => {
    if (!newPurpose.trim()) {
        toast({ title: "Error", description: "Purpose cannot be empty.", variant: "destructive" });
        return;
    }
    setIsSettingPurpose(true);
    try {
        await setPurpose(newPurpose);
        toast({ title: "Purpose Update Triggered", description: "AI is processing the new network purpose." });
    } catch (error) {
         console.error("Failed to set purpose:", error);
         const errorMessage = error instanceof Error ? error.message : "Could not update network purpose.";
         toast({ title: "Error Setting Purpose", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSettingPurpose(false);
    }
  };


  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
        toast({ title: "Error", description: "Message cannot be empty.", variant: "destructive" });
        return;
    };
    setIsSendingMessage(true);
    let source: string | 'user' = 'user';
    let target = targetCellId;

    // Simplified logic: Control panel always sends from 'user'
    try {
        await sendMessage(source, target, messageContent);
        toast({ title: "Message Sent", description: `To: ${target === 'broadcast' ? 'All Cells' : (target === 'user' ? 'User Interface' : `Cell ${target.substring(0,6)}...`)}` });
        setMessageContent(''); // Clear input after successful send
    } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not send message.";
        toast({ title: "Error Sending Message", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSendingMessage(false);
    }
  };

  const handleAskForHelp = async () => {
    if (!selectedCellId || !helpRequestText.trim()) {
        toast({ title: "Error", description: "Select a cell and enter help request.", variant: "destructive" });
        return;
    };
    setIsAskingForHelp(true);
    try {
        await askForHelp(selectedCellId, helpRequestText);
        toast({ title: "Help Request Sent", description: `Cell ${selectedCellId.substring(0,6)} asked for help.` });
        setHelpRequestText(''); // Clear input after successful request
    } catch (error) {
        console.error("Failed to ask for help:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not send help request.";
        toast({ title: "Error Asking for Help", description: errorMessage, variant: "destructive" });
    } finally {
        setIsAskingForHelp(false);
    }
  };


  const handleToggleAutoTick = () => {
    if (isAutoTicking) {
      stopAutoTick();
      toast({ title: "Auto-Tick Paused" });
    } else {
      startAutoTick();
      toast({ title: "Auto-Tick Resumed" });
    }
    setIsAutoTicking(!isAutoTicking);
  };

   const handleManualTick = () => {
    if(isAutoTicking) {
        stopAutoTick();
        setIsAutoTicking(false);
        toast({ title: "Auto-Tick Paused for Manual Tick"});
    }
    tick();
    toast({ title: "Manual Tick Executed" });
  };


  const handleAddCell = () => {
    addCell();
    toast({ title: "Cell Added" });
  };

  const handleRemoveCell = () => {
    if (selectedCellId) {
      const idToRemove = selectedCellId;
      removeCell(idToRemove);
      toast({ title: "Cell Removed", description: `Cell ${idToRemove.substring(0,6)} deleted.` });
    } else {
        toast({ title: "Error", description: "No cell selected to remove.", variant: "destructive" });
    }
  };

  const handleCloneCell = () => {
      if(selectedCellId) {
          addCell(selectedCellId);
           toast({ title: "Cell Cloned", description: `Created clone of Cell ${selectedCellId.substring(0,6)}.` });
      } else {
          toast({ title: "Error", description: "No cell selected to clone.", variant: "destructive" });
      }
  }

  return (
    <>
        <SidebarHeader className="p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <BrainCircuit className="size-6 text-primary" />
                <h1 className="text-lg font-semibold">CellConnect</h1>
            </div>
             <SidebarTrigger />
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="p-0">
          <ScrollArea className="h-full px-2">
            <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3']} className="w-full">
              {/* Network Controls */}
              <AccordionItem value="item-1">
                <AccordionTrigger className="px-2 text-base hover:no-underline">
                    <div className="flex items-center gap-2">
                        <Zap className="size-4"/> Network Controls
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-2 space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="purpose">Network Purpose</Label>
                     <Textarea
                       id="purpose"
                       placeholder="Describe the network's goal..."
                       value={newPurpose}
                       onChange={(e) => setNewPurpose(e.target.value)}
                       className="h-24"
                       disabled={isSettingPurpose}
                     />
                     <Button onClick={handleSetPurpose} size="sm" className="w-full" disabled={isSettingPurpose}>
                         {isSettingPurpose && <RefreshCw className="mr-2 size-4 animate-spin" />}
                         Set Purpose & Reconfigure
                    </Button>
                   </div>

                   <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="network-size">Initial Cell Count: {networkSize}</Label>
                    <Slider
                      id="network-size"
                      min={1}
                      max={predefinedRoles.length} // Use number of roles as max initial size
                      step={1}
                      value={[networkSize]}
                      onValueChange={(value) => setNetworkSize(value[0])}
                    />
                  </div>
                  <Button onClick={handleInitialize} size="sm" className="w-full">Initialize Network</Button>

                  <Separator />
                   <div className="flex gap-2">
                       <Button onClick={handleToggleAutoTick} size="sm" variant="outline" className="flex-1">
                           {isAutoTicking ? 'Pause Ticks' : 'Resume Ticks'}
                       </Button>
                       <Button onClick={handleManualTick} size="sm" variant="outline" className="flex-1" disabled={isAutoTicking}>
                           Manual Tick
                       </Button>
                   </div>

                    <Separator />
                     <Button onClick={handleAddCell} size="sm" variant="secondary" className="w-full">
                        <Plus className="mr-2 size-4" /> Add Cell (Next Role)
                     </Button>
                </AccordionContent>
              </AccordionItem>

              {/* Cell Inspector */}
              <AccordionItem value="item-2">
                <AccordionTrigger className="px-2 text-base hover:no-underline">
                    <div className="flex items-center gap-2">
                        <Bot className="size-4"/> Cell Inspector
                    </div>
                 </AccordionTrigger>
                <AccordionContent className="p-2">
                  {selectedCell ? (
                    <Card className="bg-card/50">
                      <CardHeader className="p-4">
                        <CardTitle className="flex items-center justify-between text-lg">
                            Cell Details
                            <Badge variant={selectedCell.isAlive ? "secondary" : "destructive"} className="cursor-pointer" onClick={() => selectCell(selectedCell.id)}>
                                {selectedCell.id.substring(0, 6)}...
                            </Badge>
                        </CardTitle>
                         <CardDescription>
                            Status: {selectedCell.isAlive ? `Alive (Age: ${selectedCell.age})` : `Dead (Died at Age: ${selectedCell.age})`} | Version: {selectedCell.version}
                         </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div className="flex items-start gap-2"> <Milestone className="size-4 text-muted-foreground mt-0.5"/> <div><strong>Expertise:</strong> {selectedCell.expertise}</div></div>
                        <div className="flex items-start gap-2"> <Target className="size-4 text-muted-foreground mt-0.5"/> <div><strong>Goal:</strong> {selectedCell.goal}</div></div>
                         <div className="flex items-start gap-2"> <ListTree className="size-4 text-muted-foreground mt-0.5"/> <div><strong>Liked Cells:</strong> {selectedCell.likedCells.length > 0 ? selectedCell.likedCells.map(id => <Badge key={id} variant="outline" className="cursor-pointer mr-1 mb-1" onClick={()=> selectCell(id)}>{id.substring(0,4)}</Badge>) : 'None'}</div></div>

                        <Separator className="my-3" />

                        <Label htmlFor="help-request">Ask Neighbors for Help:</Label>
                        <Textarea
                            id="help-request"
                            placeholder="Describe what this cell needs help with..."
                            value={helpRequestText}
                            onChange={(e) => setHelpRequestText(e.target.value)}
                            className="h-20"
                            disabled={!selectedCell.isAlive || isAskingForHelp}
                        />
                        <Button onClick={handleAskForHelp} size="sm" className="w-full" disabled={!selectedCell.isAlive || isAskingForHelp}>
                             {isAskingForHelp && <RefreshCw className="mr-2 size-4 animate-spin" />}
                            <HelpCircle className="mr-2 size-4" /> Ask for Help
                        </Button>
                        <Separator className="my-3" />
                         <div className="flex gap-2">
                            <Button onClick={handleCloneCell} size="sm" variant="outline" className="flex-1" disabled={!selectedCell.isAlive}>
                                <Plus className="mr-2 size-4" /> Clone
                            </Button>
                            <Button onClick={handleRemoveCell} size="sm" variant="destructive" className="flex-1">
                                <Trash2 className="mr-2 size-4" /> Remove
                            </Button>
                         </div>


                         <Separator className="my-3" />

                         <h4 className="font-medium flex items-center gap-2"><History className="size-4"/>History ({selectedCell.history.length})</h4>
                         <ScrollArea className="h-40 w-full rounded-md border p-2 text-xs bg-muted/30">
                            {selectedCell.history.length === 0 && <p className="text-muted-foreground italic">No history yet.</p>}
                             {selectedCell.history.slice().reverse().map(entry => ( // Reverse for newest first
                                 <p key={entry.seq} className="mb-1.5 leading-relaxed">
                                     <span className="text-muted-foreground mr-1">[{entry.age}]</span>
                                     <Badge variant="outline" className="mr-1.5 text-[10px] capitalize px-1.5 py-0 align-middle">{entry.type}</Badge>
                                      {entry.text}
                                 </p>
                             ))}
                         </ScrollArea>
                      </CardContent>
                    </Card>
                  ) : (
                    <p className="text-sm text-muted-foreground p-4 text-center">Select a cell on the network to inspect its details.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

               {/* Messaging */}
               <AccordionItem value="item-3">
                 <AccordionTrigger className="px-2 text-base hover:no-underline">
                     <div className="flex items-center gap-2">
                         <MessageSquare className="size-4"/> Messaging
                     </div>
                 </AccordionTrigger>
                 <AccordionContent className="p-2 space-y-4">
                     <div>
                         <Label htmlFor="target-cell">Target</Label>
                         <select
                            id="target-cell"
                            value={targetCellId}
                            onChange={(e) => setTargetCellId(e.target.value)}
                            className="w-full mt-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="broadcast">Broadcast to All</option>
                            <option value="user">To User Interface (Debug)</option>
                            <optgroup label="Alive Cells">
                                {Object.values(cells).filter(c => c && c.isAlive).sort((a,b) => a.id.localeCompare(b.id)).map(cell => ( // Add null check
                                    <option key={cell.id} value={cell.id}>
                                        Cell {cell.id.substring(0, 6)} ({cell.expertise})
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Dead Cells (Inspect Only)">
                                {Object.values(cells).filter(c => c && !c.isAlive).sort((a,b) => a.id.localeCompare(b.id)).map(cell => ( // Add null check
                                     <option key={cell.id} value={cell.id} disabled>
                                        Cell {cell.id.substring(0, 6)} (Dead)
                                     </option>
                                ))}
                            </optgroup>
                        </select>
                     </div>
                    <div>
                     <Label htmlFor="message-content">Message</Label>
                     <Textarea
                       id="message-content"
                       placeholder="Enter your message... (Try 'purpose?')"
                       value={messageContent}
                       onChange={(e) => setMessageContent(e.target.value)}
                       className="h-24"
                       disabled={isSendingMessage}
                     />
                    </div>
                   <Button onClick={handleSendMessage} size="sm" className="w-full" disabled={isSendingMessage}>
                     {isSendingMessage && <RefreshCw className="mr-2 size-4 animate-spin" />}
                     <Send className="mr-2 size-4" /> Send Message
                   </Button>
                 </AccordionContent>
               </AccordionItem>

            </Accordion>
             <div className="h-10"></div> {/* Spacer */}
          </ScrollArea>
        </SidebarContent>
    </>
  );
};

// Helper for predefined roles length used in Slider max
const predefinedRoles = [
    { expertise: 'Data Collector', goal: 'Gather information from sensors and network messages' },
    { expertise: 'Data Analyzer', goal: 'Process raw data to find patterns and anomalies' },
    { expertise: 'Task Router', goal: 'Direct incoming tasks to the appropriate specialist cell' },
    { expertise: 'Network Communicator', goal: 'Relay important findings between cell groups' },
    { expertise: 'Long-Term Memory', goal: 'Store and retrieve historical data for context' },
    { expertise: 'System Coordinator', goal: 'Oversee network health and resource allocation' },
    { expertise: 'Security Monitor', goal: 'Detect and report potential intrusions or malfunctions' },
    { expertise: 'Resource Allocator', goal: 'Distribute energy or computational resources efficiently'},
    { expertise: 'Predictive Modeler', goal: 'Forecast future network states based on current trends'},
    { expertise: 'User Interface Liaison', goal: 'Format data and responses for user interaction'},
];
