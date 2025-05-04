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
import { AlertCircle, Bot, BrainCircuit, Clock, HelpCircle, MessageSquare, Plus, Send, Trash2, Zap, Milestone, ListTree, Target, History, User } from 'lucide-react';
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

  const [networkSize, setNetworkSize] = useState(5);
  const [messageContent, setMessageContent] = useState('');
  const [targetCellId, setTargetCellId] = useState<'broadcast' | 'user' | string>('broadcast');
  const [helpRequestText, setHelpRequestText] = useState('');
  const [isAutoTicking, setIsAutoTicking] = useState(true); // Assume auto-tick starts by default
  const [newPurpose, setNewPurpose] = useState(purpose);

  const selectedCell = selectedCellId ? getCellById(selectedCellId) : null;

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
    try {
        await setPurpose(newPurpose);
        toast({ title: "Purpose Updated", description: "AI is reconfiguring cell expertise and goals." });
    } catch (error) {
         console.error("Failed to set purpose:", error);
         toast({ title: "Error Setting Purpose", description: "Could not update network purpose.", variant: "destructive" });
    }
  };


  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
        toast({ title: "Error", description: "Message cannot be empty.", variant: "destructive" });
        return;
    };
    let source: string | 'user' = 'user';
    // If sending to 'user', it implies a cell is sending to the user interface
    // If sending from 'user', it's the user sending into the network
    // Let's assume ControlPanel always sends *from* the user for now.
    let target = targetCellId;

    if (selectedCellId && targetCellId === selectedCellId) {
      // If target is the selected cell, maybe interpret as user replying *to* the cell?
      // This logic needs refinement based on desired interaction flow.
      // For now, keep it simple: user sends to target.
    }

    await sendMessage(source, target, messageContent);
    toast({ title: "Message Sent", description: `To: ${target === 'broadcast' ? 'All Cells' : target}` });
    setMessageContent(''); // Clear input after sending
  };

  const handleAskForHelp = async () => {
    if (!selectedCellId || !helpRequestText.trim()) {
        toast({ title: "Error", description: "Select a cell and enter help request.", variant: "destructive" });
        return;
    };
    await askForHelp(selectedCellId, helpRequestText);
    toast({ title: "Help Request Sent", description: `Cell ${selectedCellId} asked for help.` });
    setHelpRequestText('');
  };

  const handleToggleAutoTick = () => {
    if (isAutoTicking) {
      stopAutoTick();
      toast({ title: "Auto-Tick Paused" });
    } else {
      startAutoTick(); // Assumes default interval, adjust if needed
      toast({ title: "Auto-Tick Resumed" });
    }
    setIsAutoTicking(!isAutoTicking);
  };

   const handleManualTick = () => {
    if(isAutoTicking) {
        stopAutoTick();
        setIsAutoTicking(false);
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
      toast({ title: "Cell Removed", description: `Cell ${idToRemove} deleted.` });
      // selectedCellId is cleared within removeCell if it matches
    } else {
        toast({ title: "Error", description: "No cell selected to remove.", variant: "destructive" });
    }
  };

  const handleCloneCell = () => {
      if(selectedCellId) {
          addCell(selectedCellId);
           toast({ title: "Cell Cloned", description: `Created clone of Cell ${selectedCellId}.` });
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
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
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
                     />
                     <Button onClick={handleSetPurpose} size="sm" className="w-full">Set Purpose & Reconfigure</Button>
                   </div>

                   <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="network-size">Initial Cell Count: {networkSize}</Label>
                    <Slider
                      id="network-size"
                      min={1}
                      max={30} // Keep initial size reasonable
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
                        <Plus className="mr-2 size-4" /> Add Random Cell
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
                            <Badge variant={selectedCell.isAlive ? "secondary" : "destructive"}>
                                {selectedCell.id.substring(0, 6)}...
                            </Badge>
                        </CardTitle>
                         <CardDescription>
                            Status: {selectedCell.isAlive ? `Alive (Age: ${selectedCell.age})` : `Dead (Died at Age: ${selectedCell.age})`} | Version: {selectedCell.version}
                         </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div className="flex items-center gap-2"> <Milestone className="size-4 text-muted-foreground"/> <strong>Expertise:</strong> {selectedCell.expertise}</div>
                        <div className="flex items-center gap-2"> <Target className="size-4 text-muted-foreground"/> <strong>Goal:</strong> {selectedCell.goal}</div>
                         <div className="flex items-center gap-2"> <ListTree className="size-4 text-muted-foreground"/> <strong>Liked Cells:</strong> {selectedCell.likedCells.length > 0 ? selectedCell.likedCells.map(id => <Badge key={id} variant="outline" className="cursor-pointer" onClick={()=> selectCell(id)}>{id.substring(0,4)}</Badge>) : 'None'}</div>

                        <Separator className="my-3" />

                        <Label htmlFor="help-request">Ask Neighbors for Help:</Label>
                        <Textarea
                            id="help-request"
                            placeholder="Describe what this cell needs help with..."
                            value={helpRequestText}
                            onChange={(e) => setHelpRequestText(e.target.value)}
                            className="h-20"
                            disabled={!selectedCell.isAlive}
                        />
                        <Button onClick={handleAskForHelp} size="sm" className="w-full" disabled={!selectedCell.isAlive}>
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
                             {selectedCell.history.slice().reverse().map(entry => ( // Reverse for newest first
                                 <p key={entry.seq} className="mb-1">
                                     <span className="text-muted-foreground mr-1">[{entry.age}]</span>
                                     <Badge variant="outline" className="mr-1 text-xs capitalize">{entry.type}</Badge>
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
                                {Object.values(cells).filter(c => c.isAlive).map(cell => (
                                    <option key={cell.id} value={cell.id}>
                                        Cell {cell.id.substring(0, 6)} ({cell.expertise})
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Dead Cells (Inspect Only)">
                                {Object.values(cells).filter(c => !c.isAlive).map(cell => (
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
                       placeholder="Enter your message..."
                       value={messageContent}
                       onChange={(e) => setMessageContent(e.target.value)}
                       className="h-24"
                     />
                    </div>
                   <Button onClick={handleSendMessage} size="sm" className="w-full">
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
