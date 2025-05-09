
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
import { startAutoTick, stopAutoTick, MAX_CELLS } from '@/hooks/useNetworkStore'; // Import MAX_CELLS
import { Slider } from '@/components/ui/slider';
import { AlertCircle, Bot, BrainCircuit, Clock, HelpCircle, MessageSquare, Plus, Send, Trash2, Zap, Milestone, ListTree, Target, History, User, RefreshCw, BedDouble, ScanLine, Thermometer, BarChart, Waves, Wind, Lightbulb, Droplet, Rss, Eye, Ear, Paintbrush, MinusSquare, BookOpen, Play, Square, Github } from 'lucide-react'; // Added Play, Square, Github icons
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import type { CellId } from '@/types';
import { cn } from '@/lib/utils';


// Define sensor types with icons
const sensorTypes = [
    { value: 'Temperature Sensor', label: 'Temperature', icon: Thermometer },
    { value: 'Pressure Sensor', label: 'Pressure', icon: BarChart }, // Using BarChart as a proxy
    { value: 'Humidity Sensor', label: 'Humidity', icon: Droplet },
    { value: 'Light Sensor', label: 'Light', icon: Lightbulb },
    { value: 'Motion Sensor', label: 'Motion', icon: Eye }, // Using Eye as a proxy
    { value: 'Sound Sensor', label: 'Sound', icon: Ear },
    { value: 'Gas Sensor', label: 'Gas', icon: Wind },
    { value: 'Proximity Sensor', label: 'Proximity', icon: ScanLine },
    { value: 'Flow Sensor', label: 'Flow', icon: Waves },
    { value: 'Signal Sensor', label: 'Signal', icon: Rss },
];


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
    reduceCellAge,
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
    reduceCellAge: state.reduceCellAge,
  }));
    const { toast } = useToast();

  const [networkSize, setNetworkSize] = useState(10);
  const [messageContent, setMessageContent] = useState('');
  const [targetCellId, setTargetCellId] = useState<'broadcast' | 'user' | CellId>('broadcast');
  const [helpRequestText, setHelpRequestText] = useState('');
  const [isAutoTicking, setIsAutoTicking] = useState(true); // Default to true as auto-tick starts on load
  const [newPurpose, setNewPurpose] = useState(purpose);
  const [isSettingPurpose, setIsSettingPurpose] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAskingForHelp, setIsAskingForHelp] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [selectedSensorType, setSelectedSensorType] = useState<string | undefined>(undefined);
  const [ageReductionAmount, setAgeReductionAmount] = useState<number>(10);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);


  const selectedCell = selectedCellId ? getCellById(selectedCellId) : null;

  useEffect(() => {
    setNewPurpose(purpose);
  }, [purpose]);

   useEffect(() => {
       if (customRole.trim().toLowerCase() !== 'sensor') {
           setSelectedSensorType(undefined);
       }
   }, [customRole]);

   // Sync local auto-ticking state with the actual interval state (needed if initialized differently)
   useEffect(() => {
        // Check if the interval is running globally (implementation detail, assume true initially)
        // This could be improved by exposing the interval ID or a boolean from the store
        // For now, assume it starts automatically based on useNetworkStore logic
   }, []);


  const handleInitialize = () => {
    stopAutoTick(); // Stop current ticks before re-initializing
    setIsAutoTicking(false);
    initializeNetwork(networkSize);
    selectCell(null);
    toast({ title: "Network Initialized", description: `Created ${networkSize} cells.` });
    // Optionally restart ticking after init
    // startAutoTick();
    // setIsAutoTicking(true);
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


  const handleSendMessage = async (overrideContent?: string) => {
    const contentToSend = overrideContent ?? messageContent;
    if (!contentToSend.trim()) {
        toast({ title: "Error", description: "Message cannot be empty.", variant: "destructive" });
        return;
    };
    setIsSendingMessage(true);
    let source: string | 'user' = 'user';
    let target = targetCellId;

    try {
        await sendMessage(source, target, contentToSend);
        toast({ title: "Message Sent", description: `To: ${target === 'broadcast' ? 'All Cells' : (target === 'user' ? 'User Interface' : `Cell ${target.substring(0,6)}...`)}` });
        if (!overrideContent) {
             setMessageContent('');
        }
    } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not send message.";
        toast({ title: "Error Sending Message", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSendingMessage(false);
    }
  };

  const handleAskForHelp = async () => {
    if (!selectedCellId || !helpRequestText.trim() || selectedCell?.status !== 'active') {
        toast({ title: "Error", description: "Select an active cell and enter help request.", variant: "destructive" });
        return;
    };
    setIsAskingForHelp(true);
    try {
        await askForHelp(selectedCellId, helpRequestText);
        toast({ title: "Help Request Sent", description: `Cell ${selectedCellId.substring(0,6)} asked for help.` });
        setHelpRequestText('');
    } catch (error) {
        console.error("Failed to ask for help:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not send help request.";
        toast({ title: "Error Asking for Help", description: errorMessage, variant: "destructive" });
    } finally {
        setIsAskingForHelp(false);
    }
  };

  const handleStartTicks = () => {
    startAutoTick();
    setIsAutoTicking(true);
    toast({ title: "Auto-Tick Started" });
  };

  const handleStopTicks = () => {
    stopAutoTick();
    setIsAutoTicking(false);
    toast({ title: "Auto-Tick Stopped" });
  };

  const handleManualTick = () => {
    if (isAutoTicking) {
      stopAutoTick();
      setIsAutoTicking(false);
      toast({ title: "Auto-Tick Paused for Manual Tick" });
    }
    tick();
    toast({ title: "Manual Tick Executed" });
  };


  const handleAddCell = () => {
    let expertiseToAdd: string | undefined = undefined;
    const roleInput = customRole.trim();

    if (roleInput) {
        if (roleInput.toLowerCase() === 'sensor') {
             if (selectedSensorType) {
                 expertiseToAdd = selectedSensorType;
             } else {
                 toast({ title: "Error", description: "Please select a sensor type.", variant: "destructive" });
                 return;
             }
        } else {
            expertiseToAdd = roleInput;
        }
    }


    addCell(undefined, expertiseToAdd);
    toast({ title: "Cell Added", description: expertiseToAdd ? `Added with expertise: ${expertiseToAdd}` : "Added with next available role." });
    setCustomRole('');
    setSelectedSensorType(undefined);
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
      if(selectedCellId && selectedCell?.status === 'active') {
          addCell(selectedCellId);
           toast({ title: "Cell Cloned", description: `Created clone of Cell ${selectedCellId.substring(0,6)}.` });
      } else {
          toast({ title: "Error", description: "Select an active cell to clone.", variant: "destructive" });
      }
  }

   const handleReduceAge = () => {
        if (selectedCellId && selectedCell?.isAlive) {
            const amount = ageReductionAmount;
            if (amount > 0) {
                reduceCellAge(selectedCellId, amount);
                toast({ title: "Cell Age Reduced", description: `Reduced age of Cell ${selectedCellId.substring(0,6)} by ${amount}.` });
            } else {
                toast({ title: "Error", description: "Age reduction amount must be positive.", variant: "destructive" });
            }
        } else {
            toast({ title: "Error", description: "Select an alive cell to reduce its age.", variant: "destructive" });
        }
   };

   const getStatusBadgeVariant = (status: 'active' | 'sleeping' | 'dead') => {
       switch (status) {
           case 'active': return 'secondary';
           case 'sleeping': return 'outline';
           case 'dead': return 'destructive';
           default: return 'default';
       }
   }

   const handleColorSensorsGreen = () => {
        handleSendMessage("color all sensors green");
        toast({ title: "Command Sent", description: "Instructed sensors to turn green." });
   };

   const handleResetSensorColors = () => {
       handleSendMessage("reset sensor color");
       toast({ title: "Command Sent", description: "Instructed sensors to reset color." });
   };

   const handleOpenRequirements = () => {
       window.open('/requirements.html', '_blank');
       toast({ title: "Opening Requirements Document"});
   }

    const handleCommitToGitHub = async () => {
        setIsCommitting(true);
        try {
            const response = await fetch('/api/git/commit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: commitMessage }),
            });

            if (response.ok) {
                toast({ title: "Commit Successful", description: "Changes committed successfully." });
                setCommitMessage('');
            } else {
                const errorData = await response.json();
                toast({ title: "Commit Failed", description: errorData.error || "An error occurred while committing.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Commit Error", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setIsCommitting(false);
        }
    };


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
            <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4']} className="w-full">
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
                      max={MAX_CELLS}
                      step={1}
                      value={[networkSize]}
                      onValueChange={(value) => setNetworkSize(value[0])}
                    />
                  </div>
                  <Button onClick={handleInitialize} size="sm" className="w-full">Initialize Network</Button>

                  <Separator />
                   <div className="flex gap-2">
                        <Button onClick={handleStartTicks} size="sm" variant="secondary" className="flex-1" disabled={isAutoTicking}>
                           <Play className="mr-2 size-4" /> Start Ticks
                       </Button>
                       <Button onClick={handleStopTicks} size="sm" variant="destructive" className="flex-1" disabled={!isAutoTicking}>
                          <Square className="mr-2 size-4" /> Stop Ticks
                       </Button>
                   </div>
                    <Button onClick={handleManualTick} size="sm" variant="outline" className="w-full" disabled={isAutoTicking}>
                         <Clock className="mr-2 size-4" /> Manual Tick
                    </Button>


                   {/* Add Cell Section */}
                   <Separator />
                   <div className="space-y-2">
                     <Label htmlFor="custom-role">Add Cell with Role (Optional)</Label>
                     <Input
                       id="custom-role"
                       placeholder="Enter expertise (or 'Sensor')"
                       value={customRole}
                       onChange={(e) => setCustomRole(e.target.value)}
                     />
                     {customRole.trim().toLowerCase() === 'sensor' && (
                         <Select value={selectedSensorType} onValueChange={setSelectedSensorType}>
                             <SelectTrigger className="w-full">
                                 <SelectValue placeholder="Select Sensor Type..." />
                             </SelectTrigger>
                             <SelectContent>
                                 {sensorTypes.map(sensor => (
                                     <SelectItem key={sensor.value} value={sensor.value}>
                                         <div className="flex items-center gap-2">
                                             <sensor.icon className="size-4 text-muted-foreground" />
                                             {sensor.label}
                                         </div>
                                     </SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                     )}
                     <Button onClick={handleAddCell} size="sm" variant="secondary" className="w-full">
                        <Plus className="mr-2 size-4" /> Add Cell {customRole ? `(${customRole.trim()})` : "(Next Role)"}
                     </Button>
                   </div>
                     <Separator />
                      {/* Requirements Button */}
                      <Button onClick={handleOpenRequirements} size="sm" variant="outline" className="w-full">
                         <BookOpen className="mr-2 size-4" /> View Requirements
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
                            <Badge variant={getStatusBadgeVariant(selectedCell.isAlive ? selectedCell.status : 'dead')} className="cursor-pointer capitalize" onClick={() => selectCell(selectedCell.id)}>
                                {selectedCell.id.substring(0, 6)}...
                            </Badge>
                        </CardTitle>
                         <CardDescription className="capitalize">
                            Status: {selectedCell.isAlive ? selectedCell.status : `Dead (Age: ${selectedCell.age})`} {selectedCell.isAlive && `(Age: ${selectedCell.age})`} | Version: {selectedCell.version}
                         </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div className="flex items-start gap-2"> <Milestone className="size-4 text-muted-foreground mt-0.5"/> <div><strong>Expertise:</strong> {selectedCell.expertise}</div></div>
                        <div className="flex items-start gap-2"> <Target className="size-4 text-muted-foreground mt-0.5"/> <div><strong>Goal:</strong> {selectedCell.goal}</div></div>
                         <div className="flex items-start gap-2"> <ListTree className="size-4 text-muted-foreground mt-0.5"/> <div><strong>Liked Cells:</strong> {selectedCell.likedCells.length > 0 ? selectedCell.likedCells.map(id => <Badge key={id} variant="outline" className="cursor-pointer mr-1 mb-1" onClick={()=> selectCell(id)}>{id.substring(0,4)}</Badge>) : 'None'}</div></div>

                        <Separator className="my-3" />

                         {/* Reduce Age Section */}
                         <div className="space-y-2">
                            <Label htmlFor="reduce-age-amount">Reduce Age By</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="reduce-age-amount"
                                    type="number"
                                    min="1"
                                    value={ageReductionAmount}
                                    onChange={(e) => setAgeReductionAmount(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="flex-1"
                                    disabled={!selectedCell?.isAlive}
                                />
                                <Button onClick={handleReduceAge} size="sm" variant="outline" disabled={!selectedCell?.isAlive}>
                                    <MinusSquare className="mr-2 size-4" /> Reduce
                                </Button>
                            </div>
                         </div>

                        <Separator className="my-3" />

                        <Label htmlFor="help-request">Ask Neighbors for Help:</Label>
                        <Textarea
                            id="help-request"
                            placeholder={selectedCell.status !== 'active' ? 'Cell must be active to ask for help.' : "Describe what this cell needs help with..."}
                            value={helpRequestText}
                            onChange={(e) => setHelpRequestText(e.target.value)}
                            className="h-20"
                            disabled={!selectedCell.isAlive || selectedCell.status !== 'active' || isAskingForHelp}
                        />
                        <Button onClick={handleAskForHelp} size="sm" className="w-full" disabled={!selectedCell.isAlive || selectedCell.status !== 'active' || isAskingForHelp}>
                             {isAskingForHelp && <RefreshCw className="mr-2 size-4 animate-spin" />}
                            <HelpCircle className="mr-2 size-4" /> Ask for Help
                        </Button>
                        <Separator className="my-3" />
                         <div className="flex gap-2">
                            <Button onClick={handleCloneCell} size="sm" variant="outline" className="flex-1" disabled={!selectedCell.isAlive || selectedCell.status !== 'active'}>
                                <Plus className="mr-2 size-4" /> Clone
                            </Button>
                            <Button onClick={handleRemoveCell} size="sm" variant="destructive" className="flex-1">
                                <Trash2 className="mr-2 size-4" /> Remove
                            </Button>
                         </div>


                         <Separator className="my-3" />

                         <h4 className="font-medium flex items-center gap-2"><History className="size-4"/>History ({selectedCell.history.length})</h4>
                         <ScrollArea className="h-40 w-full rounded-md border p-2 text-xs bg-muted/30">
                            {selectedCell.history.length === 0 && <span className="text-muted-foreground italic">No history yet.</span>}
                             {selectedCell.history.slice().reverse().map(entry => (
                                 <div key={entry.seq} className="mb-1.5 leading-relaxed">
                                     <span className="text-muted-foreground mr-1">[{entry.age}]</span>
                                     {/* Use span with badgeVariants classes instead of div */}
                                     <Badge asSpan variant='outline' className='mr-1.5 text-[10px] capitalize px-1.5 py-0 align-middle'>{entry.type}</Badge>
                                     <span className="break-words">{entry.text}</span>
                                 </div>
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
                            onChange={(e) => setTargetCellId(e.target.value as typeof targetCellId)}
                            className="w-full mt-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="broadcast">Broadcast to All</option>
                            <option value="user">To User Interface (Debug)</option>
                             <optgroup label="Active Cells">
                                {Object.values(cells).filter(c => c?.isAlive && c.status === 'active').sort((a,b) => a!.id.localeCompare(b!.id)).map(cell => (
                                    <option key={cell!.id} value={cell!.id}>
                                        Cell {cell!.id.substring(0, 6)} ({cell!.expertise})
                                    </option>
                                ))}
                            </optgroup>
                             <optgroup label="Sleeping Cells">
                                {Object.values(cells).filter(c => c?.isAlive && c.status === 'sleeping').sort((a,b) => a!.id.localeCompare(b!.id)).map(cell => (
                                    <option key={cell!.id} value={cell!.id}>
                                        Cell {cell!.id.substring(0, 6)} (Sleeping)
                                    </option>
                                ))}
                             </optgroup>
                            <optgroup label="Dead Cells (Inspect Only)">
                                {Object.values(cells).filter(c => c && !c.isAlive).sort((a,b) => a.id.localeCompare(b.id)).map(cell => (
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
                   <Button onClick={() => handleSendMessage()} size="sm" className="w-full" disabled={isSendingMessage}>
                     {isSendingMessage && <RefreshCw className="mr-2 size-4 animate-spin" />}
                     <Send className="mr-2 size-4" /> Send Message
                   </Button>
                    <Separator />
                     {/* Sensor Color Buttons */}
                    <div className="space-y-2">
                        <Label>Sensor Commands (Broadcast Only)</Label>
                        <div className="flex gap-2">
                             <Button onClick={handleColorSensorsGreen} size="sm" variant="outline" className="flex-1" disabled={isSendingMessage}>
                                 <Paintbrush className="mr-2 size-4" /> Color Sensors Green
                             </Button>
                             <Button onClick={handleResetSensorColors} size="sm" variant="outline" className="flex-1" disabled={isSendingMessage}>
                                <RefreshCw className="mr-2 size-4" /> Reset Sensor Colors
                            </Button>
                        </div>
                    </div>
                 </AccordionContent>
               </AccordionItem>

                {/* GitHub Controls */}
                <AccordionItem value="item-4">
                    <AccordionTrigger className="px-2 text-base hover:no-underline">
                        <div className="flex items-center gap-2">
                            <Github className="size-4" /> GitHub Controls
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-2 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="commit-message">Commit Message</Label>
                            <Input
                                id="commit-message"
                                placeholder="Enter commit message..."
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleCommitToGitHub} size="sm" className="w-full" variant="outline" disabled={isCommitting}>
                            {isCommitting && <RefreshCw className="mr-2 size-4 animate-spin" />}
                            <Github className="mr-2 size-4" /> Commit to GitHub
                        </Button>
                        </AccordionContent>
                    </AccordionItem>

                 

                </AccordionItem>

            </Accordion>
             <div className="h-10"></div> {/* Spacer */}
          </ScrollArea>
        </SidebarContent>
    </>
  );
};

