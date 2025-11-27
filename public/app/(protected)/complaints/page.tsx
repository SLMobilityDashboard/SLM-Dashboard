"use client";

import React, { useState, useEffect } from "react";
import ComplaintForm from "@/ComplainCrew/components/complaint-form";
import type { ComplaintFormInput } from "@/ComplainCrew/types/complaint-types";
import EnhancedWorkflowCanvas from "@/ComplainCrew/components/workflow-canvas";
import { AgentResponsePanel } from "@/ComplainCrew/components/agent-response-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PanelRightOpen, X } from "lucide-react";

type WorkflowStep = {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed";
  duration: number; // in ms
  result?: string;
};

export default function ComplaintsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 768);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const stepsTemplate: WorkflowStep[] = [
    {
      id: "1",
      name: "Support Agent - Initial Triage",
      status: "pending",
      duration: 3000,
    },
    {
      id: "2",
      name: "Analysis Tool - Text Analysis",
      status: "pending",
      duration: 2000,
    },
    {
      id: "3",
      name: "Finance Officer - Billing Review",
      status: "pending",
      duration: 2500,
    },
    {
      id: "4",
      name: "Complaint Manager - Manual Review",
      status: "pending",
      duration: 4000,
    },
  ];

  const startWorkflowSimulation = async () => {
    setWorkflow(stepsTemplate);
    setCurrentStepIndex(-1);
    setResultMessage(null);
    setIsProcessing(true);
    setIsPanelOpen(false);

    for (let i = 0; i < stepsTemplate.length; i++) {
      setCurrentStepIndex(i);

      setWorkflow((prev) =>
        prev.map((step, idx) =>
          idx === i ? { ...step, status: "processing" } : step
        )
      );

      await new Promise((res) => setTimeout(res, stepsTemplate[i].duration));

      setWorkflow((prev) =>
        prev.map((step, idx) =>
          idx === i
            ? {
                ...step,
                status: "completed",
                result: `Step "${step.name}" completed successfully.`,
              }
            : step
        )
      );
    }

    setResultMessage("Workflow simulation completed.");
    setIsProcessing(false);
    setIsPanelOpen(true);
  };

  const handleFormSubmit = (data: ComplaintFormInput) => {
    setIsFormOpen(false);
    startWorkflowSimulation();
  };

  const handleReset = () => {
    setWorkflow([]);
    setCurrentStepIndex(-1);
    setResultMessage(null);
    setIsProcessing(false);
    setIsPanelOpen(false);
    setIsFormOpen(false);
  };

  // This function is passed to your workflow canvas and called when a node is clicked
  const handleStartNodeClick = () => {
    if (!isProcessing) {
      setIsFormOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full">
      <EnhancedWorkflowCanvas
        workflow={workflow}
        isProcessing={isProcessing}
        onStartNodeClick={handleStartNodeClick}
        setIsProcessing={setIsProcessing}
      />

      {/* Complaint Form Dialog/Sheet */}
      {isDesktop ? (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>Submit New Complaint</DialogTitle>
            </DialogHeader>
            <ComplaintForm
              onSubmit={handleFormSubmit}
              isProcessing={isProcessing}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
          <SheetContent
            side="bottom"
            className="h-3/4 bg-slate-800 text-white border-slate-700"
          >
            <SheetHeader>
              <SheetTitle>Submit New Complaint</SheetTitle>
            </SheetHeader>
            <ComplaintForm
              onSubmit={handleFormSubmit}
              isProcessing={isProcessing}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Agent Response Panel */}
      {isPanelOpen && (
        <div
          className={`absolute right-0 top-0 h-full bg-slate-800/90 backdrop-blur-sm border-l border-slate-700 p-4 transition-all duration-300 ease-in-out ${
            isPanelOpen ? "w-96" : "w-0 overflow-hidden"
          }`}
          style={{ width: isPanelOpen ? (isDesktop ? 384 : "100%") : 0 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">
              Complaint Workflow Details
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPanelOpen(false)}
              className="text-slate-400"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-white space-y-3 overflow-auto max-h-[80vh]">
            {workflow.map((step) => (
              <div
                key={step.id}
                className="p-2 border border-slate-600 rounded"
              >
                <strong>{step.name}</strong> - <em>{step.status}</em>
                {step.result && (
                  <p className="mt-1 text-sm text-slate-300">{step.result}</p>
                )}
              </div>
            ))}
            {resultMessage && (
              <div className="mt-4 p-2 bg-green-800 rounded text-white font-semibold">
                {resultMessage}
              </div>
            )}
          </div>
          <Button variant="secondary" className="mt-4" onClick={handleReset}>
            Reset Workflow
          </Button>
        </div>
      )}

      {/* Toggle panel button for desktop */}
      {isDesktop && isPanelOpen && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1/2 -translate-y-1/2 bg-slate-700 hover:bg-slate-600 text-white rounded-l-none transition-all duration-300 right-96"
          onClick={() => setIsPanelOpen(false)}
        >
          <PanelRightOpen className="h-5 w-5 rotate-180" />
        </Button>
      )}
      {isDesktop && !isPanelOpen && workflow.length > 0 && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1/2 -translate-y-1/2 bg-slate-700 hover:bg-slate-600 text-white rounded-l-none transition-all duration-300 right-0"
          onClick={() => setIsPanelOpen(true)}
        >
          <PanelRightOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
